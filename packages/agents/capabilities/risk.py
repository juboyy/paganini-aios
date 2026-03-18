"""
risk.py — Quantitative Risk Analysis for FIDC portfolios.

Implements VaR, stress testing, expected/unexpected loss,
concentration risk (HHI), and credit rating mapping using
real Basel/Brazilian-market formulas.
"""

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass, field
from typing import Any

# ---------------------------------------------------------------------------
# Result dataclasses
# ---------------------------------------------------------------------------


@dataclass
class VaRResult:
    """Value-at-Risk computation result."""

    historical_var: float  # BRL amount at risk (historical simulation)
    parametric_var: float  # BRL amount at risk (parametric/normal)
    confidence: float  # e.g. 0.95
    horizon_days: int  # look-forward horizon
    portfolio_value: float  # total portfolio market value
    historical_var_pct: float  # as % of portfolio
    parametric_var_pct: float  # as % of portfolio
    num_observations: int  # how many P&L observations used
    mean_return: float
    std_return: float
    method_used: str  # "historical" | "parametric" | "parametric_fallback"


@dataclass
class ScenarioImpact:
    """Per-scenario impact breakdown."""

    scenario: str
    default_rate_shock: float  # e.g. +0.02 = +2pp
    recovery_rate_shock: float  # e.g. -0.05 = -5pp
    rate_shock_bps: int  # basis-point shock on CDI
    pdd_impact: float  # BRL change in PDD (provisão para devedores duvidosos)
    nav_impact: float  # BRL change in NAV
    liquidity_impact: float  # BRL change in liquid assets
    expected_loss_impact: float  # BRL change in EL
    nav_impact_pct: float  # as % of NAV


@dataclass
class StressResult:
    """Stress-test result across all scenarios."""

    portfolio_value: float
    current_nav: float
    scenarios: dict[str, ScenarioImpact] = field(default_factory=dict)
    worst_case_nav: float = 0.0
    worst_case_scenario: str = ""


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------


class RiskAgent:
    """
    Quantitative risk analysis agent for FIDC structures.

    All monetary values in BRL (Brazilian Real).
    Follows Basel II/III credit risk formulas adapted for Brazilian FIDC regulation.
    """

    # ------------------------------------------------------------------ #
    # Constants                                                            #
    # ------------------------------------------------------------------ #

    # CDI approximation (13.75% a.a. as of early 2026)
    CDI_ANNUAL: float = 0.1375

    # Standard normal z-scores for confidence levels
    Z_SCORES: dict[float, float] = {
        0.90: 1.2816,
        0.95: 1.6449,
        0.99: 2.3263,
        0.999: 3.0902,
    }

    # Rating thresholds
    RATING_THRESHOLDS: list[tuple[float, str]] = [
        (95.0, "AAA"),
        (85.0, "AA"),
        (75.0, "A"),
        (65.0, "BBB"),
        (55.0, "BB"),
        (45.0, "B"),
        (0.0, "CCC"),
    ]

    # Stress scenarios: (default_shock, recovery_shock, rate_shock_bps)
    SCENARIOS: dict[str, tuple[float, float, int]] = {
        "base": (0.02, -0.05, 100),
        "adverse": (0.05, -0.15, 200),
        "extreme": (0.10, -0.30, 400),
    }

    # HHI concentration threshold
    HHI_CONCENTRATED_THRESHOLD: float = 0.15

    # ------------------------------------------------------------------ #
    # Core entry point                                                     #
    # ------------------------------------------------------------------ #

    def execute(self, task: str, context: dict, chunks: list) -> dict:
        """
        Main dispatch for the risk agent.

        Args:
            task: Natural-language task description
            context: Fund-level context (nav, portfolio, etc.)
            chunks: List of document/data chunks for analysis

        Returns:
            dict with 'status', 'results', and 'summary'
        """
        portfolio = context.get("portfolio", DEMO_PORTFOLIO)
        nav = context.get("nav", sum(r.get("valor_presente", 0) for r in portfolio))

        results: dict[str, Any] = {}

        # VaR
        var_result = self.calculate_var(portfolio, confidence=0.95, horizon_days=1)
        results["var"] = var_result

        # Stress tests
        stress_results = {}
        for scenario in ("base", "adverse", "extreme"):
            stress_results[scenario] = self.stress_test(portfolio, scenario)
        results["stress"] = stress_results

        # Concentration
        results["concentration_cedente"] = self.concentration_risk(portfolio, "cedente")
        results["concentration_sector"] = self.concentration_risk(portfolio, "sector")

        # Portfolio-level EL
        pd_avg = statistics.mean(r.get("pd", 0.03) for r in portfolio)
        lgd_avg = statistics.mean(r.get("lgd", 0.45) for r in portfolio)
        results["expected_loss"] = self.calculate_expected_loss(pd_avg, lgd_avg, nav)
        results["unexpected_loss"] = self.calculate_unexpected_loss(
            pd_avg, lgd_avg, nav
        )

        # Synthetic score → rating
        score = max(0, min(100, 100 - pd_avg * 500))
        results["rating"] = self.risk_rating(score)

        return {
            "status": "ok",
            "results": results,
            "summary": (
                f"VaR 95%: R$ {var_result.historical_var:,.2f} | "
                f"Rating: {results['rating']} | "
                f"EL: R$ {results['expected_loss']:,.2f}"
            ),
        }

    # ------------------------------------------------------------------ #
    # 1. Value-at-Risk                                                     #
    # ------------------------------------------------------------------ #

    def calculate_var(
        self,
        portfolio: list[dict],
        confidence: float = 0.95,
        horizon_days: int = 1,
    ) -> VaRResult:
        """
        Calculate Historical and Parametric VaR for a FIDC receivables portfolio.

        Historical VaR: sort P&L distribution, take (1-conf) quantile.
        Parametric VaR: μ - z * σ, scaled by √horizon.

        Args:
            portfolio: List of receivable dicts with keys:
                       valor_presente (float), valor_face (float),
                       daily_returns (list[float], optional)
            confidence: Confidence level (0.90 / 0.95 / 0.99 / 0.999)
            horizon_days: VaR horizon in trading days

        Returns:
            VaRResult dataclass
        """
        if not portfolio:
            raise ValueError("portfolio cannot be empty")
        if not 0 < confidence < 1:
            raise ValueError(f"confidence must be in (0,1), got {confidence}")

        portfolio_value = sum(
            r.get("valor_presente", r.get("valor_face", 0)) for r in portfolio
        )

        # Aggregate daily returns across all receivables
        all_returns: list[float] = []
        for rec in portfolio:
            rets = rec.get("daily_returns", [])
            all_returns.extend(rets)

        # Fall back to synthetic returns if insufficient data
        method = "historical"
        if len(all_returns) < 30:
            method = "parametric_fallback"
            # Synthesise from face/PV spread as proxy for daily vol
            spreads = []
            for r in portfolio:
                face = r.get("valor_face", 0)
                pv = r.get("valor_presente", face)
                if face > 0:
                    spreads.append((face - pv) / face)
            base_vol = statistics.stdev(spreads) if len(spreads) > 1 else 0.01
            # Simulate 252 trading-day returns (normal distribution approx)
            import random

            rng = random.Random(42)
            daily_vol = base_vol / math.sqrt(252)
            daily_rf = (1 + self.CDI_ANNUAL) ** (1 / 252) - 1
            all_returns = [rng.gauss(daily_rf, daily_vol) for _ in range(252)]

        # ---- Historical VaR ----
        sorted_returns = sorted(all_returns)
        idx = int(math.floor((1 - confidence) * len(sorted_returns)))
        idx = max(0, min(idx, len(sorted_returns) - 1))
        hist_loss_pct = -sorted_returns[idx]  # loss is positive
        # Scale to horizon
        hist_loss_pct_scaled = hist_loss_pct * math.sqrt(horizon_days)
        historical_var = portfolio_value * hist_loss_pct_scaled

        # ---- Parametric VaR ----
        mu = statistics.mean(all_returns)
        try:
            sigma = statistics.stdev(all_returns)
        except statistics.StatisticsError:
            sigma = 0.01

        z = self._get_z_score(confidence)
        # Daily parametric VaR, scaled to horizon
        parametric_loss_pct = -(mu * horizon_days) + z * sigma * math.sqrt(horizon_days)
        parametric_var = portfolio_value * max(0, parametric_loss_pct)

        return VaRResult(
            historical_var=round(historical_var, 2),
            parametric_var=round(parametric_var, 2),
            confidence=confidence,
            horizon_days=horizon_days,
            portfolio_value=round(portfolio_value, 2),
            historical_var_pct=round(hist_loss_pct_scaled * 100, 4),
            parametric_var_pct=round(max(0, parametric_loss_pct) * 100, 4),
            num_observations=len(all_returns),
            mean_return=round(mu, 6),
            std_return=round(sigma, 6),
            method_used=method,
        )

    def _get_z_score(self, confidence: float) -> float:
        """Return z-score for given confidence, interpolating if needed."""
        if confidence in self.Z_SCORES:
            return self.Z_SCORES[confidence]
        # Linear interpolation between nearest known values
        levels = sorted(self.Z_SCORES.keys())
        for i in range(len(levels) - 1):
            lo, hi = levels[i], levels[i + 1]
            if lo <= confidence <= hi:
                t = (confidence - lo) / (hi - lo)
                return self.Z_SCORES[lo] + t * (self.Z_SCORES[hi] - self.Z_SCORES[lo])
        return 1.6449  # default 95%

    # ------------------------------------------------------------------ #
    # 2. Stress Testing                                                    #
    # ------------------------------------------------------------------ #

    def stress_test(self, portfolio: list[dict], scenario: str) -> StressResult:
        """
        Apply macro scenario shocks to a FIDC portfolio.

        Scenario shocks:
          base:    default +2pp, recovery -5pp,  rates +100bps
          adverse: default +5pp, recovery -15pp, rates +200bps
          extreme: default +10pp,recovery -30pp, rates +400bps

        Impact calculation:
          PDD_shock    = EAD × ΔPDD_rate × LGD_stressed
          NAV_shock    = -PDD_shock − rate_duration_loss
          liquidity    = proportion of portfolio maturing < 30d × shock
          EL_shock     = new_pd × new_lgd × EAD

        Args:
            portfolio: List of receivable dicts
            scenario: "base" | "adverse" | "extreme"

        Returns:
            StressResult dataclass
        """
        if scenario not in self.SCENARIOS:
            raise ValueError(
                f"Unknown scenario '{scenario}'. Must be one of {list(self.SCENARIOS)}"
            )

        default_shock, recovery_shock, rate_shock_bps = self.SCENARIOS[scenario]

        portfolio_value = sum(
            r.get("valor_presente", r.get("valor_face", 0)) for r in portfolio
        )
        current_nav = portfolio_value  # simplified: NAV ≈ PV of receivables

        # --- Base metrics ---
        total_ead = sum(r.get("valor_face", 0) for r in portfolio)
        base_pd = (
            statistics.mean(r.get("pd", 0.03) for r in portfolio) if portfolio else 0.03
        )
        base_lgd = (
            statistics.mean(r.get("lgd", 0.45) for r in portfolio)
            if portfolio
            else 0.45
        )

        # Stressed PD/LGD
        stressed_pd = min(1.0, base_pd + default_shock)
        stressed_lgd = max(
            0.0, min(1.0, base_lgd - recovery_shock)
        )  # recovery ↓ → LGD ↑

        # --- PDD impact ---
        base_el = self.calculate_expected_loss(base_pd, base_lgd, total_ead)
        stressed_el = self.calculate_expected_loss(stressed_pd, stressed_lgd, total_ead)
        pdd_impact = stressed_el - base_el  # positive = more PDD needed

        # --- Rate / duration impact on NAV ---
        avg_duration_years = (
            statistics.mean(r.get("prazo_dias", 90) / 365 for r in portfolio)
            if portfolio
            else 0.25
        )
        rate_shock_decimal = rate_shock_bps / 10_000
        # Duration approximation: ΔPrice ≈ -Duration × ΔYield × Price
        rate_nav_impact = -avg_duration_years * rate_shock_decimal * portfolio_value

        # --- Total NAV impact ---
        nav_impact = -pdd_impact + rate_nav_impact  # both are negative shocks

        # --- Liquidity impact ---
        short_term_pv = sum(
            r.get("valor_presente", 0)
            for r in portfolio
            if r.get("prazo_dias", 90) <= 30
        )
        liquidity_impact = -short_term_pv * stressed_pd * stressed_lgd

        impact = ScenarioImpact(
            scenario=scenario,
            default_rate_shock=default_shock,
            recovery_rate_shock=recovery_shock,
            rate_shock_bps=rate_shock_bps,
            pdd_impact=round(pdd_impact, 2),
            nav_impact=round(nav_impact, 2),
            liquidity_impact=round(liquidity_impact, 2),
            expected_loss_impact=round(stressed_el - base_el, 2),
            nav_impact_pct=round(
                (nav_impact / current_nav * 100) if current_nav else 0, 4
            ),
        )

        result = StressResult(
            portfolio_value=round(portfolio_value, 2),
            current_nav=round(current_nav, 2),
        )
        result.scenarios[scenario] = impact
        result.worst_case_nav = round(current_nav + nav_impact, 2)
        result.worst_case_scenario = scenario

        return result

    # ------------------------------------------------------------------ #
    # 3. Expected Loss                                                     #
    # ------------------------------------------------------------------ #

    def calculate_expected_loss(
        self,
        pd: float,
        lgd: float,
        ead: float,
    ) -> float:
        """
        Basel II Expected Loss: EL = PD × LGD × EAD

        Args:
            pd:  Probability of Default [0, 1]
            lgd: Loss Given Default [0, 1]
            ead: Exposure at Default in BRL

        Returns:
            Expected loss in BRL
        """
        if not (0 <= pd <= 1):
            raise ValueError(f"pd must be in [0, 1], got {pd}")
        if not (0 <= lgd <= 1):
            raise ValueError(f"lgd must be in [0, 1], got {lgd}")
        if ead < 0:
            raise ValueError(f"ead must be >= 0, got {ead}")

        return round(pd * lgd * ead, 2)

    # ------------------------------------------------------------------ #
    # 4. Unexpected Loss                                                   #
    # ------------------------------------------------------------------ #

    def calculate_unexpected_loss(
        self,
        pd: float,
        lgd: float,
        ead: float,
        rho: float = 0.15,
    ) -> float:
        """
        Unexpected Loss with asset correlation (Basel II IRB formula).

        UL = LGD × EAD × √[Φ⁻¹(0.999) × √(ρ/(1-ρ)) + √(1/(1-ρ)) × Φ⁻¹(PD)] × normal_factor

        Simplified form used here:
          UL = EAD × LGD × √(PD × (1-PD)) × (1 + rho × (PD / (1-PD)))^0.5

        The asset-correlation version per Basel II §272:
          K = LGD × N[ N⁻¹(PD)/√(1-ρ) + √(ρ/(1-ρ)) × N⁻¹(0.999) ] − EL_rate
          UL = EAD × K

        Args:
            pd:  Probability of Default [0, 1]
            lgd: Loss Given Default [0, 1]
            ead: Exposure at Default in BRL
            rho: Asset correlation (default 0.15 per Basel II for retail)

        Returns:
            Unexpected loss (capital requirement) in BRL
        """
        if not (0 <= pd <= 1):
            raise ValueError(f"pd must be in [0, 1], got {pd}")
        if pd in (0.0, 1.0):
            return 0.0

        # Basel II IRB capital formula
        # N⁻¹ approximations using rational approximation (Abramowitz & Stegun)
        def norm_ppf(p: float) -> float:
            """Inverse standard normal CDF — rational approximation."""
            if p <= 0 or p >= 1:
                raise ValueError("p must be in (0,1)")
            a = [
                0,
                -3.969683028665376e01,
                2.209460984245205e02,
                -2.759285104469687e02,
                1.383577518672690e02,
                -3.066479806614716e01,
                2.506628277459239e00,
            ]
            b = [
                0,
                -5.447609879822406e01,
                1.615858368580409e02,
                -1.556989798598866e02,
                6.680131188771972e01,
                -1.328068155288572e01,
            ]
            c = [
                -7.784894002430293e-03,
                -3.223964580411365e-01,
                -2.400758277161838e00,
                -2.549732539343734e00,
                4.374664141464968e00,
                2.938163982698783e00,
            ]
            d = [
                7.784695709041462e-03,
                3.224671290700398e-01,
                2.445134137142996e00,
                3.754408661907416e00,
            ]
            p_low = 0.02425
            p_high = 1 - p_low
            if p < p_low:
                q = math.sqrt(-2 * math.log(p))
                return (
                    ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]
                ) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
            elif p <= p_high:
                q = p - 0.5
                r = q * q
                return (
                    (
                        ((((a[1] * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r
                        + a[6]
                    )
                    * q
                    / (((((b[1] * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5]) * r + 1)
                )
            else:
                q = math.sqrt(-2 * math.log(1 - p))
                return -(
                    ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]
                ) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)

        def norm_cdf(x: float) -> float:
            """Standard normal CDF using math.erfc."""
            return 0.5 * math.erfc(-x / math.sqrt(2))

        inv_pd = norm_ppf(max(1e-7, min(1 - 1e-7, pd)))
        inv_999 = norm_ppf(0.999)  # ≈ 3.0902
        sqrt_rho = math.sqrt(rho)
        sqrt_1mrho = math.sqrt(1 - rho)

        # Basel II WCDR (Worst-Case Default Rate)
        wcdr_arg = (inv_pd / sqrt_1mrho) + (sqrt_rho / sqrt_1mrho) * inv_999
        wcdr = norm_cdf(wcdr_arg)

        # Capital charge K = LGD × WCDR − EL_rate
        el_rate = pd * lgd
        k = max(0.0, lgd * wcdr - el_rate)

        return round(ead * k, 2)

    # ------------------------------------------------------------------ #
    # 5. Concentration Risk (HHI)                                          #
    # ------------------------------------------------------------------ #

    def concentration_risk(
        self,
        portfolio: list[dict],
        dimension: str,
    ) -> dict:
        """
        Herfindahl-Hirschman Index (HHI) for portfolio concentration.

        HHI = Σ (s_i)²  where s_i = share of entity i in total exposure.
        HHI ∈ [1/N, 1].  HHI > 0.15 = concentrated portfolio (CVM guidance).

        Args:
            portfolio: List of receivable dicts
            dimension: "cedente" | "sacado" | "sector"

        Returns:
            dict with hhi, concentrated (bool), top5, breakdown
        """
        if dimension not in ("cedente", "sacado", "sector"):
            raise ValueError("dimension must be 'cedente', 'sacado', or 'sector'")

        total_exposure = sum(r.get("valor_face", 0) for r in portfolio)
        if total_exposure == 0:
            return {"hhi": 0.0, "concentrated": False, "top5": [], "breakdown": {}}

        # Aggregate by dimension
        buckets: dict[str, float] = {}
        for rec in portfolio:
            key = str(rec.get(dimension, "UNKNOWN"))
            buckets[key] = buckets.get(key, 0) + rec.get("valor_face", 0)

        # HHI
        hhi = sum((v / total_exposure) ** 2 for v in buckets.values())

        # Top-5 by exposure
        top5 = sorted(
            [
                {
                    "name": k,
                    "exposure": v,
                    "share_pct": round(v / total_exposure * 100, 2),
                }
                for k, v in buckets.items()
            ],
            key=lambda x: x["exposure"],
            reverse=True,
        )[:5]

        return {
            "dimension": dimension,
            "hhi": round(hhi, 6),
            "concentrated": hhi > self.HHI_CONCENTRATED_THRESHOLD,
            "num_entities": len(buckets),
            "total_exposure": round(total_exposure, 2),
            "top5": top5,
            "interpretation": (
                "Concentrated — consider diversification"
                if hhi > self.HHI_CONCENTRATED_THRESHOLD
                else "Diversified — within acceptable limits"
            ),
        }

    # ------------------------------------------------------------------ #
    # 6. Risk Rating                                                       #
    # ------------------------------------------------------------------ #

    def risk_rating(self, score: float) -> str:
        """
        Map a composite risk score [0–100] to a credit rating.

        Scale:
            ≥ 95 → AAA   (minimal risk)
            ≥ 85 → AA
            ≥ 75 → A
            ≥ 65 → BBB   (investment grade boundary)
            ≥ 55 → BB    (speculative)
            ≥ 45 → B
             < 45 → CCC  (high risk / near default)

        Args:
            score: Composite risk score 0–100 (higher = better)

        Returns:
            Rating string
        """
        if not (0 <= score <= 100):
            raise ValueError(f"score must be in [0, 100], got {score}")
        for threshold, rating in self.RATING_THRESHOLDS:
            if score >= threshold:
                return rating
        return "CCC"


# ---------------------------------------------------------------------------
# Demo portfolio (used when execute() receives no portfolio in context)
# ---------------------------------------------------------------------------

DEMO_PORTFOLIO: list[dict] = [
    {
        "id": "REC-001",
        "cedente": "Empresa Alpha S.A.",
        "sacado": "Varejão Beta Ltda",
        "sector": "varejo",
        "valor_face": 500_000.0,
        "valor_presente": 490_000.0,
        "prazo_dias": 45,
        "pd": 0.02,
        "lgd": 0.40,
        "daily_returns": [0.0003, 0.0002, -0.0001, 0.0004, 0.0001] * 50,
    },
    {
        "id": "REC-002",
        "cedente": "Empresa Alpha S.A.",
        "sacado": "Distribuidora Gama",
        "sector": "distribuicao",
        "valor_face": 300_000.0,
        "valor_presente": 293_000.0,
        "prazo_dias": 30,
        "pd": 0.03,
        "lgd": 0.45,
        "daily_returns": [0.0002, -0.0002, 0.0003, 0.0001, 0.0002] * 50,
    },
    {
        "id": "REC-003",
        "cedente": "Indústria Delta EIRELI",
        "sacado": "Supermercado Epsilon",
        "sector": "varejo",
        "valor_face": 750_000.0,
        "valor_presente": 730_000.0,
        "prazo_dias": 60,
        "pd": 0.025,
        "lgd": 0.42,
        "daily_returns": [0.0004, 0.0001, -0.0002, 0.0003, 0.0002] * 50,
    },
    {
        "id": "REC-004",
        "cedente": "Têxtil Zeta S.A.",
        "sacado": "Loja Eta LTDA",
        "sector": "textil",
        "valor_face": 200_000.0,
        "valor_presente": 195_000.0,
        "prazo_dias": 90,
        "pd": 0.05,
        "lgd": 0.50,
        "daily_returns": [0.0001, -0.0003, 0.0002, 0.0000, 0.0001] * 50,
    },
    {
        "id": "REC-005",
        "cedente": "Agro Theta Cooperativa",
        "sacado": "Exportadora Iota",
        "sector": "agronegocio",
        "valor_face": 1_000_000.0,
        "valor_presente": 975_000.0,
        "prazo_dias": 120,
        "pd": 0.015,
        "lgd": 0.35,
        "daily_returns": [0.0005, 0.0002, 0.0001, 0.0003, 0.0002] * 50,
    },
]


# ---------------------------------------------------------------------------
# CLI demo
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    agent = RiskAgent()
    result = agent.execute("demo risk analysis", {}, [])
    print("=== RISK AGENT DEMO ===")
    print(f"Summary: {result['summary']}")
    var_r = result["results"]["var"]
    print(
        f"\nVaR 95% (1-day): R$ {var_r.historical_var:,.2f} ({var_r.historical_var_pct:.2f}%)"
    )
    print(f"Parametric VaR: R$ {var_r.parametric_var:,.2f}")
    print(f"Method: {var_r.method_used}")
    conc = result["results"]["concentration_cedente"]
    print(
        f"\nConcentration (cedente) HHI: {conc['hhi']:.4f} — {conc['interpretation']}"
    )
    print(f"Rating: {result['results']['rating']}")
    print(f"Expected Loss: R$ {result['results']['expected_loss']:,.2f}")
    print(f"Unexpected Loss: R$ {result['results']['unexpected_loss']:,.2f}")
