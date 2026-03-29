"""Paganini Guardrail Gate — Hallucination Detection (POST-LLM).

Verifies that the LLM response is grounded in the RAG context chunks.
Critical for regulatory finance, where hallucinated citations or numbers
are a compliance liability.

Two complementary strategies:
  1. **Overlap scoring** — Jaccard similarity between response sentences
     and the aggregated context corpus at token level.
  2. **Numerical grounding** — every number in the response must appear
     somewhere in the retrieved chunks.
  3. **Entity grounding** — capitalised multi-word entities extracted from
     the response are checked against the context.
  4. **Citation grounding** — if the response cites a source by name,
     that source must appear in the chunk metadata.

Final score: weighted average of the above strategies (configurable).
Threshold default: 0.6.  Below threshold → GateResult(passed=False).

No external ML libraries required — pure Python + regex + heuristics.
"""

from __future__ import annotations

import logging
import re
import threading
from dataclasses import dataclass, field
from typing import Any

from core.guardrails.base import GateResult, GuardrailGate

logger = logging.getLogger("paganini.guardrails.hallucination")

# ---------------------------------------------------------------------------
# Tokenisation helpers
# ---------------------------------------------------------------------------

# Portuguese stopwords (minimal set for finance domain)
_PT_STOPWORDS: frozenset[str] = frozenset(
    """a ao aos as até com como da das de do dos e é em entre
    essa esse esta este eu foi há isso isto já lhe mas me mesmo
    na nas no nos o ou os para pela pelas pelo pelos por que se
    ser seu seus só sua suas também te ter teu teus tu um uma
    umas uns você vocês""".split()
)


def _tokenise(text: str) -> list[str]:
    """Lower-case, strip punctuation, remove stopwords."""
    tokens = re.findall(r"\b\w+\b", text.lower())
    return [t for t in tokens if t not in _PT_STOPWORDS and len(t) > 1]


def _sentences(text: str) -> list[str]:
    """Split text into sentences on '.', '!', '?', ';' boundaries."""
    parts = re.split(r"(?<=[.!?;])\s+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


# ---------------------------------------------------------------------------
# Named-entity extraction (heuristic — capitalised phrases)
# ---------------------------------------------------------------------------

_ENTITY_RE = re.compile(
    r"\b([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+){0,3})\b"
)


def _extract_entities(text: str) -> list[str]:
    """Extract capitalised noun phrases as candidate named entities."""
    candidates = _ENTITY_RE.findall(text)
    # Filter very short / trivial phrases
    return [c for c in candidates if len(c) > 3 and not c.lower().startswith(("que ", "como ", "para "))]


# ---------------------------------------------------------------------------
# Numerical extraction
# ---------------------------------------------------------------------------

_NUM_RE = re.compile(
    r"""
    \b
    (?:
        \d{1,3}(?:\.\d{3})*(?:,\d+)?  # BR format: 1.234,56
      | \d+(?:\.\d+)?                  # simple float/int
      | \d+(?:,\d+)?%                  # percentage
    )
    \b
    """,
    re.VERBOSE,
)


def _extract_numbers(text: str) -> list[str]:
    """Return list of numeric strings found in *text*."""
    return _NUM_RE.findall(text)


# ---------------------------------------------------------------------------
# Citation extraction (regulatory Brazilian patterns)
# ---------------------------------------------------------------------------

_CITATION_RE = re.compile(
    r"""
    (?:
        Instrução\s+(?:CVM\s+)?n[oº°]?\s*\d+   |   # Instrução CVM nº 555
        Resolução\s+(?:CVM\s+)?n[oº°]?\s*\d+   |   # Resolução CVM nº 175
        Art(?:igo)?\.?\s*\d+                    |   # Art. 42
        ANBIMA\s+\w+\s+n[oº°]?\s*\d+            |   # ANBIMA Código nº X
        CVM\s+\d+                                    # CVM 175
    )
    """,
    re.VERBOSE | re.IGNORECASE,
)


def _extract_citations(text: str) -> list[str]:
    return _CITATION_RE.findall(text)


# ---------------------------------------------------------------------------
# Result detail dataclass
# ---------------------------------------------------------------------------


@dataclass
class HallucinationDetail:
    """Breakdown of grounding scores per strategy."""

    overlap_score: float = 0.0
    numeric_score: float = 0.0
    entity_score: float = 0.0
    citation_score: float = 1.0          # default pass if no citations claimed
    final_score: float = 0.0
    unsupported_sentences: list[str] = field(default_factory=list)
    missing_numbers: list[str] = field(default_factory=list)
    missing_entities: list[str] = field(default_factory=list)
    missing_citations: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Gate implementation
# ---------------------------------------------------------------------------


class HallucinationGate(GuardrailGate):
    """Post-LLM gate: checks that the response is grounded in RAG context.

    Expected context keys:
      - ``context["response"]``: the LLM-generated response string.
      - ``context["chunks"]``: list of str OR list of dict with a "text" key.
      - ``context.get("chunk_sources")`` (optional): list of source names/ids
        matching *chunks* — used for citation grounding.

    Configuration:
      - *threshold*: minimum score to pass (0.0–1.0, default 0.6).
      - *weights*: dict mapping strategy → float (must sum to 1.0).
    """

    _DEFAULT_WEIGHTS = {
        "overlap":  0.50,
        "numeric":  0.25,
        "entity":   0.15,
        "citation": 0.10,
    }

    def __init__(
        self,
        threshold: float = 0.6,
        weights: dict[str, float] | None = None,
    ) -> None:
        self._threshold = threshold
        self._weights = weights or dict(self._DEFAULT_WEIGHTS)
        self._lock = threading.Lock()

    @property
    def name(self) -> str:
        return "hallucination_detection"

    @property
    def description(self) -> str:
        return "Verifies LLM response is grounded in retrieved RAG context"

    # ------------------------------------------------------------------
    # Public helpers exposed for testing
    # ------------------------------------------------------------------

    def score_response(
        self,
        response: str,
        chunks: list[Any],
        chunk_sources: list[str] | None = None,
    ) -> HallucinationDetail:
        """Compute grounding scores without running the full gate.

        Args:
            response: LLM-generated text.
            chunks: Retrieved context chunks (str or dict with "text" key).
            chunk_sources: Optional source identifiers for each chunk.

        Returns:
            :class:`HallucinationDetail` with per-strategy scores.
        """
        detail = HallucinationDetail()

        # Normalise chunks to str
        context_texts: list[str] = []
        for c in chunks:
            if isinstance(c, dict):
                context_texts.append(c.get("text", str(c)))
            else:
                context_texts.append(str(c))

        context_corpus = " ".join(context_texts)
        context_tokens: set[str] = set(_tokenise(context_corpus))

        # ---- Strategy 1: Sentence-level overlap -------------------------
        sentences = _sentences(response)
        if sentences:
            supported = 0
            for sent in sentences:
                sent_tokens = set(_tokenise(sent))
                if _jaccard(sent_tokens, context_tokens) >= 0.1:
                    supported += 1
                else:
                    detail.unsupported_sentences.append(sent)
            detail.overlap_score = supported / len(sentences)
        else:
            detail.overlap_score = 1.0  # empty response — vacuously grounded

        # ---- Strategy 2: Numerical grounding ----------------------------
        response_nums = _extract_numbers(response)
        if response_nums:
            found = sum(1 for n in response_nums if n in context_corpus)
            detail.numeric_score = found / len(response_nums)
            detail.missing_numbers = [n for n in response_nums if n not in context_corpus]
        else:
            detail.numeric_score = 1.0  # no numbers claimed — neutral

        # ---- Strategy 3: Entity grounding --------------------------------
        entities = _extract_entities(response)
        if entities:
            corpus_lower = context_corpus.lower()
            found_ents = [e for e in entities if e.lower() in corpus_lower]
            missing_ents = [e for e in entities if e.lower() not in corpus_lower]
            detail.entity_score = len(found_ents) / len(entities)
            detail.missing_entities = missing_ents[:10]  # cap list length
        else:
            detail.entity_score = 1.0

        # ---- Strategy 4: Citation grounding ------------------------------
        citations = _extract_citations(response)
        if citations:
            # Check citations appear literally in context
            found_cit = [c for c in citations if c.lower() in context_corpus.lower()]
            missing_cit = [c for c in citations if c.lower() not in context_corpus.lower()]

            # If chunk_sources provided, also check against those
            if chunk_sources:
                source_str = " ".join(str(s) for s in chunk_sources).lower()
                found_cit += [c for c in missing_cit if c.lower() in source_str]
                missing_cit = [c for c in missing_cit if c.lower() not in source_str]

            if citations:
                detail.citation_score = len(found_cit) / len(citations)
                detail.missing_citations = missing_cit
        else:
            detail.citation_score = 1.0  # no citations claimed

        # ---- Final weighted score ----------------------------------------
        w = self._weights
        detail.final_score = (
            detail.overlap_score  * w.get("overlap",  0.5)
            + detail.numeric_score  * w.get("numeric",  0.25)
            + detail.entity_score   * w.get("entity",   0.15)
            + detail.citation_score * w.get("citation", 0.10)
        )
        return detail

    # ------------------------------------------------------------------

    def check(self, query: str, context: dict) -> GateResult:
        """Evaluate grounding of ``context["response"]`` against ``context["chunks"]``.

        The gate expects the pipeline to populate these keys before this
        gate runs (i.e., this is a POST-LLM gate).

        Returns:
            GateResult — passed if final_score >= threshold.
        """
        response: str = context.get("response", "")
        chunks: list = context.get("chunks", [])
        sources: list | None = context.get("chunk_sources")

        if not response:
            return GateResult(
                gate_name=self.name,
                passed=True,
                reason="No response to check",
                details={"score": 1.0},
            )

        if not chunks:
            return GateResult(
                gate_name=self.name,
                passed=False,
                reason="No context chunks available — cannot verify grounding",
                details={"score": 0.0},
            )

        with self._lock:
            detail = self.score_response(response, chunks, sources)

        logger.debug(
            "Hallucination score=%.3f threshold=%.2f [gate=%s]",
            detail.final_score,
            self._threshold,
            self.name,
        )

        passed = detail.final_score >= self._threshold
        reason = (
            ""
            if passed
            else (
                f"Response not grounded in sources "
                f"(score={detail.final_score:.2f} < threshold={self._threshold:.2f})"
            )
        )

        return GateResult(
            gate_name=self.name,
            passed=passed,
            reason=reason,
            details={
                "score": round(detail.final_score, 3),
                "threshold": self._threshold,
                "overlap_score": round(detail.overlap_score, 3),
                "numeric_score": round(detail.numeric_score, 3),
                "entity_score": round(detail.entity_score, 3),
                "citation_score": round(detail.citation_score, 3),
                "unsupported_sentences": detail.unsupported_sentences[:5],
                "missing_numbers": detail.missing_numbers[:10],
                "missing_entities": detail.missing_entities[:10],
                "missing_citations": detail.missing_citations,
            },
        )
