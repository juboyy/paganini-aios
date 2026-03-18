"""PAGANINI RAG Pipeline — Modular, swappable retrieval system."""

import hashlib
import json
import os
import re
from pathlib import Path
from typing import Optional

import chromadb
import yaml

from packages.rag.bm25 import BM25Index


class Chunk:
    """A chunk of text from a document."""
    def __init__(self, text: str, source: str, section: str = "", metadata: dict = None):
        self.text = text
        self.source = source
        self.section = section
        self.metadata = metadata or {}
        self.score = 0.0

    def __repr__(self):
        return f"Chunk({self.source}:{self.section}, {len(self.text)} chars, score={self.score:.3f})"


class Answer:
    """A RAG answer with sources."""
    def __init__(self, text: str, chunks: list[Chunk], confidence: float = 0.0,
                 model: str = "", latency_ms: float = 0, cost: float = 0):
        self.text = text
        self.chunks = chunks
        self.confidence = confidence
        self.model = model
        self.latency_ms = latency_ms
        self.cost = cost


class RAGPipeline:
    """Hybrid RAG pipeline — modular and configurable.
    
    Designed to be optimized by AutoResearch (program.md + eval.py loop).
    Every parameter is exposed and tunable.
    """

    def __init__(self, config: dict):
        self.config = config
        self.data_dir = Path(config.get("data_dir", "runtime/data"))
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # === CHUNKING (AutoResearch tunes these) ===
        rag_cfg = config.get("rag", {})
        self.chunk_size = rag_cfg.get("chunk_size", 384)
        self.chunk_overlap = rag_cfg.get("chunk_overlap", 64)
        self.respect_headers = rag_cfg.get("respect_headers", True)

        # === RETRIEVAL ===
        self.top_k = rag_cfg.get("top_k", 5)
        self.max_context_tokens = rag_cfg.get("max_context_tokens", 8000)

        # === HYBRID FUSION ===
        self.dense_weight = rag_cfg.get("dense_weight", 0.6)
        self.sparse_weight = rag_cfg.get("sparse_weight", 0.4)
        self.fusion_method = rag_cfg.get("fusion_method", "rrf")
        self.rrf_k = rag_cfg.get("rrf_k", 60)

        # === CHROMA (embedded vector DB — no external dependency) ===
        chroma_path = str(self.data_dir / "chroma")
        self.chroma = chromadb.PersistentClient(path=chroma_path)
        self.collection = self.chroma.get_or_create_collection(
            name="corpus",
            metadata={"hnsw:space": "cosine"}
        )

        # === BM25 (sparse retrieval) ===
        self.bm25 = BM25Index(self.data_dir / "bm25_index.json")

    def ingest(self, corpus_dir: str) -> dict:
        """Ingest markdown files from corpus directory.
        
        Returns stats about the ingestion.
        """
        corpus_path = Path(corpus_dir)
        if not corpus_path.is_absolute():
            # Try relative to package root
            _root = Path(__file__).parent.parent.parent
            alt_path = _root / corpus_dir
            if alt_path.exists():
                corpus_path = alt_path
        if not corpus_path.exists():
            raise FileNotFoundError(f"Corpus directory not found: {corpus_dir}")

        files = list(corpus_path.rglob("*.md"))
        if not files:
            raise ValueError(f"No .md files found in {corpus_dir}")

        stats = {"files": 0, "chunks": 0, "skipped": 0, "total_chars": 0}
        batch_ids = []
        batch_docs = []
        batch_metas = []

        for f in files:
            try:
                text = f.read_text(encoding="utf-8")
            except Exception:
                stats["skipped"] += 1
                continue

            chunks = self._chunk_document(text, str(f.relative_to(corpus_path)))
            stats["files"] += 1

            for idx, chunk in enumerate(chunks):
                chunk_id = hashlib.md5(f"{chunk.source}:{chunk.section}:{idx}:{chunk.text[:200]}".encode()).hexdigest()
                batch_ids.append(chunk_id)
                batch_docs.append(chunk.text)
                batch_metas.append({
                    "source": chunk.source,
                    "section": chunk.section,
                    **chunk.metadata
                })
                stats["chunks"] += 1
                stats["total_chars"] += len(chunk.text)

                # Batch upsert every 100 chunks
                if len(batch_ids) >= 100:
                    self.collection.upsert(ids=batch_ids, documents=batch_docs, metadatas=batch_metas)
                    self.bm25.index(batch_docs, batch_ids, batch_metas)
                    batch_ids, batch_docs, batch_metas = [], [], []

        # Final batch
        if batch_ids:
            self.collection.upsert(ids=batch_ids, documents=batch_docs, metadatas=batch_metas)
            self.bm25.index(batch_docs, batch_ids, batch_metas)

        return stats

    def retrieve(self, query: str, top_k: int = None) -> list[Chunk]:
        """Retrieve relevant chunks using hybrid dense+sparse retrieval with RRF fusion."""
        k = top_k or self.top_k

        if self.collection.count() == 0:
            return []

        # --- Dense retrieval (ChromaDB) ---
        dense_results = self.collection.query(
            query_texts=[query],
            n_results=min(k * 2, self.collection.count()),
            include=["documents", "metadatas", "distances"]
        )
        dense_hits: dict[str, dict] = {}
        for i, doc in enumerate(dense_results["documents"][0]):
            meta = dense_results["metadatas"][0][i]
            distance = dense_results["distances"][0][i]
            doc_id = dense_results["ids"][0][i]
            dense_hits[doc_id] = {
                "text": doc,
                "meta": meta,
                "dense_rank": i,           # 0-indexed rank
                "dense_score": 1 - distance,
            }

        # --- Sparse retrieval (BM25) ---
        sparse_results = self.bm25.search(query, top_k=k * 2)
        sparse_hits: dict[str, dict] = {}
        for rank, hit in enumerate(sparse_results):
            sparse_hits[hit["id"]] = {
                "sparse_rank": rank,
                "sparse_score": hit["score"],
                "meta": hit["metadata"],
            }

        # --- RRF fusion ---
        all_ids = set(dense_hits) | set(sparse_hits)
        rrf_k = self.rrf_k

        fused: list[tuple[str, float]] = []
        for doc_id in all_ids:
            score = 0.0
            if doc_id in dense_hits:
                score += 1.0 / (rrf_k + dense_hits[doc_id]["dense_rank"] + 1)
            else:
                # Not in dense results — penalise with a large rank
                score += 1.0 / (rrf_k + k * 2 + 1)

            if doc_id in sparse_hits:
                score += 1.0 / (rrf_k + sparse_hits[doc_id]["sparse_rank"] + 1)
            else:
                score += 1.0 / (rrf_k + k * 2 + 1)

            fused.append((doc_id, score))

        fused.sort(key=lambda x: x[1], reverse=True)

        # --- Build Chunk objects ---
        chunks: list[Chunk] = []
        for doc_id, fused_score in fused[:k]:
            if doc_id in dense_hits:
                hit = dense_hits[doc_id]
                text = hit["text"]
                meta = hit["meta"]
            else:
                # Sparse-only hit — we have metadata but need text from BM25 meta
                meta = sparse_hits[doc_id]["meta"]
                text = meta.get("text", "")  # text not stored in BM25, fallback

            chunk = Chunk(
                text=text,
                source=meta.get("source", "unknown"),
                section=meta.get("section", ""),
                metadata=meta,
            )
            chunk.score = fused_score
            chunks.append(chunk)

        # Normalize scores to 0-1 range for display/confidence
        if chunks:
            max_score = max(c.score for c in chunks)
            min_score = min(c.score for c in chunks)
            score_range = max_score - min_score if max_score > min_score else 1.0
            for c in chunks:
                c.score = 0.5 + 0.5 * ((c.score - min_score) / score_range) if score_range > 0 else 0.75

        return chunks

    def query(self, question: str, llm_fn=None) -> Answer:
        """Full RAG: retrieve + generate answer.
        
        llm_fn: callable that takes (system_prompt, user_prompt) → response text
        """
        chunks = self.retrieve(question)

        if not chunks:
            return Answer(
                text="Nenhum documento encontrado no corpus. Execute `paganini ingest` primeiro.",
                chunks=[], confidence=0.0
            )

        # Build context from chunks
        context_parts = []
        for i, chunk in enumerate(chunks):
            context_parts.append(
                f"[Fonte {i+1}: {chunk.source} | Seção: {chunk.section} | Relevância: {chunk.score:.2f}]\n{chunk.text}"
            )
        context = "\n\n---\n\n".join(context_parts)

        system_prompt = """Você é um especialista em FIDC (Fundos de Investimento em Direitos Creditórios) e regulamentação CVM.

Regras:
1. Responda APENAS com base no contexto fornecido
2. Cite as fontes usando [Fonte N] 
3. Se não encontrar a resposta no contexto, diga explicitamente
4. Seja preciso e objetivo
5. Use terminologia técnica correta do mercado financeiro brasileiro"""

        user_prompt = f"""Contexto:
{context}

---

Pergunta: {question}

Responda citando as fontes relevantes."""

        if llm_fn:
            import time
            start = time.time()
            response_text = llm_fn(system_prompt, user_prompt)
            latency = (time.time() - start) * 1000

            # Estimate confidence from chunk scores
            avg_score = sum(c.score for c in chunks) / len(chunks) if chunks else 0
            confidence = min(avg_score * 1.2, 1.0)  # Scale up slightly

            return Answer(
                text=response_text,
                chunks=chunks,
                confidence=confidence,
                latency_ms=latency
            )
        else:
            # No LLM — return context only
            return Answer(
                text=f"[RAG sem LLM] Top {len(chunks)} chunks encontrados:\n\n{context}",
                chunks=chunks,
                confidence=0.5
            )

    def _chunk_document(self, text: str, source: str) -> list[Chunk]:
        """Chunk a markdown document respecting headers."""
        if self.respect_headers:
            return self._chunk_by_headers(text, source)
        else:
            return self._chunk_fixed(text, source)

    def _chunk_by_headers(self, text: str, source: str) -> list[Chunk]:
        """Split by markdown headers, then chunk large sections."""
        chunks = []
        sections = re.split(r'\n(?=#{1,4}\s)', text)

        for section in sections:
            lines = section.strip().split('\n')
            if not lines:
                continue

            # Extract section title
            title = ""
            if lines[0].startswith('#'):
                title = lines[0].lstrip('#').strip()
                content = '\n'.join(lines[1:]).strip()
            else:
                content = section.strip()

            if not content:
                continue

            # If section is small enough, keep as one chunk
            if len(content) <= self.chunk_size * 4:  # chars ≈ tokens * 4
                chunks.append(Chunk(text=content, source=source, section=title))
            else:
                # Split large sections into overlapping chunks
                sub_chunks = self._split_text(content, self.chunk_size * 4, self.chunk_overlap * 4)
                for i, sub in enumerate(sub_chunks):
                    chunks.append(Chunk(
                        text=sub,
                        source=source,
                        section=f"{title} (parte {i+1})" if title else f"parte {i+1}"
                    ))

        return chunks

    def _chunk_fixed(self, text: str, source: str) -> list[Chunk]:
        """Fixed-size chunking with overlap."""
        sub_chunks = self._split_text(text, self.chunk_size * 4, self.chunk_overlap * 4)
        return [Chunk(text=c, source=source, section=f"chunk {i+1}")
                for i, c in enumerate(sub_chunks)]

    def _split_text(self, text: str, size: int, overlap: int) -> list[str]:
        """Split text into overlapping chunks."""
        chunks = []
        start = 0
        while start < len(text):
            end = start + size
            chunk = text[start:end]
            if chunk.strip():
                chunks.append(chunk.strip())
            start = end - overlap
            if start >= len(text):
                break
        return chunks

    def status(self) -> dict:
        """Return pipeline status."""
        return {
            "chunks_indexed": self.collection.count(),
            "bm25_docs": len(self.bm25),
            "chunk_size": self.chunk_size,
            "chunk_overlap": self.chunk_overlap,
            "respect_headers": self.respect_headers,
            "top_k": self.top_k,
            "dense_weight": self.dense_weight,
            "sparse_weight": self.sparse_weight,
            "fusion_method": self.fusion_method,
            "rrf_k": self.rrf_k,
            "data_dir": str(self.data_dir),
        }
