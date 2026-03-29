"""Tests for core.metering — token counting, cost calculation, rate limiting,
persistence, and budget alerts.

Run with:
    cd /path/to/paganini && python -m pytest tests/test_metering.py -v
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import threading
import time
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Ensure project root is importable
# ---------------------------------------------------------------------------
_PROJECT_ROOT = Path(__file__).parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fresh_persistence(tmp_path: Path, batch_size: int = 100, flush_interval: float = 999.0):
    """Create an isolated UsagePersistence instance pointing at tmp_path."""
    from core.metering.persistence import UsagePersistence
    p = tmp_path / "usage.jsonl"
    return UsagePersistence(
        output_path=str(p),
        batch_size=batch_size,
        flush_interval_seconds=flush_interval,
    )


def _fresh_limiter(**kwargs):
    """Create an isolated RateLimiter (not the global singleton)."""
    from core.metering.limiter import RateLimiter
    return RateLimiter(**kwargs)


def _fresh_alerts(**kwargs):
    """Create an isolated BudgetAlerts (not the global singleton)."""
    from core.metering.alerts import BudgetAlerts
    return BudgetAlerts(**kwargs)


def _fresh_counter(persistence, limiter, alerts, **kwargs):
    """Create an isolated TokenCounter wired to fresh sub-components."""
    # Patch module-level singletons so the counter uses our isolated instances
    import core.metering.persistence as pm
    import core.metering.limiter as lm
    import core.metering.alerts as am
    import core.metering.cost as cm
    from core.metering.counter import TokenCounter

    original_gp = pm.get_persistence
    original_gl = lm.get_limiter
    original_ga = am.get_alerts

    pm.get_persistence = lambda *a, **kw: persistence
    lm.get_limiter = lambda *a, **kw: limiter
    am.get_alerts = lambda *a, **kw: alerts

    counter = TokenCounter(**kwargs)
    yield counter

    pm.get_persistence = original_gp
    lm.get_limiter = original_gl
    am.get_alerts = original_ga


# ===========================================================================
# COST CALCULATOR
# ===========================================================================

class TestCostCalculator:
    """Tests for core.metering.cost.CostCalculator."""

    def setup_method(self):
        from core.metering.cost import CostCalculator
        self.calc = CostCalculator()

    # ------------------------------------------------------------------
    # Pricing lookup
    # ------------------------------------------------------------------

    def test_known_model_returns_correct_pricing(self):
        pricing = self.calc.get_pricing("gpt-4o-mini")
        assert pricing.model_id == "gpt-4o-mini"
        assert pricing.provider == "openai"
        assert pricing.input_per_1k > 0

    def test_case_insensitive_lookup(self):
        p1 = self.calc.get_pricing("GPT-4O-MINI")
        p2 = self.calc.get_pricing("gpt-4o-mini")
        assert p1.model_id == p2.model_id

    def test_provider_prefix_stripping(self):
        p = self.calc.get_pricing("gemini/gemini-2.5-flash")
        assert p.provider == "google"

    def test_unknown_model_returns_fallback(self):
        p = self.calc.get_pricing("totally-unknown-model-xyz")
        assert p.model_id == "__fallback__"
        assert p.input_per_1k > 0

    # ------------------------------------------------------------------
    # Cost calculation — each major model family
    # ------------------------------------------------------------------

    def test_qwen_7b_cost(self):
        cost = self.calc.calculate("qwen-7b", input_tokens=1000, output_tokens=500)
        assert cost.llm_cost_usd > 0
        assert cost.total_cost_usd == pytest.approx(
            (1000 / 1000) * 0.0002 + (500 / 1000) * 0.0002, rel=1e-5
        )

    def test_qwen_27b_cost(self):
        cost = self.calc.calculate("qwen-27b", input_tokens=1000, output_tokens=1000)
        expected = (1000 / 1000) * 0.0008 + (1000 / 1000) * 0.0008
        assert cost.llm_cost_usd == pytest.approx(expected, rel=1e-5)

    def test_gpt4o_mini_cost(self):
        cost = self.calc.calculate("gpt-4o-mini", input_tokens=10_000, output_tokens=2_000)
        expected_in = (10_000 / 1000) * 0.00015
        expected_out = (2_000 / 1000) * 0.0006
        assert cost.llm_cost_usd == pytest.approx(expected_in + expected_out, rel=1e-5)

    def test_claude_sonnet_cost(self):
        cost = self.calc.calculate("claude-3-5-sonnet", input_tokens=500, output_tokens=500)
        assert cost.llm_cost_usd > 0

    def test_gemini_flash_cost(self):
        cost = self.calc.calculate("gemini-2.5-flash", input_tokens=1000, output_tokens=1000)
        assert cost.llm_cost_usd > 0

    # ------------------------------------------------------------------
    # BYOK mode
    # ------------------------------------------------------------------

    def test_byok_zeroes_all_costs(self):
        cost = self.calc.calculate("gpt-4o", input_tokens=10_000, output_tokens=5_000, byok=True)
        assert cost.llm_cost_usd == 0.0
        assert cost.embedding_cost_usd == 0.0
        assert cost.reranker_cost_usd == 0.0
        assert cost.total_cost_usd == 0.0

    def test_byok_still_returns_cost_object(self):
        from core.metering.cost import CompositeCost
        cost = self.calc.calculate("gpt-4o", input_tokens=1000, output_tokens=500, byok=True)
        assert isinstance(cost, CompositeCost)

    # ------------------------------------------------------------------
    # Composite cost
    # ------------------------------------------------------------------

    def test_composite_cost_includes_embeddings(self):
        cost = self.calc.calculate(
            "gpt-4o-mini",
            input_tokens=1000,
            output_tokens=500,
            embedding_tokens=2000,
            embedding_model="text-embedding-3-small",
        )
        assert cost.embedding_cost_usd > 0
        assert cost.total_cost_usd == pytest.approx(
            cost.llm_cost_usd + cost.embedding_cost_usd + cost.reranker_cost_usd, rel=1e-8
        )

    def test_composite_total_is_sum(self):
        cost = self.calc.calculate(
            "claude-3-5-sonnet",
            input_tokens=1000,
            output_tokens=1000,
            embedding_tokens=500,
            embedding_model="text-embedding-3-small",
        )
        manual_total = cost.llm_cost_usd + cost.embedding_cost_usd + cost.reranker_cost_usd
        assert cost.total_cost_usd == pytest.approx(manual_total, rel=1e-8)

    def test_zero_tokens_gives_zero_cost(self):
        cost = self.calc.calculate("gpt-4o-mini", input_tokens=0, output_tokens=0)
        assert cost.llm_cost_usd == 0.0
        assert cost.total_cost_usd == 0.0

    # ------------------------------------------------------------------
    # list_models
    # ------------------------------------------------------------------

    def test_list_models_returns_all(self):
        models = self.calc.list_models()
        assert len(models) > 5

    def test_list_models_filters_by_provider(self):
        openai_models = self.calc.list_models(provider="openai")
        assert all(m.provider == "openai" for m in openai_models)
        assert len(openai_models) > 0

    def test_list_models_google(self):
        google_models = self.calc.list_models(provider="google")
        assert len(google_models) > 0

    def test_list_models_qwen(self):
        qwen_models = self.calc.list_models(provider="qwen")
        assert len(qwen_models) >= 2


# ===========================================================================
# RATE LIMITER
# ===========================================================================

class TestRateLimiter:
    """Tests for core.metering.limiter.RateLimiter."""

    def test_allow_within_limits(self):
        limiter = _fresh_limiter(default_tier="starter")
        result = limiter.check("t1", tokens=100)
        assert result.allowed is True

    def test_deny_over_tpm(self):
        from core.metering.limiter import TierDefaults, RateLimiter
        tiny = TierDefaults(tokens_per_minute=10, tokens_per_day=1_000_000, requests_per_minute=1000)
        limiter = RateLimiter()
        limiter.set_custom_limits("t1", tiny)
        # Exhaust the TPM bucket
        result = limiter.check("t1", tokens=11)
        assert result.allowed is False
        assert result.limit_type == "tokens_per_minute"

    def test_deny_over_tpd(self):
        from core.metering.limiter import TierDefaults, RateLimiter
        tiny = TierDefaults(tokens_per_minute=1_000_000, tokens_per_day=5, requests_per_minute=1000)
        limiter = RateLimiter()
        limiter.set_custom_limits("t1", tiny)
        result = limiter.check("t1", tokens=6)
        assert result.allowed is False
        assert result.limit_type == "tokens_per_day"

    def test_deny_over_rpm(self):
        from core.metering.limiter import TierDefaults, RateLimiter
        tiny = TierDefaults(tokens_per_minute=1_000_000, tokens_per_day=1_000_000, requests_per_minute=1)
        limiter = RateLimiter()
        limiter.set_custom_limits("t1", tiny)
        # First request should pass
        r1 = limiter.check("t1", tokens=1)
        assert r1.allowed is True
        # Second request in same second should fail (only 1 req/min)
        r2 = limiter.check("t1", tokens=1)
        assert r2.allowed is False
        assert r2.limit_type == "requests_per_minute"

    def test_retry_after_is_positive(self):
        from core.metering.limiter import TierDefaults, RateLimiter
        tiny = TierDefaults(tokens_per_minute=10, tokens_per_day=1_000_000, requests_per_minute=1000)
        limiter = RateLimiter()
        limiter.set_custom_limits("t1", tiny)
        result = limiter.check("t1", tokens=11)
        assert result.retry_after_seconds > 0

    def test_reset_clears_state(self):
        from core.metering.limiter import TierDefaults, RateLimiter
        tiny = TierDefaults(tokens_per_minute=5, tokens_per_day=1_000_000, requests_per_minute=1000)
        limiter = RateLimiter()
        limiter.set_custom_limits("t1", tiny)
        # Exhaust
        limiter.check("t1", tokens=6)
        # Reset
        limiter.reset("t1")
        result = limiter.check("t1", tokens=4)
        assert result.allowed is True

    def test_enterprise_tier_is_unlimited(self):
        limiter = _fresh_limiter(default_tier="enterprise")
        # Enterprise should pass even with a huge token count
        result = limiter.check("t1", tokens=999_999_999)
        assert result.allowed is True

    def test_starter_tier_defaults(self):
        from core.metering.limiter import TIER_DEFAULTS
        starter = TIER_DEFAULTS["starter"]
        assert starter.tokens_per_day == 100_000
        assert starter.tokens_per_minute == 10_000
        assert starter.requests_per_minute == 60

    def test_professional_tier_defaults(self):
        from core.metering.limiter import TIER_DEFAULTS
        pro = TIER_DEFAULTS["professional"]
        assert pro.tokens_per_day == 1_000_000
        assert not pro.unlimited

    def test_set_tier_invalid_raises(self):
        limiter = _fresh_limiter()
        with pytest.raises(ValueError):
            limiter.set_tier("t1", "nonexistent_tier")

    def test_usage_snapshot(self):
        limiter = _fresh_limiter(default_tier="starter")
        limiter.check("t1", tokens=100)
        snap = limiter.usage_snapshot("t1")
        assert snap["tenant_id"] == "t1"
        assert "tpd_used" in snap

    def test_different_tenants_are_isolated(self):
        from core.metering.limiter import TierDefaults, RateLimiter
        tiny = TierDefaults(tokens_per_minute=5, tokens_per_day=5, requests_per_minute=1000)
        limiter = RateLimiter()
        limiter.set_custom_limits("t_tiny", tiny)
        limiter.set_custom_limits("t_big", TierDefaults(
            tokens_per_minute=1_000_000, tokens_per_day=1_000_000, requests_per_minute=1000
        ))
        r_tiny = limiter.check("t_tiny", tokens=6)
        r_big = limiter.check("t_big", tokens=6)
        assert r_tiny.allowed is False
        assert r_big.allowed is True

    def test_thread_safety(self):
        """Concurrent checks from multiple threads must not corrupt state."""
        limiter = _fresh_limiter(default_tier="professional")
        errors = []

        def worker():
            try:
                for _ in range(20):
                    limiter.check("shared_tenant", tokens=10)
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=worker) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert errors == [], f"Thread errors: {errors}"


# ===========================================================================
# PERSISTENCE
# ===========================================================================

class TestUsagePersistence:
    """Tests for core.metering.persistence.UsagePersistence."""

    def test_record_and_flush(self, tmp_path):
        persistence = _fresh_persistence(tmp_path, batch_size=100)
        from core.metering.persistence import UsageEvent
        event = UsageEvent(
            tenant_id="acme",
            agent_id="gestor",
            model="gpt-4o-mini",
            input_tokens=500,
            output_tokens=100,
            cost_usd=0.0002,
        )
        persistence.record(event)
        persistence.flush()

        events = persistence.read_events()
        assert len(events) == 1
        assert events[0]["tenant_id"] == "acme"

    def test_batch_flush_triggers_at_batch_size(self, tmp_path):
        from core.metering.persistence import UsageEvent
        persistence = _fresh_persistence(tmp_path, batch_size=3)

        for i in range(3):
            persistence.record(UsageEvent(
                tenant_id=f"t{i}",
                agent_id="a",
                model="gpt-4o-mini",
                input_tokens=10,
                output_tokens=5,
                cost_usd=0.0001,
            ))
        # Batch size 3 was hit — file should be written
        events = persistence.read_events()
        assert len(events) == 3

    def test_usage_event_schema_fields(self, tmp_path):
        from core.metering.persistence import UsageEvent
        persistence = _fresh_persistence(tmp_path)
        event = UsageEvent(
            tenant_id="t1",
            agent_id="risk",
            model="claude-3-5-sonnet",
            input_tokens=1024,
            output_tokens=256,
            cost_usd=0.005,
            query_type="analytical",
            latency_ms=342,
            query_id="q-test-001",
        )
        persistence.record(event)
        persistence.flush()

        raw = persistence.read_events()[0]
        assert raw["timestamp"]
        assert raw["tenant_id"] == "t1"
        assert raw["agent_id"] == "risk"
        assert raw["model"] == "claude-3-5-sonnet"
        assert raw["input_tokens"] == 1024
        assert raw["output_tokens"] == 256
        assert raw["cost_usd"] == pytest.approx(0.005)
        assert raw["query_type"] == "analytical"
        assert raw["latency_ms"] == 342
        assert raw["query_id"] == "q-test-001"

    def test_read_events_limit(self, tmp_path):
        from core.metering.persistence import UsageEvent
        persistence = _fresh_persistence(tmp_path, batch_size=2)

        for i in range(4):
            persistence.record(UsageEvent(
                tenant_id="t1",
                agent_id="a",
                model="m",
                input_tokens=i,
                output_tokens=i,
                cost_usd=0.0,
            ))
        persistence.flush()

        events = persistence.read_events(limit=2)
        assert len(events) == 2

    def test_stats(self, tmp_path):
        from core.metering.persistence import UsageEvent
        persistence = _fresh_persistence(tmp_path, batch_size=100)
        persistence.record(UsageEvent(
            tenant_id="t1", agent_id="a", model="m",
            input_tokens=10, output_tokens=5, cost_usd=0.0
        ))
        stats = persistence.stats()
        assert stats["buffered"] == 1
        assert stats["total_flushed"] == 0

        persistence.flush()
        stats2 = persistence.stats()
        assert stats2["buffered"] == 0
        assert stats2["total_flushed"] == 1

    def test_jsonl_output_is_valid(self, tmp_path):
        from core.metering.persistence import UsageEvent
        persistence = _fresh_persistence(tmp_path, batch_size=1)
        persistence.record(UsageEvent(
            tenant_id="t1", agent_id="a", model="m",
            input_tokens=10, output_tokens=5, cost_usd=0.0
        ))
        path = tmp_path / "usage.jsonl"
        assert path.exists()
        with path.open() as f:
            for line in f:
                obj = json.loads(line)  # Should not raise
                assert isinstance(obj, dict)

    def test_thread_safe_recording(self, tmp_path):
        from core.metering.persistence import UsageEvent
        persistence = _fresh_persistence(tmp_path, batch_size=1000)
        errors = []

        def worker(n):
            try:
                for i in range(10):
                    persistence.record(UsageEvent(
                        tenant_id=f"t{n}",
                        agent_id="a",
                        model="m",
                        input_tokens=i,
                        output_tokens=i,
                        cost_usd=0.0,
                    ))
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=worker, args=(n,)) for n in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert errors == []
        persistence.flush()
        events = persistence.read_events()
        assert len(events) == 50  # 5 threads × 10 events


# ===========================================================================
# BUDGET ALERTS
# ===========================================================================

class TestBudgetAlerts:
    """Tests for core.metering.alerts.BudgetAlerts."""

    def test_no_alert_below_50pct(self):
        alerts = _fresh_alerts(budgets={"t1": 100.0})
        alerts.add_spend("t1", 40.0)
        result = alerts.check_tenant("t1")
        assert result == []

    def test_alert_at_50pct(self):
        from core.metering.alerts import AlertLevel
        alerts = _fresh_alerts(budgets={"t1": 100.0})
        alerts.add_spend("t1", 50.0)
        result = alerts.check_tenant("t1")
        assert len(result) == 1
        assert result[0].level == AlertLevel.INFO
        assert result[0].threshold_pct == 0.50

    def test_alert_at_80pct(self):
        from core.metering.alerts import AlertLevel
        alerts = _fresh_alerts(budgets={"t1": 100.0})
        alerts.add_spend("t1", 80.0)
        result = alerts.check_tenant("t1")
        levels = {a.level for a in result}
        assert AlertLevel.INFO in levels
        assert AlertLevel.WARNING in levels

    def test_alert_at_95pct(self):
        from core.metering.alerts import AlertLevel
        alerts = _fresh_alerts(budgets={"t1": 100.0})
        alerts.add_spend("t1", 95.0)
        result = alerts.check_tenant("t1")
        levels = {a.level for a in result}
        assert AlertLevel.CRITICAL in levels

    def test_alert_at_100pct(self):
        from core.metering.alerts import AlertLevel
        alerts = _fresh_alerts(budgets={"t1": 100.0})
        alerts.add_spend("t1", 100.0)
        result = alerts.check_tenant("t1")
        levels = {a.level for a in result}
        assert AlertLevel.EXHAUSTED in levels

    def test_over_100pct_shows_exhausted(self):
        from core.metering.alerts import AlertLevel
        alerts = _fresh_alerts(budgets={"t1": 10.0})
        alerts.add_spend("t1", 15.0)  # 150%
        result = alerts.check_tenant("t1")
        levels = {a.level for a in result}
        assert AlertLevel.EXHAUSTED in levels

    def test_already_sent_flag(self):
        alerts = _fresh_alerts(budgets={"t1": 100.0})
        alerts.add_spend("t1", 60.0)
        # First check — should NOT be already sent
        r1 = alerts.check_tenant("t1")
        assert any(not a.already_sent for a in r1)

        # Second check — same thresholds already marked
        r2 = alerts.check_tenant("t1")
        assert all(a.already_sent for a in r2)

    def test_reset_period_clears_spend_and_alerts(self):
        from core.metering.alerts import AlertLevel
        alerts = _fresh_alerts(budgets={"t1": 100.0})
        alerts.add_spend("t1", 90.0)
        alerts.check_tenant("t1")  # mark thresholds
        alerts.reset_period("t1")
        alerts.add_spend("t1", 60.0)
        r = alerts.check_tenant("t1")
        # After reset, 60% should trigger INFO (not already_sent)
        assert any(not a.already_sent and a.level == AlertLevel.INFO for a in r)

    def test_unknown_tenant_returns_empty(self):
        alerts = _fresh_alerts()
        result = alerts.check_tenant("nobody")
        assert result == []

    def test_check_all(self):
        alerts = _fresh_alerts(budgets={"t1": 100.0, "t2": 50.0})
        alerts.add_spend("t1", 55.0)
        alerts.add_spend("t2", 10.0)
        all_alerts = alerts.check_all()
        assert "t1" in all_alerts
        assert "t2" not in all_alerts  # t2 hasn't crossed 50%

    def test_spend_pct_in_alert(self):
        alerts = _fresh_alerts(budgets={"t1": 200.0})
        alerts.add_spend("t1", 100.0)
        result = alerts.check_tenant("t1")
        assert result[0].spend_pct == pytest.approx(0.5)

    def test_message_contains_tenant(self):
        alerts = _fresh_alerts(budgets={"acme-corp": 1000.0})
        alerts.add_spend("acme-corp", 510.0)
        result = alerts.check_tenant("acme-corp")
        assert "acme-corp" in result[0].message

    def test_negative_budget_raises(self):
        alerts = _fresh_alerts()
        with pytest.raises(ValueError):
            alerts.set_budget("t1", -10.0)

    def test_negative_spend_raises(self):
        alerts = _fresh_alerts(budgets={"t1": 100.0})
        with pytest.raises(ValueError):
            alerts.add_spend("t1", -5.0)

    def test_status_returns_none_for_unknown(self):
        alerts = _fresh_alerts()
        assert alerts.status("nobody") is None

    def test_status_returns_dict_for_known(self):
        alerts = _fresh_alerts(budgets={"t1": 100.0})
        alerts.add_spend("t1", 25.0)
        status = alerts.status("t1")
        assert status is not None
        assert status["spend_pct"] == pytest.approx(25.0)

    def test_thread_safety(self):
        """Concurrent add_spend calls must not corrupt spend total."""
        alerts = _fresh_alerts(budgets={"t1": 1_000_000.0})
        errors = []

        def worker():
            try:
                for _ in range(100):
                    alerts.add_spend("t1", 1.0)
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=worker) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert errors == []
        # 10 threads × 100 spend = $1000
        assert alerts.get_spend("t1") == pytest.approx(1000.0, rel=1e-6)


# ===========================================================================
# TOKEN COUNTER (integration)
# ===========================================================================

class TestTokenCounter:
    """Integration tests for core.metering.counter.TokenCounter.

    Patches ``core.metering.counter``'s getter references (get_persistence,
    get_limiter, get_alerts) directly — that is where they are called at
    runtime, so patching the sub-module singletons alone is not enough.
    """

    def _setup_isolation(self, tmp_path, extra_limiter=None):
        """Patch counter module's getters to use fresh isolated instances."""
        import core.metering.counter as cc
        from core.metering.persistence import UsagePersistence
        from core.metering.limiter import RateLimiter
        from core.metering.alerts import BudgetAlerts

        self._persistence = UsagePersistence(
            output_path=str(tmp_path / "usage.jsonl"),
            batch_size=100,
            flush_interval_seconds=999,
        )
        self._rate_limiter = extra_limiter or RateLimiter(default_tier="professional")
        self._budget_alerts = BudgetAlerts()

        # Save originals and patch counter module namespace
        self._cc = cc
        self._orig = {
            "get_persistence": cc.get_persistence,
            "get_limiter": cc.get_limiter,
            "get_alerts": cc.get_alerts,
        }
        p, rl, ba = self._persistence, self._rate_limiter, self._budget_alerts
        cc.get_persistence = lambda *a, **kw: p
        cc.get_limiter = lambda *a, **kw: rl
        cc.get_alerts = lambda *a, **kw: ba

    def teardown_method(self):
        if hasattr(self, "_cc") and hasattr(self, "_orig"):
            for name, fn in self._orig.items():
                setattr(self._cc, name, fn)

    def test_track_records_event(self, tmp_path):
        from core.metering.counter import TokenCounter
        self._setup_isolation(tmp_path)
        counter = TokenCounter()

        with counter.track("t1", agent_id="gestor", model="gpt-4o-mini") as ctx:
            ctx.finish(input_tokens=100, output_tokens=50)

        self._persistence.flush()
        events = self._persistence.read_events()
        assert len(events) == 1
        assert events[0]["tenant_id"] == "t1"
        assert events[0]["input_tokens"] == 100
        assert events[0]["output_tokens"] == 50

    def test_track_calculates_cost(self, tmp_path):
        from core.metering.counter import TokenCounter
        self._setup_isolation(tmp_path)
        counter = TokenCounter()

        with counter.track("t1", model="gpt-4o-mini") as ctx:
            cost = ctx.finish(input_tokens=1000, output_tokens=500)
        assert cost.total_cost_usd > 0

    def test_byok_tenant_has_zero_cost(self, tmp_path):
        from core.metering.counter import TokenCounter
        self._setup_isolation(tmp_path)
        counter = TokenCounter(byok_tenants={"byok_t"})

        with counter.track("byok_t", model="gpt-4o") as ctx:
            cost = ctx.finish(input_tokens=10_000, output_tokens=5_000)
        assert cost.total_cost_usd == 0.0

        self._persistence.flush()
        events = self._persistence.read_events()
        assert events[0]["cost_usd"] == 0.0

    def test_metering_disabled_is_noop(self, tmp_path):
        from core.metering.counter import TokenCounter
        self._setup_isolation(tmp_path)
        counter = TokenCounter(enabled=False)

        with counter.track("t1", model="gpt-4o-mini") as ctx:
            ctx.finish(input_tokens=1000, output_tokens=500)

        self._persistence.flush()
        events = self._persistence.read_events()
        assert events == []

    def test_rate_limit_blocks_when_enforced(self, tmp_path):
        from core.metering.counter import TokenCounter
        from core.metering.limiter import TierDefaults, RateLimiter

        tiny = TierDefaults(tokens_per_minute=5, tokens_per_day=1_000_000, requests_per_minute=1000)
        small_limiter = RateLimiter()
        small_limiter.set_custom_limits("t1", tiny)

        self._setup_isolation(tmp_path, extra_limiter=small_limiter)
        counter = TokenCounter(enforce_limits=True)

        with pytest.raises(PermissionError):
            with counter.track("t1", model="gpt-4o-mini", estimated_tokens=10) as ctx:
                ctx.finish(input_tokens=10, output_tokens=0)

    def test_rate_limit_passes_when_not_enforced(self, tmp_path):
        from core.metering.counter import TokenCounter
        from core.metering.limiter import TierDefaults, RateLimiter

        tiny = TierDefaults(tokens_per_minute=1, tokens_per_day=1_000_000, requests_per_minute=1000)
        small_limiter = RateLimiter()
        small_limiter.set_custom_limits("t1", tiny)

        self._setup_isolation(tmp_path, extra_limiter=small_limiter)
        counter = TokenCounter(enforce_limits=False)

        with counter.track("t1", model="gpt-4o-mini", estimated_tokens=100) as ctx:
            ctx.finish(input_tokens=100, output_tokens=50)

    def test_stats_accumulate(self, tmp_path):
        from core.metering.counter import TokenCounter
        self._setup_isolation(tmp_path)
        counter = TokenCounter()

        with counter.track("t1", model="gpt-4o-mini") as ctx:
            ctx.finish(input_tokens=100, output_tokens=50)
        with counter.track("t2", model="gpt-4o-mini") as ctx:
            ctx.finish(input_tokens=200, output_tokens=100)

        stats = counter.stats()
        assert stats["total_requests"] == 2
        assert stats["total_input_tokens"] == 300
        assert stats["total_output_tokens"] == 150

    def test_record_direct(self, tmp_path):
        from core.metering.counter import TokenCounter
        self._setup_isolation(tmp_path)
        counter = TokenCounter()

        event = counter.record_direct(
            tenant_id="t1",
            agent_id="risk",
            model="claude-3-5-sonnet",
            input_tokens=500,
            output_tokens=100,
            query_type="analytical",
            latency_ms=200,
        )
        assert event.tenant_id == "t1"
        self._persistence.flush()
        events = self._persistence.read_events()
        assert len(events) == 1

    def test_context_latency_positive(self, tmp_path):
        from core.metering.counter import TokenCounter
        self._setup_isolation(tmp_path)
        counter = TokenCounter()

        with counter.track("t1", model="gpt-4o-mini") as ctx:
            time.sleep(0.01)
            ctx.finish(input_tokens=10, output_tokens=5)
        assert ctx.latency_ms >= 10

    def test_finish_not_called_still_records(self, tmp_path):
        """If ctx.finish() is not called (e.g. on error), we still record zeros."""
        from core.metering.counter import TokenCounter
        self._setup_isolation(tmp_path)
        counter = TokenCounter()

        try:
            with counter.track("t1", model="gpt-4o-mini") as ctx:
                raise ValueError("simulated LLM error")
        except ValueError:
            pass

        self._persistence.flush()
        events = self._persistence.read_events()
        assert len(events) == 1
        assert events[0]["input_tokens"] == 0



class TestSingletons:
    """Verify module-level singleton factories return consistent instances."""

    def test_get_cost_calculator_same_instance(self):
        import core.metering.cost as cm
        cm._calculator = None
        from core.metering.cost import get_cost_calculator
        a = get_cost_calculator()
        b = get_cost_calculator()
        assert a is b

    def test_get_limiter_same_instance(self):
        import core.metering.limiter as lm
        lm._limiter = None
        from core.metering.limiter import get_limiter
        a = get_limiter()
        b = get_limiter()
        assert a is b

    def test_get_alerts_same_instance(self):
        import core.metering.alerts as am
        am._alerts = None
        from core.metering.alerts import get_alerts
        a = get_alerts()
        b = get_alerts()
        assert a is b

    def test_get_persistence_same_instance(self, tmp_path):
        import core.metering.persistence as pm
        pm._persistence = None
        from core.metering.persistence import get_persistence
        a = get_persistence(output_path=str(tmp_path / "u.jsonl"))
        b = get_persistence()
        assert a is b
        pm._persistence = None  # cleanup

    def test_get_counter_same_instance(self):
        import core.metering.counter as cm
        cm._counter = None
        from core.metering.counter import get_counter
        a = get_counter()
        b = get_counter()
        assert a is b
        cm._counter = None  # cleanup


# ===========================================================================
# USAGE EVENT DATACLASS
# ===========================================================================

class TestUsageEvent:
    """Tests for the UsageEvent schema."""

    def test_timestamp_is_auto_set(self):
        from core.metering.persistence import UsageEvent
        event = UsageEvent(tenant_id="t", agent_id="a", model="m", input_tokens=0, output_tokens=0, cost_usd=0.0)
        assert event.timestamp.endswith("Z")
        assert "T" in event.timestamp

    def test_to_dict_has_all_fields(self):
        from core.metering.persistence import UsageEvent
        event = UsageEvent(tenant_id="t", agent_id="a", model="m", input_tokens=10, output_tokens=5, cost_usd=0.001)
        d = event.to_dict()
        for field_name in ["timestamp", "tenant_id", "agent_id", "model", "input_tokens",
                           "output_tokens", "cost_usd", "query_type", "latency_ms"]:
            assert field_name in d

    def test_to_jsonl_is_valid_json(self):
        from core.metering.persistence import UsageEvent
        event = UsageEvent(tenant_id="t", agent_id="a", model="m", input_tokens=1, output_tokens=1, cost_usd=0.0)
        line = event.to_jsonl()
        parsed = json.loads(line)
        assert parsed["tenant_id"] == "t"
