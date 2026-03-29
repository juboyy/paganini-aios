"""Paganini Guardrail Gate — Regulatory Citation Enforcement.

Ensures that LLM responses about regulatory topics cite specific,
verifiable legal instruments.  Hallucinated or vague regulatory answers
are a hard compliance liability in Brazilian investment funds.

Detection pipeline:
  1. Classify query as regulatory based on keyword matching.
  2. If regulatory: scan response for citation patterns.
  3. If no citations found: block with explanation.
  4. Optionally: validate that cited articles exist in context (strict mode).

Brazilian regulatory patterns recognised:
  - Resolução CVM nº X / Resolução X
  - Instrução CVM nº X / Instrução Normativa nº X
  - Art. X / Artigo X
  - Deliberação CVM nº X
  - ANBIMA Código nº X
  - Lei nº X / Lei Complementar nº X
  - Circular BCB nº X / Resolução BCB nº X (Banco Central)
  - Nota Técnica CVM nº X
"""

from __future__ import annotations

import logging
import re
from typing import NamedTuple

from core.guardrails.base import GateResult, GuardrailGate

logger = logging.getLogger("paganini.guardrails.regulatory_citation")

# ---------------------------------------------------------------------------
# Regulatory topic keywords (Portuguese + common abbreviations)
# ---------------------------------------------------------------------------

_REGULATORY_KEYWORDS: list[str] = [
    # Regulators
    r"\bCVM\b",
    r"\bANBIMA\b",
    r"\bBACEN\b",
    r"\bBCB\b",
    r"\bSusep\b",
    r"\bPrevic\b",
    r"\bCMN\b",
    # Document types
    r"\bResolu[cç][aã]o\b",
    r"\bInstru[cç][aã]o\b",
    r"\bNormativo\b",
    r"\bNorma\b",
    r"\bDelibera[cç][aã]o\b",
    r"\bCircular\b",
    r"\bNota\s+T[eé]cnica\b",
    # Legal concepts
    r"\bcompliance\b",
    r"\bregula[cç][aã]o\b",
    r"\bregulament[ao]\b",
    r"\bnormativa?\b",
    r"\blegisla[cç][aã]o\b",
    r"\bartigo\b",
    r"\bparagrafo\b",
    r"\bpar[aá]grafo\b",
    r"\binciso\b",
    # Finance-specific regulatory terms
    r"\bFIDC\b",
    r"\bFII\b",
    r"\bfundo\s+de\s+investimento\b",
    r"\bgestor[a]?\b",
    r"\badministrador[a]?\b",
    r"\bcustodiante\b",
    r"\bPLD\b",
    r"\bAML\b",
    r"\bKYC\b",
    r"\bdue\s+diligence\b",
    r"\bprov[aã]o\b",
    r"\bprospec[ct]o\b",
    r"\bregulamenta[cç][aã]o\b",
    r"\bprospecto\b",
    r"\bcotas?\b",
    r"\b(?:limite|concentra[cç][aã]o)\s+(?:de\s+)?(?:risco|carteira|cedente)\b",
]

_REGULATORY_KW_RE = re.compile(
    "|".join(_REGULATORY_KEYWORDS),
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Citation patterns (what counts as a valid citation in the response)
# ---------------------------------------------------------------------------

_CITATION_PATTERNS: list[tuple[re.Pattern, str]] = [
    (
        re.compile(r"Instru[cç][aã]o\s+(?:CVM\s+)?n[oº°\.]\s*\d+", re.IGNORECASE),
        "Instrução CVM",
    ),
    (
        re.compile(r"Resolu[cç][aã]o\s+(?:CVM\s+|CMN\s+|BCB\s+)?n[oº°\.]\s*\d+", re.IGNORECASE),
        "Resolução",
    ),
    (
        re.compile(r"Delibera[cç][aã]o\s+CVM\s+n[oº°\.]\s*\d+", re.IGNORECASE),
        "Deliberação CVM",
    ),
    (
        re.compile(r"Art(?:igo)?\.?\s*\d+(?:[oº°])?\b", re.IGNORECASE),
        "Artigo",
    ),
    (
        re.compile(r"ANBIMA\s+\w+\s+n[oº°\.]\s*\d+", re.IGNORECASE),
        "ANBIMA",
    ),
    (
        re.compile(r"CVM\s+\d{2,4}\b"),
        "CVM nº",
    ),
    (
        re.compile(r"Lei\s+(?:Complementar\s+)?n[oº°\.]\s*\d+", re.IGNORECASE),
        "Lei",
    ),
    (
        re.compile(r"Circular\s+(?:BCB|BACEN)\s+n[oº°\.]\s*\d+", re.IGNORECASE),
        "Circular BCB",
    ),
    (
        re.compile(r"Nota\s+T[eé]cnica\s+CVM\s+n[oº°\.]\s*\d+", re.IGNORECASE),
        "Nota Técnica CVM",
    ),
    (
        re.compile(r"Instru[cç][aã]o\s+Normativa\s+n[oº°\.]\s*\d+", re.IGNORECASE),
        "Instrução Normativa",
    ),
    (
        re.compile(r"Par[aá]grafo\s+[ÚU]nico\b|§\s*\d+[oº°]?\b", re.IGNORECASE),
        "Parágrafo",
    ),
]


class FoundCitation(NamedTuple):
    pattern_label: str
    matched_text: str


def _find_citations(text: str) -> list[FoundCitation]:
    """Return all regulatory citations found in *text*."""
    found: list[FoundCitation] = []
    for pattern, label in _CITATION_PATTERNS:
        for m in pattern.finditer(text):
            found.append(FoundCitation(pattern_label=label, matched_text=m.group()))
    return found


def _is_regulatory_query(query: str) -> bool:
    """Return True if the query appears to be about a regulatory topic."""
    return bool(_REGULATORY_KW_RE.search(query))


# ---------------------------------------------------------------------------
# Gate implementation
# ---------------------------------------------------------------------------


class RegulatoryCitationGate(GuardrailGate):
    """Post-LLM gate: enforces citation of specific regulations.

    If the query is determined to be regulatory in nature, the response
    **must** contain at least one recognisable citation pattern.

    Expected context keys:
      - ``context["response"]``: LLM-generated response.
      - ``context.get("is_regulatory")``: Optional bool override.  If
        provided, it takes precedence over keyword detection.

    Args:
        min_citations: Minimum number of distinct citations required
            (default 1).
        strict: If True, also require at least one citation that references
            a specific article number (not just a document number).
    """

    def __init__(
        self,
        min_citations: int = 1,
        strict: bool = False,
    ) -> None:
        self._min_citations = min_citations
        self._strict = strict

    @property
    def name(self) -> str:
        return "regulatory_citation"

    @property
    def description(self) -> str:
        return "Ensures regulatory responses cite specific laws/resolutions"

    def check(self, query: str, context: dict) -> GateResult:
        """Verify regulatory queries are properly cited.

        Returns:
            GateResult — passed=True for non-regulatory queries, or for
            regulatory queries that include sufficient citations.
        """
        response: str = context.get("response", "")

        # Determine if this is a regulatory context
        is_regulatory: bool
        if "is_regulatory" in context:
            is_regulatory = bool(context["is_regulatory"])
        else:
            is_regulatory = _is_regulatory_query(query)

        if not is_regulatory:
            return GateResult(
                gate_name=self.name,
                passed=True,
                reason="Query is not regulatory — citation check skipped",
                details={"is_regulatory": False},
            )

        if not response:
            return GateResult(
                gate_name=self.name,
                passed=False,
                reason="Regulatory query but no response to check",
                details={"is_regulatory": True},
            )

        citations = _find_citations(response)
        citation_count = len(citations)

        logger.debug(
            "Regulatory citation check: found=%d required=%d strict=%s",
            citation_count,
            self._min_citations,
            self._strict,
        )

        # Strict mode: require at least one article-level citation
        has_article = any(c.pattern_label == "Artigo" for c in citations)
        strict_ok = (not self._strict) or has_article

        passed = citation_count >= self._min_citations and strict_ok

        if passed:
            return GateResult(
                gate_name=self.name,
                passed=True,
                reason=f"Found {citation_count} regulatory citation(s)",
                details={
                    "is_regulatory": True,
                    "citation_count": citation_count,
                    "citations": [c.matched_text for c in citations[:10]],
                    "citation_types": list({c.pattern_label for c in citations}),
                },
            )

        # Build a helpful failure reason
        if citation_count == 0:
            reason = (
                "Regulatory response must cite specific regulations "
                "(e.g., Resolução CVM nº 175, Art. 42)"
            )
        elif citation_count < self._min_citations:
            reason = (
                f"Regulatory response requires at least {self._min_citations} "
                f"citation(s) but only {citation_count} found"
            )
        else:  # strict mode failed
            reason = (
                "Regulatory response must include at least one article-level "
                "citation (Art. X or Artigo X)"
            )

        return GateResult(
            gate_name=self.name,
            passed=False,
            reason=reason,
            details={
                "is_regulatory": True,
                "citation_count": citation_count,
                "citations_found": [c.matched_text for c in citations],
                "min_required": self._min_citations,
                "strict_mode": self._strict,
                "has_article_citation": has_article,
            },
        )
