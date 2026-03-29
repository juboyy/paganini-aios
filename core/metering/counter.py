"""PAGANINI Metering — Token counter middleware.

Provides a context-manager based API for intercepting LLM calls and capturing
token usage metadata.  The :class:`TokenCounter` singleton is accessible from
any channel (API, Slack, Telegram, CLI) via :func:`get_counter`.

Usage::

    counter = get_counter()

    with counter.track(
        tenant_id="acme",
        agent_id="gestor",
        model="gpt-4o-mini",
        query_id="q-abc123",
        query_type="analytical",
    ) as ctx:
        result = llm_fn(system_prompt, user_prompt)
        # Supply actual token counts from the LLM response if available:
        ctx.finish(input_tokens=512, output_tokens=128)
        # If not available, a tiktoken-style estimate is used.

FastAPI middleware usage::

    from fastapi import Request
    from core.metering.counter import MeteringMiddleware

    app.add_middleware(MeteringMiddleware, tenant_header="X-Tenant-ID")

The counter wraps *after* routing (CognitiveRouter already decided the model)
but *before* the actual LLM call, so the rate limiter can gate the request.
"""

from __future__ import annotations

import threading
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Generator, Iterator, Optional

from core.metering.cost import get_cost_calculator, CompositeCost
from core.metering.limiter import get_limiter, RateLimitResult
from core.metering.persistence import get_persistence, UsageEvent
from core.metering.alerts import get_alerts


# ---------------------------------------------------------------------------
# MeteringContext — returned by counter.track()
# ---------------------------------------------------------------------------

@dataclass
class MeteringContext:
    """Active metering context for a single LLM call.

    Callers should invoke :meth:`finish` after the LLM call completes to
    record actual token counts.  If ``finish`` is not called, the context
    records with ``input_tokens=0, output_tokens=0`` on exit (error path).
    """

    tenant_id: str
    agent_id: str
    model: str
    query_id: str
    query_type: str
    byok: bool
    _start_time: float = field(default_factory=time.time, repr=False)
    _finished: bool = field(default=False, repr=False)
    _input_tokens: int = field(default=0, repr=False)
    _output_tokens: int = field(default=0, repr=False)
    _embedding_tokens: int = field(default=0, repr=False)
    _reranker_tokens: int = field(default=0, repr=False)
    _cost: Optional[CompositeCost] = field(default=None, repr=False)
    _rate_result: Optional[RateLimitResult] = field(default=None, repr=False)

    @property
    def latency_ms(self) -> int:
        """Elapsed time since context creation in milliseconds."""
        return int((time.time() - self._start_time) * 1000)

    @property
    def cost(self) -> Optional[CompositeCost]:
        """Composite cost calculated after :meth:`finish` is called."""
        return self._cost

    def finish(
        self,
        input_tokens: int = 0,
        output_tokens: int = 0,
        embedding_tokens: int = 0,
        reranker_tokens: int = 0,
    ) -> CompositeCost:
        """Record actual token counts and calculate cost.

        Call this immediately after the LLM call returns.

        Args:
            input_tokens:     Actual prompt token count.
            output_tokens:    Actual completion token count.
            embedding_tokens: RAG embedding token count (optional).
            reranker_tokens:  Reranker token count (optional).

        Returns:
            :class:`CompositeCost` for this request.
        """
        self._finished = True
        self._input_tokens = input_tokens
        self._output_tokens = output_tokens
        self._embedding_tokens = embedding_tokens
        self._reranker_tokens = reranker_tokens

        calc = get_cost_calculator()
        self._cost = calc.calculate(
            model=self.model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            byok=self.byok,
            embedding_tokens=embedding_tokens,
            reranker_tokens=reranker_tokens,
        )
        return self._cost

    def estimate_tokens_from_text(self, text: str) -> int:
        """Rough token estimate: ~4 chars per token (no external deps).

        Args:
            text: Text to estimate.

        Returns:
            Estimated token count.
        """
        return max(1, len(text) // 4)


# ---------------------------------------------------------------------------
# TokenCounter singleton
# ---------------------------------------------------------------------------

class TokenCounter:
    """Central token counter — orchestrates limiter, cost, persistence, alerts.

    Accessible as a singleton via :func:`get_counter`.

    Thread-safe: all state is managed through the sub-components
    (RateLimiter, UsagePersistence, BudgetAlerts) which are individually
    thread-safe.

    Args:
        enabled:          When False, the counter is a no-op passthrough.
        enforce_limits:   When False, rate limit checks run but never block.
        byok_tenants:     Set of tenant IDs that use BYOK (cost = 0).
    """

    def __init__(
        self,
        enabled: bool = True,
        enforce_limits: bool = True,
        byok_tenants: Optional[set[str]] = None,
    ) -> None:
        self._enabled = enabled
        self._enforce_limits = enforce_limits
        self._byok_tenants: set[str] = byok_tenants or set()
        self._lock = threading.Lock()
        self._total_requests: int = 0
        self._total_input_tokens: int = 0
        self._total_output_tokens: int = 0
        self._total_cost_usd: float = 0.0

    # ------------------------------------------------------------------
    # Main API
    # ------------------------------------------------------------------

    @contextmanager
    def track(
        self,
        tenant_id: str,
        agent_id: str = "unknown",
        model: str = "unknown",
        query_id: Optional[str] = None,
        query_type: str = "unknown",
        estimated_tokens: int = 0,
    ) -> Generator[MeteringContext, None, None]:
        """Context manager that wraps a single LLM call with full metering.

        Rate limiting is checked on entry.  On successful exit, the usage
        event is persisted and budget alerts are updated.

        Args:
            tenant_id:         Tenant identifier (required).
            agent_id:          Agent that initiated the call.
            model:             LLM model identifier.
            query_id:          Optional correlation ID.
            query_type:        Query intent (``"analytical"``, ``"factual"``, …).
            estimated_tokens:  Token estimate for rate limit pre-check.

        Raises:
            PermissionError: If rate limits are exceeded and ``enforce_limits=True``.

        Yields:
            :class:`MeteringContext` — caller calls ``ctx.finish(in, out)`` after LLM.
        """
        if not self._enabled:
            ctx = MeteringContext(
                tenant_id=tenant_id,
                agent_id=agent_id,
                model=model,
                query_id=query_id or str(uuid.uuid4()),
                query_type=query_type,
                byok=False,
            )
            yield ctx
            return

        qid = query_id or str(uuid.uuid4())
        byok = tenant_id in self._byok_tenants

        # 1. Rate limit check (pre-call)
        limiter = get_limiter()
        rate_result = limiter.check(tenant_id, tokens=estimated_tokens)
        if not rate_result.allowed and self._enforce_limits:
            raise PermissionError(
                f"Rate limit exceeded for tenant '{tenant_id}': {rate_result.reason} "
                f"(retry after {rate_result.retry_after_seconds:.1f}s)"
            )

        ctx = MeteringContext(
            tenant_id=tenant_id,
            agent_id=agent_id,
            model=model,
            query_id=qid,
            query_type=query_type,
            byok=byok,
        )
        ctx._rate_result = rate_result

        try:
            yield ctx
        finally:
            # 2. Record (even on error — partial usage still counts)
            latency = ctx.latency_ms
            cost = ctx._cost
            if cost is None:
                # finish() wasn't called — calculate with zeros
                cost = ctx.finish(input_tokens=0, output_tokens=0)

            # 3. Reconcile actual token count with limiter
            actual_tokens = ctx._input_tokens + ctx._output_tokens
            if actual_tokens > estimated_tokens and actual_tokens > 0:
                limiter.consume(tenant_id, actual_tokens - estimated_tokens)

            # 4. Persist usage event
            event = UsageEvent(
                tenant_id=tenant_id,
                agent_id=agent_id,
                model=model,
                input_tokens=ctx._input_tokens,
                output_tokens=ctx._output_tokens,
                cost_usd=cost.total_cost_usd,
                query_type=query_type,
                latency_ms=latency,
                query_id=qid,
                byok=byok,
            )
            get_persistence().record(event)

            # 5. Update budget alerts
            alerts = get_alerts()
            alerts.add_spend(tenant_id, cost.total_cost_usd)

            # 6. Update internal counters (thread-safe)
            with self._lock:
                self._total_requests += 1
                self._total_input_tokens += ctx._input_tokens
                self._total_output_tokens += ctx._output_tokens
                self._total_cost_usd += cost.total_cost_usd

    def record_direct(
        self,
        tenant_id: str,
        agent_id: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        query_type: str = "unknown",
        latency_ms: int = 0,
        query_id: Optional[str] = None,
        byok: bool = False,
    ) -> UsageEvent:
        """Record a usage event without the context manager (for async or callback paths).

        Args:
            tenant_id:    Tenant identifier.
            agent_id:     Agent that made the call.
            model:        Model used.
            input_tokens: Prompt token count.
            output_tokens: Completion token count.
            query_type:   Query intent.
            latency_ms:   Request latency.
            query_id:     Optional correlation ID.
            byok:         True if BYOK.

        Returns:
            The persisted :class:`UsageEvent`.
        """
        if not self._enabled:
            return UsageEvent(
                tenant_id=tenant_id,
                agent_id=agent_id,
                model=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cost_usd=0.0,
            )

        byok = byok or (tenant_id in self._byok_tenants)
        calc = get_cost_calculator()
        cost = calc.calculate(model=model, input_tokens=input_tokens, output_tokens=output_tokens, byok=byok)

        event = UsageEvent(
            tenant_id=tenant_id,
            agent_id=agent_id,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost.total_cost_usd,
            query_type=query_type,
            latency_ms=latency_ms,
            query_id=query_id or str(uuid.uuid4()),
            byok=byok,
        )
        get_persistence().record(event)
        get_alerts().add_spend(tenant_id, cost.total_cost_usd)

        with self._lock:
            self._total_requests += 1
            self._total_input_tokens += input_tokens
            self._total_output_tokens += output_tokens
            self._total_cost_usd += cost.total_cost_usd

        return event

    def stats(self) -> dict:
        """Return aggregate statistics across all tracked requests.

        Returns:
            Dict with total requests, tokens, and cost.
        """
        with self._lock:
            return {
                "enabled": self._enabled,
                "enforce_limits": self._enforce_limits,
                "total_requests": self._total_requests,
                "total_input_tokens": self._total_input_tokens,
                "total_output_tokens": self._total_output_tokens,
                "total_tokens": self._total_input_tokens + self._total_output_tokens,
                "total_cost_usd": round(self._total_cost_usd, 6),
            }

    def add_byok_tenant(self, tenant_id: str) -> None:
        """Register a tenant as BYOK (cost = 0 for LLM calls).

        Args:
            tenant_id: Tenant to mark as BYOK.
        """
        with self._lock:
            self._byok_tenants.add(tenant_id)

    def remove_byok_tenant(self, tenant_id: str) -> None:
        """Remove a tenant from BYOK mode.

        Args:
            tenant_id: Tenant to unmark.
        """
        with self._lock:
            self._byok_tenants.discard(tenant_id)


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_counter: Optional[TokenCounter] = None
_counter_lock = threading.Lock()


def get_counter(
    enabled: bool = True,
    enforce_limits: bool = True,
    byok_tenants: Optional[set[str]] = None,
) -> TokenCounter:
    """Return the module-level :class:`TokenCounter` singleton.

    First call initialises with the provided parameters; subsequent calls
    return the same instance regardless of arguments.

    Args:
        enabled:        Enable metering (pass ``False`` to disable entirely).
        enforce_limits: Block requests that exceed rate limits.
        byok_tenants:   Initial set of BYOK tenant IDs.

    Returns:
        Shared :class:`TokenCounter` instance.
    """
    global _counter
    if _counter is None:
        with _counter_lock:
            if _counter is None:
                _counter = TokenCounter(
                    enabled=enabled,
                    enforce_limits=enforce_limits,
                    byok_tenants=byok_tenants,
                )
    return _counter


# ---------------------------------------------------------------------------
# Optional FastAPI middleware
# ---------------------------------------------------------------------------

def _build_metering_middleware():
    """Build the FastAPI middleware class only if fastapi is available.

    Returns the class or None if fastapi is not installed.
    """
    try:
        from fastapi import Request
        from starlette.middleware.base import BaseHTTPMiddleware
        from starlette.responses import JSONResponse
        import json as _json

        class MeteringMiddleware(BaseHTTPMiddleware):
            """FastAPI middleware that gates LLM-bound requests through metering.

            Extracts ``tenant_id`` from a configurable request header and checks
            rate limits before the request reaches the route handler.

            On rate limit exceeded, returns HTTP 429 with ``Retry-After`` header.

            Args:
                app:            ASGI application.
                tenant_header:  HTTP header name carrying the tenant ID.
                agent_header:   HTTP header name carrying the agent ID (optional).
                llm_paths:      Path prefixes to apply metering on (default: all).
                enforce_limits: Mirror of :class:`TokenCounter` enforce flag.
            """

            def __init__(
                self,
                app,
                tenant_header: str = "X-Tenant-ID",
                agent_header: str = "X-Agent-ID",
                llm_paths: Optional[list[str]] = None,
                enforce_limits: bool = True,
            ) -> None:
                super().__init__(app)
                self._tenant_header = tenant_header
                self._agent_header = agent_header
                self._llm_paths = llm_paths  # None = all paths
                self._enforce = enforce_limits

            async def dispatch(self, request: Request, call_next):
                # Only meter configured paths
                if self._llm_paths and not any(
                    request.url.path.startswith(p) for p in self._llm_paths
                ):
                    return await call_next(request)

                tenant_id = request.headers.get(self._tenant_header, "anonymous")

                # Pre-call rate limit check
                limiter = get_limiter()
                result = limiter.check(tenant_id, tokens=0)  # token-free gate check
                if not result.allowed and self._enforce:
                    return JSONResponse(
                        status_code=429,
                        content={
                            "error": "rate_limit_exceeded",
                            "message": result.reason,
                            "retry_after": result.retry_after_seconds,
                        },
                        headers={"Retry-After": str(int(result.retry_after_seconds) + 1)},
                    )

                response = await call_next(request)
                return response

        return MeteringMiddleware

    except ImportError:
        return None


# Lazy attribute — only materialises if FastAPI is installed
def __getattr__(name: str):
    if name == "MeteringMiddleware":
        cls = _build_metering_middleware()
        if cls is None:
            raise ImportError(
                "MeteringMiddleware requires FastAPI. Install it with: pip install fastapi"
            )
        return cls
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
