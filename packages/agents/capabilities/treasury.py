"""
treasury.py — Cash Management and Liquidity for FIDC funds.

Implements cash-flow projection, liquidity ratios, reserve adequacy,
duration gap analysis, redemption processing, and bank reconciliation.
All monetary values in BRL.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Optional

# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


@dataclass
class DailyBalance:
    """Single day in the cash-flow projection."""

    date: str  # ISO date YYYY-MM-DD
    inflows: float  # Receivable maturities + other inflows
    outflows: float  # Redemptions + fees + expenses
    net: float  # inflows - outflows
    cumulative: float  # running balance


@dataclass
class CashFlowProjection:
    """90-day (or custom horizon) cash-flow projection result."""

    horizon_days: int
    opening_balance: float
    closing_balance: float
    min_balance: float
    avg_balance: float
    max_balance: float
    total_inflows: float
    total_outflows: float
    daily_balances: list[DailyBalance]
    liquidity_warning: bool  # True if min_balance < 0
    days_below_zero: int
    reserve_coverage_days: int  # how many days of outflows are covered


@dataclass
class ReconciliationItem:
    """A single reconciliation finding."""

    internal_id: Optional[str]
    bank_id: Optional[str]
    amount_internal: float
    amount_bank: float
    discrepancy: float
    status: str  # "matched" | "internal_only" | "bank_only" | "amount_mismatch"
    description: str


@dataclass
class ReconciliationResult:
    """Bank statement reconciliation result."""

    total_internal: float
    total_bank: float
    total_discrepancy: float
    matched_count: int
    unmatched_internal: int
    unmatched_bank: int
    amount_mismatches: int
    items: list[ReconciliationItem]
    reconciled: bool  # True if discrepancy < tolerance
    tolerance: float


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------


class TreasuryAgent:
    """
    Treasury and liquidity management agent for FIDC funds.

    Handles cash-flow projections, reserve management, duration analysis,
    and bank reconciliation per ANBIMA / CVM guidelines.
    """

    # ------------------------------------------------------------------ #
    # Constants                                                            #
    # ------------------------------------------------------------------ #

    # Annual management fee rate (typical FIDC: 0.5–2%)
    DEFAULT_MANAGEMENT_FEE_ANNUAL: float = 0.01  # 1% a.a.

    # CDI daily rate approximation (13.75% a.a.)
    CDI_ANNUAL: float = 0.1375
    CDI_DAILY: float = (1 + CDI_ANNUAL) ** (1 / 252) - 1

    # Minimum liquidity ratio (regulatory guidance)
    MIN_LIQUIDITY_RATIO: float = 1.0

    # Redemption policies
    REDEMPTION_APPROVE_THRESHOLD: float = 0.50  # approve if cash covers 50%+
    REDEMPTION_PARTIAL_THRESHOLD: float = 0.20  # partial if cash covers 20–50%

    # ------------------------------------------------------------------ #
    # Core entry point                                                     #
    # ------------------------------------------------------------------ #

    def execute(self, task: str, context: dict, chunks: list) -> dict:
        """
        Main dispatch for the treasury agent.

        Args:
            task:    Task description
            context: Fund context (portfolio, cash, nav, obligations)
            chunks:  Data chunks

        Returns:
            dict with status, results, summary
        """
        portfolio = context.get("portfolio", DEMO_PORTFOLIO)
        cash = context.get("cash", 500_000.0)
        nav = context.get("nav", 3_000_000.0)
        obligations = context.get("short_term_obligations", 200_000.0)

        results: dict = {}

        proj = self.project_cash_flow(portfolio, horizon_days=90)
        results["cash_flow_projection"] = proj

        results["liquidity_ratio"] = self.calculate_liquidity_ratio(cash, obligations)

        results["reserve_adequacy"] = self.check_reserve_adequacy(cash, nav, 0.10)

        results["duration_gap"] = self.duration_gap(
            context.get("assets_duration", 0.5),
            context.get("liabilities_duration", 0.25),
        )

        results["redemption_test"] = self.process_redemption_request(
            amount=100_000.0,
            cash=cash,
            nav=nav,
            liquidity_ratio=results["liquidity_ratio"],
        )

        results["reconciliation"] = self.reconcile_bank_statement(
            DEMO_INTERNAL_TRANSACTIONS, DEMO_BANK_TRANSACTIONS
        )

        return {
            "status": "ok",
            "results": results,
            "summary": (
                f"Cash: R$ {cash:,.2f} | "
                f"Liquidity ratio: {results['liquidity_ratio']:.2f} | "
                f"Reserve: {'OK' if results['reserve_adequacy']['adequate'] else 'INSUFICIENTE'}"
            ),
        }

    # ------------------------------------------------------------------ #
    # 1. Cash-Flow Projection                                              #
    # ------------------------------------------------------------------ #

    def project_cash_flow(
        self,
        portfolio: list[dict],
        horizon_days: int = 90,
    ) -> CashFlowProjection:
        """
        Project daily cash inflows and outflows for `horizon_days`.

        Inflows:  receivable maturities (by prazo_dias), CDI income on cash
        Outflows: daily management fee accrual, scheduled redemptions,
                  admin/custodian expenses

        Args:
            portfolio:    List of receivable dicts (valor_presente, prazo_dias, etc.)
            horizon_days: Projection horizon in calendar days

        Returns:
            CashFlowProjection dataclass
        """
        opening_balance = (
            sum(r.get("caixa_inicial", 0) for r in portfolio if "caixa_inicial" in r)
            or 500_000.0
        )  # default demo opening cash

        nav = sum(r.get("valor_presente", 0) for r in portfolio)
        daily_fee = nav * self.DEFAULT_MANAGEMENT_FEE_ANNUAL / 252

        # Build maturity schedule: day → inflow
        maturity_schedule: dict[int, float] = {}
        for rec in portfolio:
            prazo = int(rec.get("prazo_dias", 30))
            if 0 < prazo <= horizon_days:
                vp = rec.get("valor_presente", 0)
                maturity_schedule[prazo] = maturity_schedule.get(prazo, 0) + vp
            # If maturity beyond horizon, spread remaining as discount-based inflow

        # Scheduled redemptions from context (default: none)
        redemption_schedule: dict[int, float] = {}
        for redemption in [r for r in portfolio if "redemption_day" in r]:
            day = redemption["redemption_day"]
            redemption_schedule[day] = redemption_schedule.get(day, 0) + redemption.get(
                "amount", 0
            )

        today = date.today()
        running_balance = opening_balance
        daily_balances: list[DailyBalance] = []
        days_below_zero = 0

        for d in range(1, horizon_days + 1):
            current_date = today + timedelta(days=d)

            # Inflows
            receivable_maturity = maturity_schedule.get(d, 0)
            cdi_income = running_balance * self.CDI_DAILY if running_balance > 0 else 0
            total_inflow = receivable_maturity + cdi_income

            # Outflows
            fee_outflow = daily_fee
            redemption_out = redemption_schedule.get(d, 0)
            # Operational expenses: 0.02% of NAV daily (admin, custodian, auditor)
            operational = nav * 0.0002 / 252

            total_outflow = fee_outflow + redemption_out + operational

            net = total_inflow - total_outflow
            running_balance += net

            daily_balances.append(
                DailyBalance(
                    date=current_date.isoformat(),
                    inflows=round(total_inflow, 2),
                    outflows=round(total_outflow, 2),
                    net=round(net, 2),
                    cumulative=round(running_balance, 2),
                )
            )

            if running_balance < 0:
                days_below_zero += 1

        balances = [b.cumulative for b in daily_balances]
        min_balance = min(balances)
        avg_balance = statistics.mean(balances)
        max_balance = max(balances)
        closing = daily_balances[-1].cumulative

        total_in = sum(b.inflows for b in daily_balances)
        total_out = sum(b.outflows for b in daily_balances)

        # Reserve coverage: how many days of avg daily outflow does cash cover?
        avg_daily_outflow = total_out / horizon_days if horizon_days > 0 else 1
        reserve_days = (
            int(opening_balance / avg_daily_outflow) if avg_daily_outflow > 0 else 9999
        )

        return CashFlowProjection(
            horizon_days=horizon_days,
            opening_balance=round(opening_balance, 2),
            closing_balance=round(closing, 2),
            min_balance=round(min_balance, 2),
            avg_balance=round(avg_balance, 2),
            max_balance=round(max_balance, 2),
            total_inflows=round(total_in, 2),
            total_outflows=round(total_out, 2),
            daily_balances=daily_balances,
            liquidity_warning=min_balance < 0,
            days_below_zero=days_below_zero,
            reserve_coverage_days=min(reserve_days, 9999),
        )

    # ------------------------------------------------------------------ #
    # 2. Liquidity Ratio                                                   #
    # ------------------------------------------------------------------ #

    def calculate_liquidity_ratio(
        self,
        cash: float,
        short_term_obligations: float,
    ) -> float:
        """
        Liquidity Coverage Ratio: LCR = Cash / Short-term obligations.

        Ratio ≥ 1.0 → adequate.
        Ratio < 0.5 → critical.

        Args:
            cash:                    Available liquid cash in BRL
            short_term_obligations:  Obligations due within 30 days in BRL

        Returns:
            LCR as float (e.g. 1.5 = 150% coverage)
        """
        if short_term_obligations <= 0:
            return float("inf")
        return round(cash / short_term_obligations, 4)

    # ------------------------------------------------------------------ #
    # 3. Reserve Adequacy                                                  #
    # ------------------------------------------------------------------ #

    def check_reserve_adequacy(
        self,
        cash: float,
        nav: float,
        min_reserve_pct: float = 0.10,
    ) -> dict:
        """
        Verify minimum cash reserve vs. NAV requirement.

        ANBIMA guideline: maintain at least 10% of NAV in liquid assets.

        Args:
            cash:            Current cash balance (BRL)
            nav:             Net Asset Value (BRL)
            min_reserve_pct: Minimum reserve as % of NAV (default 10%)

        Returns:
            dict: adequate (bool), reserve_required, shortfall, coverage_pct
        """
        if nav <= 0:
            raise ValueError("nav must be positive")

        reserve_required = nav * min_reserve_pct
        shortfall = max(0.0, reserve_required - cash)
        coverage_pct = (
            (cash / reserve_required * 100) if reserve_required > 0 else 100.0
        )

        return {
            "adequate": cash >= reserve_required,
            "cash": round(cash, 2),
            "nav": round(nav, 2),
            "min_reserve_pct": min_reserve_pct,
            "reserve_required": round(reserve_required, 2),
            "shortfall": round(shortfall, 2),
            "coverage_pct": round(coverage_pct, 2),
            "recommendation": (
                "Reserve adequate"
                if cash >= reserve_required
                else f"Increase cash by R$ {shortfall:,.2f} to meet minimum reserve"
            ),
        }

    # ------------------------------------------------------------------ #
    # 4. Duration Gap                                                      #
    # ------------------------------------------------------------------ #

    def duration_gap(
        self,
        assets_duration: float,
        liabilities_duration: float,
    ) -> float:
        """
        Duration Gap = D_assets − D_liabilities.

        Positive gap → asset-sensitive: rising rates hurt NAV.
        Negative gap → liability-sensitive.
        Target: gap close to 0 (immunised portfolio).

        Args:
            assets_duration:      Macaulay duration of assets in years
            liabilities_duration: Macaulay duration of liabilities in years

        Returns:
            Duration gap in years
        """
        gap = assets_duration - liabilities_duration
        return round(gap, 4)

    def duration_gap_analysis(
        self,
        assets_duration: float,
        liabilities_duration: float,
        nav: float,
        rate_shock_bps: int = 100,
    ) -> dict:
        """
        Full duration gap analysis with rate shock impact.

        ΔP ≈ −Duration_gap × ΔYield × NAV

        Args:
            assets_duration:      in years
            liabilities_duration: in years
            nav:                  Net Asset Value in BRL
            rate_shock_bps:       Interest rate shock in basis points

        Returns:
            dict with gap, rate_shock_impact, risk_level
        """
        gap = self.duration_gap(assets_duration, liabilities_duration)
        rate_shock = rate_shock_bps / 10_000
        nav_impact = -gap * rate_shock * nav

        risk_level = "LOW"
        if abs(gap) > 1.0:
            risk_level = "HIGH"
        elif abs(gap) > 0.5:
            risk_level = "MEDIUM"

        return {
            "duration_gap_years": gap,
            "assets_duration": assets_duration,
            "liabilities_duration": liabilities_duration,
            "rate_shock_bps": rate_shock_bps,
            "nav_impact_brl": round(nav_impact, 2),
            "nav_impact_pct": round(nav_impact / nav * 100, 4) if nav else 0,
            "risk_level": risk_level,
            "recommendation": (
                "Portfolio nearly immunised"
                if abs(gap) < 0.25
                else "Consider hedging duration gap with DI futures or swaps"
            ),
        }

    # ------------------------------------------------------------------ #
    # 5. Redemption Processing                                             #
    # ------------------------------------------------------------------ #

    def process_redemption_request(
        self,
        amount: float,
        cash: float,
        nav: float,
        liquidity_ratio: float,
    ) -> dict:
        """
        Approve, deny, or partially approve a redemption request.

        Decision logic:
          - LCR < 0.5            → DENY (critical liquidity)
          - cash >= amount        → APPROVE (full)
          - cash >= 50% × amount  → PARTIAL (50% approved)
          - cash < 20% × amount   → DENY

        Args:
            amount:           Requested redemption amount (BRL)
            cash:             Available cash (BRL)
            nav:              Current NAV (BRL)
            liquidity_ratio:  Current LCR

        Returns:
            dict: decision, approved_amount, reason, post_redemption_cash
        """
        if amount <= 0:
            raise ValueError("amount must be positive")

        # Critical liquidity gate
        if liquidity_ratio < 0.5:
            return {
                "decision": "DENY",
                "approved_amount": 0.0,
                "reason": f"Critical liquidity (LCR={liquidity_ratio:.2f} < 0.50). Redemption suspended.",
                "post_redemption_cash": cash,
                "post_redemption_lcr": liquidity_ratio,
            }

        # Cap redemption at 10% of NAV per request (FIDC typical rule)
        max_single_redemption = nav * 0.10
        if amount > max_single_redemption:
            amount = max_single_redemption
            capped = True
        else:
            capped = False

        if cash >= amount:
            decision = "APPROVE"
            approved = amount
            reason = "Full liquidity available."
        elif cash >= amount * self.REDEMPTION_APPROVE_THRESHOLD:
            decision = "PARTIAL"
            approved = round(cash * self.REDEMPTION_APPROVE_THRESHOLD, 2)
            reason = (
                f"Partial approval: {self.REDEMPTION_APPROVE_THRESHOLD*100:.0f}% of requested "
                f"amount due to liquidity constraints."
            )
        elif cash >= amount * self.REDEMPTION_PARTIAL_THRESHOLD:
            decision = "PARTIAL"
            approved = round(cash * self.REDEMPTION_PARTIAL_THRESHOLD, 2)
            reason = (
                f"Minimal partial approval: {self.REDEMPTION_PARTIAL_THRESHOLD*100:.0f}% of "
                f"requested amount. Consider queuing remainder."
            )
        else:
            decision = "DENY"
            approved = 0.0
            reason = f"Insufficient cash (R$ {cash:,.2f}) to cover minimum redemption threshold."

        if capped:
            reason = "[CAPPED to 10% NAV] " + reason

        post_cash = cash - approved
        return {
            "decision": decision,
            "requested_amount": round(amount, 2),
            "approved_amount": round(approved, 2),
            "denied_amount": round(amount - approved, 2),
            "reason": reason,
            "post_redemption_cash": round(post_cash, 2),
            "post_redemption_lcr": round(post_cash / max(cash, 1) * liquidity_ratio, 4),
            "capped_to_nav_pct": capped,
        }

    # ------------------------------------------------------------------ #
    # 6. Bank Reconciliation                                               #
    # ------------------------------------------------------------------ #

    def reconcile_bank_statement(
        self,
        internal: list[dict],
        bank: list[dict],
    ) -> ReconciliationResult:
        """
        Match internal ledger transactions against bank statement.

        Matching key: (date, abs(amount)) within ±R$ 0.02 tolerance.
        Flags:
          - matched:        both sides agree
          - internal_only:  in ledger, missing in bank
          - bank_only:      in bank, missing in ledger
          - amount_mismatch: same date/ref but different amounts

        Args:
            internal: List of {'id', 'date', 'amount', 'description'}
            bank:     List of {'id', 'date', 'amount', 'description'}

        Returns:
            ReconciliationResult dataclass
        """
        TOLERANCE = 0.02  # R$ 0.02 tolerance

        items: list[ReconciliationItem] = []
        matched_bank_ids: set[str] = set()

        for int_tx in internal:
            int_id = int_tx.get("id", "")
            int_date = int_tx.get("date", "")
            int_amt = float(int_tx.get("amount", 0))
            int_desc = int_tx.get("description", "")

            # Find matching bank transaction
            best_match = None
            for bank_tx in bank:
                if bank_tx.get("id") in matched_bank_ids:
                    continue
                b_date = bank_tx.get("date", "")
                b_amt = float(bank_tx.get("amount", 0))
                if b_date == int_date and abs(abs(b_amt) - abs(int_amt)) <= TOLERANCE:
                    best_match = bank_tx
                    break

            if best_match:
                matched_bank_ids.add(best_match.get("id", ""))
                b_amt = float(best_match.get("amount", 0))
                discrepancy = round(abs(b_amt) - abs(int_amt), 4)
                status = (
                    "matched" if abs(discrepancy) <= TOLERANCE else "amount_mismatch"
                )
                items.append(
                    ReconciliationItem(
                        internal_id=int_id,
                        bank_id=best_match.get("id"),
                        amount_internal=round(int_amt, 2),
                        amount_bank=round(b_amt, 2),
                        discrepancy=discrepancy,
                        status=status,
                        description=int_desc,
                    )
                )
            else:
                items.append(
                    ReconciliationItem(
                        internal_id=int_id,
                        bank_id=None,
                        amount_internal=round(int_amt, 2),
                        amount_bank=0.0,
                        discrepancy=round(int_amt, 2),
                        status="internal_only",
                        description=int_desc,
                    )
                )

        # Bank-only transactions
        for bank_tx in bank:
            if bank_tx.get("id") not in matched_bank_ids:
                b_amt = float(bank_tx.get("amount", 0))
                items.append(
                    ReconciliationItem(
                        internal_id=None,
                        bank_id=bank_tx.get("id"),
                        amount_internal=0.0,
                        amount_bank=round(b_amt, 2),
                        discrepancy=round(-b_amt, 2),
                        status="bank_only",
                        description=bank_tx.get("description", ""),
                    )
                )

        total_internal = sum(abs(i.amount_internal) for i in items if i.internal_id)
        total_bank = sum(abs(i.amount_bank) for i in items if i.bank_id)
        total_discrepancy = round(abs(total_bank - total_internal), 2)
        matched_count = sum(1 for i in items if i.status == "matched")
        unmatched_int = sum(1 for i in items if i.status == "internal_only")
        unmatched_bank = sum(1 for i in items if i.status == "bank_only")
        mismatches = sum(1 for i in items if i.status == "amount_mismatch")

        return ReconciliationResult(
            total_internal=round(total_internal, 2),
            total_bank=round(total_bank, 2),
            total_discrepancy=total_discrepancy,
            matched_count=matched_count,
            unmatched_internal=unmatched_int,
            unmatched_bank=unmatched_bank,
            amount_mismatches=mismatches,
            items=items,
            reconciled=(total_discrepancy <= 1.0 and mismatches == 0),
            tolerance=TOLERANCE,
        )


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

DEMO_PORTFOLIO: list[dict] = [
    {"valor_presente": 490_000.0, "prazo_dias": 30, "cedente": "Alpha"},
    {"valor_presente": 293_000.0, "prazo_dias": 45, "cedente": "Beta"},
    {"valor_presente": 730_000.0, "prazo_dias": 60, "cedente": "Gamma"},
    {"valor_presente": 195_000.0, "prazo_dias": 90, "cedente": "Delta"},
    {"valor_presente": 975_000.0, "prazo_dias": 75, "cedente": "Epsilon"},
]

DEMO_INTERNAL_TRANSACTIONS = [
    {
        "id": "INT-001",
        "date": "2026-03-01",
        "amount": 50_000.00,
        "description": "Recebimento Alpha",
    },
    {
        "id": "INT-002",
        "date": "2026-03-05",
        "amount": -10_000.00,
        "description": "Taxa administração",
    },
    {
        "id": "INT-003",
        "date": "2026-03-10",
        "amount": 120_000.00,
        "description": "Recebimento Beta",
    },
    {
        "id": "INT-004",
        "date": "2026-03-15",
        "amount": -5_000.00,
        "description": "Custódia",
    },
    {
        "id": "INT-005",
        "date": "2026-03-20",
        "amount": 75_000.00,
        "description": "Recebimento Gamma",
    },
]

DEMO_BANK_TRANSACTIONS = [
    {
        "id": "BNK-001",
        "date": "2026-03-01",
        "amount": 50_000.00,
        "description": "TED recebida",
    },
    {
        "id": "BNK-002",
        "date": "2026-03-05",
        "amount": -10_000.00,
        "description": "Débito taxa",
    },
    {
        "id": "BNK-003",
        "date": "2026-03-10",
        "amount": 119_998.50,
        "description": "TED recebida",
    },  # mismatch
    {
        "id": "BNK-004",
        "date": "2026-03-15",
        "amount": -5_000.00,
        "description": "Débito custódia",
    },
    {
        "id": "BNK-006",
        "date": "2026-03-25",
        "amount": -2_500.00,
        "description": "Tarifa bancária",
    },  # bank-only
]


# ---------------------------------------------------------------------------
# CLI demo
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    agent = TreasuryAgent()
    result = agent.execute("demo treasury", {}, [])
    print("=== TREASURY AGENT DEMO ===")
    print(f"Summary: {result['summary']}")
    proj = result["results"]["cash_flow_projection"]
    print(
        f"\nCash flow (90d): opening R$ {proj.opening_balance:,.2f} → closing R$ {proj.closing_balance:,.2f}"
    )
    print(
        f"Min balance: R$ {proj.min_balance:,.2f} | Days below zero: {proj.days_below_zero}"
    )
    print(f"Reserve coverage: {proj.reserve_coverage_days} days")
    ra = result["results"]["reserve_adequacy"]
    print(
        f"\nReserve: {'✓ OK' if ra['adequate'] else '✗ INSUFICIENTE'} | Coverage: {ra['coverage_pct']:.1f}%"
    )
    rd = result["results"]["redemption_test"]
    print(f"\nRedemption test: {rd['decision']} — {rd['reason']}")
    rec = result["results"]["reconciliation"]
    print(f"\nReconciliation: {'✓ OK' if rec.reconciled else '✗ DIVERGÊNCIAS'}")
    print(
        f"  Matched: {rec.matched_count} | Internal-only: {rec.unmatched_internal} | Bank-only: {rec.unmatched_bank}"
    )
    print(f"  Discrepancy: R$ {rec.total_discrepancy:,.2f}")
