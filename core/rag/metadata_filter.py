"""Dynamic Metadata Filtering — extract filter criteria from queries and apply them
to ChromaDB where-clauses and post-retrieval result sets.

Two-phase filtering strategy:

1. **Pre-filter** — build a ChromaDB ``where`` dict from extracted criteria and
   pass it with the vector query so only matching documents are searched.
2. **Post-filter** — re-apply the same criteria to any result list (e.g. BM25
   results) as a pure Python pass-through.

Filter dimensions supported:

* **Fund name / ID** — ``fundo_nome``, ``fundo_id``
* **Document date / version** — ``doc_date``, prefer newest
* **Document type** — ``doc_type``: loaded from domain pack
* **Regulatory body** — ``regulatory_body``: loaded from domain pack

Domain knowledge (regulatory bodies, doc types) is loaded from a
:class:`~core.rag.domain.DomainConfig` pack.  Pass ``domain=None`` for a
generic filter that still handles dates, versions, and free-text doc_type.

Usage::

    from core.rag.metadata_filter import MetadataFilter
    from core.rag.domain import load_domain

    domain = load_domain(pack_name="finance")
    mf = MetadataFilter(domain=domain)
    criteria = mf.extract_from_query("Regulamento do FIDC Empírica 2024 emitido pela CVM")
    where_clause = mf.to_chroma_where(criteria)

    # After retrieval, post-filter:
    filtered = mf.post_filter(chunks, criteria)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Optional

from core.rag.domain import DomainConfig, GENERIC_DOMAIN

__all__ = [
    "FilterCriteria",
    "MetadataFilter",
]


# ---------------------------------------------------------------------------
# Built-in doc-type patterns (domain-agnostic fallback)
# ---------------------------------------------------------------------------

_BUILTIN_DOC_TYPE_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("report",   re.compile(r"\breport\b|\brelat[oó]rio\b|\bbalancete\b|\bdemonstrac[aã]o\b", re.I)),
    ("contract", re.compile(r"\bcontrato\b|\bcontract\b|\bacordo\b|\btermo\b", re.I)),
    ("policy",   re.compile(r"\bpolicy\b|\bpol[ií]tica\b|\bmanual\b|\bprocedimento\b", re.I)),
]

# ---------------------------------------------------------------------------
# Fund / entity name patterns (generic enough for any corpus)
# ---------------------------------------------------------------------------

_FUND_NAME_PATTERNS: list[re.Pattern] = [
    re.compile(r"FIDC\s+([\w\s\-]+?)(?:\s+\d{4}|\s*[,;\.\|]|$)", re.I),
    re.compile(
        r"FUNDO\s+(?:DE\s+)?INVEST\w*\s+(?:EM\s+)?(?:DIREITOS?\s+CREDIT[OÓ]RIOS?\s+)?"
        r"([\w\s\-]+?)(?:\s+\d{4}|\s*[,;\.\|]|$)",
        re.I,
    ),
    re.compile(r"FII\s+([\w\s\-]+?)(?:\s+\d{4}|\s*[,;\.\|]|$)", re.I),
]

# ---------------------------------------------------------------------------
# Date / version patterns
# ---------------------------------------------------------------------------

_DATE_PATTERNS: list[re.Pattern] = [
    re.compile(r"\b(20\d{2}[-/][01]\d(?:[-/][0-3]\d)?)\b"),   # YYYY-MM or YYYY-MM-DD
    re.compile(r"\b(20\d{2})\b"),                               # year only
    re.compile(r"\b([0-3]\d[/-][01]\d[/-]20\d{2})\b"),         # DD/MM/YYYY
]

_VERSION_KEYWORDS = re.compile(
    r"vers[aã]o\s+([0-9]+(?:\.[0-9]+)*)|v\.?\s*([0-9]+(?:\.[0-9]+)*)", re.I
)

_PREFER_NEWEST_KEYWORDS = re.compile(
    r"\brecente\b|\bvigente\b|\batual\b|\b[uú]ltimo\b|\bnovo\b|\blatest\b|\bnewest\b|\bcurrent\b",
    re.I,
)


# ---------------------------------------------------------------------------
# Helper: compile domain doc-type patterns
# ---------------------------------------------------------------------------

def _compile_doc_type_patterns(domain: DomainConfig) -> list[tuple[str, re.Pattern]]:
    if domain.doc_type_patterns:
        compiled: list[tuple[str, re.Pattern]] = []
        for label, patterns in domain.doc_type_patterns.items():
            if patterns:
                combined = "|".join(
                    re.escape(p) if not any(c in p for c in r"\.^$*+?{}[]|()")
                    else p
                    for p in patterns
                )
                # Wrap each alternative in word-boundary anchors where possible
                compiled.append((label, re.compile(combined, re.I)))
        return compiled
    return _BUILTIN_DOC_TYPE_PATTERNS


def _compile_regulatory_patterns(domain: DomainConfig) -> list[tuple[str, re.Pattern]]:
    compiled: list[tuple[str, re.Pattern]] = []
    if domain.regulatory_patterns:
        for body, patterns in domain.regulatory_patterns.items():
            if patterns:
                combined = "|".join(
                    re.escape(p) if not any(c in p for c in r"\.^$*+?{}[]|()")
                    else p
                    for p in patterns
                )
                compiled.append((body, re.compile(combined, re.I)))
    elif domain.regulatory_bodies:
        for body in domain.regulatory_bodies:
            compiled.append((body, re.compile(rf"\b{re.escape(body)}\b", re.I)))
    return compiled


# ---------------------------------------------------------------------------
# FilterCriteria dataclass
# ---------------------------------------------------------------------------

@dataclass
class FilterCriteria:
    """Structured filter criteria extracted from a user query or supplied directly.

    All fields are optional. ``None`` means "no constraint on this dimension".
    """

    doc_type: Optional[str] = None
    regulatory_body: Optional[str] = None
    fund_name: Optional[str] = None
    date_from: Optional[str] = None
    version: Optional[str] = None
    prefer_newest: bool = False
    extra: dict[str, Any] = field(default_factory=dict)

    def is_empty(self) -> bool:
        """Return True when no filter dimension is set (pass-through)."""
        return (
            self.doc_type is None
            and self.regulatory_body is None
            and self.fund_name is None
            and self.date_from is None
            and self.version is None
            and not self.extra
        )


# ---------------------------------------------------------------------------
# MetadataFilter
# ---------------------------------------------------------------------------

class MetadataFilter:
    """Extract filter criteria from natural-language queries and apply them.

    Works in two steps:

    1. :meth:`extract_from_query` — heuristic NLP to pull out filter signals.
    2. :meth:`to_chroma_where` — convert to a ChromaDB ``where`` dict.
    3. :meth:`post_filter` — Python-side filter for BM25 / merged results.
    4. :meth:`sort_by_recency` — push newest documents to the top.

    All operations are purely local — no LLM or network required.

    Args:
        domain: Optional :class:`~core.rag.domain.DomainConfig` for domain
                vocabulary (regulatory bodies, doc types).  When ``None``,
                falls back to generic built-in patterns.
    """

    def __init__(self, domain: Optional[DomainConfig] = None):
        self._domain = domain or GENERIC_DOMAIN
        self._doc_type_patterns = _compile_doc_type_patterns(self._domain)
        self._regulatory_patterns = _compile_regulatory_patterns(self._domain)

    # ------------------------------------------------------------------
    # Extraction
    # ------------------------------------------------------------------

    def extract_from_query(self, query: str) -> FilterCriteria:
        """Parse a natural-language query and return :class:`FilterCriteria`.

        Args:
            query: User's query string.

        Returns:
            :class:`FilterCriteria` populated from heuristic extraction.
        """
        criteria = FilterCriteria()

        # Document type
        for label, pat in self._doc_type_patterns:
            if pat.search(query):
                criteria.doc_type = label
                break

        # Regulatory body (may match multiple)
        bodies: list[str] = []
        for name, pat in self._regulatory_patterns:
            if pat.search(query):
                bodies.append(name)
        if bodies:
            criteria.regulatory_body = ", ".join(bodies)

        # Fund name
        for pat in _FUND_NAME_PATTERNS:
            m = pat.search(query)
            if m:
                raw = m.group(1).strip()
                criteria.fund_name = re.sub(r"\s+", " ", raw)
                break

        # Date / year
        for pat in _DATE_PATTERNS:
            m = pat.search(query)
            if m:
                criteria.date_from = m.group(1)
                break

        # Version
        vm = _VERSION_KEYWORDS.search(query)
        if vm:
            criteria.version = vm.group(1) or vm.group(2)

        # Prefer newest
        if _PREFER_NEWEST_KEYWORDS.search(query):
            criteria.prefer_newest = True

        return criteria

    # ------------------------------------------------------------------
    # ChromaDB where clause
    # ------------------------------------------------------------------

    def to_chroma_where(self, criteria: FilterCriteria) -> Optional[dict[str, Any]]:
        """Convert :class:`FilterCriteria` to a ChromaDB ``where`` dict.

        Returns ``None`` when there are no constraints.
        """
        if criteria.is_empty():
            return None

        clauses: list[dict[str, Any]] = []

        if criteria.doc_type:
            clauses.append({"doc_type": {"$eq": criteria.doc_type}})

        if criteria.regulatory_body:
            first_body = criteria.regulatory_body.split(",")[0].strip()
            clauses.append({"regulatory_body": {"$contains": first_body}})

        if criteria.fund_name:
            keywords = criteria.fund_name.split()[:3]
            if keywords:
                clauses.append({"fund_name": {"$contains": keywords[0]}})

        if criteria.version:
            clauses.append({"version": {"$contains": criteria.version}})

        if criteria.date_from:
            clauses.append({"doc_date": {"$gte": criteria.date_from}})

        if not clauses:
            return None
        if len(clauses) == 1:
            return clauses[0]
        return {"$and": clauses}

    # ------------------------------------------------------------------
    # Post-retrieval filter
    # ------------------------------------------------------------------

    def post_filter(self, chunks: list, criteria: FilterCriteria) -> list:
        """Filter a chunk list using :class:`FilterCriteria`.

        Applied *after* retrieval.  Chunks without matching metadata fields
        pass through — only chunks with *conflicting* metadata are removed.

        Args:
            chunks: Retrieved :class:`~core.rag.pipeline.Chunk` objects.
            criteria: Criteria from :meth:`extract_from_query`.

        Returns:
            Filtered list; original list is not mutated.
        """
        if criteria.is_empty():
            return chunks

        result: list = []
        for chunk in chunks:
            meta = chunk.metadata if hasattr(chunk, "metadata") else {}

            if criteria.doc_type:
                stored = meta.get("doc_type", "")
                if stored and stored != criteria.doc_type:
                    continue

            if criteria.regulatory_body:
                stored = meta.get("regulatory_body", "")
                if stored:
                    bodies = [b.strip() for b in criteria.regulatory_body.split(",")]
                    if not any(b in stored for b in bodies):
                        continue

            if criteria.fund_name:
                stored = meta.get("fund_name", "") or meta.get("source", "")
                if stored:
                    keywords = criteria.fund_name.lower().split()
                    if not any(kw in stored.lower() for kw in keywords):
                        continue

            if criteria.date_from:
                stored = meta.get("doc_date", "") or meta.get("version", "")
                if stored and stored < criteria.date_from:
                    continue

            result.append(chunk)

        return result

    # ------------------------------------------------------------------
    # Recency sorting
    # ------------------------------------------------------------------

    @staticmethod
    def sort_by_recency(chunks: list, weight: float = 0.2) -> list:
        """Boost score of chunks from newer documents.

        Args:
            chunks: Chunk objects with a ``.score`` attribute.
            weight: How much weight (0–1) to give recency vs. relevance score.

        Returns:
            New list sorted by blended score (descending).
        """
        if not chunks:
            return chunks

        dates: list[str] = []
        for c in chunks:
            meta = c.metadata if hasattr(c, "metadata") else {}
            d = meta.get("doc_date", "") or meta.get("version", "")
            dates.append(d)

        unique_dates = sorted(set(d for d in dates if d), reverse=True)
        date_rank: dict[str, float] = {
            d: 1.0 - i / max(len(unique_dates) - 1, 1)
            for i, d in enumerate(unique_dates)
        }

        for chunk, d in zip(chunks, dates):
            recency = date_rank.get(d, 0.5)
            chunk.score = (1 - weight) * chunk.score + weight * recency

        return sorted(chunks, key=lambda c: c.score, reverse=True)
