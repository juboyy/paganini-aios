"""
Pricing Agent — PDD calculation, mark-to-market, discount rates, yield.

Implements:
- BACEN-aligned PDD aging buckets (Resolução 2682/99)
- Mark-to-market via DCF: PV = Σ(CF_i / (1 + r_i)^(t_i/252))
- Annualised yield: (face_value / purchase_price)^(252/days) − 1
- Discount rate: risk_free + spread (day-count convention: 252 b.d.)
- Full portfolio pricing report

BACEN Resolução 2682/99 PDD buckets (minimum provisions):
  AA:         0%       (0 days past due)
  A:          0.5%     (0–14 dpd)
  B:          1%       (15–30 dpd)
  C:          3%       (31–60 dpd)
  D:          10%      (61–90 dpd)
  E:          30%      (91–120 dpd)
  F:          50%      (121–150 dpd)
  G:          70%      (151–180 dpd)
  H:          100%     (>180 dpd)

Paganini uses simplified 7-bucket mapping (0-30d through >180d) aligned with BACEN.
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# PDD aging buckets (BACEN-aligned)
# ---------------------------------------------------------------------------

# (max_days_past_due, provision_rate, bucket_label)
PDD_BUCKETS: list[tuple[int, float, str]] = [
    (30,  0.005,  "A:0-30d"),
    (60,  0.010,  "B:31-60d"),
    (90,  0.030,  "C:61-90d"),
    (120, 0.100,  "D:91-120d"),
    (150, 0.300,  "E:121-150d"),
    (180, 0.500,  "F:151-180d"),
    (999_999, 1.000, "H:>180d"),
]

# Day-count convention
BUSINESS_DAYS_YEAR = 252
CALENDAR_DAYS_YEAR = 365

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class AgingBucket:
    label: str
    max_dpd: int
    provision_rate: float
    count: int = 0
    face_value: float = 0.0
    provision_amount: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "bucket": self.label,
            "max_dpd": self.max_dpd,
            "provision_rate_pct": round(self.provision_rate * 100, 2),
            "count": self.count,
            "face_value_brl": round(self.face_value, 2),
            "provision_brl": round(self.provision_amount, 2),
            "provision_pct_of_bucket": round(
                self.provision_amount / self.face_value * 100 if self.face_value else 0, 2
            ),
        }


@dataclass
class AgingReport:
    date: str
    total_receivables: int
    total_face_value: float
    total_provision: float
    effective_provision_rate: float
    buckets: list[AgingBucket]
    reclassifications: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "date": self.date,
            "total_receivables": self.total_receivables,
            "total_face_value_brl": round(self.total_face_value, 2),
            "total_provision_brl": round(self.total_provision, 2),
            "effective_provision_rate_pct": round(self.effective_provision_rate * 100, 4),
            "buckets": [b.to_dict() for b in self.buckets],
            "reclassifications": self.reclassifications,
        }


# ---------------------------------------------------------------------------
# PricingAgent
# ---------------------------------------------------------------------------

class PricingAgent:
    """
    Pricing and provisioning agent.

    Handles PDD aging analysis, mark-to-market valuation via DCF,
    discount rate construction, yield calculation, and portfolio pricing reports.
    """

    def __init__(self):
        self.pdd_buckets = PDD_BUCKETS
        self.bd_year = BUSINESS_DAYS_YEAR

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
        Dispatch pricing operations.

        Args:
            task: Action name.
            context: Data context.
            chunks: Optional RAG chunks.

        Returns:
            Serialisable result dict.
        """
        action_map = {
            "calculate_pdd_aging": lambda: self.calculate_pdd_aging(
                context.get("receivables", [])
            ).to_dict(),
            "mark_to_market": lambda: {
                "mtm_value": self.mark_to_market(
                    context.get("receivable", context),
                    context.get("curve", {}),
                )
            },
            "calculate_discount_rate": lambda: {
                "discount_rate": self.calculate_discount_rate(
                    float(context.get("risk_free", 0.1025)),
                    float(context.get("spread", 0.02)),
                    int(context.get("maturity_days", 90)),
                )
            },
            "calculate_yield": lambda: {
                "annualized_yield": self.calculate_yield(
                    float(context.get("purchase_price", 0)),
                    float(context.get("face_value", 0)),
                    int(context.get("days", 1)),
                )
            },
            "generate_pricing_report": lambda: self.generate_pricing_report(
                context.get("portfolio", [])
            ),
        }
        handler = action_map.get(task)
        if handler is None:
            return {"error": f"Unknown action: {task!r}", "available": list(action_map)}
        return handler()

    # ------------------------------------------------------------------
    # Core capabilities
    # ------------------------------------------------------------------

    def calculate_pdd_aging(
        self,
        receivables: list[dict[str, Any]],
    ) -> AgingReport:
        """
        Calculate PDD (Provisão para Devedores Duvidosos) using BACEN aging buckets.

        BACEN Resolução 2682/99 minimum provision rates by days past due (dpd):
          0-30d   → 0.5%
          31-60d  → 1.0%
          61-90d  → 3.0%
          91-120d → 10.0%
          121-150d → 30.0%
          151-180d → 50.0%
          >180d   → 100.0%

        Each receivable must have:
        - face_value (float): Nominal value.
        - days_past_due (int): Days overdue (0 if current).
        - bacen_rating (str, optional): Override rating (AA/A/B/C/D/E/F/G/H).

        Args:
            receivables: List of receivable dicts.

        Returns:
            AgingReport with bucket-level and portfolio-level summary.
        """
        buckets = [
            AgingBucket(label=label, max_dpd=max_dpd, provision_rate=rate)
            for max_dpd, rate, label in self.pdd_buckets
        ]

        reclassifications: list[dict[str, Any]] = []
        total_face_value = 0.0
        total_provision = 0.0

        for rec in receivables:
            fv = float(rec.get("face_value", 0.0))
            if fv <= 0:
                continue

            dpd = int(rec.get("days_past_due", 0))
            bacen_override = rec.get("bacen_rating", "")

            # Assign to bucket
            assigned_bucket: AgingBucket | None = None
            for bucket in buckets:
                if dpd <= bucket.max_dpd:
                    assigned_bucket = bucket
                    break

            if assigned_bucket is None:
                assigned_bucket = buckets[-1]   # H: >180d = 100%

            # BACEN rating override: if debtor is rated lower than bucket, use debtor rating
            if bacen_override:
                override_rate = self._bacen_rating_to_rate(bacen_override)
                if override_rate > assigned_bucket.provision_rate:
                    reclassifications.append({
                        "receivable_id": rec.get("id", "?"),
                        "original_bucket": assigned_bucket.label,
                        "original_rate": assigned_bucket.provision_rate,
                        "override_rating": bacen_override,
                        "override_rate": override_rate,
                        "reason": "Debtor credit rating requires higher provision.",
                    })
                    # Create a virtual bucket for this reclassification
                    provision_amount = fv * override_rate
                    total_face_value += fv
                    total_provision += provision_amount
                    continue

            provision_amount = fv * assigned_bucket.provision_rate
            assigned_bucket.count += 1
            assigned_bucket.face_value += fv
            assigned_bucket.provision_amount += provision_amount
            total_face_value += fv
            total_provision += provision_amount

        # Also account for reclassified amounts
        for r in reclassifications:
            total_provision += float(r.get("override_rate", 0)) * float(
                next((rec.get("face_value", 0) for rec in receivables if rec.get("id") == r["receivable_id"]), 0)
            )

        effective_rate = total_provision / total_face_value if total_face_value > 0 else 0.0

        return AgingReport(
            date=datetime.utcnow().strftime("%Y-%m-%d"),
            total_receivables=len(receivables),
            total_face_value=round(total_face_value, 2),
            total_provision=round(total_provision, 2),
            effective_provision_rate=round(effective_rate, 6),
            buckets=[b for b in buckets if b.count > 0],
            reclassifications=reclassifications,
        )

    def mark_to_market(
        self,
        receivable: dict[str, Any],
        curve: dict[str, Any],
    ) -> float:
        """
        Mark receivable to market via Discounted Cash Flow.

        Formula:
            MTM = Σ( CF_i / (1 + r_i)^(t_i / 252) )

        Where:
        - CF_i is the i-th cash flow (face_value if single bullet, or scheduled amounts)
        - r_i is the discount rate for cash flow i (from yield curve interpolation)
        - t_i is the number of business days until CF_i

        For simple receivables (bullet payment), this reduces to:
            MTM = face_value / (1 + r)^(days / 252)

        Args:
            receivable: Dict with face_value, cash_flows (optional list of
                        {amount, days_to_payment}), days_to_maturity.
            curve: Dict mapping maturity label to rate (e.g., {"90d": 0.12, "180d": 0.13}).
                   Used to interpolate discount rates per cash flow.

        Returns:
            Mark-to-market value in BRL.
        """
        face_value = float(receivable.get("face_value", 0.0))
        if face_value <= 0:
            return 0.0

        days_to_maturity = int(receivable.get("days_to_maturity", 1))
        cash_flows = receivable.get("cash_flows")

        # Use explicit cash flows if provided, else treat as bullet
        if not cash_flows:
            cash_flows = [{"amount": face_value, "days_to_payment": days_to_maturity}]

        pv = 0.0
        for cf in cash_flows:
            cf_amount = float(cf.get("amount", 0.0))
            t = float(cf.get("days_to_payment", days_to_maturity))
            if cf_amount <= 0:
                continue

            r = self._interpolate_rate(t, curve, receivable)
            discount_factor = (1 + r) ** (t / self.bd_year)
            pv += cf_amount / discount_factor

        return round(pv, 2)

    def calculate_discount_rate(
        self,
        risk_free: float,
        spread: float,
        maturity_days: int,
    ) -> float:
        """
        Build a composite discount rate.

        Formula (additive spread model):
            r = (1 + risk_free) × (1 + spread) − 1

        For term structure, apply a maturity adjustment (simplified Nelson-Siegel):
            long-term premium = spread × (1 − exp(−maturity_days / 252))

        Args:
            risk_free: Risk-free rate (annualised, 252 b.d. convention). E.g., 0.1025 = 10.25%.
            spread: Credit spread (annualised). E.g., 0.03 = 3%.
            maturity_days: Business days to maturity.

        Returns:
            Composite annualised discount rate.
        """
        if maturity_days <= 0:
            return risk_free + spread

        # Term structure adjustment: spread is higher for longer maturities
        # Using simplified exponential saturation: spread increases toward full spread
        term_factor = 1.0 - math.exp(-maturity_days / self.bd_year)
        adjusted_spread = spread * (0.5 + 0.5 * term_factor)   # Linear interpolation base

        # Compound: (1 + risk_free) × (1 + spread_adj) − 1
        composite_rate = (1 + risk_free) * (1 + adjusted_spread) - 1

        return round(composite_rate, 8)

    def calculate_yield(
        self,
        purchase_price: float,
        face_value: float,
        days: int,
    ) -> float:
        """
        Calculate annualised yield (252 b.d. convention).

        Formula:
            yield = (face_value / purchase_price)^(252 / days) − 1

        This is the effective annualised return for a zero-coupon / bullet receivable
        bought at discount.

        Args:
            purchase_price: Price paid for the receivable (BRL).
            face_value: Nominal / face value at maturity (BRL).
            days: Number of business days to maturity.

        Returns:
            Annualised yield as decimal (e.g., 0.1350 = 13.50% a.a.).

        Raises:
            ValueError: If purchase_price or days <= 0.
        """
        if purchase_price <= 0:
            raise ValueError(f"purchase_price must be positive, got {purchase_price}")
        if days <= 0:
            raise ValueError(f"days must be positive, got {days}")
        if face_value <= 0:
            raise ValueError(f"face_value must be positive, got {face_value}")

        ratio = face_value / purchase_price
        annualized_yield = ratio ** (self.bd_year / days) - 1
        return round(annualized_yield, 8)

    def generate_pricing_report(
        self,
        portfolio: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Generate a comprehensive portfolio pricing report.

        For each receivable:
        - Compute MTM value
        - Compute annualised yield
        - Compute PDD provision
        - Compute discount (face vs. MTM)

        Aggregate:
        - Total face value, total MTM, total provision
        - Weighted average yield
        - Portfolio-level aging report
        - Unrealised P&L (MTM − purchase_price)

        Args:
            portfolio: List of receivable dicts, each with:
                       face_value, purchase_price, days_to_maturity,
                       days_past_due, discount_rate (optional), spread (optional).

        Returns:
            Dict with per-receivable details and portfolio aggregates.
        """
        if not portfolio:
            return {"error": "Empty portfolio."}

        # Build default curve from risk-free + sector spread
        default_curve = {
            "30d": 0.105, "60d": 0.108, "90d": 0.111, "120d": 0.114,
            "180d": 0.118, "252d": 0.122, "360d": 0.126,
        }

        items: list[dict[str, Any]] = []
        total_face_value = 0.0
        total_mtm = 0.0
        total_purchase_price = 0.0
        total_provision = 0.0
        weighted_yield_numerator = 0.0

        for rec in portfolio:
            fv = float(rec.get("face_value", 0.0))
            pp = float(rec.get("purchase_price", fv))   # Assume purchased at par if not provided
            days = int(rec.get("days_to_maturity", 1))
            dpd = int(rec.get("days_past_due", 0))

            if fv <= 0:
                continue

            # MTM
            curve = rec.get("curve", default_curve)
            mtm = self.mark_to_market(rec, curve)

            # Yield
            try:
                yld = self.calculate_yield(pp, fv, max(days, 1))
            except ValueError:
                yld = 0.0

            # PDD for this receivable
            bucket_rate = self._dpd_to_provision_rate(dpd)
            provision = fv * bucket_rate

            # MTM discount vs. face value
            mtm_discount = fv - mtm
            mtm_discount_pct = mtm_discount / fv * 100 if fv else 0.0

            # Unrealised P&L
            unrealised_pnl = mtm - pp

            items.append({
                "id": rec.get("id", "?"),
                "face_value_brl": round(fv, 2),
                "purchase_price_brl": round(pp, 2),
                "mtm_value_brl": round(mtm, 2),
                "mtm_discount_brl": round(mtm_discount, 2),
                "mtm_discount_pct": round(mtm_discount_pct, 4),
                "unrealised_pnl_brl": round(unrealised_pnl, 2),
                "annualized_yield_pct": round(yld * 100, 4),
                "days_to_maturity": days,
                "days_past_due": dpd,
                "pdd_rate_pct": round(bucket_rate * 100, 2),
                "pdd_provision_brl": round(provision, 2),
                "cedente": rec.get("cedente", ""),
                "sacado": rec.get("sacado", ""),
                "sector": rec.get("sector", ""),
            })

            total_face_value += fv
            total_mtm += mtm
            total_purchase_price += pp
            total_provision += provision
            weighted_yield_numerator += yld * fv

        if not items:
            return {"error": "No valid receivables in portfolio."}

        weighted_avg_yield = weighted_yield_numerator / total_face_value if total_face_value > 0 else 0.0
        total_unrealised_pnl = total_mtm - total_purchase_price
        net_asset_value = total_mtm - total_provision

        # Aging report
        aging = self.calculate_pdd_aging(portfolio)

        return {
            "report_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "summary": {
                "total_receivables": len(items),
                "total_face_value_brl": round(total_face_value, 2),
                "total_purchase_price_brl": round(total_purchase_price, 2),
                "total_mtm_value_brl": round(total_mtm, 2),
                "total_provision_brl": round(total_provision, 2),
                "net_asset_value_brl": round(net_asset_value, 2),
                "total_unrealised_pnl_brl": round(total_unrealised_pnl, 2),
                "weighted_avg_yield_pct": round(weighted_avg_yield * 100, 4),
                "effective_provision_rate_pct": round(total_provision / total_face_value * 100, 4) if total_face_value else 0,
            },
            "aging_report": aging.to_dict(),
            "receivables": items,
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _dpd_to_provision_rate(self, dpd: int) -> float:
        """Map days-past-due to BACEN provision rate."""
        for max_dpd, rate, _ in self.pdd_buckets:
            if dpd <= max_dpd:
                return rate
        return 1.0

    def _bacen_rating_to_rate(self, rating: str) -> float:
        """Map BACEN rating letter (AA–H) to provision rate."""
        mapping = {
            "AA": 0.0, "A": 0.005, "B": 0.01, "C": 0.03,
            "D": 0.10, "E": 0.30, "F": 0.50, "G": 0.70, "H": 1.00,
        }
        return mapping.get(rating.upper(), 0.0)

    def _interpolate_rate(
        self,
        days: float,
        curve: dict[str, Any],
        receivable: dict[str, Any],
    ) -> float:
        """
        Interpolate discount rate from the yield curve.

        Performs linear interpolation between adjacent tenor points.
        Falls back to receivable-level discount_rate if curve is sparse.

        Args:
            days: Business days to payment.
            curve: Dict like {"30d": 0.105, "90d": 0.111, ...}.
            receivable: Source receivable (for fallback rate).

        Returns:
            Interpolated annualised discount rate.
        """
        # Parse curve tenors
        parsed: list[tuple[float, float]] = []
        for key, rate in curve.items():
            try:
                tenor_days = float(key.replace("d", "").replace("m", ""))
                if "m" in key:
                    tenor_days *= 21   # Approximate trading months
                parsed.append((tenor_days, float(rate)))
            except ValueError:
                continue

        parsed.sort(key=lambda x: x[0])

        if not parsed:
            # Fallback: use receivable's own discount_rate or spread + Selic
            return float(receivable.get("discount_rate", 0.12))

        # Extrapolate left
        if days <= parsed[0][0]:
            return parsed[0][1]

        # Extrapolate right
        if days >= parsed[-1][0]:
            return parsed[-1][1]

        # Linear interpolation
        for i in range(len(parsed) - 1):
            t0, r0 = parsed[i]
            t1, r1 = parsed[i + 1]
            if t0 <= days <= t1:
                weight = (days - t0) / (t1 - t0)
                return r0 + weight * (r1 - r0)

        return parsed[-1][1]


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

DEMO_RECEIVABLES = [
    {
        "id": "rec_001", "face_value": 500_000, "purchase_price": 490_000,
        "days_to_maturity": 90, "days_past_due": 0,
        "cedente": "Alpha Ltda", "sacado": "Walmart BR", "sector": "varejo",
    },
    {
        "id": "rec_002", "face_value": 200_000, "purchase_price": 180_000,
        "days_to_maturity": 45, "days_past_due": 35,
        "cedente": "Beta S.A.", "sacado": "Magazine Luiza", "sector": "varejo",
    },
    {
        "id": "rec_003", "face_value": 1_000_000, "purchase_price": 950_000,
        "days_to_maturity": 180, "days_past_due": 0,
        "cedente": "Gamma ME", "sacado": "Petrobras", "sector": "energia",
    },
    {
        "id": "rec_004", "face_value": 300_000, "purchase_price": 240_000,
        "days_to_maturity": 10, "days_past_due": 95,
        "bacen_rating": "D",
        "cedente": "Delta S.A.", "sacado": "Empresa XYZ", "sector": "construção",
    },
]

if __name__ == "__main__":
    import json
    agent = PricingAgent()

    print("=== PDD Aging Report ===")
    aging = agent.calculate_pdd_aging(DEMO_RECEIVABLES)
    print(json.dumps(aging.to_dict(), indent=2))

    print("\n=== MTM Example ===")
    mtm = agent.mark_to_market(DEMO_RECEIVABLES[0], {"90d": 0.1350})
    print(f"MTM (rec_001): R$ {mtm:,.2f}")

    print("\n=== Yield Example ===")
    yld = agent.calculate_yield(490_000, 500_000, 90)
    print(f"Yield (rec_001): {yld * 100:.4f}% a.a.")

    print("\n=== Discount Rate ===")
    dr = agent.calculate_discount_rate(risk_free=0.1025, spread=0.03, maturity_days=90)
    print(f"Discount rate (90d): {dr * 100:.4f}% a.a.")

    print("\n=== Pricing Report Summary ===")
    report = agent.generate_pricing_report(DEMO_RECEIVABLES)
    print(json.dumps(report["summary"], indent=2))
