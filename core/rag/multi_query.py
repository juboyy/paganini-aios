"""Multi-Query Rewriting — expand a single query into 3-5 variations to improve recall.

Recall suffers when the user's phrasing differs from the corpus vocabulary.
This module generates alternative phrasings through:

1. **Synonym expansion** — financial/legal synonyms in Portuguese
2. **Specificity variation** — broader and narrower reformulations
3. **Perspective shift** — regulatory, operational, and risk lenses

When an LLM function is provided the module delegates generation to it;
otherwise a fast rule-based fallback is used so the system works fully
offline without any API calls.

Usage::

    from core.rag.multi_query import MultiQueryRewriter

    rewriter = MultiQueryRewriter()
    queries = rewriter.rewrite("O que é subordinação em FIDC?")
    # → ["O que é subordinação em FIDC?",
    #    "cota subordinada FIDC definição",
    #    "mezanino crédito subordinado fundo",
    #    ...]
"""

from __future__ import annotations

import re
from typing import Callable, Optional

__all__ = [
    "MultiQueryRewriter",
    "SYNONYM_MAP",
    "PERSPECTIVE_TEMPLATES",
]


# ---------------------------------------------------------------------------
# Synonym dictionary — Portuguese financial / legal vocabulary
# ---------------------------------------------------------------------------

SYNONYM_MAP: dict[str, list[str]] = {
    # Estrutura de cotas
    "subordinação":     ["cota subordinada", "mezanino", "credit enhancement", "subordinação de cotas"],
    "sênior":           ["cota sênior", "tranche sênior", "série sênior"],
    "mezanino":         ["cota mezanino", "tranche intermediária", "subordinação intermediária"],
    "cotista":          ["investidor", "detentor de cotas", "titular de cotas"],
    "cota":             ["fração ideal", "quota", "participação no fundo"],

    # Operações de crédito
    "cedente":          ["originador", "vendedor de recebíveis", "assignor"],
    "sacado":           ["devedor", "pagador", "obrigado"],
    "recebível":        ["direito creditório", "crédito a receber", "receivable"],
    "securitização":    ["cessão de crédito", "estruturação de recebíveis", "securitization"],
    "deságio":          ["desconto", "deságio na cessão", "haircut"],
    "inadimplência":    ["default", "atraso", "não pagamento", "calote"],
    "provisão":         ["PDD", "provisão para devedores duvidosos", "allowance"],

    # Regulação
    "CVM":              ["Comissão de Valores Mobiliários", "regulador", "autarquia federal"],
    "ANBIMA":           ["associação de mercado", "autorregulador"],
    "regulamento":      ["estatuto", "regimento", "norma interna", "regulação"],
    "instrução":        ["resolução CVM", "circular", "deliberação", "norma"],
    "patrimônio líquido": ["PL", "NAV", "net asset value", "valor patrimonial"],

    # Fundos
    "FIDC":             ["fundo de investimento em direitos creditórios", "fundo de recebíveis"],
    "FII":              ["fundo imobiliário", "fundo de investimento imobiliário"],
    "fundo":            ["veículo de investimento", "estrutura de investimento"],
    "administrador":    ["gestor administrativo", "administradora fiduciária"],
    "gestor":           ["gestora", "portfolio manager", "gestor de carteira"],
    "custodiante":      ["custodiador", "banco custodiante", "depositário"],

    # Indicadores
    "taxa de retorno":  ["yield", "retorno esperado", "TIR", "taxa interna de retorno"],
    "duration":         ["prazo médio ponderado", "duration modificada", "DV01"],
    "spread":           ["diferencial de taxa", "prêmio de risco", "credit spread"],
    "rating":           ["classificação de risco", "nota de crédito", "avaliação de risco"],
}

# ---------------------------------------------------------------------------
# Perspective templates
# ---------------------------------------------------------------------------

PERSPECTIVE_TEMPLATES: dict[str, str] = {
    "regulatorio":   "Do ponto de vista regulatório (CVM/ANBIMA): {query}",
    "operacional":   "Em termos operacionais e de gestão: {query}",
    "risco":         "Considerando análise de risco e inadimplência: {query}",
    "contabil":      "Sob perspectiva contábil e de provisionamento: {query}",
    "investidor":    "Para um cotista ou investidor institucional: {query}",
}

# ---------------------------------------------------------------------------
# LLM prompt for when an llm_fn is supplied
# ---------------------------------------------------------------------------

_LLM_SYSTEM = (
    "Você é um especialista em fundos de investimento e mercado de capitais brasileiro. "
    "Gere variações de consulta para melhorar a recuperação de documentos."
)

_LLM_TEMPLATE = (
    "Dado a consulta: «{query}»\n\n"
    "Gere exatamente {n} variações alternativas que ajudem a recuperar documentos relevantes. "
    "Use sinônimos financeiros/jurídicos em português, perspectivas diferentes (regulatória, "
    "operacional, de risco) e variações de especificidade (mais ampla e mais estreita).\n\n"
    "Retorne SOMENTE as variações, uma por linha, sem numeração ou marcadores."
)


def _tokenize(text: str) -> list[str]:
    """Lowercase word tokens."""
    return re.findall(r"[a-záéíóúâêîôûãõç]+", text.lower())


def _expand_synonyms(query: str) -> list[str]:
    """Replace known terms in the query with their synonyms, producing new queries."""
    variants: list[str] = []
    q_lower = query.lower()

    for term, synonyms in SYNONYM_MAP.items():
        if term.lower() in q_lower:
            for syn in synonyms[:2]:  # cap at 2 replacements per term
                variant = re.sub(re.escape(term), syn, query, flags=re.IGNORECASE)
                if variant.lower() != query.lower():
                    variants.append(variant)

    return variants


def _specificity_variants(query: str) -> list[str]:
    """Generate a broader and a narrower version of the query."""
    tokens = _tokenize(query)
    variants: list[str] = []

    # Broader: strip the last descriptive word (likely a qualifier)
    if len(tokens) >= 3:
        # Drop last token
        broader = " ".join(tokens[:-1])
        variants.append(broader)

    # Narrower: add a financial context anchor
    anchors = ["FIDC", "regulamento", "CVM", "fundo de investimento"]
    has_anchor = any(a.lower() in query.lower() for a in anchors)
    if not has_anchor and tokens:
        narrower = f"{query} em FIDC"
        variants.append(narrower)
    else:
        # Add "conforme regulação CVM" as a narrowing qualifier
        if "CVM" not in query:
            variants.append(f"{query} conforme regulação CVM")

    return variants


def _perspective_variants(query: str, max_perspectives: int = 2) -> list[str]:
    """Generate query variants from different professional perspectives."""
    # Pick the most relevant perspectives based on query content
    q_lower = query.lower()
    priorities: list[str] = []

    if any(w in q_lower for w in ["regulamento", "instrução", "cvm", "norma", "resolução"]):
        priorities.append("regulatorio")
    if any(w in q_lower for w in ["risco", "inadimplência", "default", "perda", "rating"]):
        priorities.append("risco")
    if any(w in q_lower for w in ["gestor", "administrador", "operaç", "procedimento"]):
        priorities.append("operacional")
    if any(w in q_lower for w in ["cotista", "investidor", "retorno", "yield"]):
        priorities.append("investidor")

    # Fill remaining with defaults
    for key in PERSPECTIVE_TEMPLATES:
        if key not in priorities:
            priorities.append(key)

    results: list[str] = []
    for key in priorities[:max_perspectives]:
        template = PERSPECTIVE_TEMPLATES[key]
        results.append(template.format(query=query))

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
    """

    def __init__(self, n_variants: int = 4, dedup: bool = True):
        self.n_variants = max(2, min(8, n_variants))
        self.dedup = dedup

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
            query: Original user query in Portuguese.
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
        seen: dict[str, object] = {}   # text fingerprint → Chunk
        counts: dict[str, int] = {}

        for results in results_per_query:
            for chunk in results:
                key = chunk.text[:120]  # fingerprint
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

        # 1. Synonym expansions
        syn_variants = _expand_synonyms(query)
        variants.extend(syn_variants)

        # 2. Specificity
        spec_variants = _specificity_variants(query)
        variants.extend(spec_variants)

        # 3. Perspective shifts
        persp_variants = _perspective_variants(query)
        variants.extend(persp_variants)

        if self.dedup:
            variants = self._deduplicate(variants)

        # Trim or pad to n_variants
        return variants[: self.n_variants]

    def _llm_rewrite(
        self,
        query: str,
        llm_fn: Callable[[str, str], str],
    ) -> list[str]:
        n = self.n_variants - 1  # we'll prepend the original
        user_prompt = _LLM_TEMPLATE.format(query=query, n=n)
        response = llm_fn(_LLM_SYSTEM, user_prompt)

        lines = [ln.strip() for ln in response.splitlines() if ln.strip()]
        # Strip leading bullets/numbers
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
