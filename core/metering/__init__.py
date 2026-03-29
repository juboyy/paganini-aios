"""PAGANINI Metering — Token counting, cost attribution, rate limiting, and budget alerts.

This package provides the metering foundation for Paganini AIOS:

    from core.metering import get_counter, get_limiter, get_alerts

Usage (wrap an LLM call):
    counter = get_counter()
    with counter.track(tenant_id="t1", agent_id="gestor", model="gpt-4o-mini") as ctx:
        result = llm_fn(system_prompt, user_prompt)
        ctx.finish(input_tokens=..., output_tokens=...)

Sub-modules:
    counter     — TokenCounter middleware (singleton)
    cost        — Pricing table + cost calculation
    limiter     — Token bucket rate limiter per tenant
    persistence — JSONL event storage with batch flush
    alerts      — Budget threshold alerts
"""

from core.metering.counter import TokenCounter, get_counter, MeteringContext
from core.metering.cost import CostCalculator, get_cost_calculator, ModelPricing
from core.metering.limiter import RateLimiter, get_limiter, RateLimitResult, TierDefaults
from core.metering.persistence import UsagePersistence, get_persistence, UsageEvent
from core.metering.alerts import BudgetAlerts, get_alerts, AlertLevel, AlertInfo

__all__ = [
    # Counter
    "TokenCounter",
    "get_counter",
    "MeteringContext",
    # Cost
    "CostCalculator",
    "get_cost_calculator",
    "ModelPricing",
    # Limiter
    "RateLimiter",
    "get_limiter",
    "RateLimitResult",
    "TierDefaults",
    # Persistence
    "UsagePersistence",
    "get_persistence",
    "UsageEvent",
    # Alerts
    "BudgetAlerts",
    "get_alerts",
    "AlertLevel",
    "AlertInfo",
]
