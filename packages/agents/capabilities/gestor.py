"""
Gestor Agent — Portfolio allocation, concentration monitoring, rebalancing, stress testing.

Implements professional asset management for FIDCs per:
- CVM Resolução 175/22
- ANBIMA Code of Regulation and Best Practices for Investment Funds
- BACEN stress testing guidelines

Key formulas:
  weighted_average_duration = Σ(weight_i × duration_i)
  allocation_pct = exposure_i / nav
  stress_nav = nav × (1 − weighted_loss_rate_under_scenario)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Regulatory limits (default — can be overridden via limits dict)
# ---------------------------------------------------------------------------

DEFAULT_LIMITS: dict[str, float] = {
    "max_cedente_pct": 0.15,        # 15% per cedente
    "max_sacado_pct": 0.10,         # 10% per sacado
    "max_sector_pct": 0.25,         # 25% per sector
    "max_maturity_bucket_pct": 0.40,  # 40% in any single maturity bucket
    "min_liquidity_pct": 0.05,      # 5% min in cash/liquid
}

# Stress test assumptions by scenario
STRESS_SCENARIOS: dict[str, dict[str, float]] = {
    "base": {
        "pdd_multiplier": 1.0,       # No change to base PDD
        "recovery_rate": 0.60,       # 60% recovery on defaults
        "liquidity_haircut": 0.00,   # No liquidity haircut
        "nav_discount": 0.00,
        "description": "Base case — current market conditions.",
    },
    "adverse": {
        "pdd_multiplier": 2.0,       # PDD doubles
        "recovery_rate": 0.40,       # Lower recovery
        "liquidity_haircut": 0.10,   # 10% haircut on liquid assets
        "nav_discount": 0.05,        # 5% MTM discount
        "description": "Adverse scenario — moderate economic stress.",
    },
    "extreme": {
        "pdd_multiplier": 4.0,       # PDD 4× base
        "recovery_rate": 0.20,       # Very low recovery
        "liquidity_haircut": 0.25,   # 25% haircut
        "nav_discount": 0.15,        # 15% MTM discount
        "description": "Extreme scenario — systemic financial crisis.",
    },
}

# ---------------------------------------------------------------------------
# GestorAgent
# ---------------------------------------------------------------------------

class GestorAgent:
    """
    Portfolio Manager (Gestor) agent.

    Manages portfolio allocation analysis, concentration limit monitoring,
    rebalancing order generation, duration calculation, and stress testing.
    """

    def __init__(self, limits: dict[str, float] | None = None):
        self.limits = limits or DEFAULT_LIMITS.copy()

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def execute(
        self,
        task: str,
        context: dict[str, Any],
        chunks: list[Any] | None = None,
    ) -> dict[str, Any]:
        """
        Dispatch portfolio management operations.

        Args:
            task: Action name.
            context: Portfolio context dict.
            chunks: Optional RAG chunks.

        Returns:
            Serialisable result dict.
        """
        action_map = {
            "calculate_portfolio_allocation": lambda: self.calculate_portfolio_allocation(
                context.get("portfolio", []),
                float(context.get("nav", 1.0)),
            ),
            "check_concentration_limits": lambda: {
                "violations": self.check_concentration_limits(
                    context.get("allocation", {}),
                    context.get("limits", self.limits),
                )
            },
            "rebalance_portfolio": lambda: {
                "orders": self.rebalance_portfolio(
                    context.get("current", {}),
                    context.get("target", {}),
                    context.get("constraints", {}),
                )
            },
            "calculate_portfolio_duration": lambda: {
                "duration_days": self.calculate_portfolio_duration(context.get("portfolio", []))
            },
            "stress_test": lambda: self.stress_test(
                context.get("portfolio", []),
                context.get("scenario", "base"),
            ),
        }
        handler = action_map.get(task)
        if handler is None:
            return {"error": f"Unknown action: {task!r}", "available": list(action_map)}
        return handler()

    # ------------------------------------------------------------------
    # Core capabilities
    # ------------------------------------------------------------------

    def calculate_portfolio_allocation(
        self,
        portfolio: list[dict[str, Any]],
        nav: float,
    ) -> dict[str, Any]:
        """
        Compute portfolio allocation breakdowns.

        Dimensions: cedente, sacado, sector, maturity_bucket.

        Each receivable in portfolio must have:
        - face_value (float)
        - cedente (str)
        - sacado (str)
        - sector (str)
        - days_to_maturity (int)

        Args:
            portfolio: List of receivable dicts.
            nav: Total fund NAV (BRL) — used to compute allocation percentages.

        Returns:
            Dict with by_cedente, by_sacado, by_sector, by_maturity,
            hhi_indices, total_exposure, allocation_vs_nav.
        """
        if not portfolio:
            return {"error": "Empty portfolio.", "by_cedente": {}, "by_sacado": {},
                    "by_sector": {}, "by_maturity": {}}

        by_cedente: dict[str, float] = {}
        by_sacado: dict[str, float] = {}
        by_sector: dict[str, float] = {}
        by_maturity: dict[str, float] = {
            "0-30d": 0.0, "31-90d": 0.0, "91-180d": 0.0,
            "181-360d": 0.0, ">360d": 0.0,
        }

        total_exposure = 0.0

        for rec in portfolio:
            fv = float(rec.get("face_value", 0.0))
            if fv <= 0:
                continue
            total_exposure += fv

            cedente = str(rec.get("cedente", "UNKNOWN"))
            sacado = str(rec.get("sacado", "UNKNOWN"))
            sector = str(rec.get("sector", "geral"))
            days = int(rec.get("days_to_maturity", 0))

            by_cedente[cedente] = by_cedente.get(cedente, 0.0) + fv
            by_sacado[sacado] = by_sacado.get(sacado, 0.0) + fv
            by_sector[sector] = by_sector.get(sector, 0.0) + fv

            if days <= 30:
                by_maturity["0-30d"] += fv
            elif days <= 90:
                by_maturity["31-90d"] += fv
            elif days <= 180:
                by_maturity["91-180d"] += fv
            elif days <= 360:
                by_maturity["181-360d"] += fv
            else:
                by_maturity[">360d"] += fv

        # Compute % of NAV
        def to_pct_dict(d: dict[str, float]) -> dict[str, dict[str, float]]:
            return {
                k: {
                    "brl": round(v, 2),
                    "pct_of_nav": round(v / nav * 100, 4) if nav > 0 else 0.0,
                    "pct_of_portfolio": round(v / total_exposure * 100, 4) if total_exposure > 0 else 0.0,
                }
                for k, v in sorted(d.items(), key=lambda x: -x[1])
            }

        # HHI (Herfindahl-Hirschman Index) per dimension — market concentration measure
        def hhi(d: dict[str, float]) -> float:
            if total_exposure <= 0:
                return 0.0
            return round(sum((v / total_exposure) ** 2 for v in d.values()), 6)

        return {
            "total_exposure_brl": round(total_exposure, 2),
            "allocation_vs_nav_pct": round(total_exposure / nav * 100, 2) if nav > 0 else 0.0,
            "by_cedente": to_pct_dict(by_cedente),
            "by_sacado": to_pct_dict(by_sacado),
            "by_sector": to_pct_dict(by_sector),
            "by_maturity": to_pct_dict(by_maturity),
            "hhi": {
                "cedente": hhi(by_cedente),
                "sacado": hhi(by_sacado),
                "sector": hhi(by_sector),
                "note": "HHI < 0.15 = diversified; 0.15–0.25 = moderately concentrated; > 0.25 = concentrated.",
            },
            "record_count": len(portfolio),
        }

    def check_concentration_limits(
        self,
        allocation: dict[str, Any],
        limits: dict[str, float],
    ) -> list[dict[str, Any]]:
        """
        Check portfolio allocation against concentration limits.

        Flags any dimension (cedente, sacado, sector, maturity) exceeding limits.

        Args:
            allocation: Output of calculate_portfolio_allocation.
            limits: Dict with max_cedente_pct, max_sacado_pct, etc. (decimal fractions).

        Returns:
            List of violation dicts. Empty list = all clear.
        """
        violations: list[dict[str, Any]] = []
        effective_limits = {**self.limits, **limits}

        dimension_limit_map = [
            ("by_cedente", "max_cedente_pct", "cedente"),
            ("by_sacado", "max_sacado_pct", "sacado"),
            ("by_sector", "max_sector_pct", "sector"),
            ("by_maturity", "max_maturity_bucket_pct", "maturity_bucket"),
        ]

        for dim_key, limit_key, dim_label in dimension_limit_map:
            dim_data = allocation.get(dim_key, {})
            limit_pct = effective_limits.get(limit_key, 1.0) * 100   # Convert to %

            for name, data in dim_data.items():
                if isinstance(data, dict):
                    pct = float(data.get("pct_of_nav", 0.0))
                else:
                    pct = float(data)

                if pct > limit_pct:
                    severity = "CRITICAL" if pct > limit_pct * 1.25 else "WARNING"
                    violations.append({
                        "dimension": dim_label,
                        "name": name,
                        "current_pct": round(pct, 2),
                        "limit_pct": round(limit_pct, 2),
                        "excess_pct": round(pct - limit_pct, 2),
                        "severity": severity,
                        "action": f"Reduce {dim_label} '{name}' exposure by R$ equivalent to {pct - limit_pct:.2f}% of NAV.",
                    })

        # Sort by severity then excess
        violations.sort(key=lambda v: (-1 if v["severity"] == "CRITICAL" else 0, -v["excess_pct"]))
        return violations

    def rebalance_portfolio(
        self,
        current: dict[str, Any],
        target: dict[str, Any],
        constraints: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """
        Generate rebalancing orders to move from current to target allocation.

        For each dimension in target allocation, computes the delta (BRL) between
        current and target, then generates BUY/SELL/REDUCE orders.

        Args:
            current: Current allocation by sector/cedente (key: name, value: BRL or pct).
            target: Target allocation (same structure as current).
            constraints: Dict with max_single_order_brl, min_order_brl, excluded_sectors.

        Returns:
            List of rebalancing order dicts, sorted by priority.
        """
        max_single_order = float(constraints.get("max_single_order_brl", 5_000_000.0))
        min_order = float(constraints.get("min_order_brl", 100_000.0))
        excluded = set(constraints.get("excluded_names", []))

        orders: list[dict[str, Any]] = []

        all_keys = set(current) | set(target)

        for key in all_keys:
            if key in excluded:
                continue

            current_brl = float(current.get(key, 0.0))
            target_brl = float(target.get(key, 0.0))
            delta = target_brl - current_brl

            if abs(delta) < min_order:
                continue   # Too small to execute

            # Split large orders
            remaining_delta = delta
            order_seq = 1
            while abs(remaining_delta) >= min_order:
                order_amount = min(abs(remaining_delta), max_single_order)
                direction = "BUY" if remaining_delta > 0 else "REDUCE"

                priority = 1 if abs(delta) / max(current_brl, 1) > 0.20 else 2

                orders.append({
                    "id": f"ORD-{key[:8].upper().replace(' ', '_')}-{order_seq:02d}",
                    "name": key,
                    "direction": direction,
                    "amount_brl": round(order_amount, 2),
                    "current_brl": round(current_brl, 2),
                    "target_brl": round(target_brl, 2),
                    "total_delta_brl": round(delta, 2),
                    "priority": priority,
                    "note": (
                        f"{'Increase' if direction == 'BUY' else 'Decrease'} "
                        f"exposure from R$ {current_brl:,.0f} → R$ {target_brl:,.0f}."
                    ),
                })
                remaining_delta -= order_amount if delta > 0 else -order_amount
                order_seq += 1

        # Sort: priority ASC, then largest delta first
        orders.sort(key=lambda o: (o["priority"], -abs(o["total_delta_brl"])))
        return orders

    def calculate_portfolio_duration(self, portfolio: list[dict[str, Any]]) -> float:
        """
        Calculate weighted average duration of the portfolio (in days).

        Formula (Macaulay-style for receivables):
            duration = Σ(face_value_i × days_to_maturity_i) / Σ(face_value_i)

        For receivables (single payment at maturity), Macaulay duration = time to maturity.

        Args:
            portfolio: List of receivable dicts with face_value and days_to_maturity.

        Returns:
            Weighted average duration in calendar days.
        """
        total_weighted = 0.0
        total_value = 0.0

        for rec in portfolio:
            fv = float(rec.get("face_value", 0.0))
            days = float(rec.get("days_to_maturity", 0.0))
            if fv <= 0 or days < 0:
                continue
            total_weighted += fv * days
            total_value += fv

        if total_value <= 0:
            return 0.0

        duration = total_weighted / total_value
        logger.info(f"Portfolio duration: {duration:.2f} days ({duration / 30:.1f} months)")
        return round(duration, 2)

    def stress_test(
        self,
        portfolio: list[dict[str, Any]],
        scenario: str = "base",
    ) -> dict[str, Any]:
        """
        Run a stress test on the portfolio under a named scenario.

        Scenarios: base | adverse | extreme

        For each scenario, computes:
        - Stressed PDD = base_pdd × pdd_multiplier × (1 − recovery_rate)
        - Stressed NAV = current_nav − incremental_pdd − liquidity_haircut − mtm_discount
        - Liquidity buffer after haircut
        - NAV impact percentage

        Args:
            portfolio: List of receivable dicts with face_value, pdd_rate (optional),
                       and sector.
            scenario: 'base', 'adverse', or 'extreme'.

        Returns:
            Dict with scenario assumptions, stressed financials, and risk metrics.
        """
        if scenario not in STRESS_SCENARIOS:
            raise ValueError(f"Unknown scenario: {scenario!r}. Available: {list(STRESS_SCENARIOS)}")

        params = STRESS_SCENARIOS[scenario]

        # Base calculations
        total_face_value = sum(float(r.get("face_value", 0)) for r in portfolio)
        if total_face_value <= 0:
            return {"error": "Portfolio is empty or has no positive face values."}

        # Weighted PDD base rate (from portfolio data or BACEN 3% default)
        base_pdd_amounts: list[float] = []
        for rec in portfolio:
            fv = float(rec.get("face_value", 0.0))
            pdd_rate = float(rec.get("pdd_rate", 0.03))  # Default 3%
            base_pdd_amounts.append(fv * pdd_rate)

        base_pdd = sum(base_pdd_amounts)
        base_nav = total_face_value - base_pdd

        # Cash / liquid component (assume 5% of portfolio if not provided)
        liquid_assets = sum(
            float(r.get("face_value", 0)) for r in portfolio
            if r.get("type") in ("cash", "liquid")
        )
        if liquid_assets == 0:
            liquid_assets = total_face_value * 0.05  # Assume 5% liquid

        # Stressed PDD
        stressed_pdd = base_pdd * params["pdd_multiplier"] * (1 - params["recovery_rate"])
        incremental_pdd = stressed_pdd - base_pdd * (1 - params["recovery_rate"])

        # Liquidity haircut
        stressed_liquid = liquid_assets * (1 - params["liquidity_haircut"])
        liquidity_lost = liquid_assets - stressed_liquid

        # MTM discount on non-liquid assets
        non_liquid = total_face_value - liquid_assets - stressed_pdd
        mtm_loss = max(non_liquid * params["nav_discount"], 0.0)

        # Stressed NAV
        stressed_nav = base_nav - incremental_pdd - liquidity_lost - mtm_loss
        nav_impact_pct = (base_nav - stressed_nav) / base_nav * 100 if base_nav > 0 else 0.0

        # Sector breakdown under stress
        sector_impacts: dict[str, dict[str, float]] = {}
        for rec in portfolio:
            sector = str(rec.get("sector", "geral"))
            fv = float(rec.get("face_value", 0.0))
            pdd_rate = float(rec.get("pdd_rate", 0.03))
            stressed_loss = fv * pdd_rate * params["pdd_multiplier"] * (1 - params["recovery_rate"])
            if sector not in sector_impacts:
                sector_impacts[sector] = {"exposure_brl": 0.0, "stressed_loss_brl": 0.0}
            sector_impacts[sector]["exposure_brl"] += fv
            sector_impacts[sector]["stressed_loss_brl"] += stressed_loss

        for sec_data in sector_impacts.values():
            sec_data["loss_rate_pct"] = round(
                sec_data["stressed_loss_brl"] / sec_data["exposure_brl"] * 100
                if sec_data["exposure_brl"] > 0 else 0.0, 2
            )

        # Subordination sufficiency check
        # Assumes sub_nav = 20% of base_nav
        sub_nav = base_nav * 0.20
        sub_covers_losses = sub_nav >= (base_nav - stressed_nav)

        return {
            "scenario": scenario,
            "description": params["description"],
            "assumptions": params,
            "portfolio_summary": {
                "total_face_value": round(total_face_value, 2),
                "record_count": len(portfolio),
            },
            "base": {
                "pdd": round(base_pdd, 2),
                "nav": round(base_nav, 2),
                "liquid_assets": round(liquid_assets, 2),
            },
            "stressed": {
                "pdd": round(stressed_pdd, 2),
                "nav": round(stressed_nav, 2),
                "liquid_assets": round(stressed_liquid, 2),
                "incremental_pdd": round(incremental_pdd, 2),
                "liquidity_lost": round(liquidity_lost, 2),
                "mtm_loss": round(mtm_loss, 2),
            },
            "nav_impact_pct": round(nav_impact_pct, 2),
            "sub_nav_brl": round(sub_nav, 2),
            "subordination_sufficient": sub_covers_losses,
            "sector_impacts": {
                k: {kk: round(vv, 2) for kk, vv in v.items()}
                for k, v in sector_impacts.items()
            },
            "risk_assessment": (
                "LOW" if nav_impact_pct < 5
                else "MODERATE" if nav_impact_pct < 10
                else "HIGH" if nav_impact_pct < 20
                else "CRITICAL"
            ),
        }


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

DEMO_PORTFOLIO = [
    {"face_value": 5_000_000, "cedente": "Alpha Ltda", "sacado": "Walmart BR", "sector": "varejo", "days_to_maturity": 45, "pdd_rate": 0.02},
    {"face_value": 8_000_000, "cedente": "Beta S.A.", "sacado": "Petrobras", "sector": "energia", "days_to_maturity": 180, "pdd_rate": 0.01},
    {"face_value": 3_000_000, "cedente": "Gamma ME", "sacado": "Hospital ABC", "sector": "saúde", "days_to_maturity": 90, "pdd_rate": 0.03},
    {"face_value": 4_000_000, "cedente": "Delta S.A.", "sacado": "Coop Agro", "sector": "agronegócio", "days_to_maturity": 270, "pdd_rate": 0.015},
    {"face_value": 2_000_000, "cedente": "Alpha Ltda", "sacado": "Atacadão", "sector": "varejo", "days_to_maturity": 30, "pdd_rate": 0.025},
]

DEMO_NAV = 25_000_000.0

if __name__ == "__main__":
    import json
    agent = GestorAgent()

    allocation = agent.calculate_portfolio_allocation(DEMO_PORTFOLIO, DEMO_NAV)
    print("Allocation:")
    print(json.dumps({k: v for k, v in allocation.items() if k != "by_cedente"}, indent=2))

    violations = agent.check_concentration_limits(allocation, DEFAULT_LIMITS)
    print(f"\nConcentration violations: {len(violations)}")
    for v in violations:
        print(f"  [{v['severity']}] {v['dimension']} '{v['name']}': {v['current_pct']:.2f}% > {v['limit_pct']:.2f}%")

    duration = agent.calculate_portfolio_duration(DEMO_PORTFOLIO)
    print(f"\nPortfolio Duration: {duration:.1f} days ({duration / 30:.1f} months)")

    for scen in ("base", "adverse", "extreme"):
        st = agent.stress_test(DEMO_PORTFOLIO, scen)
        print(f"\nStress [{scen.upper()}]: NAV impact {st['nav_impact_pct']:.2f}% — {st['risk_assessment']}")
