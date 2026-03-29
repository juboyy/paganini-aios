"""PAGANINI Metering — Cost calculator.

Pricing table per model family.  Costs are in USD per 1 000 tokens (prompt / completion).
Update ``PRICING_TABLE`` as provider prices change — all other code reads from here.

Composite cost formula:
    total_cost = llm_cost + embedding_cost + reranker_cost

BYOK mode: cost_usd is always 0 when the tenant supplies their own API key,
but token counts are still tracked for capacity planning.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Pricing table  (USD per 1 000 tokens)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ModelPricing:
    """Per-model pricing in USD per 1 000 tokens."""

    model_id: str
    """Canonical model identifier (matches what CognitiveRouter / Moltis passes)."""

    input_per_1k: float
    """Cost per 1 000 *input* (prompt) tokens."""

    output_per_1k: float
    """Cost per 1 000 *output* (completion) tokens."""

    embedding_per_1k: float = 0.0
    """Cost per 1 000 embedding tokens (0 if model doesn't do embeddings)."""

    reranker_per_1k: float = 0.0
    """Cost per 1 000 reranker tokens (0 if not applicable)."""

    provider: str = "unknown"
    """Provider label: openai | anthropic | google | qwen | custom."""


# Canonical pricing table — keys are lowercase model IDs / aliases.
# Prices sourced from provider docs as of Q1 2026 — update as needed.
PRICING_TABLE: dict[str, ModelPricing] = {
    # ── Qwen (self-hosted / Alibaba Cloud) ────────────────────────────────
    "qwen-7b": ModelPricing(
        model_id="qwen-7b",
        input_per_1k=0.0002,
        output_per_1k=0.0002,
        provider="qwen",
    ),
    "qwen-7b-instruct": ModelPricing(
        model_id="qwen-7b-instruct",
        input_per_1k=0.0002,
        output_per_1k=0.0002,
        provider="qwen",
    ),
    "qwen-27b": ModelPricing(
        model_id="qwen-27b",
        input_per_1k=0.0008,
        output_per_1k=0.0008,
        provider="qwen",
    ),
    "qwen-27b-instruct": ModelPricing(
        model_id="qwen-27b-instruct",
        input_per_1k=0.0008,
        output_per_1k=0.0008,
        provider="qwen",
    ),
    # ── OpenAI ────────────────────────────────────────────────────────────
    "gpt-4o": ModelPricing(
        model_id="gpt-4o",
        input_per_1k=0.005,
        output_per_1k=0.015,
        provider="openai",
    ),
    "gpt-4o-mini": ModelPricing(
        model_id="gpt-4o-mini",
        input_per_1k=0.00015,
        output_per_1k=0.0006,
        provider="openai",
    ),
    "gpt-4-turbo": ModelPricing(
        model_id="gpt-4-turbo",
        input_per_1k=0.01,
        output_per_1k=0.03,
        provider="openai",
    ),
    "o1": ModelPricing(
        model_id="o1",
        input_per_1k=0.015,
        output_per_1k=0.06,
        provider="openai",
    ),
    "o1-mini": ModelPricing(
        model_id="o1-mini",
        input_per_1k=0.003,
        output_per_1k=0.012,
        provider="openai",
    ),
    # Embeddings
    "text-embedding-3-small": ModelPricing(
        model_id="text-embedding-3-small",
        input_per_1k=0.00002,
        output_per_1k=0.0,
        embedding_per_1k=0.00002,
        provider="openai",
    ),
    "text-embedding-3-large": ModelPricing(
        model_id="text-embedding-3-large",
        input_per_1k=0.00013,
        output_per_1k=0.0,
        embedding_per_1k=0.00013,
        provider="openai",
    ),
    # ── Anthropic ─────────────────────────────────────────────────────────
    "claude-3-5-sonnet": ModelPricing(
        model_id="claude-3-5-sonnet",
        input_per_1k=0.003,
        output_per_1k=0.015,
        provider="anthropic",
    ),
    "claude-3-5-haiku": ModelPricing(
        model_id="claude-3-5-haiku",
        input_per_1k=0.0008,
        output_per_1k=0.004,
        provider="anthropic",
    ),
    "claude-3-opus": ModelPricing(
        model_id="claude-3-opus",
        input_per_1k=0.015,
        output_per_1k=0.075,
        provider="anthropic",
    ),
    "claude-sonnet-4": ModelPricing(
        model_id="claude-sonnet-4",
        input_per_1k=0.003,
        output_per_1k=0.015,
        provider="anthropic",
    ),
    # ── Google ────────────────────────────────────────────────────────────
    "gemini-2.5-flash": ModelPricing(
        model_id="gemini-2.5-flash",
        input_per_1k=0.000075,
        output_per_1k=0.0003,
        provider="google",
    ),
    "gemini-2.5-pro": ModelPricing(
        model_id="gemini-2.5-pro",
        input_per_1k=0.00125,
        output_per_1k=0.005,
        provider="google",
    ),
    "gemini/gemini-2.5-flash": ModelPricing(
        model_id="gemini/gemini-2.5-flash",
        input_per_1k=0.000075,
        output_per_1k=0.0003,
        provider="google",
    ),
    "gemini/gemini-2.5-pro": ModelPricing(
        model_id="gemini/gemini-2.5-pro",
        input_per_1k=0.00125,
        output_per_1k=0.005,
        provider="google",
    ),
    # Embeddings
    "text-embedding-004": ModelPricing(
        model_id="text-embedding-004",
        input_per_1k=0.000025,
        output_per_1k=0.0,
        embedding_per_1k=0.000025,
        provider="google",
    ),
}

# Fallback pricing for unknown models — conservative estimate
_FALLBACK_PRICING = ModelPricing(
    model_id="__fallback__",
    input_per_1k=0.002,
    output_per_1k=0.008,
    provider="unknown",
)


# ---------------------------------------------------------------------------
# Cost calculator
# ---------------------------------------------------------------------------

@dataclass
class CompositeCost:
    """Breakdown of costs for a single request."""

    llm_cost_usd: float = 0.0
    """Cost of the LLM call itself (input + output tokens)."""

    embedding_cost_usd: float = 0.0
    """Cost of embedding tokens (RAG retrieval stage)."""

    reranker_cost_usd: float = 0.0
    """Cost of reranker tokens."""

    total_cost_usd: float = field(init=False)
    """Sum of all cost components."""

    def __post_init__(self) -> None:
        self.total_cost_usd = round(
            self.llm_cost_usd + self.embedding_cost_usd + self.reranker_cost_usd, 8
        )


class CostCalculator:
    """Calculate USD cost from token counts and model ID.

    Supports BYOK (Bring Your Own Key) mode — when ``byok=True``, all
    ``*_cost_usd`` fields are 0 but token counts are still returned.

    Thread-safe: stateless, reads only from the module-level PRICING_TABLE.
    """

    def __init__(self, pricing_table: Optional[dict[str, ModelPricing]] = None) -> None:
        """Initialise with an optional custom pricing table (useful for tests)."""
        self._table: dict[str, ModelPricing] = pricing_table if pricing_table is not None else PRICING_TABLE

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_pricing(self, model: str) -> ModelPricing:
        """Return pricing for *model*, falling back to a conservative default.

        Lookup is case-insensitive and also tries stripping the provider prefix
        (e.g. ``"gemini/gemini-2.5-flash"`` → ``"gemini-2.5-flash"``).

        Args:
            model: Model identifier as passed by the caller.

        Returns:
            :class:`ModelPricing` for the model, or a fallback entry.
        """
        key = model.lower().strip()
        if key in self._table:
            return self._table[key]
        # Try stripping provider prefix ("anthropic/claude-3-5-sonnet" → "claude-3-5-sonnet")
        short = key.split("/")[-1]
        if short in self._table:
            return self._table[short]
        return _FALLBACK_PRICING

    def calculate(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
        *,
        byok: bool = False,
        embedding_tokens: int = 0,
        embedding_model: Optional[str] = None,
        reranker_tokens: int = 0,
        reranker_model: Optional[str] = None,
    ) -> CompositeCost:
        """Calculate composite USD cost for a single LLM request.

        Args:
            model:            LLM model identifier.
            input_tokens:     Number of prompt tokens consumed.
            output_tokens:    Number of completion tokens generated.
            byok:             If True, cost is always 0 (BYOK mode).
            embedding_tokens: Optional embedding token count (RAG stage).
            embedding_model:  Model used for embeddings (defaults to ``model``).
            reranker_tokens:  Optional reranker token count.
            reranker_model:   Model used for reranking (defaults to ``model``).

        Returns:
            :class:`CompositeCost` with per-component and total USD costs.
        """
        if byok:
            return CompositeCost(llm_cost_usd=0.0, embedding_cost_usd=0.0, reranker_cost_usd=0.0)

        pricing = self.get_pricing(model)
        llm_cost = (
            (input_tokens / 1000) * pricing.input_per_1k
            + (output_tokens / 1000) * pricing.output_per_1k
        )

        emb_cost = 0.0
        if embedding_tokens > 0:
            emb_pricing = self.get_pricing(embedding_model or model)
            emb_cost = (embedding_tokens / 1000) * emb_pricing.embedding_per_1k

        rer_cost = 0.0
        if reranker_tokens > 0:
            rer_pricing = self.get_pricing(reranker_model or model)
            rer_cost = (reranker_tokens / 1000) * rer_pricing.reranker_per_1k

        return CompositeCost(
            llm_cost_usd=round(llm_cost, 8),
            embedding_cost_usd=round(emb_cost, 8),
            reranker_cost_usd=round(rer_cost, 8),
        )

    def list_models(self, provider: Optional[str] = None) -> list[ModelPricing]:
        """Return all known model pricings, optionally filtered by provider.

        Args:
            provider: Filter by provider name (e.g. ``"openai"``).

        Returns:
            List of :class:`ModelPricing` entries.
        """
        entries = list(self._table.values())
        if provider:
            entries = [e for e in entries if e.provider == provider]
        return sorted(entries, key=lambda e: (e.provider, e.model_id))


# Module-level singleton
_calculator: Optional[CostCalculator] = None


def get_cost_calculator() -> CostCalculator:
    """Return the module-level :class:`CostCalculator` singleton.

    Thread-safe: instance creation is idempotent.
    """
    global _calculator
    if _calculator is None:
        _calculator = CostCalculator()
    return _calculator
