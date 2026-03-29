"""Paganini Guardrail Gate — Output Validation.

Validates that structured LLM outputs (reports, analyses) meet format,
completeness, and content-quality requirements before being returned to
the user or stored.

Checks performed (all configurable):
  1. **Required sections** — headings/labels that must appear in the output.
  2. **Minimum length** — output must exceed a character threshold.
  3. **Forbidden patterns** — hedging language, AI self-references, etc.
  4. **Regulatory citations** — outputs of type "regulatory" must cite at
     least one specific resolution/instruction.

The gate does NOT block by default on minor issues; a severity map controls
whether a failure is a hard block or a warning.  For production finance,
section-missing and regulatory-citation failures are hard blocks; length
and forbidden-pattern violations are configurable per deployment.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

from core.guardrails.base import GateResult, GuardrailGate

logger = logging.getLogger("paganini.guardrails.output_validation")

# ---------------------------------------------------------------------------
# Default configuration sets per output type
# ---------------------------------------------------------------------------

# Regex patterns for regulatory citations (Brazilian finance)
_REGULATORY_CITATION_RE = re.compile(
    r"""
    (?:
        Instrução\s+(?:CVM\s+)?n[oº°]?\s*\d+   |
        Resolução\s+(?:CVM\s+)?n[oº°]?\s*\d+   |
        Art(?:igo)?\.?\s*\d+                    |
        ANBIMA\s+\w+\s+n[oº°]?\s*\d+            |
        CVM\s+\d+                               |
        Deliberação\s+CVM\s+n[oº°]?\s*\d+       |
        Instrução\s+Normativa\s+n[oº°]?\s*\d+   |
        Lei\s+(?:Complementar\s+)?n[oº°]?\s*\d+
    )
    """,
    re.VERBOSE | re.IGNORECASE,
)

# Forbidden language patterns (Portuguese + English)
_DEFAULT_FORBIDDEN: list[tuple[str, str]] = [
    # AI self-references
    (r"\bcomo\s+(?:uma?\s+)?IA\b", "AI self-reference (PT)"),
    (r"\bcomo\s+(?:um\s+)?modelo\s+de\s+linguagem\b", "LLM self-reference (PT)"),
    (r"\bas\s+an\s+AI\b", "AI self-reference (EN)"),
    (r"\bas\s+a\s+language\s+model\b", "LLM self-reference (EN)"),
    (r"\bI\s+(?:am|was)\s+(?:an?\s+)?AI\b", "AI identity (EN)"),
    # Unhelpful hedging
    (r"\bnão\s+(?:sei|tenho\s+certeza)\b", "Uncertainty hedge (PT)"),
    (r"\bnão\s+posso\s+(?:afirmar|garantir)\b", "Cannot confirm (PT)"),
    (r"\bI\s+don['']t\s+know\b", "Uncertainty hedge (EN)"),
    (r"\bI\s+(?:cannot|can't)\s+(?:confirm|guarantee)\b", "Cannot confirm (EN)"),
    # Excessive disclaimers typical of hallucinating models
    (r"\bpoderia\s+estar\s+errado\b", "Self-doubt hedge (PT)"),
    (r"\bpossibly\s+(?:incorrect|wrong)\b", "Self-doubt hedge (EN)"),
    # Blank/empty answers
    (r"^\s*(?:N/A|Sem\s+informação|Não\s+disponível\.?)\s*$", "Empty answer placeholder"),
]

# Default required sections for common output types
_DEFAULT_SECTIONS: dict[str, list[str]] = {
    "report": [
        r"##?\s*(?:Resumo|Sumário|Executive\s+Summary)",
        r"##?\s*(?:Análise|Analysis|Detalhes)",
        r"##?\s*(?:Conclusão|Recomendações?|Conclusion)",
    ],
    "regulatory": [
        r"##?\s*(?:Contexto\s+Regulatório|Regulação\s+Aplicável|Regulatory\s+Context)",
        r"##?\s*(?:Análise|Fundamentação|Analysis)",
        r"##?\s*(?:Conclusão|Parecer|Conclusion)",
    ],
    "risk": [
        r"##?\s*(?:Identificação\s+de\s+Riscos?|Risk\s+Identification)",
        r"##?\s*(?:Avaliação|Assessment|Scoring)",
        r"##?\s*(?:Mitigação|Mitigations?|Recomendações?)",
    ],
    "analysis": [
        r"##?\s*(?:Contexto|Context|Background)",
        r"##?\s*(?:Análise|Analysis|Detalhes)",
        r"##?\s*(?:Conclusão|Conclusion|Summary)",
    ],
}

_DEFAULT_MIN_LENGTH: dict[str, int] = {
    "report": 300,
    "regulatory": 200,
    "risk": 200,
    "analysis": 150,
    "default": 50,
}


# ---------------------------------------------------------------------------
# Validation result detail
# ---------------------------------------------------------------------------


@dataclass
class ValidationDetail:
    """Breakdown of which checks passed/failed."""

    missing_sections: list[str] = field(default_factory=list)
    forbidden_matches: list[dict[str, str]] = field(default_factory=list)  # {pattern, label}
    length_ok: bool = True
    actual_length: int = 0
    min_length: int = 0
    has_regulatory_citations: bool = True
    citation_count: int = 0
    issues: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Gate implementation
# ---------------------------------------------------------------------------


class OutputValidationGate(GuardrailGate):
    """Post-LLM gate: validates response format and quality.

    Expected context keys:
      - ``context["response"]``: the LLM-generated text to validate.
      - ``context.get("output_type", "default")``: one of
        "report" | "regulatory" | "risk" | "analysis" | "default".

    Custom section patterns, forbidden patterns, and length overrides can
    be supplied at construction time.
    """

    def __init__(
        self,
        required_sections: dict[str, list[str]] | None = None,
        forbidden_patterns: list[tuple[str, str]] | None = None,
        min_length: dict[str, int] | None = None,
        block_on_forbidden: bool = True,
        block_on_missing_section: bool = True,
        block_on_length: bool = False,
    ) -> None:
        """
        Args:
            required_sections: Mapping output_type → list of regex patterns that
                must match at least once in the response.
            forbidden_patterns: List of (regex, label) pairs.  Any match fails
                the gate.
            min_length: Mapping output_type → minimum character count.
            block_on_forbidden: Hard-block when forbidden language found.
            block_on_missing_section: Hard-block when required section missing.
            block_on_length: Hard-block when output is too short (default False).
        """
        self._sections: dict[str, list[str]] = {
            **_DEFAULT_SECTIONS,
            **(required_sections or {}),
        }
        self._forbidden: list[tuple[re.Pattern, str]] = [
            (re.compile(pat, re.IGNORECASE | re.MULTILINE), label)
            for pat, label in (_DEFAULT_FORBIDDEN + (forbidden_patterns or []))
        ]
        self._min_length: dict[str, int] = {
            **_DEFAULT_MIN_LENGTH,
            **(min_length or {}),
        }
        self._block_forbidden = block_on_forbidden
        self._block_section = block_on_missing_section
        self._block_length = block_on_length

    @property
    def name(self) -> str:
        return "output_validation"

    @property
    def description(self) -> str:
        return "Validates LLM output format, completeness, and quality"

    # ------------------------------------------------------------------

    def validate(self, response: str, output_type: str = "default") -> ValidationDetail:
        """Run all validation checks and return a structured detail object.

        Args:
            response: The LLM-generated text.
            output_type: Output category; controls which checks apply.

        Returns:
            :class:`ValidationDetail` with per-check results.
        """
        detail = ValidationDetail()
        detail.actual_length = len(response)

        # ---- Length check -----------------------------------------------
        min_len = self._min_length.get(output_type, self._min_length["default"])
        detail.min_length = min_len
        detail.length_ok = detail.actual_length >= min_len
        if not detail.length_ok:
            detail.issues.append(
                f"Output too short: {detail.actual_length} chars < {min_len} required"
            )

        # ---- Required sections check ------------------------------------
        section_patterns = self._sections.get(output_type, [])
        for pat in section_patterns:
            compiled = re.compile(pat, re.IGNORECASE | re.MULTILINE)
            if not compiled.search(response):
                detail.missing_sections.append(pat)
                detail.issues.append(f"Missing required section matching: {pat}")

        # ---- Forbidden patterns check ------------------------------------
        for compiled_pat, label in self._forbidden:
            m = compiled_pat.search(response)
            if m:
                detail.forbidden_matches.append({"label": label, "match": m.group()[:80]})
                detail.issues.append(f"Forbidden language [{label}]: '{m.group()[:40]}…'")

        # ---- Regulatory citation check (only for regulatory type) --------
        if output_type == "regulatory":
            citations = _REGULATORY_CITATION_RE.findall(response)
            detail.citation_count = len(citations)
            detail.has_regulatory_citations = detail.citation_count > 0
            if not detail.has_regulatory_citations:
                detail.issues.append(
                    "Regulatory output must cite at least one specific "
                    "resolution/instruction (e.g., Resolução CVM nº 175)"
                )

        return detail

    # ------------------------------------------------------------------

    def check(self, query: str, context: dict) -> GateResult:
        """Validate the LLM response stored in *context*.

        Returns:
            GateResult — passed if all enabled checks pass.
        """
        response: str = context.get("response", "")
        output_type: str = context.get("output_type", "default")

        if not response:
            return GateResult(
                gate_name=self.name,
                passed=True,
                reason="No response to validate",
            )

        detail = self.validate(response, output_type)

        # Determine overall pass/fail
        failures: list[str] = []

        if not detail.length_ok and self._block_length:
            failures.append(f"Output too short ({detail.actual_length} < {detail.min_length})")

        if detail.missing_sections and self._block_section:
            failures.append(
                f"Missing section(s): {len(detail.missing_sections)} required section(s) absent"
            )

        if detail.forbidden_matches and self._block_forbidden:
            labels = [m["label"] for m in detail.forbidden_matches]
            failures.append(f"Forbidden language: {', '.join(labels)}")

        if output_type == "regulatory" and not detail.has_regulatory_citations:
            failures.append("Regulatory response must cite specific regulations")

        passed = len(failures) == 0
        reason = "; ".join(failures) if failures else ""

        logger.debug(
            "Output validation output_type=%s passed=%s issues=%d",
            output_type,
            passed,
            len(detail.issues),
        )

        return GateResult(
            gate_name=self.name,
            passed=passed,
            reason=reason,
            details={
                "output_type": output_type,
                "length": detail.actual_length,
                "min_length": detail.min_length,
                "length_ok": detail.length_ok,
                "missing_sections": detail.missing_sections,
                "forbidden_matches": detail.forbidden_matches,
                "regulatory_citations": detail.citation_count,
                "all_issues": detail.issues,
            },
        )
