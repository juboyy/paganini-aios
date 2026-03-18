"""
Administrador Agent — NAV calculation, quota management, CVM filings.

Implements Brazilian FIDC administration rules per CVM Instrução 356/01 and
CVM Resolução 175/22 (effective Jan 2023).

Key formula:
    NAV = (receivables_gross − PDD) + cash + other_assets − liabilities
    quota_price = NAV / total_quotas
    subordination_ratio = sub_nav / (senior_nav + sub_nav)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CVM / ANBIMA regulatory constants
# ---------------------------------------------------------------------------

# Maximum admin fee per year (annualised, in decimal)
MAX_ADMIN_FEE_ANNUAL = 0.02          # 2% a.a.
MAX_CUSTODY_FEE_ANNUAL = 0.005       # 0.5% a.a.

# Minimum subordination ratio for senior quotas (CVM 175)
MIN_SUBORDINATION_RATIO = 0.20       # 20%

# Day-count for fee accrual (Brazilian 252-business-day convention)
BUSINESS_DAYS_YEAR = 252

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class NavResult:
    """Full NAV breakdown for a FIDC."""
    date: str
    receivables_gross: float
    pdd_provision: float
    receivables_net: float
    cash: float
    other_assets: float
    total_assets: float
    liabilities: float
    admin_fees_accrued: float
    custody_fees_accrued: float
    total_liabilities: float
    nav: float
    senior_nav: float
    sub_nav: float
    total_quotas_senior: float
    total_quotas_sub: float
    quota_price_senior: float
    quota_price_sub: float
    subordination_ratio: float
    subordination_ok: bool

    def to_dict(self) -> dict[str, Any]:
        return self.__dict__.copy()


# ---------------------------------------------------------------------------
# AdministradorAgent
# ---------------------------------------------------------------------------

class AdministradorAgent:
    """
    FIDC Administrator agent.

    Responsible for daily NAV calculation, quota pricing, subordination
    monitoring, quota issuance/redemption processing, and CVM report generation.
    """

    def __init__(self):
        self.admin_fee_annual = MAX_ADMIN_FEE_ANNUAL
        self.custody_fee_annual = MAX_CUSTODY_FEE_ANNUAL
        self.business_days_year = BUSINESS_DAYS_YEAR

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
        Entry point dispatched by the orchestrator.

        Args:
            task: Action name ('calculate_nav', 'generate_daily_report', …).
            context: Portfolio and fund-state dict.
            chunks: Optional document context from RAG.

        Returns:
            Serialisable result dict.
        """
        action_map = {
            "calculate_nav": self._exec_calculate_nav,
            "calculate_quota_price": self._exec_quota_price,
            "issue_quotas": self._exec_issue_quotas,
            "process_redemption": self._exec_redemption,
            "generate_daily_report": self._exec_daily_report,
        }
        handler = action_map.get(task)
        if handler is None:
            return {"error": f"Unknown action: {task!r}", "available": list(action_map)}
        return handler(context)

    # ------------------------------------------------------------------
    # Core capabilities
    # ------------------------------------------------------------------

    def calculate_nav(self, portfolio: dict[str, Any]) -> NavResult:
        """
        Calculate Net Asset Value for the FIDC.

        NAV = receivables_net + cash + other_assets − total_liabilities

        Fee accrual uses the Brazilian pro-rata die convention over 252 b.d.:
            daily_rate = (1 + annual_rate)^(1/252) − 1
            accrued = nav_base × daily_rate × accrual_days

        Args:
            portfolio: Dict with keys:
                receivables_gross (float): Face value of all receivables.
                pdd_provision (float): Provision for doubtful debts.
                cash (float): Cash and equivalents.
                other_assets (float): Other fund assets.
                liabilities (float): Non-fee liabilities (leverage, payables).
                senior_nav (float): Senior tranche NAV (for subordination calc).
                sub_nav (float): Subordinated tranche NAV.
                total_quotas_senior (float): Number of senior quotas outstanding.
                total_quotas_sub (float): Number of sub quotas outstanding.
                accrual_days (int): Days since last fee accrual (default 1).
                admin_fee_override (float | None): Optional fee override.

        Returns:
            NavResult with full breakdown.
        """
        receivables_gross = float(portfolio.get("receivables_gross", 0.0))
        pdd_provision = float(portfolio.get("pdd_provision", 0.0))
        cash = float(portfolio.get("cash", 0.0))
        other_assets = float(portfolio.get("other_assets", 0.0))
        liabilities = float(portfolio.get("liabilities", 0.0))
        senior_nav_input = float(portfolio.get("senior_nav", 0.0))
        sub_nav_input = float(portfolio.get("sub_nav", 0.0))
        total_quotas_senior = float(portfolio.get("total_quotas_senior", 1.0))
        total_quotas_sub = float(portfolio.get("total_quotas_sub", 1.0))
        accrual_days = int(portfolio.get("accrual_days", 1))
        admin_fee_rate = float(portfolio.get("admin_fee_override", self.admin_fee_annual))
        custody_fee_rate = float(portfolio.get("custody_fee_override", self.custody_fee_annual))

        receivables_net = receivables_gross - pdd_provision
        total_assets = receivables_net + cash + other_assets

        # Pro-rata fee accrual: (1 + annual)^(days/252) − 1
        # Applied to the gross NAV base
        nav_base = total_assets - liabilities
        admin_daily_factor = (1 + admin_fee_rate) ** (accrual_days / self.business_days_year) - 1
        custody_daily_factor = (1 + custody_fee_rate) ** (accrual_days / self.business_days_year) - 1

        admin_fees_accrued = nav_base * admin_daily_factor
        custody_fees_accrued = nav_base * custody_daily_factor
        total_liabilities = liabilities + admin_fees_accrued + custody_fees_accrued

        nav = total_assets - total_liabilities

        # Tranche NAVs from input; if not provided, split proportionally
        if senior_nav_input + sub_nav_input > 0:
            senior_nav = senior_nav_input
            sub_nav = sub_nav_input
        else:
            # Default: 80/20 senior/sub split
            senior_nav = nav * 0.80
            sub_nav = nav * 0.20

        quota_price_senior = self.calculate_quota_price(senior_nav, total_quotas_senior)
        quota_price_sub = self.calculate_quota_price(sub_nav, total_quotas_sub)
        sub_ratio = self.calculate_subordination_ratio(senior_nav, sub_nav)

        return NavResult(
            date=datetime.utcnow().strftime("%Y-%m-%d"),
            receivables_gross=round(receivables_gross, 2),
            pdd_provision=round(pdd_provision, 2),
            receivables_net=round(receivables_net, 2),
            cash=round(cash, 2),
            other_assets=round(other_assets, 2),
            total_assets=round(total_assets, 2),
            liabilities=round(liabilities, 2),
            admin_fees_accrued=round(admin_fees_accrued, 6),
            custody_fees_accrued=round(custody_fees_accrued, 6),
            total_liabilities=round(total_liabilities, 6),
            nav=round(nav, 2),
            senior_nav=round(senior_nav, 2),
            sub_nav=round(sub_nav, 2),
            total_quotas_senior=total_quotas_senior,
            total_quotas_sub=total_quotas_sub,
            quota_price_senior=round(quota_price_senior, 6),
            quota_price_sub=round(quota_price_sub, 6),
            subordination_ratio=round(sub_ratio, 6),
            subordination_ok=sub_ratio >= MIN_SUBORDINATION_RATIO,
        )

    def calculate_quota_price(self, nav: float, total_quotas: float) -> float:
        """
        Calculate price per quota.

        quota_price = NAV / total_quotas

        Args:
            nav: Net Asset Value for the tranche (BRL).
            total_quotas: Number of outstanding quotas.

        Returns:
            Price per quota in BRL. Returns 0.0 if total_quotas <= 0.
        """
        if total_quotas <= 0:
            logger.warning("total_quotas <= 0; returning quota_price = 0.0")
            return 0.0
        return nav / total_quotas

    def calculate_subordination_ratio(self, senior_nav: float, sub_nav: float) -> float:
        """
        Calculate subordination ratio (cobertura de subordinação).

        subordination_ratio = sub_nav / (senior_nav + sub_nav)

        Regulatorily required to be >= 20% (CVM 175) for new issuances.
        Many FIDC regulations require >= 25%.

        Args:
            senior_nav: Senior tranche NAV (BRL).
            sub_nav: Subordinated tranche NAV (BRL).

        Returns:
            Ratio in decimal (e.g. 0.25 = 25%).
        """
        total = senior_nav + sub_nav
        if total <= 0:
            return 0.0
        return sub_nav / total

    def issue_quotas(
        self,
        amount: float,
        quota_class: str,
        current_nav: float,
    ) -> dict[str, Any]:
        """
        Process a quota issuance request.

        New quotas are priced at current NAV per quota at issuance date.
        quota_count = amount / current_quota_price

        Args:
            amount: BRL amount to subscribe.
            quota_class: 'senior' or 'subordinada'.
            current_nav: Current tranche NAV at issuance.

        Returns:
            Dict with quota_count, price_per_quota, settlement_date,
            updated_nav.
        """
        if amount <= 0:
            raise ValueError(f"Issuance amount must be positive, got {amount}")
        if quota_class not in ("senior", "subordinada"):
            raise ValueError(f"quota_class must be 'senior' or 'subordinada', got {quota_class!r}")

        # Quota price before issuance (NAV known from current_nav argument)
        # Assume total_quotas = current_nav / 1000 for demo (1000 BRL par)
        par_value = 1_000.0
        existing_quotas = current_nav / par_value if current_nav > 0 else 1.0
        price_per_quota = self.calculate_quota_price(current_nav, existing_quotas)

        new_quota_count = amount / price_per_quota if price_per_quota > 0 else 0.0
        new_nav = current_nav + amount

        settlement_days = 2  # D+2 in Brazilian markets
        today = datetime.utcnow()

        return {
            "operation": "issuance",
            "quota_class": quota_class,
            "subscribed_amount_brl": round(amount, 2),
            "price_per_quota": round(price_per_quota, 6),
            "new_quota_count": round(new_quota_count, 6),
            "settlement_date": today.strftime("%Y-%m-%d"),
            "settlement_d_plus": settlement_days,
            "nav_pre_issuance": round(current_nav, 2),
            "nav_post_issuance": round(new_nav, 2),
            "total_quotas_post": round(existing_quotas + new_quota_count, 6),
            "cvm_filing_required": amount >= 1_000_000,
        }

    def process_redemption(
        self,
        quotas: float,
        quota_class: str,
        nav_per_quota: float,
    ) -> dict[str, Any]:
        """
        Process a quota redemption.

        redemption_amount = quotas × nav_per_quota

        Args:
            quotas: Number of quotas to redeem.
            quota_class: 'senior' or 'subordinada'.
            nav_per_quota: Current NAV per quota (BRL).

        Returns:
            Dict with redemption_amount, settlement_date, withholding_tax.
        """
        if quotas <= 0:
            raise ValueError(f"quotas must be positive, got {quotas}")
        if nav_per_quota <= 0:
            raise ValueError(f"nav_per_quota must be positive, got {nav_per_quota}")

        gross_redemption = quotas * nav_per_quota

        # Brazilian IRRF on FIDC: 15% for holds > 720 days, 22.5% for <180d
        # Simplified: use 15% flat for calculation
        irrf_rate = 0.15
        irrf_amount = gross_redemption * irrf_rate
        net_redemption = gross_redemption - irrf_amount

        # D+3 settlement for senior, D+30 for subordinada
        settlement_d_plus = 3 if quota_class == "senior" else 30

        return {
            "operation": "redemption",
            "quota_class": quota_class,
            "quotas_redeemed": round(quotas, 6),
            "nav_per_quota": round(nav_per_quota, 6),
            "gross_redemption_brl": round(gross_redemption, 2),
            "irrf_rate": irrf_rate,
            "irrf_amount_brl": round(irrf_amount, 2),
            "net_redemption_brl": round(net_redemption, 2),
            "settlement_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "settlement_d_plus": settlement_d_plus,
        }

    def generate_daily_report(self, nav_data: dict[str, Any]) -> str:
        """
        Generate a formatted daily NAV report (CVM Informe Diário format).

        Args:
            nav_data: Dict with NAV breakdown (output of calculate_nav or similar).

        Returns:
            Formatted multi-line string report.
        """
        date = nav_data.get("date", datetime.utcnow().strftime("%Y-%m-%d"))
        nav = nav_data.get("nav", 0.0)
        senior_nav = nav_data.get("senior_nav", 0.0)
        sub_nav = nav_data.get("sub_nav", 0.0)
        receivables_gross = nav_data.get("receivables_gross", 0.0)
        pdd_provision = nav_data.get("pdd_provision", 0.0)
        receivables_net = nav_data.get("receivables_net", 0.0)
        cash = nav_data.get("cash", 0.0)
        total_assets = nav_data.get("total_assets", 0.0)
        total_liabilities = nav_data.get("total_liabilities", 0.0)
        admin_fees = nav_data.get("admin_fees_accrued", 0.0)
        custody_fees = nav_data.get("custody_fees_accrued", 0.0)
        quota_price_senior = nav_data.get("quota_price_senior", 0.0)
        quota_price_sub = nav_data.get("quota_price_sub", 0.0)
        sub_ratio = nav_data.get("subordination_ratio", 0.0)
        sub_ok = nav_data.get("subordination_ok", False)

        def fmt_brl(v: float) -> str:
            return f"R$ {v:>18,.2f}"

        sub_status = "✓ ADEQUADA" if sub_ok else "✗ INSUFICIENTE"

        lines = [
            "=" * 70,
            f"  PAGANINI FIDC — INFORME DIÁRIO DE NAV",
            f"  Data de Referência: {date}",
            "=" * 70,
            "",
            "  ATIVO",
            f"    Direitos creditórios (bruto)    {fmt_brl(receivables_gross)}",
            f"    (−) PDD / Provisão              {fmt_brl(-pdd_provision)}",
            f"    Direitos creditórios (líquido)  {fmt_brl(receivables_net)}",
            f"    Caixa e equivalentes            {fmt_brl(cash)}",
            f"    Outros ativos                   {fmt_brl(nav_data.get('other_assets', 0.0))}",
            f"    TOTAL DO ATIVO                  {fmt_brl(total_assets)}",
            "",
            "  PASSIVO",
            f"    Obrigações diversas             {fmt_brl(nav_data.get('liabilities', 0.0))}",
            f"    Taxa de administração (acruado) {fmt_brl(admin_fees)}",
            f"    Taxa de custódia (acruado)      {fmt_brl(custody_fees)}",
            f"    TOTAL DO PASSIVO                {fmt_brl(total_liabilities)}",
            "",
            "─" * 70,
            f"  PATRIMÔNIO LÍQUIDO (NAV)          {fmt_brl(nav)}",
            "─" * 70,
            "",
            "  COTAS",
            f"    PL Sênior                       {fmt_brl(senior_nav)}",
            f"    Valor Cota Sênior               {fmt_brl(quota_price_senior)}",
            f"    PL Subordinada                  {fmt_brl(sub_nav)}",
            f"    Valor Cota Subordinada          {fmt_brl(quota_price_sub)}",
            "",
            "  SUBORDINAÇÃO",
            f"    Índice de Subordinação          {sub_ratio * 100:.2f}%  {sub_status}",
            f"    Mínimo regulatório              {MIN_SUBORDINATION_RATIO * 100:.0f}%",
            "",
            "=" * 70,
            f"  Gerado em: {datetime.utcnow().isoformat()}Z",
            "=" * 70,
        ]
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Private dispatch helpers
    # ------------------------------------------------------------------

    def _exec_calculate_nav(self, context: dict) -> dict:
        result = self.calculate_nav(context.get("portfolio", context))
        return result.to_dict()

    def _exec_quota_price(self, context: dict) -> dict:
        nav = float(context.get("nav", 0))
        quotas = float(context.get("total_quotas", 1))
        price = self.calculate_quota_price(nav, quotas)
        return {"nav": nav, "total_quotas": quotas, "quota_price": price}

    def _exec_issue_quotas(self, context: dict) -> dict:
        return self.issue_quotas(
            amount=float(context.get("amount", 0)),
            quota_class=context.get("quota_class", "senior"),
            current_nav=float(context.get("current_nav", 0)),
        )

    def _exec_redemption(self, context: dict) -> dict:
        return self.process_redemption(
            quotas=float(context.get("quotas", 0)),
            quota_class=context.get("quota_class", "senior"),
            nav_per_quota=float(context.get("nav_per_quota", 0)),
        )

    def _exec_daily_report(self, context: dict) -> dict:
        nav_data = context.get("nav_data", context)
        report_text = self.generate_daily_report(nav_data)
        return {"report": report_text}


# ---------------------------------------------------------------------------
# Demo usage
# ---------------------------------------------------------------------------

DEMO_PORTFOLIO = {
    "receivables_gross": 95_000_000.00,
    "pdd_provision": 2_850_000.00,   # ~3% PDD
    "cash": 4_200_000.00,
    "other_assets": 800_000.00,
    "liabilities": 500_000.00,
    "senior_nav": 78_400_000.00,
    "sub_nav": 17_800_000.00,
    "total_quotas_senior": 78_400.0,   # par BRL 1,000
    "total_quotas_sub": 17_800.0,
    "accrual_days": 1,
}

if __name__ == "__main__":
    agent = AdministradorAgent()
    result = agent.calculate_nav(DEMO_PORTFOLIO)
    print(agent.generate_daily_report(result.to_dict()))
