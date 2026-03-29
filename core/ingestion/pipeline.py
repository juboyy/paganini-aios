"""Paganini AIOS — Corpus Self-Service Ingestion Pipeline.

Accepts document uploads (PDF, DOCX, MD, TXT), extracts text,
chunks it, generates embeddings, and indexes into the vector store.

Designed for:
- Self-service via Telegram document upload
- Admin corpus management
- Auto-tagging with tenant_id and fund_id for multi-tenant RAG

Dependencies: pure Python stdlib only (no PyMuPDF, pdfplumber, etc.)
PDF parsing uses a basic byte-level extractor; for production,
drop in a proper extractor in the _extract_pdf() method.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import struct
import time
import unicodedata
import zlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

log = logging.getLogger("paganini.ingestion")

# ── Chunking config defaults ───────────────────────────────────────────────────
DEFAULT_CHUNK_SIZE = 800        # characters
DEFAULT_CHUNK_OVERLAP = 150     # characters
DEFAULT_MIN_CHUNK = 80          # below this, merge with next

# ── Status constants ───────────────────────────────────────────────────────────
STATUS_OK = "ok"
STATUS_PARTIAL = "partial"
STATUS_FAILED = "failed"
STATUS_UNSUPPORTED = "unsupported"


# ── Result Dataclass ───────────────────────────────────────────────────────────


@dataclass
class IngestResult:
    """Result from the document ingestion pipeline.

    Attributes:
        chunks_created:    Number of text chunks indexed
        embedding_time_ms: Wall-clock time for embedding + indexing
        total_tokens:      Estimated token count (approx chars/4)
        status:            "ok" | "partial" | "failed" | "unsupported"
        doc_id:            Document hash ID used in the vector store
        source:            Source file path
        error:             Error message if status != "ok"
    """

    chunks_created: int = 0
    embedding_time_ms: float = 0.0
    total_tokens: int = 0
    status: str = STATUS_OK
    doc_id: str = ""
    source: str = ""
    error: str = ""

    def to_dict(self) -> dict:
        return {
            "chunks_created": self.chunks_created,
            "embedding_time_ms": round(self.embedding_time_ms, 2),
            "total_tokens": self.total_tokens,
            "status": self.status,
            "doc_id": self.doc_id,
            "source": self.source,
            "error": self.error,
        }


# ── Text Extraction ────────────────────────────────────────────────────────────


def _extract_txt(path: Path) -> str:
    """Extract text from a .txt or .md file."""
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return path.read_bytes().decode("utf-8", errors="replace")


def _extract_md(path: Path) -> str:
    """Extract text from a Markdown file (strips markup)."""
    text = _extract_txt(path)
    # Strip common Markdown markup for plain-text embedding
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)   # headers
    text = re.sub(r"\*{1,3}(.+?)\*{1,3}", r"\1", text)            # bold/italic
    text = re.sub(r"`{1,3}[^`]*`{1,3}", "", text)                  # code
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)                     # images
    text = re.sub(r"\[(.+?)\]\(.*?\)", r"\1", text)                # links
    text = re.sub(r"^[-*+]\s+", "", text, flags=re.MULTILINE)     # lists
    return text


def _extract_pdf_stdlib(path: Path) -> str:
    """Minimal PDF text extractor using stdlib only.

    Decodes FlateDecode streams and extracts BT/ET text blocks.
    Good enough for text-based PDFs; for scanned PDFs, use OCR.
    """
    raw = path.read_bytes()
    text_parts: list[str] = []

    # Find all compressed streams and attempt inflate
    for match in re.finditer(rb"/FlateDecode.*?stream\r?\n(.*?)\r?\nendstream", raw, re.DOTALL):
        try:
            decompressed = zlib.decompress(match.group(1))
            text_parts.append(decompressed.decode("latin-1", errors="ignore"))
        except Exception:
            continue

    # Also look for uncompressed text blocks (BT...ET)
    full = raw.decode("latin-1", errors="ignore")
    for bt_match in re.finditer(r"BT\s(.+?)ET", full, re.DOTALL):
        block = bt_match.group(1)
        # Extract strings from Tj and TJ operators
        for tj_match in re.finditer(r"\(([^)]*)\)\s*Tj", block):
            text_parts.append(tj_match.group(1))
        for tj_match in re.finditer(r"\[([^\]]*)\]\s*TJ", block):
            inner = tj_match.group(1)
            words = re.findall(r"\(([^)]*)\)", inner)
            text_parts.append(" ".join(words))

    text = "\n".join(text_parts)
    # Clean control characters
    text = re.sub(r"[\x00-\x08\x0b-\x0c\x0e-\x1f]", " ", text)
    text = re.sub(r"\s{3,}", "\n\n", text)
    return text.strip()


def _extract_docx_stdlib(path: Path) -> str:
    """Extract text from DOCX using zipfile (stdlib).

    DOCX is a ZIP containing word/document.xml.
    """
    import zipfile
    import xml.etree.ElementTree as ET

    try:
        with zipfile.ZipFile(path) as z:
            if "word/document.xml" not in z.namelist():
                return ""
            xml_content = z.read("word/document.xml")

        root = ET.fromstring(xml_content)
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

        parts = []
        for para in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
            texts = [
                t.text or ""
                for t in para.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t")
            ]
            line = "".join(texts).strip()
            if line:
                parts.append(line)

        return "\n\n".join(parts)
    except Exception as exc:
        log.warning("DOCX extraction error: %s", exc)
        return ""


def extract_text(file_path: str, doc_type: str = "txt") -> str:
    """Extract plain text from a document.

    Args:
        file_path: Path to the source file.
        doc_type:  "txt" | "md" | "pdf" | "docx"

    Returns:
        Extracted plain text string.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = doc_type.lower().lstrip(".")
    if ext == "txt":
        return _extract_txt(path)
    elif ext == "md":
        return _extract_md(path)
    elif ext == "pdf":
        return _extract_pdf_stdlib(path)
    elif ext == "docx":
        return _extract_docx_stdlib(path)
    else:
        # Try as text
        try:
            return _extract_txt(path)
        except Exception:
            raise ValueError(f"Unsupported document type: {doc_type}")


# ── Chunker ────────────────────────────────────────────────────────────────────


def chunk_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
    min_chunk: int = DEFAULT_MIN_CHUNK,
) -> list[str]:
    """Split text into overlapping chunks suitable for embedding.

    Respects paragraph and sentence boundaries where possible.

    Args:
        text:       Source text to chunk.
        chunk_size: Target chunk size in characters.
        overlap:    Overlap between consecutive chunks.
        min_chunk:  Minimum chunk size (smaller chunks are merged).

    Returns:
        List of text chunks.
    """
    # Normalize whitespace
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()

    if not text:
        return []

    # Split on paragraph boundaries first
    paragraphs = [p.strip() for p in re.split(r"\n\n+", text) if p.strip()]

    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        # If paragraph fits in current chunk
        if len(current) + len(para) + 2 <= chunk_size:
            current = f"{current}\n\n{para}".strip()
        elif len(para) > chunk_size:
            # Flush current
            if current:
                chunks.append(current)
                current = ""
            # Split long paragraph into sentence chunks
            sentences = re.split(r"(?<=[.!?])\s+", para)
            sent_buf = ""
            for sent in sentences:
                if len(sent_buf) + len(sent) + 1 <= chunk_size:
                    sent_buf = f"{sent_buf} {sent}".strip()
                else:
                    if sent_buf and len(sent_buf) >= min_chunk:
                        chunks.append(sent_buf)
                    sent_buf = sent
            if sent_buf:
                current = sent_buf
        else:
            # Flush and start new chunk
            if current and len(current) >= min_chunk:
                chunks.append(current)
            # Overlap: carry last `overlap` chars
            if current and overlap > 0:
                overlap_text = current[-overlap:].strip()
                current = f"{overlap_text}\n\n{para}".strip()
            else:
                current = para

    if current and len(current) >= min_chunk:
        chunks.append(current)

    return chunks


# ── Doc ID ────────────────────────────────────────────────────────────────────


def _doc_id(file_path: str, tenant_id: str, fund_id: str) -> str:
    """Generate a stable document ID from file content hash + metadata."""
    path = Path(file_path)
    try:
        content = path.read_bytes()
    except Exception:
        content = file_path.encode()
    h = hashlib.sha256(content + tenant_id.encode() + fund_id.encode())
    return h.hexdigest()[:16]


# ── Vector Store Integration ───────────────────────────────────────────────────


def _index_chunks(
    chunks: list[str],
    doc_id: str,
    file_path: str,
    tenant_id: str,
    fund_id: str,
    doc_type: str,
) -> None:
    """Index chunks into ChromaDB via the existing RAG pipeline.

    Falls back to a local JSONL index if ChromaDB is unavailable.

    Args:
        chunks:    Text chunks to index.
        doc_id:    Stable document identifier.
        file_path: Original file path (used as source metadata).
        tenant_id: Tenant/organization identifier.
        fund_id:   Fund scope for filtering.
        doc_type:  Document type label.
    """
    source_name = Path(file_path).name
    metadata_base = {
        "doc_id": doc_id,
        "source": source_name,
        "tenant_id": tenant_id,
        "fund_id": fund_id,
        "doc_type": doc_type,
        "ingested_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    # Try ChromaDB via existing RAG pipeline
    try:
        import chromadb
        client = chromadb.Client()
        # Use tenant-scoped collection name
        col_name = f"paganini_{tenant_id}_{fund_id}".replace("-", "_").lower()
        try:
            collection = client.get_collection(col_name)
        except Exception:
            collection = client.create_collection(col_name)

        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc_id}_{i:04d}"
            meta = {**metadata_base, "chunk_index": i, "section": f"chunk_{i}"}
            collection.add(
                ids=[chunk_id],
                documents=[chunk],
                metadatas=[meta],
            )
        log.info("Indexed %d chunks into ChromaDB collection '%s'", len(chunks), col_name)
        return
    except Exception as exc:
        log.warning("ChromaDB indexing failed (%s) — falling back to JSONL", exc)

    # Fallback: append to runtime/data/corpus_{fund_id}.jsonl
    fallback_dir = Path("runtime") / "data"
    fallback_dir.mkdir(parents=True, exist_ok=True)
    fallback_file = fallback_dir / f"corpus_{fund_id}.jsonl"

    try:
        with fallback_file.open("a", encoding="utf-8") as fh:
            for i, chunk in enumerate(chunks):
                entry = {
                    **metadata_base,
                    "chunk_index": i,
                    "text": chunk,
                    "chunk_id": f"{doc_id}_{i:04d}",
                }
                fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
        log.info("JSONL fallback: indexed %d chunks → %s", len(chunks), fallback_file)
    except Exception as exc:
        log.error("JSONL fallback indexing failed: %s", exc)
        raise


# ── Main Pipeline ─────────────────────────────────────────────────────────────


class IngestionPipeline:
    """Full corpus ingestion pipeline.

    Orchestrates: extract → chunk → index → return status.

    Args:
        runtime_dir: Base runtime directory.
        chunk_size:  Target chunk character size.
        overlap:     Chunk overlap in characters.
    """

    def __init__(
        self,
        runtime_dir: str = "runtime",
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        overlap: int = DEFAULT_CHUNK_OVERLAP,
    ):
        self._runtime = Path(runtime_dir)
        self._chunk_size = chunk_size
        self._overlap = overlap

    def ingest(
        self,
        file_path: str,
        tenant_id: str,
        fund_id: str,
        doc_type: str = "txt",
    ) -> IngestResult:
        """Ingest a document into the vector store.

        Args:
            file_path: Path to source document.
            tenant_id: Tenant identifier for multi-tenant filtering.
            fund_id:   Fund scope for RAG filtering.
            doc_type:  "txt" | "md" | "pdf" | "docx"

        Returns:
            IngestResult with indexing statistics.
        """
        t0 = time.time()
        source = Path(file_path).name

        # Validate type
        supported = {"txt", "md", "pdf", "docx"}
        if doc_type.lower().lstrip(".") not in supported:
            return IngestResult(
                status=STATUS_UNSUPPORTED,
                source=source,
                error=f"Tipo não suportado: {doc_type}",
            )

        # Extract
        try:
            text = extract_text(file_path, doc_type)
        except FileNotFoundError as exc:
            return IngestResult(status=STATUS_FAILED, source=source, error=str(exc))
        except Exception as exc:
            log.error("Ingestion: extract error for %s: %s", file_path, exc)
            return IngestResult(status=STATUS_FAILED, source=source, error=f"Extração: {exc}")

        if not text.strip():
            return IngestResult(
                status=STATUS_PARTIAL,
                source=source,
                error="Nenhum texto extraído do documento",
            )

        # Chunk
        chunks = chunk_text(text, self._chunk_size, self._overlap)
        if not chunks:
            return IngestResult(
                status=STATUS_PARTIAL,
                source=source,
                error="Nenhum chunk gerado (documento muito curto?)",
            )

        # Token estimate (approximate: chars / 4)
        total_chars = sum(len(c) for c in chunks)
        total_tokens = total_chars // 4

        # Generate doc ID
        did = _doc_id(file_path, tenant_id, fund_id)

        # Index
        try:
            _index_chunks(chunks, did, file_path, tenant_id, fund_id, doc_type)
        except Exception as exc:
            log.error("Ingestion: index error for %s: %s", file_path, exc)
            return IngestResult(
                chunks_created=len(chunks),
                total_tokens=total_tokens,
                embedding_time_ms=(time.time() - t0) * 1000,
                status=STATUS_PARTIAL,
                doc_id=did,
                source=source,
                error=f"Indexação: {exc}",
            )

        elapsed_ms = (time.time() - t0) * 1000
        log.info(
            "Ingestion: %s → %d chunks, %d tokens, %.0fms",
            source, len(chunks), total_tokens, elapsed_ms,
        )

        return IngestResult(
            chunks_created=len(chunks),
            embedding_time_ms=elapsed_ms,
            total_tokens=total_tokens,
            status=STATUS_OK,
            doc_id=did,
            source=source,
        )


# ── Public convenience function ────────────────────────────────────────────────

_default_pipeline: Optional[IngestionPipeline] = None


def IngestDocument(
    file_path: str,
    tenant_id: str,
    fund_id: str,
    doc_type: str = "txt",
    runtime_dir: str = "runtime",
) -> IngestResult:
    """Convenience function: ingest a document using the default pipeline.

    Args:
        file_path:   Path to source document.
        tenant_id:   Tenant identifier.
        fund_id:     Fund scope.
        doc_type:    "txt" | "md" | "pdf" | "docx"
        runtime_dir: Base runtime directory.

    Returns:
        IngestResult with chunk count, timing, and status.

    Example:
        result = IngestDocument("data/contrato.pdf", "paganini", "alpha", "pdf")
        print(f"{result.chunks_created} chunks in {result.embedding_time_ms:.0f}ms")
    """
    global _default_pipeline
    if _default_pipeline is None:
        _default_pipeline = IngestionPipeline(runtime_dir)
    return _default_pipeline.ingest(file_path, tenant_id, fund_id, doc_type)
