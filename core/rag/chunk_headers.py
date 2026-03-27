"""Contextual Chunk Headers — enrich every chunk with parent-document metadata.

Each chunk gets a structured header injected as both prepended text and
`metadata["contextual_header"]`, providing the LLM with document provenance
so it can always tell *where* a passage comes from.

Header format (Markdown comment-style, non-intrusive):
    [Documento: Regulamento FIDC XYZ | Seção: Capítulo III - Subordinação | Versão: 2024-03 | Tipo: regulamento]

Domain knowledge (doc types, regulatory bodies) is loaded from a
:class:`~core.rag.domain.DomainConfig` pack so the module remains
domain-agnostic.  Pass ``domain=None`` (or omit it) for a generic fallback
that still works for any corpus.

Usage::

    from core.rag.chunk_headers import build_contextual_header, annotate_chunk
    from core.rag.domain import load_domain

    domain = load_domain(pack_name="finance")  # or None for generic
    header = build_contextual_header(source="regulamentos/fidc_xyz.md",
                                     section="Capítulo III - Subordinação",
                                     text_snippet=chunk_text[:400],
                                     domain=domain)
    annotate_chunk(chunk, header)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

from core.rag.domain import DomainConfig, GENERIC_DOMAIN

__all__ = [
    "DocumentInfo",
    "extract_document_info",
    "build_contextual_header",
    "annotate_chunk",
    "inject_headers_into_chunks",
]


# ---------------------------------------------------------------------------
# Built-in fallback patterns (domain-agnostic, always applied when no domain)
# ---------------------------------------------------------------------------

_BUILTIN_TYPE_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("report",   re.compile(r"report|relat[oó]rio|demonstra[cç][aã]o", re.I)),
    ("contract", re.compile(r"contrato|contract|acordo|term[oa][._-]", re.I)),
    ("policy",   re.compile(r"policy|pol[ií]tica|manual|procedimento", re.I)),
    ("document", re.compile(r"document|documento", re.I)),
]

_VERSION_PATTERNS: list[re.Pattern] = [
    re.compile(r"vers[aã]o[:\s]+([0-9]{4}[-/][0-9]{2}(?:[-/][0-9]{2})?)", re.I),
    re.compile(r"v(?:ers[aã]o)?[:\s]*([0-9]+\.[0-9]+(?:\.[0-9]+)?)", re.I),
    re.compile(r"\b(20\d{2}[-/][01]\d(?:[-/][0-3]\d)?)\b"),   # ISO date
    re.compile(r"\b(20\d{2})\b"),                               # year only
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


# ---------------------------------------------------------------------------
# Domain-aware detection helpers
# ---------------------------------------------------------------------------

def _build_type_patterns(domain: DomainConfig) -> list[tuple[str, re.Pattern]]:
    """Compile doc-type patterns from *domain*, falling back to builtins."""
    if not domain.doc_type_patterns:
        return _BUILTIN_TYPE_PATTERNS

    compiled: list[tuple[str, re.Pattern]] = []
    for label, patterns in domain.doc_type_patterns.items():
        if patterns:
            combined = "|".join(re.escape(p) if not any(c in p for c in r"\.^$*+?{}[]|()")
                                else p for p in patterns)
            compiled.append((label, re.compile(combined, re.I)))
    return compiled


def _build_regulatory_patterns(domain: DomainConfig) -> list[tuple[str, re.Pattern]]:
    """Compile regulatory body patterns from *domain*."""
    compiled: list[tuple[str, re.Pattern]] = []
    if domain.regulatory_patterns:
        for body, patterns in domain.regulatory_patterns.items():
            if patterns:
                combined = "|".join(
                    re.escape(p) if not any(c in p for c in r"\.^$*+?{}[]|()")
                    else p for p in patterns
                )
                compiled.append((body, re.compile(combined, re.I)))
    elif domain.regulatory_bodies:
        # No explicit patterns — fall back to exact word boundary match
        for body in domain.regulatory_bodies:
            compiled.append((body, re.compile(rf"\b{re.escape(body)}\b", re.I)))
    return compiled


def _detect_doc_type(source: str, snippet: str, domain: DomainConfig) -> str:
    """Infer document type from filename + first 500 chars of text."""
    combined = source.lower() + " " + snippet[:500].lower()
    for label, pat in _build_type_patterns(domain):
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
    for pat in _FUND_PATTERNS:
        m = pat.search(snippet[:500])
        if m:
            raw = m.group(0).strip()
            return re.sub(r"[\s,;:]+$", "", raw)

    stem = re.sub(r"\.[^.]+$", "", source)
    stem = stem.replace("/", " / ")
    stem = re.sub(r"[_-]+", " ", stem)
    return stem.strip().title()


def _extract_regulatory_body(snippet: str, domain: DomainConfig) -> str:
    """Detect regulatory authority mentions using domain patterns."""
    patterns = _build_regulatory_patterns(domain)
    found: list[str] = []
    for name, pat in patterns:
        if pat.search(snippet[:1000]):
            found.append(name)
    return ", ".join(found)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_document_info(
    source: str,
    text: str,
    section: str = "",
    domain: Optional[DomainConfig] = None,
) -> DocumentInfo:
    """Parse document metadata from source path + full text content.

    Args:
        source: Relative file path (e.g. ``"regulamentos/fidc_xyz.md"``).
        text: Full document text (or at minimum the first 1 000 chars).
        section: Pre-parsed section/header title, if available.
        domain: Optional :class:`~core.rag.domain.DomainConfig` for domain
                vocabulary.  Defaults to the generic (empty) domain.

    Returns:
        :class:`DocumentInfo` populated from heuristic extraction.
    """
    d = domain or GENERIC_DOMAIN
    snippet = text[:1200]
    return DocumentInfo(
        source=source,
        doc_type=_detect_doc_type(source, snippet, d),
        fund_name=_extract_fund_name(source, snippet),
        version=_extract_version(source, snippet),
        section=section,
        regulatory_body=_extract_regulatory_body(snippet, d),
    )


def build_contextual_header(
    source: str,
    text: str = "",
    section: str = "",
    doc_info: Optional[DocumentInfo] = None,
    domain: Optional[DomainConfig] = None,
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
        domain: Optional :class:`~core.rag.domain.DomainConfig`.

    Returns:
        Formatted header string, e.g.
        ``"[Documento: FIDC XYZ | Seção: Cap. III | Versão: 2024-03 | Tipo: regulamento]"``
    """
    d = domain or GENERIC_DOMAIN
    if doc_info is None:
        doc_info = extract_document_info(source, text, section, domain=d)
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
    * Optionally prepends the header to ``chunk.text``.

    Args:
        chunk: A ``Chunk`` instance (duck-typed).
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
    domain: Optional[DomainConfig] = None,
) -> list:
    """Batch-annotate a list of chunks that share the same source document.

    Extracts :class:`DocumentInfo` once from the full document text and reuses
    it for every chunk, overriding only the ``section`` per chunk.

    Args:
        chunks: List of ``Chunk`` instances from a single document.
        source: Document source path.
        full_text: Complete document text (used for metadata extraction).
        prepend_to_text: Whether to prepend the header to each chunk's text.
        domain: Optional :class:`~core.rag.domain.DomainConfig`.

    Returns:
        The same list of chunks (mutated in-place) for chaining.
    """
    if not chunks:
        return chunks

    d = domain or GENERIC_DOMAIN
    doc_info = extract_document_info(source, full_text, section="", domain=d)

    for chunk in chunks:
        section = getattr(chunk, "section", "") or chunk.metadata.get("section", "")
        header = build_contextual_header(
            source=source,
            section=section,
            doc_info=doc_info,
            domain=d,
        )
        annotate_chunk(chunk, header, prepend_to_text=prepend_to_text)

    return chunks
