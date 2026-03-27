"""Contextual Chunk Headers — enrich every chunk with parent-document metadata.

Each chunk gets a structured header injected as both prepended text and
`metadata["contextual_header"]`, providing the LLM with document provenance
so it can always tell *where* a passage comes from.

Header format (Markdown comment-style, non-intrusive):
    [Documento: Regulamento FIDC XYZ | Seção: Capítulo III - Subordinação | Versão: 2024-03 | Tipo: regulamento]

Usage::

    from core.rag.chunk_headers import build_contextual_header, annotate_chunk

    header = build_contextual_header(source="regulamentos/fidc_xyz.md",
                                     section="Capítulo III - Subordinação",
                                     text_snippet=chunk_text[:400])
    annotate_chunk(chunk, header)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

__all__ = [
    "DocumentInfo",
    "extract_document_info",
    "build_contextual_header",
    "annotate_chunk",
    "inject_headers_into_chunks",
]


# ---------------------------------------------------------------------------
# Document type taxonomy — Portuguese-first
# ---------------------------------------------------------------------------

_TYPE_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("regulamento",  re.compile(r"regulamento|reg[._-]", re.I)),
    ("parecer",      re.compile(r"parecer|opini[aã]o[._-]legal|legal[._-]opinion", re.I)),
    ("ata",          re.compile(r"\bata\b|ata[._-]reuniao|ata[._-]assembl", re.I)),
    ("contrato",     re.compile(r"contrato|acordo|term[oa][._-]", re.I)),
    ("prospecto",    re.compile(r"prospecto|offering[._-]memorandum", re.I)),
    ("relatorio",    re.compile(r"relatorio|report|demonstra[cç][aã]o", re.I)),
    ("comunicado",   re.compile(r"comunicado|aviso|informe", re.I)),
    ("politica",     re.compile(r"politica|policy|manual|procedimento", re.I)),
    ("laudo",        re.compile(r"laudo|valuation|avalia[cç][aã]o", re.I)),
]

_VERSION_PATTERNS: list[re.Pattern] = [
    re.compile(r"vers[aã]o[:\s]+([0-9]{4}[-/][0-9]{2}(?:[-/][0-9]{2})?)", re.I),
    re.compile(r"v(?:ers[aã]o)?[:\s]*([0-9]+\.[0-9]+(?:\.[0-9]+)?)", re.I),
    re.compile(r"\b(20\d{2}[-/][01]\d(?:[-/][0-3]\d)?)\b"),           # ISO date
    re.compile(r"\b(20\d{2})\b"),                                        # year only
]

_FUND_PATTERNS: list[re.Pattern] = [
    re.compile(r"FIDC\s+[\w\s]+?(?=\s*[|\n]|$)", re.I),
    re.compile(r"FI[CDQ]C?\s+(?:[A-Z][A-Za-z\s]+){1,4}", re.I),
    re.compile(r"FUNDO\s+(?:DE\s+)?(?:INVEST\w+\s+){1,2}[\w\s]+?(?=\s*[|\n]|$)", re.I),
]


@dataclass
class DocumentInfo:
    """Parsed metadata extracted from a document's source path and content snippet."""

    source: str
    doc_type: str = "documento"
    fund_name: str = ""
    version: str = ""
    section: str = ""
    regulatory_body: str = ""
    extra: dict = field(default_factory=dict)

    def to_header(self) -> str:
        """Render as a single-line contextual header string."""
        parts: list[str] = []
        name = self.fund_name or self.source
        parts.append(f"Documento: {name}")
        if self.section:
            parts.append(f"Seção: {self.section}")
        if self.version:
            parts.append(f"Versão: {self.version}")
        parts.append(f"Tipo: {self.doc_type}")
        if self.regulatory_body:
            parts.append(f"Órgão: {self.regulatory_body}")
        return "[" + " | ".join(parts) + "]"


def _detect_doc_type(source: str, snippet: str) -> str:
    """Infer document type from filename + first 500 chars of text."""
    combined = source.lower() + " " + snippet[:500].lower()
    for label, pat in _TYPE_PATTERNS:
        if pat.search(combined):
            return label
    return "documento"


def _extract_version(source: str, snippet: str) -> str:
    """Try to find a version/date string in source path or text snippet."""
    combined = source + " " + snippet[:800]
    for pat in _VERSION_PATTERNS:
        m = pat.search(combined)
        if m:
            return m.group(1)
    return ""


def _extract_fund_name(source: str, snippet: str) -> str:
    """Extract fund name from path stem or text header."""
    # Try to find a formal fund name in the snippet first
    for pat in _FUND_PATTERNS:
        m = pat.search(snippet[:500])
        if m:
            raw = m.group(0).strip()
            # Clean trailing punctuation
            return re.sub(r"[\s,;:]+$", "", raw)

    # Fall back: derive a readable name from the file stem
    stem = re.sub(r"\.[^.]+$", "", source)   # drop extension
    stem = stem.replace("/", " / ")
    stem = re.sub(r"[_-]+", " ", stem)
    return stem.strip().title()


def _extract_regulatory_body(snippet: str) -> str:
    """Detect regulatory authority mentions."""
    bodies = {
        "CVM":    re.compile(r"\bCVM\b"),
        "ANBIMA": re.compile(r"\bANBIMA\b"),
        "BACEN":  re.compile(r"\bBACEN\b|\bBanco Central\b", re.I),
        "CETIP":  re.compile(r"\bCETIP\b|\bB3\b"),
        "SUSEP":  re.compile(r"\bSUSEP\b"),
    }
    found: list[str] = []
    for name, pat in bodies.items():
        if pat.search(snippet[:1000]):
            found.append(name)
    return ", ".join(found)


def extract_document_info(source: str, text: str, section: str = "") -> DocumentInfo:
    """Parse document metadata from source path + full text content.

    Args:
        source: Relative file path (e.g. ``"regulamentos/fidc_xyz.md"``).
        text: Full document text (or at minimum the first 1 000 chars).
        section: Pre-parsed section/header title, if available.

    Returns:
        :class:`DocumentInfo` populated from heuristic extraction.
    """
    snippet = text[:1200]
    return DocumentInfo(
        source=source,
        doc_type=_detect_doc_type(source, snippet),
        fund_name=_extract_fund_name(source, snippet),
        version=_extract_version(source, snippet),
        section=section,
        regulatory_body=_extract_regulatory_body(snippet),
    )


def build_contextual_header(
    source: str,
    text: str = "",
    section: str = "",
    doc_info: Optional[DocumentInfo] = None,
) -> str:
    """Build the contextual header string for a chunk.

    Accepts either a pre-built :class:`DocumentInfo` *or* raw ``source`` +
    ``text`` arguments (in which case :func:`extract_document_info` is called
    automatically).

    Args:
        source: File path for the source document.
        text: Document text (used when *doc_info* is not provided).
        section: Section / heading for this specific chunk.
        doc_info: Pre-built :class:`DocumentInfo` (skip re-extraction).

    Returns:
        Formatted header string, e.g.
        ``"[Documento: FIDC XYZ | Seção: Cap. III | Versão: 2024-03 | Tipo: regulamento]"``
    """
    if doc_info is None:
        doc_info = extract_document_info(source, text, section)
    elif section:
        doc_info = DocumentInfo(
            source=doc_info.source,
            doc_type=doc_info.doc_type,
            fund_name=doc_info.fund_name,
            version=doc_info.version,
            section=section,
            regulatory_body=doc_info.regulatory_body,
            extra=doc_info.extra,
        )
    return doc_info.to_header()


def annotate_chunk(chunk, header: str, prepend_to_text: bool = True) -> None:
    """Attach a contextual header to a :class:`~core.rag.pipeline.Chunk`.

    Mutates *chunk* in-place:
    * Sets ``chunk.metadata["contextual_header"]`` to the header string.
    * Optionally prepends the header to ``chunk.text`` so it travels with
      the text into the LLM context window.

    Args:
        chunk: A ``Chunk`` instance (duck-typed — only needs ``.metadata``
               and ``.text``).
        header: Header string from :func:`build_contextual_header`.
        prepend_to_text: If ``True`` (default), prepend the header followed
                         by a blank line to ``chunk.text``.
    """
    chunk.metadata["contextual_header"] = header
    if prepend_to_text:
        chunk.text = f"{header}\n\n{chunk.text}"


def inject_headers_into_chunks(
    chunks: list,
    source: str,
    full_text: str,
    prepend_to_text: bool = True,
) -> list:
    """Batch-annotate a list of chunks that share the same source document.

    Extracts :class:`DocumentInfo` once from the full document text and reuses
    it for every chunk, overriding only the ``section`` per chunk.

    Args:
        chunks: List of ``Chunk`` instances from a single document.
        source: Document source path.
        full_text: Complete document text (used for metadata extraction).
        prepend_to_text: Whether to prepend the header to each chunk's text.

    Returns:
        The same list of chunks (mutated in-place) for chaining.
    """
    if not chunks:
        return chunks

    # Extract once — expensive only for the heuristics, cheap for the loop
    doc_info = extract_document_info(source, full_text, section="")

    for chunk in chunks:
        section = getattr(chunk, "section", "") or chunk.metadata.get("section", "")
        header = build_contextual_header(
            source=source,
            section=section,
            doc_info=doc_info,
        )
        annotate_chunk(chunk, header, prepend_to_text=prepend_to_text)

    return chunks
