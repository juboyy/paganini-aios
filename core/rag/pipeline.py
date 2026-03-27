"""PAGANINI RAG Pipeline — Modular, swappable retrieval system.

Extended with 6 advanced RAG techniques:
  1. Contextual Chunk Headers  — :mod:`core.rag.chunk_headers`
  2. Multi-Query Rewriting     — :mod:`core.rag.multi_query`
  3. Dynamic Metadata Filter   — :mod:`core.rag.metadata_filter`
  4. Context Compression       — :mod:`core.rag.compressor`
  5. Post-Retrieval Reranking  — :mod:`core.rag.reranker`
  6. GraphRAG Foundation       — :mod:`core.rag.graph_rag`

Domain knowledge is supplied via a :class:`~core.rag.domain.DomainConfig` pack.
Pass ``domain_config`` directly or configure ``config["pack"]`` to auto-load a pack.

The existing :meth:`RAGPipeline.retrieve` and :meth:`RAGPipeline.query`
methods are unchanged for backward compatibility.  New callers should use
:meth:`RAGPipeline.enhanced_retrieve` / :meth:`RAGPipeline.enhanced_query`.
"""

import hashlib
import re
from pathlib import Path
from typing import Callable, Optional

import chromadb

from core.rag.domain import DomainConfig, load_domain, GENERIC_DOMAIN
from core.rag.bm25 import BM25Index
from core.rag.chunk_headers import inject_headers_into_chunks
from core.rag.multi_query import MultiQueryRewriter
from core.rag.metadata_filter import MetadataFilter
from core.rag.compressor import ContextCompressor
from core.rag.reranker import get_reranker
from core.rag.graph_rag import GraphRAG, is_multi_hop_query


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

    Args:
        config: Pipeline configuration dict.
        domain_config: Optional :class:`~core.rag.domain.DomainConfig` for
            domain-specific vocabulary (doc types, synonyms, entity patterns,
            regulatory bodies, reranker boost terms).

            If ``None``, the pipeline attempts to load a pack from
            ``config["pack"]`` (a pack name string, e.g. ``"finance"``).
            If neither is provided, the pipeline runs in **generic mode** —
            all modules work correctly, just without domain-specific boosts.
    """

    def __init__(self, config: dict, domain_config: Optional[DomainConfig] = None):
        self.config = config
        self.data_dir = Path(config.get("data_dir", "runtime/data"))
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # === DOMAIN CONFIG ===
        if domain_config is not None:
            self.domain = domain_config
        else:
            pack_name: Optional[str] = config.get("pack")
            if pack_name:
                try:
                    self.domain = load_domain(pack_name=pack_name)
                except FileNotFoundError:
                    print(f"Warning: pack '{pack_name}' not found — running in generic mode.")
                    self.domain = GENERIC_DOMAIN
            else:
                self.domain = GENERIC_DOMAIN

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
        Path(chroma_path).mkdir(parents=True, exist_ok=True)
        try:
            self.chroma = chromadb.PersistentClient(path=chroma_path)
        except Exception:
            self.chroma = chromadb.Client()
        _embed_fn = None
        try:
            import chromadb.utils.embedding_functions as ef
            _api_key = config.get("provider", {}).get("api_key") or __import__("os").environ.get("GOOGLE_API_KEY", "")
            if _api_key:
                _embed_fn = ef.GoogleGenerativeAiEmbeddingFunction(
                    api_key=_api_key,
                    model_name="models/gemini-embedding-2-preview",
                    task_type="RETRIEVAL_DOCUMENT",
                )
                print("Using Google text-embedding-004")
        except Exception as _e:
            print(f"Google embedding unavailable: {_e} — using default")

        _col_kwargs = {"name": "corpus", "metadata": {"hnsw:space": "cosine"}}
        if _embed_fn:
            _col_kwargs["embedding_function"] = _embed_fn
        self.collection = self.chroma.get_or_create_collection(**_col_kwargs)

        # === BM25 (sparse retrieval) ===
        self.bm25 = BM25Index(self.data_dir / "bm25_index.json")

        # === ADVANCED RAG MODULES (all receive domain) ===
        # 1. Contextual chunk headers — injected during _chunk_document
        self.inject_chunk_headers: bool = rag_cfg.get("chunk_headers", True)

        # 2. Multi-query rewriting
        self.multi_query = MultiQueryRewriter(
            n_variants=rag_cfg.get("multi_query_variants", 4),
            domain=self.domain,
        )

        # 3. Metadata filter
        self.metadata_filter = MetadataFilter(domain=self.domain)

        # 4. Context compressor
        self.compressor = ContextCompressor(
            max_tokens=self.max_context_tokens,
            strategy=rag_cfg.get("compression_strategy", "extractive"),
        )

        # 5. Reranker
        self.reranker = get_reranker(config, domain=self.domain)

        # 6. GraphRAG
        graph_path = self.data_dir / "graph.json"
        self.graph = GraphRAG(
            graph_path=graph_path,
            max_hops=rag_cfg.get("graph_max_hops", 1),
            max_extra_chunks=rag_cfg.get("graph_max_extra_chunks", 3),
            domain=self.domain,
        )

    def ingest(self, corpus_dir: str) -> dict:
        """Ingest markdown files from corpus directory.

        Returns stats about the ingestion.
        """
        corpus_path = Path(corpus_dir)
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

                if len(batch_ids) >= 100:
                    self.collection.upsert(ids=batch_ids, documents=batch_docs, metadatas=batch_metas)
                    self.bm25.index(batch_docs, batch_ids, batch_metas)
                    batch_ids, batch_docs, batch_metas = [], [], []

        if batch_ids:
            self.collection.upsert(ids=batch_ids, documents=batch_docs, metadatas=batch_metas)
            self.bm25.index(batch_docs, batch_ids, batch_metas)

        # === Build / update GraphRAG knowledge graph ===
        try:
            all_chroma = self.collection.get(include=["documents", "metadatas"])
            graph_chunks = []
            for doc, meta in zip(all_chroma["documents"], all_chroma["metadatas"]):
                c = Chunk(
                    text=doc,
                    source=meta.get("source", ""),
                    section=meta.get("section", ""),
                    metadata=meta,
                )
                graph_chunks.append(c)
            if graph_chunks:
                self.graph.build_from_chunks(graph_chunks)
                self.graph.save()
                stats["graph_entities"] = self.graph.stats().get("total_entities", 0)
        except Exception as _ge:
            stats["graph_error"] = str(_ge)

        return stats

    def retrieve(self, query: str, top_k: int = None) -> list[Chunk]:
        """Retrieve relevant chunks using hybrid dense+sparse retrieval with RRF fusion."""
        k = top_k or self.top_k

        if self.collection.count() == 0:
            return []

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
                "dense_rank": i,
                "dense_score": 1 - distance,
            }

        sparse_results = self.bm25.search(query, top_k=k * 2)
        sparse_hits: dict[str, dict] = {}
        for rank, hit in enumerate(sparse_results):
            sparse_hits[hit["id"]] = {
                "sparse_rank": rank,
                "sparse_score": hit["score"],
                "meta": hit["metadata"],
            }

        all_ids = set(dense_hits) | set(sparse_hits)
        rrf_k = self.rrf_k

        fused: list[tuple[str, float]] = []
        for doc_id in all_ids:
            score = 0.0
            if doc_id in dense_hits:
                score += 1.0 / (rrf_k + dense_hits[doc_id]["dense_rank"] + 1)
            else:
                score += 1.0 / (rrf_k + k * 2 + 1)
            if doc_id in sparse_hits:
                score += 1.0 / (rrf_k + sparse_hits[doc_id]["sparse_rank"] + 1)
            else:
                score += 1.0 / (rrf_k + k * 2 + 1)
            fused.append((doc_id, score))

        fused.sort(key=lambda x: x[1], reverse=True)

        chunks: list[Chunk] = []
        for doc_id, fused_score in fused[:k]:
            if doc_id in dense_hits:
                hit = dense_hits[doc_id]
                text = hit["text"]
                meta = hit["meta"]
            else:
                meta = sparse_hits[doc_id]["meta"]
                text = meta.get("text", "")

            chunk = Chunk(
                text=text,
                source=meta.get("source", "unknown"),
                section=meta.get("section", ""),
                metadata=meta,
            )
            chunk.score = fused_score
            chunks.append(chunk)

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

        context_parts = []
        for i, chunk in enumerate(chunks):
            context_parts.append(
                f"[Fonte {i+1}: {chunk.source} | Seção: {chunk.section} | Relevância: {chunk.score:.2f}]\n{chunk.text}"
            )
        context = "\n\n---\n\n".join(context_parts)

        system_prompt = """Você é um especialista sênior em fundos de investimento, regulamentação CVM e mercado de capitais brasileiro.

Diretrizes:
1. Use o contexto fornecido como base principal para a resposta
2. Cite fontes usando [Fonte N] quando se basear nos documentos
3. Quando o contexto cobrir parcialmente a pergunta, RESPONDA com o que está disponível e indique o que está coberto e o que não está
4. Conecte informações de múltiplas fontes para construir respostas mais completas
5. Se o contexto fornece regulações gerais aplicáveis à pergunta, APLIQUE-AS ao caso específico perguntado
6. Use terminologia técnica do mercado financeiro brasileiro
7. Seja direto e informativo — nunca responda apenas "não encontrei"
8. Estruture respostas longas com tópicos e subtítulos para clareza"""

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
            avg_score = sum(c.score for c in chunks) / len(chunks) if chunks else 0
            confidence = min(avg_score * 1.2, 1.0)
            return Answer(
                text=response_text,
                chunks=chunks,
                confidence=confidence,
                latency_ms=latency
            )
        else:
            return Answer(
                text=f"[RAG sem LLM] Top {len(chunks)} chunks encontrados:\n\n{context}",
                chunks=chunks,
                confidence=0.5
            )

    def enhanced_retrieve(
        self,
        query: str,
        top_k: Optional[int] = None,
        llm_fn: Optional[Callable] = None,
    ) -> list[Chunk]:
        """Advanced retrieval chain with all 6 RAG enhancements.

        Pipeline order:

        1. **Multi-query rewriting** — generate up to 4 query variants.
        2. **Metadata filtering** — extract filter criteria from query; build
           ChromaDB pre-filter and post-filter for BM25/merged results.
        3. **Hybrid retrieval** — run the existing dense+sparse RRF pipeline
           for each query variant, then merge and deduplicate results.
        4. **Reranking** — cross-encoder (if available) or keyword fallback.
        5. **Context compression** — trim to :attr:`max_context_tokens`.
        6. **Graph augmentation** — if the query signals multi-hop reasoning,
           traverse the knowledge graph and append up to 3 extra chunks.

        Args:
            query: User query.
            top_k: Override the pipeline's default ``top_k``.
            llm_fn: Optional LLM callable ``(system_prompt, user_prompt) → str``.

        Returns:
            Reranked, compressed list of :class:`Chunk` objects.
        """
        k = top_k or self.top_k

        # ── 1. Multi-query rewriting ────────────────────────────────────────
        query_variants = self.multi_query.rewrite(query, llm_fn=llm_fn)

        # ── 2. Metadata filtering — extract criteria ────────────────────────
        criteria = self.metadata_filter.extract_from_query(query)
        where_clause = self.metadata_filter.to_chroma_where(criteria)

        # ── 3. Hybrid retrieval per variant + merge ──────────────────────────
        all_variant_results: list[list[Chunk]] = []
        for variant in query_variants:
            variant_chunks = self._retrieve_with_filter(variant, k, where_clause)
            variant_chunks = self.metadata_filter.post_filter(variant_chunks, criteria)
            all_variant_results.append(variant_chunks)

        chunks = self.multi_query.merge_results(all_variant_results)

        if criteria.prefer_newest:
            chunks = self.metadata_filter.sort_by_recency(chunks, weight=0.25)

        # ── 4. Reranking ────────────────────────────────────────────────────
        chunks = self.reranker.rerank(query, chunks)

        # ── 5. Context compression ──────────────────────────────────────────
        chunks = self.compressor.compress(chunks, query, llm_fn=llm_fn)

        # ── 6. Graph augmentation ───────────────────────────────────────────
        try:
            if is_multi_hop_query(query):
                graph_chunks = self.graph.retrieve(query, chunks, force=False)
                chunks = chunks + graph_chunks  # type: ignore[operator]
        except Exception:
            pass

        return chunks  # type: ignore[return-value]

    def enhanced_query(
        self,
        question: str,
        llm_fn: Optional[Callable] = None,
    ) -> Answer:
        """Full enhanced RAG: :meth:`enhanced_retrieve` + generation.

        Drop-in replacement for :meth:`query` with all 6 RAG enhancements.

        Args:
            question: User's question.
            llm_fn: LLM callable ``(system_prompt, user_prompt) → str``.

        Returns:
            :class:`Answer` with the generated response and source chunks.
        """
        chunks = self.enhanced_retrieve(question, llm_fn=llm_fn)

        if not chunks:
            return Answer(
                text="Nenhum documento encontrado no corpus. Execute `paganini ingest` primeiro.",
                chunks=[], confidence=0.0,
            )

        context_parts = []
        for i, chunk in enumerate(chunks):
            header = ""
            if hasattr(chunk, "metadata"):
                header = chunk.metadata.get("contextual_header", "")
            label = f"[Fonte {i + 1}: {chunk.source} | Seção: {chunk.section} | Relevância: {chunk.score:.2f}]"
            body = chunk.text
            if header and body.startswith(header):
                context_parts.append(f"{label}\n{body}")
            elif header:
                context_parts.append(f"{label}\n{header}\n\n{body}")
            else:
                context_parts.append(f"{label}\n{body}")

        context = "\n\n---\n\n".join(context_parts)

        system_prompt = """Você é um especialista sênior em fundos de investimento, regulamentação CVM e mercado de capitais brasileiro.

Diretrizes:
1. Use o contexto fornecido como base principal para a resposta
2. Cite fontes usando [Fonte N] quando se basear nos documentos
3. Quando o contexto cobrir parcialmente a pergunta, RESPONDA com o que está disponível e indique o que está coberto e o que não está
4. Conecte informações de múltiplas fontes para construir respostas mais completas
5. Se o contexto fornece regulações gerais aplicáveis à pergunta, APLIQUE-AS ao caso específico perguntado
6. Use terminologia técnica do mercado financeiro brasileiro
7. Seja direto e informativo — nunca responda apenas "não encontrei"
8. Estruture respostas longas com tópicos e subtítulos para clareza"""

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
            avg_score = sum(c.score for c in chunks) / len(chunks) if chunks else 0
            confidence = min(avg_score * 1.2, 1.0)
            return Answer(
                text=response_text,
                chunks=chunks,
                confidence=confidence,
                latency_ms=latency,
            )
        else:
            return Answer(
                text=f"[Enhanced RAG sem LLM] Top {len(chunks)} chunks:\n\n{context}",
                chunks=chunks,
                confidence=0.5,
            )

    # ------------------------------------------------------------------
    # Internal helper used by enhanced_retrieve
    # ------------------------------------------------------------------

    def _retrieve_with_filter(
        self,
        query: str,
        k: int,
        where: Optional[dict] = None,
    ) -> list[Chunk]:
        """Run the hybrid retrieval pipeline with an optional ChromaDB where-filter."""
        if self.collection.count() == 0:
            return []

        query_kwargs: dict = {
            "query_texts": [query],
            "n_results": min(k * 2, self.collection.count()),
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            query_kwargs["where"] = where

        try:
            dense_results = self.collection.query(**query_kwargs)
        except Exception:
            query_kwargs.pop("where", None)
            try:
                dense_results = self.collection.query(**query_kwargs)
            except Exception:
                return []

        dense_hits: dict[str, dict] = {}
        for i, doc in enumerate(dense_results["documents"][0]):
            meta = dense_results["metadatas"][0][i]
            distance = dense_results["distances"][0][i]
            doc_id = dense_results["ids"][0][i]
            dense_hits[doc_id] = {
                "text": doc,
                "meta": meta,
                "dense_rank": i,
                "dense_score": 1 - distance,
            }

        sparse_results = self.bm25.search(query, top_k=k * 2)
        sparse_hits: dict[str, dict] = {}
        for rank, hit in enumerate(sparse_results):
            sparse_hits[hit["id"]] = {
                "sparse_rank": rank,
                "sparse_score": hit["score"],
                "meta": hit["metadata"],
            }

        all_ids = set(dense_hits) | set(sparse_hits)
        rrf_k = self.rrf_k
        fused: list[tuple[str, float]] = []
        for doc_id in all_ids:
            score = 0.0
            if doc_id in dense_hits:
                score += 1.0 / (rrf_k + dense_hits[doc_id]["dense_rank"] + 1)
            else:
                score += 1.0 / (rrf_k + k * 2 + 1)
            if doc_id in sparse_hits:
                score += 1.0 / (rrf_k + sparse_hits[doc_id]["sparse_rank"] + 1)
            else:
                score += 1.0 / (rrf_k + k * 2 + 1)
            fused.append((doc_id, score))

        fused.sort(key=lambda x: x[1], reverse=True)

        chunks: list[Chunk] = []
        for doc_id, fused_score in fused[:k]:
            if doc_id in dense_hits:
                hit = dense_hits[doc_id]
                text = hit["text"]
                meta = hit["meta"]
            else:
                meta = sparse_hits[doc_id]["meta"]
                text = meta.get("text", "")

            chunk = Chunk(
                text=text,
                source=meta.get("source", "unknown"),
                section=meta.get("section", ""),
                metadata=meta,
            )
            chunk.score = fused_score
            chunks.append(chunk)

        if chunks:
            max_score = max(c.score for c in chunks)
            min_score = min(c.score for c in chunks)
            score_range = max_score - min_score if max_score > min_score else 1.0
            for c in chunks:
                c.score = 0.5 + 0.5 * ((c.score - min_score) / score_range) if score_range > 0 else 0.75

        return chunks

    def _chunk_document(self, text: str, source: str) -> list[Chunk]:
        """Chunk a markdown document respecting headers."""
        if self.respect_headers:
            chunks = self._chunk_by_headers(text, source)
        else:
            chunks = self._chunk_fixed(text, source)

        if self.inject_chunk_headers and chunks:
            inject_headers_into_chunks(
                chunks,
                source=source,
                full_text=text,
                prepend_to_text=True,
                domain=self.domain,
            )

        return chunks

    def _chunk_by_headers(self, text: str, source: str) -> list[Chunk]:
        """Split by markdown headers, then chunk large sections."""
        chunks = []
        sections = re.split(r'\n(?=#{1,4}\s)', text)

        for section in sections:
            lines = section.strip().split('\n')
            if not lines:
                continue

            title = ""
            if lines[0].startswith('#'):
                title = lines[0].lstrip('#').strip()
                content = '\n'.join(lines[1:]).strip()
            else:
                content = section.strip()

            if not content:
                continue

            if len(content) <= self.chunk_size * 4:
                chunks.append(Chunk(text=content, source=source, section=title))
            else:
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
        """Return pipeline status including advanced module states."""
        base = {
            "chunks_indexed": self.collection.count(),
            "bm25_docs": len(self.bm25),
            "chunk_size": self.chunk_size,
            "chunk_overlap": self.chunk_overlap,
            "respect_headers": self.respect_headers,
            "chunk_headers_enabled": self.inject_chunk_headers,
            "top_k": self.top_k,
            "dense_weight": self.dense_weight,
            "sparse_weight": self.sparse_weight,
            "fusion_method": self.fusion_method,
            "rrf_k": self.rrf_k,
            "data_dir": str(self.data_dir),
            "max_context_tokens": self.max_context_tokens,
            "compression_strategy": self.compressor.strategy,
            "domain": self.domain.name,
            "domain_language": self.domain.language,
        }
        base.update(self.graph.stats())
        return base
