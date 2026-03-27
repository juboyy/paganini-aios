"""Multi-Query Rewriting — expand a single query into 3-5 variations to improve recall.

Recall suffers when the user's phrasing differs from the corpus vocabulary.
This module generates alternative phrasings through:

1. **Synonym expansion** — domain synonyms loaded from :class:`~core.rag.domain.DomainConfig`
2. **Specificity variation** — broader and narrower reformulations
3. **Perspective shift** — regulatory, operational, and risk lenses

When an LLM function is provided the module delegates generation to it;
otherwise a fast rule-based fallback is used so the system works fully
offline without any API calls.

Domain knowledge (synonyms) is loaded from a ``DomainConfig`` pack.  Pass
``domain=None`` to use an empty synonym table — perspective/specificity
variations still apply.

Usage::

    from core.rag.multi_query import MultiQueryRewriter
    from core.rag.domain import load_domain

    domain = load_domain(pack_name="finance")
    rewriter = MultiQueryRewriter(domain=domain)
    queries = rewriter.rewrite("O que é subordinação em FIDC?")
    # → ["O que é subordinação em FIDC?", "cota subordinada FIDC definição", ...]
"""

from __future__ import annotations

import re
from typing import Callable, Optional

from core.rag.domain import DomainConfig, GENERIC_DOMAIN

__all__ = [
    "MultiQueryRewriter",
    "SYNONYM_MAP",
    "PERSPECTIVE_TEMPLATES",
]


# ---------------------------------------------------------------------------
# Module-level SYNONYM_MAP kept for backward-compat (now loaded from domain)
# ---------------------------------------------------------------------------

# This is intentionally empty — the real synonyms live in packs/finance/rag_domain.yaml.
# Existing code that imports SYNONYM_MAP directly will get an empty dict, which is
# functionally equivalent to "no domain" (generic mode).
SYNONYM_MAP: dict[str, list[str]] = {}

# ---------------------------------------------------------------------------
# Perspective templates — language-neutral enough for any domain
# ---------------------------------------------------------------------------

PERSPECTIVE_TEMPLATES: dict[str, str] = {
    "regulatory":  "From a regulatory and compliance perspective: {query}",
    "operational": "In operational and management terms: {query}",
    "risk":        "Considering risk analysis and failure scenarios: {query}",
    "accounting":  "From an accounting and financial reporting perspective: {query}",
    "investor":    "For an investor or end-user of this system: {query}",
}

# Portuguese-language override — used when domain language starts with "pt"
_PERSPECTIVE_TEMPLATES_PT: dict[str, str] = {
    "regulatorio":  "Do ponto de vista regulatório: {query}",
    "operacional":  "Em termos operacionais e de gestão: {query}",
    "risco":        "Considerando análise de risco e inadimplência: {query}",
    "contabil":     "Sob perspectiva contábil e de provisionamento: {query}",
    "investidor":   "Para um cotista ou investidor institucional: {query}",
}

# LLM prompt templates
_LLM_SYSTEM = (
    "You are a domain expert helping to generate query variations for document retrieval."
)

_LLM_TEMPLATE = (
    "Given the query: «{query}»\n\n"
    "Generate exactly {n} alternative variations that help retrieve relevant documents. "
    "Use domain-specific synonyms, different perspectives (regulatory, operational, risk) "
    "and specificity variations (broader and narrower).\n\n"
    "Return ONLY the variations, one per line, without numbering or bullets."
)


def _tokenize(text: str) -> list[str]:
    """Lowercase word tokens (handles accented characters)."""
    return re.findall(r"[a-záéíóúâêîôûãõçàèìòùñ]+", text.lower())


def _expand_synonyms(query: str, synonyms: dict[str, list[str]]) -> list[str]:
    """Replace known terms in the query with their synonyms."""
    variants: list[str] = []
    q_lower = query.lower()

    for term, syns in synonyms.items():
        if term.lower() in q_lower:
            for syn in syns[:2]:
                variant = re.sub(re.escape(term), syn, query, flags=re.IGNORECASE)
                if variant.lower() != query.lower():
                    variants.append(variant)

    return variants


def _specificity_variants(query: str, domain: DomainConfig) -> list[str]:
    """Generate a broader and a narrower version of the query."""
    tokens = _tokenize(query)
    variants: list[str] = []

    # Broader: strip the last descriptive word
    if len(tokens) >= 3:
        broader = " ".join(tokens[:-1])
        variants.append(broader)

    # Narrower: add a domain context anchor if none present
    anchors = list(domain.regulatory_bodies) + list(domain.doc_types)[:3]
    has_anchor = any(a.lower() in query.lower() for a in anchors) if anchors else False

    if not has_anchor and tokens:
        # Generic narrowing: append "in context"
        if anchors:
            variants.append(f"{query} {anchors[0]}")
        else:
            variants.append(f"{query} (detailed)")
    elif anchors and anchors[0] not in query:
        variants.append(f"{query} {anchors[0]}")

    return variants


def _perspective_variants(
    query: str,
    templates: dict[str, str],
    max_perspectives: int = 2,
) -> list[str]:
    """Generate query variants from different professional perspectives."""
    q_lower = query.lower()
    priorities: list[str] = []

    # Heuristic: pick perspectives relevant to the query content
    keys = list(templates.keys())
    for key in keys:
        word = key.lower()
        if any(w in q_lower for w in [word, word[:5]]):
            priorities.append(key)

    # Fill remaining
    for key in keys:
        if key not in priorities:
            priorities.append(key)

    results: list[str] = []
    for key in priorities[:max_perspectives]:
        results.append(templates[key].format(query=query))

    return results


class MultiQueryRewriter:
    """Generate 3-5 query variations for improved RAG recall.

    Can operate in two modes:

    * **Rule-based** (default): fast, offline, no LLM required.
    * **LLM-assisted**: pass ``llm_fn`` to :meth:`rewrite` for higher-quality
      variations. The function signature must be ``(system: str, user: str) → str``.

    Args:
        n_variants: Total number of query variants to produce (including the
                    original). Clamped to the range [2, 8].
        dedup: Whether to deduplicate near-identical variants.
        domain: Optional :class:`~core.rag.domain.DomainConfig` containing
                the synonym table. When ``None``, synonym expansion is skipped
                but perspective/specificity variations still run.
    """

    def __init__(
        self,
        n_variants: int = 4,
        dedup: bool = True,
        domain: Optional[DomainConfig] = None,
    ):
        self.n_variants = max(2, min(8, n_variants))
        self.dedup = dedup
        self._domain = domain or GENERIC_DOMAIN
        # Select perspective templates based on domain language
        if self._domain.language.lower().startswith("pt"):
            self._perspectives = _PERSPECTIVE_TEMPLATES_PT
        else:
            self._perspectives = PERSPECTIVE_TEMPLATES

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def rewrite(
        self,
        query: str,
        llm_fn: Optional[Callable[[str, str], str]] = None,
    ) -> list[str]:
        """Produce *n_variants* query strings including the original.

        Args:
            query: Original user query.
            llm_fn: Optional LLM callable ``(system_prompt, user_prompt) → text``.
                    When supplied, the LLM generates variations; rule-based
                    logic is used as a fallback if the LLM call fails.

        Returns:
            List of query strings, original first, deduplicated.
        """
        query = query.strip()
        if not query:
            return [query]

        if llm_fn is not None:
            try:
                return self._llm_rewrite(query, llm_fn)
            except Exception:
                pass  # fall through to rule-based

        return self._rule_based_rewrite(query)

    def merge_results(
        self,
        results_per_query: list[list],
        boost_factor: float = 1.1,
    ) -> list:
        """Merge retrieval results from multiple queries, deduplicating by text.

        Items that appear in results from multiple query variants receive a
        score boost proportional to how many times they appear.

        Args:
            results_per_query: A list where each element is the list of
                               :class:`~core.rag.pipeline.Chunk` objects
                               returned for one query variant.
            boost_factor: Multiplicative score boost per additional occurrence.

        Returns:
            Deduplicated, re-scored list of chunks sorted by descending score.
        """
        seen: dict[str, object] = {}
        counts: dict[str, int] = {}

        for results in results_per_query:
            for chunk in results:
                key = chunk.text[:120]
                if key in seen:
                    counts[key] = counts[key] + 1
                else:
                    seen[key] = chunk
                    counts[key] = 1

        merged = list(seen.values())
        for chunk in merged:
            key = chunk.text[:120]
            n = counts.get(key, 1)
            if n > 1:
                chunk.score = chunk.score * (boost_factor ** (n - 1))

        merged.sort(key=lambda c: c.score, reverse=True)
        return merged

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _rule_based_rewrite(self, query: str) -> list[str]:
        variants: list[str] = [query]

        # 1. Synonym expansions (domain-driven)
        variants.extend(_expand_synonyms(query, self._domain.synonyms))

        # 2. Specificity
        variants.extend(_specificity_variants(query, self._domain))

        # 3. Perspective shifts
        variants.extend(_perspective_variants(query, self._perspectives))

        if self.dedup:
            variants = self._deduplicate(variants)

        return variants[: self.n_variants]

    def _llm_rewrite(
        self,
        query: str,
        llm_fn: Callable[[str, str], str],
    ) -> list[str]:
        n = self.n_variants - 1
        user_prompt = _LLM_TEMPLATE.format(query=query, n=n)
        response = llm_fn(_LLM_SYSTEM, user_prompt)

        lines = [ln.strip() for ln in response.splitlines() if ln.strip()]
        cleaned = [re.sub(r"^[\d.)\-*•]+\s*", "", ln) for ln in lines]
        variants = [query] + [ln for ln in cleaned if ln and ln.lower() != query.lower()]

        if self.dedup:
            variants = self._deduplicate(variants)

        return variants[: self.n_variants]

    @staticmethod
    def _deduplicate(variants: list[str]) -> list[str]:
        """Remove near-duplicate variants using token-level Jaccard similarity."""
        seen: list[set] = []
        unique: list[str] = []
        for v in variants:
            tokens = set(_tokenize(v))
            is_dup = False
            for s in seen:
                if tokens and s:
                    jaccard = len(tokens & s) / len(tokens | s)
                    if jaccard > 0.85:
                        is_dup = True
                        break
            if not is_dup:
                unique.append(v)
                seen.append(tokens)
        return unique
