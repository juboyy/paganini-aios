"""PAGANINI Metering — Token bucket rate limiter.

Each tenant gets an independent token bucket for three independent limits:

    tokens_per_minute   — raw LLM token throughput
    tokens_per_day      — daily quota (resets at UTC midnight)
    requests_per_minute — API call rate

When *any* limit is exceeded, :meth:`RateLimiter.check` returns a
:class:`RateLimitResult` with ``allowed=False`` and a ``retry_after_seconds``
value suitable for the ``Retry-After`` HTTP response header.

Tier defaults:
    starter:      100 000 tokens/day,  10 000 tokens/min,  60 req/min
    professional:   1 000 000 /day,   100 000 /min,       300 req/min
    enterprise:   unlimited (no limits enforced)
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Optional


# ---------------------------------------------------------------------------
# Tier defaults
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TierDefaults:
    """Token/request limits for a subscription tier."""

    tokens_per_minute: int
    """Maximum LLM tokens consumed per 60-second window."""

    tokens_per_day: int
    """Maximum LLM tokens consumed per calendar day (UTC)."""

    requests_per_minute: int
    """Maximum API requests per 60-second window."""

    unlimited: bool = False
    """When True, all limit checks are bypassed."""


TIER_DEFAULTS: dict[str, TierDefaults] = {
    "starter": TierDefaults(
        tokens_per_minute=10_000,
        tokens_per_day=100_000,
        requests_per_minute=60,
    ),
    "professional": TierDefaults(
        tokens_per_minute=100_000,
        tokens_per_day=1_000_000,
        requests_per_minute=300,
    ),
    "enterprise": TierDefaults(
        tokens_per_minute=0,
        tokens_per_day=0,
        requests_per_minute=0,
        unlimited=True,
    ),
}


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

@dataclass
class RateLimitResult:
    """Result of a rate limit check."""

    allowed: bool
    """True if the request is permitted."""

    reason: str = ""
    """Human-readable reason when ``allowed=False``."""

    retry_after_seconds: float = 0.0
    """Seconds until the client may retry (for ``Retry-After`` header)."""

    limit_type: str = ""
    """Which limit was hit: ``tokens_per_minute`` | ``tokens_per_day`` | ``requests_per_minute``."""


# ---------------------------------------------------------------------------
# Per-tenant bucket state
# ---------------------------------------------------------------------------

@dataclass
class _TenantState:
    """Mutable rate-limit state for a single tenant."""

    # tokens_per_minute bucket
    tpm_tokens: float      # current available tokens in the bucket
    tpm_last_refill: float  # epoch seconds of last refill

    # tokens_per_day counter
    tpd_count: int          # tokens used today
    tpd_day: int            # UTC day number of tpd_count (days since epoch)

    # requests_per_minute bucket
    rpm_count: float        # available request slots
    rpm_last_refill: float  # epoch seconds of last refill


# ---------------------------------------------------------------------------
# RateLimiter
# ---------------------------------------------------------------------------

class RateLimiter:
    """Thread-safe token bucket rate limiter with per-tenant state.

    All bucket math is done in fractional seconds so partial-minute windows
    are handled correctly.

    Args:
        default_tier:  Tier applied to tenants with no explicit configuration.
        tenant_tiers:  Optional mapping of ``{tenant_id: tier_name}``.
        tenant_limits: Optional mapping of ``{tenant_id: TierDefaults}`` for
                       fully custom per-tenant limits (overrides tier lookup).
    """

    def __init__(
        self,
        default_tier: str = "starter",
        tenant_tiers: Optional[dict[str, str]] = None,
        tenant_limits: Optional[dict[str, TierDefaults]] = None,
    ) -> None:
        self._default_tier = default_tier
        self._tenant_tiers: dict[str, str] = tenant_tiers or {}
        self._tenant_limits: dict[str, TierDefaults] = tenant_limits or {}
        self._state: dict[str, _TenantState] = {}
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def check(
        self,
        tenant_id: str,
        tokens: int = 0,
    ) -> RateLimitResult:
        """Check whether a request is allowed for *tenant_id*.

        Call this **before** the LLM call.  If allowed, the token count is
        reserved in the buckets.  If denied, nothing is consumed.

        Args:
            tenant_id: Tenant identifier.
            tokens:    Estimated token count to reserve (input + output estimate).

        Returns:
            :class:`RateLimitResult` indicating allowed / denied.
        """
        limits = self._get_limits(tenant_id)
        if limits.unlimited:
            return RateLimitResult(allowed=True)

        now = time.time()
        with self._lock:
            state = self._get_or_create_state(tenant_id, limits, now)

            # 1. Refill minute buckets
            self._refill_minute_buckets(state, limits, now)

            # 2. Reset daily counter if day rolled over
            self._maybe_reset_daily(state, now)

            # 3. tokens_per_day
            if tokens > 0 and (state.tpd_count + tokens) > limits.tokens_per_day:
                remaining = limits.tokens_per_day - state.tpd_count
                seconds_to_midnight = self._seconds_to_utc_midnight(now)
                return RateLimitResult(
                    allowed=False,
                    reason=(
                        f"Daily token quota exceeded "
                        f"({state.tpd_count}/{limits.tokens_per_day}). "
                        f"Resets in {seconds_to_midnight:.0f}s."
                    ),
                    retry_after_seconds=seconds_to_midnight,
                    limit_type="tokens_per_day",
                )

            # 4. tokens_per_minute
            if tokens > 0 and state.tpm_tokens < tokens:
                deficit = tokens - state.tpm_tokens
                # Time to refill enough tokens
                rate = limits.tokens_per_minute / 60.0
                retry_after = deficit / rate if rate > 0 else 60.0
                return RateLimitResult(
                    allowed=False,
                    reason=(
                        f"Tokens-per-minute limit exceeded "
                        f"(available {state.tpm_tokens:.0f}/{limits.tokens_per_minute})."
                    ),
                    retry_after_seconds=round(retry_after, 2),
                    limit_type="tokens_per_minute",
                )

            # 5. requests_per_minute
            if state.rpm_count < 1:
                rate = limits.requests_per_minute / 60.0
                retry_after = (1 - state.rpm_count) / rate if rate > 0 else 60.0
                return RateLimitResult(
                    allowed=False,
                    reason=(
                        f"Requests-per-minute limit exceeded "
                        f"({limits.requests_per_minute} req/min)."
                    ),
                    retry_after_seconds=round(retry_after, 2),
                    limit_type="requests_per_minute",
                )

            # All checks passed — consume
            if tokens > 0:
                state.tpm_tokens -= tokens
                state.tpd_count += tokens
            state.rpm_count -= 1
            return RateLimitResult(allowed=True)

    def consume(self, tenant_id: str, tokens: int) -> None:
        """Post-call token consumption correction.

        Call this **after** the LLM call with the actual token count to
        reconcile any estimation difference.  Does not enforce limits —
        purely adjusts bucket levels.

        Args:
            tenant_id: Tenant identifier.
            tokens:    Actual tokens consumed.
        """
        limits = self._get_limits(tenant_id)
        if limits.unlimited:
            return
        now = time.time()
        with self._lock:
            state = self._get_or_create_state(tenant_id, limits, now)
            state.tpm_tokens = max(0.0, state.tpm_tokens - tokens)
            state.tpd_count += tokens

    def reset(self, tenant_id: str) -> None:
        """Reset all buckets for a tenant (e.g. after a billing cycle upgrade).

        Args:
            tenant_id: Tenant to reset.
        """
        with self._lock:
            self._state.pop(tenant_id, None)

    def set_tier(self, tenant_id: str, tier: str) -> None:
        """Assign a tier to a tenant and reset their buckets.

        Args:
            tenant_id: Tenant to configure.
            tier:      Tier name from :data:`TIER_DEFAULTS`.
        """
        if tier not in TIER_DEFAULTS:
            raise ValueError(f"Unknown tier '{tier}'. Valid: {list(TIER_DEFAULTS)}")
        with self._lock:
            self._tenant_tiers[tenant_id] = tier
            self._state.pop(tenant_id, None)

    def set_custom_limits(self, tenant_id: str, limits: TierDefaults) -> None:
        """Set fully custom limits for a specific tenant.

        Args:
            tenant_id: Tenant to configure.
            limits:    :class:`TierDefaults` with custom values.
        """
        with self._lock:
            self._tenant_limits[tenant_id] = limits
            self._state.pop(tenant_id, None)

    def usage_snapshot(self, tenant_id: str) -> dict:
        """Return a snapshot of current usage for a tenant.

        Args:
            tenant_id: Tenant identifier.

        Returns:
            Dict with current bucket levels and limits.
        """
        limits = self._get_limits(tenant_id)
        now = time.time()
        with self._lock:
            state = self._get_or_create_state(tenant_id, limits, now)
            self._refill_minute_buckets(state, limits, now)
            self._maybe_reset_daily(state, now)
            return {
                "tenant_id": tenant_id,
                "unlimited": limits.unlimited,
                "tpm_available": round(state.tpm_tokens, 2),
                "tpm_limit": limits.tokens_per_minute,
                "tpd_used": state.tpd_count,
                "tpd_limit": limits.tokens_per_day,
                "rpm_available": round(state.rpm_count, 2),
                "rpm_limit": limits.requests_per_minute,
            }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_limits(self, tenant_id: str) -> TierDefaults:
        """Resolve effective limits for a tenant."""
        if tenant_id in self._tenant_limits:
            return self._tenant_limits[tenant_id]
        tier = self._tenant_tiers.get(tenant_id, self._default_tier)
        return TIER_DEFAULTS.get(tier, TIER_DEFAULTS["starter"])

    def _get_or_create_state(
        self, tenant_id: str, limits: TierDefaults, now: float
    ) -> _TenantState:
        """Retrieve or initialise per-tenant state (must be called with lock held)."""
        if tenant_id not in self._state:
            today = int(now // 86400)
            self._state[tenant_id] = _TenantState(
                tpm_tokens=float(limits.tokens_per_minute),
                tpm_last_refill=now,
                tpd_count=0,
                tpd_day=today,
                rpm_count=float(limits.requests_per_minute),
                rpm_last_refill=now,
            )
        return self._state[tenant_id]

    @staticmethod
    def _refill_minute_buckets(
        state: _TenantState, limits: TierDefaults, now: float
    ) -> None:
        """Refill tpm and rpm buckets proportionally to elapsed time."""
        # TPM refill
        elapsed = now - state.tpm_last_refill
        if elapsed > 0:
            rate = limits.tokens_per_minute / 60.0
            state.tpm_tokens = min(
                float(limits.tokens_per_minute),
                state.tpm_tokens + elapsed * rate,
            )
            state.tpm_last_refill = now

        # RPM refill
        elapsed_rpm = now - state.rpm_last_refill
        if elapsed_rpm > 0:
            rate_rpm = limits.requests_per_minute / 60.0
            state.rpm_count = min(
                float(limits.requests_per_minute),
                state.rpm_count + elapsed_rpm * rate_rpm,
            )
            state.rpm_last_refill = now

    @staticmethod
    def _maybe_reset_daily(state: _TenantState, now: float) -> None:
        """Reset the daily token counter if a UTC day boundary has passed."""
        today = int(now // 86400)
        if today != state.tpd_day:
            state.tpd_count = 0
            state.tpd_day = today

    @staticmethod
    def _seconds_to_utc_midnight(now: float) -> float:
        """Seconds remaining until the next UTC midnight."""
        seconds_today = now % 86400
        return 86400.0 - seconds_today


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_limiter: Optional[RateLimiter] = None
_limiter_lock = threading.Lock()


def get_limiter(
    default_tier: str = "starter",
    tenant_tiers: Optional[dict[str, str]] = None,
    tenant_limits: Optional[dict[str, TierDefaults]] = None,
) -> RateLimiter:
    """Return the module-level :class:`RateLimiter` singleton.

    First call initialises with the provided parameters; subsequent calls
    return the same instance.

    Args:
        default_tier:  Default tier for new tenants.
        tenant_tiers:  Optional ``{tenant_id: tier}`` mapping.
        tenant_limits: Optional ``{tenant_id: TierDefaults}`` overrides.

    Returns:
        Shared :class:`RateLimiter` instance.
    """
    global _limiter
    if _limiter is None:
        with _limiter_lock:
            if _limiter is None:
                _limiter = RateLimiter(
                    default_tier=default_tier,
                    tenant_tiers=tenant_tiers,
                    tenant_limits=tenant_limits,
                )
    return _limiter
