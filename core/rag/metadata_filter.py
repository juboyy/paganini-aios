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
* **Document type** — ``doc_type``: regulamento, parecer, ata, contrato, …
* **Regulatory body** — ``regulatory_body``: CVM, ANBIMA, CETIP, BACEN

Usage::

    from core.rag.metadata_filter import MetadataFilter

    mf = MetadataFilter()
    criteria = mf.extract_from_query("Regulamento do FIDC Empírica 2024 emitido pela CVM")
    where_clause = mf.to_chroma_where(criteria)
    # → {"regulatory_body": {"$contains": "CVM"}, "doc_type": "regulamento"}

    # After retrieval, post-filter:
    filtered = mf.post_filter(chunks, criteria)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Optional

__all__ = [
    "FilterCriteria",
    "MetadataFilter",
]


# ---------------------------------------------------------------------------
# Extraction patterns
# ---------------------------------------------------------------------------

_DOC_TYPE_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("regulamento",  re.compile(r"\bregulamenta?\b|\bregulamento\b", re.I)),
    ("parecer",      re.compile(r"\bparecer\b|\bopini[aã]o legal\b", re.I)),
    ("ata",          re.compile(r"\bata\b|\bata de reuni[aã]o\b|\bassembl[eé]ia\b", re.I)),
    ("contrato",     re.compile(r"\bcontrato\b|\bacordo\b|\btermo\b", re.I)),
    ("prospecto",    re.compile(r"\bprospecto\b|\boffering memorandum\b", re.I)),
    ("relatorio",    re.compile(r"\brelat[oó]rio\b|\bbalancete\b|\bdemonstrac[aã]o\b", re.I)),
    ("comunicado",   re.compile(r"\bcomunicado\b|\baviso\b|\binforme\b", re.I)),
    ("laudo",        re.compile(r"\blaudo\b|\bvaluation\b|\bavalia[cç][aã]o\b", re.I)),
]

_REGULATORY_BODY_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("CVM",    re.compile(r"\bCVM\b|\bComiss[aã]o de Valores Mobili[aá]rios\b", re.I)),
    ("ANBIMA", re.compile(r"\bANBIMA\b", re.I)),
    ("BACEN",  re.compile(r"\bBACEN\b|\bBanco Central\b", re.I)),
    ("CETIP",  re.compile(r"\bCETIP\b|\bB3\b")),
    ("SUSEP",  re.compile(r"\bSUSEP\b", re.I)),
]

_FUND_NAME_PATTERNS: list[re.Pattern] = [
    re.compile(r"FIDC\s+([\w\s\-]+?)(?:\s+\d{4}|\s*[,;\.\|]|$)", re.I),
    re.compile(r"FUNDO\s+(?:DE\s+)?INVEST\w*\s+(?:EM\s+)?(?:DIREITOS?\s+CREDIT[OÓ]RIOS?\s+)?([\w\s\-]+?)(?:\s+\d{4}|\s*[,;\.\|]|$)", re.I),
    re.compile(r"FII\s+([\w\s\-]+?)(?:\s+\d{4}|\s*[,;\.\|]|$)", re.I),
]

_DATE_PATTERNS: list[re.Pattern] = [
    re.compile(r"\b(20\d{2}[-/][01]\d(?:[-/][0-3]\d)?)\b"),   # YYYY-MM or YYYY-MM-DD
    re.compile(r"\b(20\d{2})\b"),                               # year only
    re.compile(r"\b([0-3]\d[/-][01]\d[/-]20\d{2})\b"),         # DD/MM/YYYY
]

_VERSION_KEYWORDS = re.compile(
    r"vers[aã]o\s+([0-9]+(?:\.[0-9]+)*)|v\.?\s*([0-9]+(?:\.[0-9]+)*)", re.I
)

_PREFER_NEWEST_KEYWORDS = re.compile(
    r"\brecente\b|\bvigente\b|\batual\b|\b[uú]ltimo\b|\bnovo\b|\blatest\b|\bnewest\b", re.I
)


@dataclass
class FilterCriteria:
    """Structured filter criteria extracted from a user query or supplied directly.

    All fields are optional. ``None`` means "no constraint on this dimension".
    """

    doc_type: Optional[str] = None               # e.g. "regulamento"
    regulatory_body: Optional[str] = None        # e.g. "CVM" or "CVM, ANBIMA"
    fund_name: Optional[str] = None              # e.g. "Empírica"
    date_from: Optional[str] = None              # ISO-ish string e.g. "2024"
    version: Optional[str] = None               # e.g. "2.1"
    prefer_newest: bool = False                  # sort/filter toward newest doc
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


class MetadataFilter:
    """Extract filter criteria from natural-language queries and apply them.

    Works in two steps:

    1. :meth:`extract_from_query` — heuristic NLP to pull out filter signals.
    2. :meth:`to_chroma_where` — convert to a ChromaDB ``where`` dict.
    3. :meth:`post_filter` — Python-side filter for BM25 / merged results.
    4. :meth:`sort_by_recency` — push newest documents to the top.

    All operations are purely local — no LLM or network required.
    """

    # ------------------------------------------------------------------
    # Extraction
    # ------------------------------------------------------------------

    def extract_from_query(self, query: str) -> FilterCriteria:
        """Parse a natural-language query and return :class:`FilterCriteria`.

        Args:
            query: User's query string in Portuguese (or mixed EN/PT).

        Returns:
            :class:`FilterCriteria` populated from heuristic extraction.
        """
        criteria = FilterCriteria()

        # Document type
        for label, pat in _DOC_TYPE_PATTERNS:
            if pat.search(query):
                criteria.doc_type = label
                break

        # Regulatory body (may match multiple)
        bodies: list[str] = []
        for name, pat in _REGULATORY_BODY_PATTERNS:
            if pat.search(query):
                bodies.append(name)
        if bodies:
            criteria.regulatory_body = ", ".join(bodies)

        # Fund name
        for pat in _FUND_NAME_PATTERNS:
            m = pat.search(query)
            if m:
                raw = m.group(1).strip()
                cleaned = re.sub(r"\s+", " ", raw)
                criteria.fund_name = cleaned
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

        ChromaDB ``where`` supports ``$eq``, ``$ne``, ``$gt``, ``$lt``,
        ``$contains``, and ``$and`` / ``$or`` operators.

        Returns ``None`` when there are no constraints (avoids empty-dict
        errors in ChromaDB).
        """
        if criteria.is_empty():
            return None

        clauses: list[dict[str, Any]] = []

        if criteria.doc_type:
            clauses.append({"doc_type": {"$eq": criteria.doc_type}})

        if criteria.regulatory_body:
            # May be "CVM, ANBIMA" — use $contains on first match
            first_body = criteria.regulatory_body.split(",")[0].strip()
            clauses.append({"regulatory_body": {"$contains": first_body}})

        if criteria.fund_name:
            # Fuzzy match isn't natively supported — use $contains on keywords
            keywords = criteria.fund_name.split()[:3]  # first 3 words
            if keywords:
                clauses.append({"fund_name": {"$contains": keywords[0]}})

        if criteria.version:
            clauses.append({"version": {"$contains": criteria.version}})

        # date_from → filter metadata field if present
        if criteria.date_from:
            # Store as string comparison — works for YYYY and YYYY-MM formats
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

        Applied *after* retrieval (e.g. to BM25 results that weren't
        pre-filtered by ChromaDB).  Chunks without matching metadata fields
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

        Computes a recency bonus based on the ``doc_date`` or ``version``
        metadata field (lexicographic comparison works for ISO dates and
        YYYY-MM strings).  Blends with the existing retrieval score.

        Args:
            chunks: Chunk objects with a ``.score`` attribute.
            weight: How much weight (0–1) to give recency vs. relevance score.

        Returns:
            New list sorted by blended score (descending).  Original objects
            are mutated in-place (score updated).
        """
        if not chunks:
            return chunks

        # Collect all dates for normalisation
        dates: list[str] = []
        for c in chunks:
            meta = c.metadata if hasattr(c, "metadata") else {}
            d = meta.get("doc_date", "") or meta.get("version", "")
            dates.append(d)

        # Rank by date (lexicographic — works for YYYY, YYYY-MM, YYYY-MM-DD)
        unique_dates = sorted(set(d for d in dates if d), reverse=True)
        date_rank: dict[str, float] = {
            d: 1.0 - i / max(len(unique_dates) - 1, 1)
            for i, d in enumerate(unique_dates)
        }

        for chunk, d in zip(chunks, dates):
            recency = date_rank.get(d, 0.5)  # unknown → neutral
            chunk.score = (1 - weight) * chunk.score + weight * recency

        return sorted(chunks, key=lambda c: c.score, reverse=True)
