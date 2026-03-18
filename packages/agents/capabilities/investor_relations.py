"""
investor_relations.py — Investor Communication and Performance for FIDC funds.

Implements performance calculation (MTD/QTD/YTD/inception), Sharpe ratio vs CDI,
factsheet generation, investor query answering, and distribution calculation.
All monetary values in BRL.
"""

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Optional


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class PerformanceReport:
    """Comprehensive fund performance metrics."""
    mtd: float                   # Month-to-date return (decimal, e.g. 0.012 = 1.2%)
    qtd: float                   # Quarter-to-date return
    ytd: float                   # Year-to-date return
    since_inception: float       # Return since inception (cumulative)
    annualized: float            # Annualized return since inception
    sharpe_ratio: float          # Sharpe ratio vs CDI (annualized)
    max_drawdown: float          # Maximum drawdown (negative number, e.g. -0.05)
    cdi_mtd: float               # CDI for the same MTD period
    cdi_ytd: float               # CDI for the same YTD period
    pct_cdi_mtd: float           # Fund MTD as % of CDI MTD
    pct_cdi_ytd: float           # Fund YTD as % of CDI YTD
    volatility_annual: float     # Annualized volatility of daily returns
    nav_start: float             # NAV at start of period
    nav_end: float               # NAV at end of period
    num_observations: int        # Number of NAV data points
    best_month: float            # Best monthly return in history
    worst_month: float           # Worst monthly return in history
    calmar_ratio: float          # Annualized return / |max_drawdown|


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class InvestorRelationsAgent:
    """
    Investor relations and performance reporting agent.

    Handles all investor-facing computations and communications for
    FIDC funds in the Brazilian market.
    """

    # ------------------------------------------------------------------ #
    # Constants                                                            #
    # ------------------------------------------------------------------ #

    CDI_ANNUAL: float = 0.1375      # ~13.75% a.a. (early 2026 target)
    CDI_DAILY: float  = (1 + CDI_ANNUAL) ** (1 / 252) - 1
    TRADING_DAYS: int = 252

    # ------------------------------------------------------------------ #
    # Core entry point                                                     #
    # ------------------------------------------------------------------ #

    def execute(self, task: str, context: dict, chunks: list) -> dict:
        """
        Main dispatch.

        Args:
            task:    Task description
            context: Contains nav_history, fund_data, investor_query
            chunks:  Data chunks

        Returns:
            dict with status, performance, factsheet, query_response, summary
        """
        nav_history = context.get("nav_history", DEMO_NAV_HISTORY)
        fund_data   = context.get("fund_data", DEMO_FUND_DATA)
        query       = context.get("investor_query", "")

        perf    = self.calculate_performance(nav_history)
        fs      = self.generate_factsheet(fund_data, perf)
        dist    = self.calculate_distribution(
            nav=fund_data.get("nav", 0),
            income=fund_data.get("distributable_income", 0),
            quota_count=fund_data.get("quotas_senior", 1),
        )
        q_resp  = self.process_investor_query(query, fund_data) if query else "(no query)"

        return {
            "status": "ok",
            "performance": perf,
            "factsheet": fs,
            "distribution": dist,
            "query_response": q_resp,
            "summary": (
                f"MTD: {perf.mtd*100:.4f}% ({perf.pct_cdi_mtd:.1f}% CDI) | "
                f"Sharpe: {perf.sharpe_ratio:.2f} | "
                f"Max DD: {perf.max_drawdown*100:.2f}%"
            ),
        }

    # ------------------------------------------------------------------ #
    # 1. Performance Calculation                                           #
    # ------------------------------------------------------------------ #

    def calculate_performance(self, nav_history: list[dict]) -> PerformanceReport:
        """
        Compute comprehensive performance metrics from NAV history.

        Each entry in nav_history should have:
          - date: ISO date string (YYYY-MM-DD)
          - nav:  NAV value in BRL
          - quota_value: optional quota price

        MTD: performance since first entry in current month
        QTD: performance since first entry in current quarter
        YTD: performance since first entry in current year
        Since inception: from first historical entry

        Args:
            nav_history: List of {'date': str, 'nav': float}

        Returns:
            PerformanceReport dataclass
        """
        if len(nav_history) < 2:
            raise ValueError("Need at least 2 NAV data points for performance calculation")

        # Sort by date ascending
        sorted_hist = sorted(nav_history, key=lambda x: x["date"])

        today  = datetime.utcnow().date()
        navs   = [float(h["nav"]) for h in sorted_hist]
        dates  = [datetime.fromisoformat(h["date"]).date() for h in sorted_hist]

        nav_start  = navs[0]
        nav_end    = navs[-1]
        first_date = dates[0]

        # Daily returns
        daily_returns = [
            (navs[i] - navs[i-1]) / navs[i-1]
            for i in range(1, len(navs))
        ]

        # ---- MTD ----
        mtd_start = self._find_period_start(sorted_hist, "month")
        mtd        = (nav_end - mtd_start) / mtd_start if mtd_start else 0.0

        # ---- QTD ----
        qtd_start = self._find_period_start(sorted_hist, "quarter")
        qtd        = (nav_end - qtd_start) / qtd_start if qtd_start else 0.0

        # ---- YTD ----
        ytd_start = self._find_period_start(sorted_hist, "year")
        ytd        = (nav_end - ytd_start) / ytd_start if ytd_start else 0.0

        # ---- Since inception ----
        since_inception = (nav_end - nav_start) / nav_start if nav_start else 0.0

        # ---- Annualized return ----
        days_elapsed = (dates[-1] - first_date).days or 1
        years        = days_elapsed / 365.25
        annualized   = (1 + since_inception) ** (1 / years) - 1 if years > 0 else 0.0

        # ---- CDI benchmarks ----
        months_mtd = max(1, (today - today.replace(day=1)).days) / 30
        cdi_mtd    = (1 + self.CDI_ANNUAL) ** (months_mtd / 12) - 1
        cdi_ytd    = (1 + self.CDI_ANNUAL) ** (today.timetuple().tm_yday / 365) - 1

        pct_cdi_mtd = (mtd / cdi_mtd * 100) if cdi_mtd else 0.0
        pct_cdi_ytd = (ytd / cdi_ytd * 100) if cdi_ytd else 0.0

        # ---- Sharpe ratio ----
        sharpe = self.calculate_sharpe_ratio(daily_returns, self.CDI_ANNUAL)

        # ---- Max drawdown ----
        max_dd = self._max_drawdown(navs)

        # ---- Volatility (annualized) ----
        if len(daily_returns) >= 2:
            daily_vol  = statistics.stdev(daily_returns)
            annual_vol = daily_vol * math.sqrt(self.TRADING_DAYS)
        else:
            annual_vol = 0.0

        # ---- Monthly returns for best/worst ----
        monthly_returns = self._compute_monthly_returns(sorted_hist)
        best_month  = max(monthly_returns) if monthly_returns else mtd
        worst_month = min(monthly_returns) if monthly_returns else mtd

        # ---- Calmar ratio ----
        calmar = (annualized / abs(max_dd)) if max_dd != 0 else float("inf")

        return PerformanceReport(
            mtd=round(mtd, 8),
            qtd=round(qtd, 8),
            ytd=round(ytd, 8),
            since_inception=round(since_inception, 8),
            annualized=round(annualized, 8),
            sharpe_ratio=round(sharpe, 4),
            max_drawdown=round(max_dd, 8),
            cdi_mtd=round(cdi_mtd, 8),
            cdi_ytd=round(cdi_ytd, 8),
            pct_cdi_mtd=round(pct_cdi_mtd, 2),
            pct_cdi_ytd=round(pct_cdi_ytd, 2),
            volatility_annual=round(annual_vol, 8),
            nav_start=round(nav_start, 2),
            nav_end=round(nav_end, 2),
            num_observations=len(sorted_hist),
            best_month=round(best_month, 8),
            worst_month=round(worst_month, 8),
            calmar_ratio=round(calmar, 4),
        )

    def _find_period_start(self, history: list[dict], period: str) -> Optional[float]:
        """Find NAV at start of given period (month, quarter, year)."""
        today = datetime.utcnow().date()
        if period == "month":
            cutoff = today.replace(day=1)
        elif period == "quarter":
            q_month = ((today.month - 1) // 3) * 3 + 1
            cutoff  = today.replace(month=q_month, day=1)
        elif period == "year":
            cutoff = today.replace(month=1, day=1)
        else:
            return None

        # Find last NAV before cutoff (as starting value)
        candidates = [
            h for h in history
            if datetime.fromisoformat(h["date"]).date() < cutoff
        ]
        if candidates:
            return float(candidates[-1]["nav"])
        # If no data before cutoff, use first available
        return float(history[0]["nav"]) if history else None

    def _max_drawdown(self, navs: list[float]) -> float:
        """
        Compute maximum drawdown from a NAV series.

        Max drawdown = max( (peak - trough) / peak ) over all i < j.

        Returns:
            Negative float (e.g. -0.05 = -5% drawdown)
        """
        if len(navs) < 2:
            return 0.0
        peak = navs[0]
        max_dd = 0.0
        for nav in navs:
            peak = max(peak, nav)
            dd = (nav - peak) / peak
            if dd < max_dd:
                max_dd = dd
        return max_dd

    def _compute_monthly_returns(self, history: list[dict]) -> list[float]:
        """Aggregate daily NAVs into monthly returns."""
        monthly: dict[str, list[float]] = {}
        for h in history:
            d = h["date"][:7]  # YYYY-MM
            monthly.setdefault(d, []).append(float(h["nav"]))

        months = sorted(monthly.keys())
        returns = []
        for i in range(1, len(months)):
            prev_last = monthly[months[i-1]][-1]
            curr_last = monthly[months[i]][-1]
            if prev_last > 0:
                returns.append((curr_last - prev_last) / prev_last)
        return returns

    # ------------------------------------------------------------------ #
    # 2. Sharpe Ratio                                                      #
    # ------------------------------------------------------------------ #

    def calculate_sharpe_ratio(
        self,
        returns: list[float],
        risk_free_rate: float = 0.1375,
    ) -> float:
        """
        Annualised Sharpe ratio of daily returns vs risk-free rate (CDI).

        Formula: Sharpe = (μ_daily - rf_daily) / σ_daily × √252

        Args:
            returns:        List of daily returns (decimal, e.g. 0.001)
            risk_free_rate: Annual risk-free rate (default CDI 13.75%)

        Returns:
            Annualised Sharpe ratio
        """
        if len(returns) < 2:
            return 0.0

        rf_daily = (1 + risk_free_rate) ** (1 / self.TRADING_DAYS) - 1
        excess   = [r - rf_daily for r in returns]
        mean_ex  = statistics.mean(excess)
        try:
            std_ex = statistics.stdev(excess)
        except statistics.StatisticsError:
            return 0.0

        if std_ex == 0:
            return 0.0

        return (mean_ex / std_ex) * math.sqrt(self.TRADING_DAYS)

    # ------------------------------------------------------------------ #
    # 3. Factsheet                                                         #
    # ------------------------------------------------------------------ #

    def generate_factsheet(
        self,
        fund_data: dict,
        performance: PerformanceReport,
    ) -> str:
        """
        One-page fund factsheet in Markdown.

        Args:
            fund_data:   Fund information dict
            performance: PerformanceReport from calculate_performance()

        Returns:
            Markdown string
        """
        fname     = fund_data.get("fund_name", "FIDC Paganini")
        cnpj      = fund_data.get("cnpj", "00.000.000/0001-00")
        admin     = fund_data.get("administrator", "Paganini Gestora S.A.")
        nav       = fund_data.get("nav", 0.0)
        q_val     = fund_data.get("quota_value", 0.0)
        rating    = fund_data.get("rating", "A")
        strategy  = fund_data.get("strategy", "Multissetorial de recebíveis comerciais")
        target_ret = fund_data.get("target_return", "CDI + 2% a.a.")
        inception  = fund_data.get("inception_date", "01/01/2022")
        now        = datetime.utcnow().strftime("%d/%m/%Y")

        def pct(v: float) -> str:
            return f"{v*100:.4f}%"

        def fmt_brl(v: float) -> str:
            abs_v = abs(v)
            cents_total = round(abs_v * 100)
            cents = cents_total % 100
            int_part = f"{cents_total // 100:,}".replace(",", ".")
            return f"R$ {'-' if v < 0 else ''}{int_part},{cents:02d}"

        lines = [
            f"# 📊 Factsheet — {fname}",
            f"**Data de referência:** {now}",
            f"",
            f"---",
            f"## Identificação",
            f"",
            f"| Campo | Detalhe |",
            f"|-------|---------|",
            f"| Nome | {fname} |",
            f"| CNPJ | {cnpj} |",
            f"| Administrador / Gestor | {admin} |",
            f"| Estratégia | {strategy} |",
            f"| Data de Início | {inception} |",
            f"| Rating | {rating} |",
            f"| Retorno Alvo | {target_ret} |",
            f"",
            f"---",
            f"## Dados do Fundo",
            f"",
            f"| Indicador | Valor |",
            f"|-----------|-------|",
            f"| PL | {fmt_brl(nav)} |",
            f"| Valor da Cota Sênior | {fmt_brl(q_val)} |",
            f"| Benchmark | CDI |",
            f"",
            f"---",
            f"## Rentabilidade",
            f"",
            f"| Período | Fundo | CDI | % CDI |",
            f"|---------|-------|-----|-------|",
            f"| Mês | {pct(performance.mtd)} | {pct(performance.cdi_mtd)} | {performance.pct_cdi_mtd:.1f}% |",
            f"| Ano | {pct(performance.ytd)} | {pct(performance.cdi_ytd)} | {performance.pct_cdi_ytd:.1f}% |",
            f"| Desde o início | {pct(performance.since_inception)} | — | — |",
            f"| Anualizado | {pct(performance.annualized)} | {pct(self.CDI_ANNUAL)} | {performance.annualized/self.CDI_ANNUAL*100:.1f}% |",
            f"",
            f"---",
            f"## Indicadores de Risco",
            f"",
            f"| Indicador | Valor |",
            f"|-----------|-------|",
            f"| Volatilidade (a.a.) | {pct(performance.volatility_annual)} |",
            f"| Sharpe Ratio | {performance.sharpe_ratio:.2f} |",
            f"| Max Drawdown | {pct(performance.max_drawdown)} |",
            f"| Calmar Ratio | {performance.calmar_ratio:.2f} |",
            f"| Melhor Mês | {pct(performance.best_month)} |",
            f"| Pior Mês | {pct(performance.worst_month)} |",
            f"",
            f"---",
            f"## Público-Alvo e Informações",
            f"",
            f"Este fundo é destinado a investidores qualificados nos termos da regulamentação CVM.",
            f"A rentabilidade passada não é garantia de rentabilidade futura.",
            f"Leia o regulamento e o prospecto antes de investir.",
            f"",
            f"**Regulamentação:** CVM Resolução Nº 175/2022 | ANBIMA Código de Melhores Práticas",
            f"",
            f"---",
            f"*Paganini AIOS — Documento gerado automaticamente em {now}*",
        ]

        return "\n".join(lines)

    # ------------------------------------------------------------------ #
    # 4. Investor Query Processing                                         #
    # ------------------------------------------------------------------ #

    def process_investor_query(self, query: str, fund_data: dict) -> str:
        """
        Answer common investor questions about the fund.

        Handles topics: performance, liquidity, distributions, risk, NAV,
        covenants, regulatory, and general inquiries.

        Args:
            query:     Investor's natural-language question
            fund_data: Current fund data dict

        Returns:
            Formatted answer string
        """
        q_lower = query.lower()
        nav       = fund_data.get("nav", 0)
        mtd       = fund_data.get("mtd_return", 0)
        rating    = fund_data.get("rating", "A")
        liquidity = fund_data.get("liquidity_ratio", 0)
        pdd       = fund_data.get("pdd", 0)
        total_rec = fund_data.get("total_receivables", nav)
        pdd_pct   = (pdd / total_rec * 100) if total_rec else 0

        def fmt_brl(v: float) -> str:
            abs_v = abs(v)
            cents_total = round(abs_v * 100)
            cents = cents_total % 100
            int_part = f"{cents_total // 100:,}".replace(",", ".")
            return f"R$ {'-' if v < 0 else ''}{int_part},{cents:02d}"

        # Dispatch on topic
        if any(kw in q_lower for kw in ["rentabilidade", "rendimento", "retorno", "performance"]):
            return (
                f"**Rentabilidade do Fundo**\n\n"
                f"- Mês atual: {mtd*100:.4f}%\n"
                f"- Benchmark CDI mês: {self.CDI_ANNUAL/12*100:.4f}%\n"
                f"- % do CDI: {mtd/(self.CDI_ANNUAL/12)*100:.1f}%\n\n"
                f"A rentabilidade passada não garante resultados futuros."
            )

        if any(kw in q_lower for kw in ["pl", "patrimônio", "nav", "valor"]):
            return (
                f"**Patrimônio Líquido (PL)**\n\n"
                f"O PL atual do fundo é de **{fmt_brl(nav)}**.\n"
                f"Total de recebíveis: {fmt_brl(total_rec)}\n"
                f"PDD (provisão): {fmt_brl(pdd)} ({pdd_pct:.2f}% da carteira)"
            )

        if any(kw in q_lower for kw in ["liquidez", "resgate", "resgat"]):
            return (
                f"**Liquidez e Resgate**\n\n"
                f"- Índice de liquidez atual: {liquidity:.2f}x\n"
                f"- Status: {'✅ Adequado' if liquidity >= 1.0 else '⚠️ Atenção'}\n\n"
                f"Resgates são processados conforme o regulamento do fundo. "
                f"Consulte o cronograma de resgate na seção 8 do regulamento."
            )

        if any(kw in q_lower for kw in ["risco", "rating", "inadimplência", "default"]):
            return (
                f"**Indicadores de Risco**\n\n"
                f"- Rating interno: **{rating}**\n"
                f"- PDD / Carteira: {pdd_pct:.2f}%\n"
                f"- Índice de liquidez: {liquidity:.2f}x\n\n"
                f"O fundo mantém rating {rating}, dentro da faixa investment-grade."
            )

        if any(kw in q_lower for kw in ["distribuição", "dividendo", "amortização", "rendimento"]):
            dist_info = fund_data.get("last_distribution", {})
            if dist_info:
                return (
                    f"**Última Distribuição**\n\n"
                    f"- Data: {dist_info.get('date', 'N/A')}\n"
                    f"- Valor por cota: {fmt_brl(dist_info.get('per_quota', 0))}\n"
                    f"- Total distribuído: {fmt_brl(dist_info.get('total', 0))}"
                )
            return (
                "Informações de distribuição não disponíveis no momento. "
                "Consulte o gestor para o calendário de distribuições."
            )

        if any(kw in q_lower for kw in ["covenant", "limite", "regulamento"]):
            covenants = fund_data.get("covenants", [])
            if covenants:
                lines = ["**Status dos Covenants**\n"]
                for c in covenants:
                    icon = "✅" if c.get("ok", True) else "❌"
                    lines.append(f"- {icon} {c['name']}: limite {c['limit']}, atual {c['actual']}")
                return "\n".join(lines)
            return "Dados de covenants não disponíveis. Consulte o relatório mensal."

        if any(kw in q_lower for kw in ["cvm", "regulação", "regulamento", "bacen"]):
            return (
                "**Regulamentação Aplicável**\n\n"
                "Este fundo é regulado pela CVM (Comissão de Valores Mobiliários) "
                "nos termos da Resolução CVM Nº 175/2022 e segue os padrões "
                "de melhores práticas da ANBIMA."
            )

        # Default
        return (
            f"Olá! Posso responder perguntas sobre rentabilidade, PL, liquidez, "
            f"risco, covenants e distribuições do fundo. "
            f"Por favor, reformule sua pergunta ou entre em contato com a equipe de RI: "
            f"ri@paganini.com.br"
        )

    # ------------------------------------------------------------------ #
    # 5. Distribution Calculation                                          #
    # ------------------------------------------------------------------ #

    def calculate_distribution(
        self,
        nav: float,
        income: float,
        quota_count: float,
    ) -> dict:
        """
        Calculate income distribution (amortisation/dividend) per quota.

        Brazilian FIDC rules:
          - Senior quotas receive priority distribution up to target rate (CDI + spread)
          - Subordinated quotas receive residual after senior allocation
          - PIS/COFINS not applicable to FIDC income (IO 1.585/2015 exemption)
          - IR: 15% for quotas held > 720 days (15%), 20% for ≤ 720 days

        Args:
            nav:         Current Net Asset Value (BRL)
            income:      Distributable income for the period (BRL)
            quota_count: Number of senior quotas outstanding

        Returns:
            dict: per_quota, total_gross, total_net (after IR), ir_rate, etc.
        """
        if quota_count <= 0:
            raise ValueError("quota_count must be positive")

        # Distribute income to senior quotas first (priority tranche)
        gross_per_quota = income / quota_count if quota_count else 0.0

        # IR withholding (simplified: 15% for long-term holding)
        IR_RATE = 0.15
        ir_per_quota   = gross_per_quota * IR_RATE
        net_per_quota  = gross_per_quota - ir_per_quota

        total_gross = gross_per_quota * quota_count
        total_ir    = ir_per_quota    * quota_count
        total_net   = net_per_quota   * quota_count

        # Yield vs CDI for the period (assume monthly)
        monthly_cdi = (1 + self.CDI_ANNUAL) ** (1 / 12) - 1
        quota_value = nav / quota_count
        period_yield = gross_per_quota / quota_value if quota_value else 0.0
        pct_cdi = (period_yield / monthly_cdi * 100) if monthly_cdi else 0.0

        return {
            "nav": round(nav, 2),
            "distributable_income": round(income, 2),
            "quota_count": quota_count,
            "quota_value": round(quota_value, 6),
            "gross_per_quota": round(gross_per_quota, 6),
            "ir_rate": IR_RATE,
            "ir_per_quota": round(ir_per_quota, 6),
            "net_per_quota": round(net_per_quota, 6),
            "total_gross": round(total_gross, 2),
            "total_ir_withheld": round(total_ir, 2),
            "total_net_distributed": round(total_net, 2),
            "period_yield_pct": round(period_yield * 100, 4),
            "pct_cdi": round(pct_cdi, 2),
            "benchmark_cdi_monthly_pct": round(monthly_cdi * 100, 4),
        }


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

def _make_nav_history() -> list[dict]:
    """Generate 252 trading days of synthetic NAV history."""
    import random
    rng = random.Random(42)
    nav = 100.0
    daily_rf  = (1 + 0.1375) ** (1 / 252) - 1
    daily_vol = 0.0008   # typical FIDC low volatility
    history = []
    current = date(2025, 3, 1)
    for _ in range(252):
        ret = rng.gauss(daily_rf + 0.0002, daily_vol)
        nav *= (1 + ret)
        history.append({"date": current.isoformat(), "nav": round(nav, 6)})
        current = current + __import__("datetime").timedelta(days=1)
    return history


DEMO_NAV_HISTORY = _make_nav_history()

DEMO_FUND_DATA = {
    "fund_name":           "FIDC Paganini Multissetorial",
    "cnpj":                "12.345.678/0001-90",
    "administrator":       "Paganini Gestora S.A.",
    "nav":                 3_000_000.0,
    "quota_value":              270.0,
    "quotas_senior":        10_000.0,
    "rating":                   "A",
    "strategy":            "multissetorial de recebíveis comerciais",
    "target_return":       "CDI + 2,0% a.a.",
    "inception_date":      "01/03/2022",
    "mtd_return":               0.011832,
    "ytd_return":               0.034521,
    "pdd":                   165_000.0,
    "total_receivables":   2_800_000.0,
    "distributable_income":  35_000.0,
    "liquidity_ratio":           2.3,
    "covenants": [
        {"name": "Subordinação Mínima", "limit": "≥ 15%", "actual": "18.5%", "ok": True},
        {"name": "Índice de PDD",       "limit": "≤ 8%",  "actual": "5.9%",  "ok": True},
    ],
    "last_distribution": {
        "date":      "28/02/2026",
        "per_quota": 3.15,
        "total":     31_500.0,
    },
}


# ---------------------------------------------------------------------------
# CLI demo
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    agent = InvestorRelationsAgent()
    result = agent.execute("demo IR", {}, [])
    print("=== INVESTOR RELATIONS AGENT DEMO ===")
    print(f"Summary: {result['summary']}")
    p = result["performance"]
    print(f"\nMTD:             {p.mtd*100:.4f}%")
    print(f"YTD:             {p.ytd*100:.4f}%")
    print(f"Since inception: {p.since_inception*100:.4f}%")
    print(f"Annualized:      {p.annualized*100:.4f}%")
    print(f"Sharpe ratio:    {p.sharpe_ratio:.4f}")
    print(f"Max drawdown:    {p.max_drawdown*100:.4f}%")
    print(f"Volatility (a.a.): {p.volatility_annual*100:.4f}%")
    d = result["distribution"]
    print(f"\nDistribution per quota: R$ {d['gross_per_quota']:.6f} ({d['pct_cdi']:.1f}% CDI)")
    print("\n--- Factsheet (first 600 chars) ---")
    print(result["factsheet"][:600])
    print("\n--- Query: rentabilidade ---")
    qr = agent.process_investor_query("Qual a rentabilidade do fundo?", DEMO_FUND_DATA)
    print(qr)
