"""PAGANINI Metering — Budget alert engine.

Compares current spend against a tenant's configured budget and emits
:class:`AlertInfo` objects when a threshold is crossed.

Alert thresholds: 50 %, 80 %, 95 %, 100 % of budget.

Channels (API, Slack, Telegram, CLI) call :meth:`BudgetAlerts.check_tenant`
and act on the returned :class:`AlertInfo` list — the alert module itself
never sends messages, it only signals.

Usage::

    alerts = get_alerts()
    alerts.set_budget("acme", 100.0)           # $100 USD monthly budget
    alerts.add_spend("acme", 42.50)            # track cumulative spend
    infos = alerts.check_tenant("acme")
    for info in infos:
        if not info.already_sent:
            channel.notify(info.message)
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ---------------------------------------------------------------------------
# Alert levels
# ---------------------------------------------------------------------------

class AlertLevel(Enum):
    """Severity of a budget alert."""

    INFO = "info"
    """50 % threshold — informational notice."""

    WARNING = "warning"
    """80 % threshold — action recommended."""

    CRITICAL = "critical"
    """95 % threshold — urgent intervention required."""

    EXHAUSTED = "exhausted"
    """100 % threshold — budget fully consumed."""


# Thresholds in ascending order (fraction of budget)
_THRESHOLDS: list[tuple[float, AlertLevel]] = [
    (0.50, AlertLevel.INFO),
    (0.80, AlertLevel.WARNING),
    (0.95, AlertLevel.CRITICAL),
    (1.00, AlertLevel.EXHAUSTED),
]


# ---------------------------------------------------------------------------
# Alert info
# ---------------------------------------------------------------------------

@dataclass
class AlertInfo:
    """A single budget alert signal."""

    tenant_id: str
    """Tenant this alert is for."""

    level: AlertLevel
    """Alert severity."""

    threshold_pct: float
    """Threshold fraction that triggered the alert (e.g. 0.80)."""

    budget_usd: float
    """Total configured budget in USD."""

    spend_usd: float
    """Current cumulative spend in USD."""

    spend_pct: float
    """spend_usd / budget_usd as a fraction."""

    message: str
    """Human-readable alert message ready for delivery."""

    already_sent: bool = False
    """True if this threshold was already signalled in the current period."""

    timestamp: float = field(default_factory=time.time)
    """Unix epoch of alert generation."""


# ---------------------------------------------------------------------------
# Per-tenant budget state
# ---------------------------------------------------------------------------

@dataclass
class _TenantBudget:
    """Mutable budget state for a single tenant."""

    budget_usd: float
    """Total budget in USD for the current period."""

    spend_usd: float = 0.0
    """Cumulative spend in USD."""

    alerted_thresholds: set[float] = field(default_factory=set)
    """Set of threshold fractions already signalled to avoid duplicates."""

    period_start: float = field(default_factory=time.time)
    """Unix epoch when this budget period started."""


# ---------------------------------------------------------------------------
# BudgetAlerts
# ---------------------------------------------------------------------------

class BudgetAlerts:
    """Thread-safe budget alert tracker.

    Maintains per-tenant spend totals and budget configurations.
    Alerts are idempotent within a billing period — each threshold
    fires at most once unless :meth:`reset_period` is called.

    Args:
        budgets: Optional ``{tenant_id: budget_usd}`` initialisation map.
    """

    def __init__(self, budgets: Optional[dict[str, float]] = None) -> None:
        self._tenants: dict[str, _TenantBudget] = {}
        self._lock = threading.Lock()

        if budgets:
            for tenant_id, budget in budgets.items():
                self.set_budget(tenant_id, budget)

    # ------------------------------------------------------------------
    # Budget configuration
    # ------------------------------------------------------------------

    def set_budget(self, tenant_id: str, budget_usd: float) -> None:
        """Set or update the budget for a tenant.

        If the tenant already exists, the budget is updated but cumulative
        spend is preserved (to avoid resetting mid-period).

        Args:
            tenant_id:  Tenant identifier.
            budget_usd: Budget in USD for the current period.
        """
        if budget_usd < 0:
            raise ValueError(f"Budget must be non-negative, got {budget_usd}")
        with self._lock:
            if tenant_id in self._tenants:
                self._tenants[tenant_id].budget_usd = budget_usd
            else:
                self._tenants[tenant_id] = _TenantBudget(budget_usd=budget_usd)

    def reset_period(self, tenant_id: str) -> None:
        """Reset spend and alerted thresholds for a new billing period.

        Args:
            tenant_id: Tenant to reset.
        """
        with self._lock:
            if tenant_id in self._tenants:
                tenant = self._tenants[tenant_id]
                tenant.spend_usd = 0.0
                tenant.alerted_thresholds = set()
                tenant.period_start = time.time()

    # ------------------------------------------------------------------
    # Spend tracking
    # ------------------------------------------------------------------

    def add_spend(self, tenant_id: str, cost_usd: float) -> None:
        """Record additional spend for a tenant.

        Args:
            tenant_id: Tenant identifier.
            cost_usd:  Amount in USD to add to cumulative spend.
        """
        if cost_usd < 0:
            raise ValueError(f"Spend amount must be non-negative, got {cost_usd}")
        with self._lock:
            if tenant_id not in self._tenants:
                # Auto-register with unlimited budget (no alert will fire)
                return
            self._tenants[tenant_id].spend_usd += cost_usd

    def get_spend(self, tenant_id: str) -> float:
        """Return current cumulative spend for a tenant.

        Args:
            tenant_id: Tenant identifier.

        Returns:
            Spend in USD, or 0.0 if tenant is unknown.
        """
        with self._lock:
            tenant = self._tenants.get(tenant_id)
            return tenant.spend_usd if tenant else 0.0

    # ------------------------------------------------------------------
    # Alert checks
    # ------------------------------------------------------------------

    def check_tenant(self, tenant_id: str) -> list[AlertInfo]:
        """Check budget thresholds for a tenant and return pending alerts.

        Already-signalled thresholds have ``already_sent=True`` set — callers
        should inspect this flag to avoid duplicate notifications.

        Args:
            tenant_id: Tenant to check.

        Returns:
            List of :class:`AlertInfo` — empty if no thresholds have been
            crossed or if the tenant has no configured budget.
        """
        with self._lock:
            tenant = self._tenants.get(tenant_id)
            if tenant is None or tenant.budget_usd <= 0:
                return []

            spend_pct = tenant.spend_usd / tenant.budget_usd
            alerts: list[AlertInfo] = []

            for threshold, level in _THRESHOLDS:
                if spend_pct >= threshold:
                    already_sent = threshold in tenant.alerted_thresholds
                    if not already_sent:
                        tenant.alerted_thresholds.add(threshold)

                    message = self._build_message(
                        tenant_id, level, threshold, tenant.budget_usd, tenant.spend_usd, spend_pct
                    )
                    alerts.append(
                        AlertInfo(
                            tenant_id=tenant_id,
                            level=level,
                            threshold_pct=threshold,
                            budget_usd=tenant.budget_usd,
                            spend_usd=tenant.spend_usd,
                            spend_pct=spend_pct,
                            message=message,
                            already_sent=already_sent,
                        )
                    )
            return alerts

    def check_all(self) -> dict[str, list[AlertInfo]]:
        """Check all tenants and return a mapping of ``{tenant_id: alerts}``.

        Returns:
            Dict mapping tenant IDs to their pending :class:`AlertInfo` lists.
            Tenants with no alerts are omitted.
        """
        with self._lock:
            tenant_ids = list(self._tenants.keys())

        result: dict[str, list[AlertInfo]] = {}
        for tenant_id in tenant_ids:
            alerts = self.check_tenant(tenant_id)
            if alerts:
                result[tenant_id] = alerts
        return result

    def status(self, tenant_id: str) -> Optional[dict]:
        """Return current budget status for a tenant.

        Args:
            tenant_id: Tenant identifier.

        Returns:
            Dict with budget details, or None if tenant is unknown.
        """
        with self._lock:
            tenant = self._tenants.get(tenant_id)
            if tenant is None:
                return None
            spend_pct = tenant.spend_usd / tenant.budget_usd if tenant.budget_usd > 0 else 0.0
            return {
                "tenant_id": tenant_id,
                "budget_usd": tenant.budget_usd,
                "spend_usd": round(tenant.spend_usd, 6),
                "spend_pct": round(spend_pct * 100, 2),
                "alerted_thresholds": sorted(tenant.alerted_thresholds),
                "period_start": tenant.period_start,
            }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_message(
        tenant_id: str,
        level: AlertLevel,
        threshold: float,
        budget: float,
        spend: float,
        pct: float,
    ) -> str:
        """Build a human-readable alert message."""
        pct_str = f"{pct * 100:.1f}%"
        budget_str = f"${budget:.2f}"
        spend_str = f"${spend:.4f}"
        remaining = max(0.0, budget - spend)
        remaining_str = f"${remaining:.4f}"

        if level == AlertLevel.EXHAUSTED:
            return (
                f"🔴 [{tenant_id}] Budget EXHAUSTED: spent {spend_str} of {budget_str} "
                f"({pct_str}). All LLM calls will be blocked until budget is increased."
            )
        elif level == AlertLevel.CRITICAL:
            return (
                f"🟠 [{tenant_id}] Budget CRITICAL ({pct_str}): spent {spend_str} of {budget_str}. "
                f"Remaining: {remaining_str}. Increase budget or reduce usage immediately."
            )
        elif level == AlertLevel.WARNING:
            return (
                f"🟡 [{tenant_id}] Budget WARNING ({pct_str}): spent {spend_str} of {budget_str}. "
                f"Remaining: {remaining_str}."
            )
        else:  # INFO
            return (
                f"ℹ️ [{tenant_id}] Budget 50% used: spent {spend_str} of {budget_str}. "
                f"Remaining: {remaining_str}."
            )


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_alerts: Optional[BudgetAlerts] = None
_alerts_lock = threading.Lock()


def get_alerts(budgets: Optional[dict[str, float]] = None) -> BudgetAlerts:
    """Return the module-level :class:`BudgetAlerts` singleton.

    First call initialises with optional ``budgets``; subsequent calls
    return the same instance.

    Args:
        budgets: Optional ``{tenant_id: budget_usd}`` to pre-configure.

    Returns:
        Shared :class:`BudgetAlerts` instance.
    """
    global _alerts
    if _alerts is None:
        with _alerts_lock:
            if _alerts is None:
                _alerts = BudgetAlerts(budgets=budgets)
    return _alerts
