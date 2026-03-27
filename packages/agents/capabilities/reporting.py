"""
reporting.py — Report Generation for FIDC funds.

Generates CVM-compliant monthly reports, regulatory filings, cedente performance
reports, investor letters, and factsheets. Includes BRL currency formatting.
All output is Markdown unless noted.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------


class ReportingAgent:
    """
    Report generation agent for Paganini FIDC AIOS.

    Produces:
      - CVM-compliant monthly/quarterly regulatory reports
      - Investor letters and factsheets
      - Cedente (originator) performance reports
      - Compiled data aggregation from multi-agent outputs

    Brazilian-market specifics:
      - BRL formatting: R$ 1.234.567,89
      - CDI as benchmark (~13.75% a.a.)
      - CVM Resolução 175 / ANBIMA disclosure standards
    """

    # ------------------------------------------------------------------ #
    # Constants                                                            #
    # ------------------------------------------------------------------ #

    CDI_ANNUAL: float = 0.1375  # 13.75% CDI benchmark (early 2026)
    FUND_NAME_DEFAULT: str = "FIDC Paganini Multissetorial"

    # Filing types per CVM Resolução 175
    FILING_TYPES = {
        "informe_mensal": "Informe Mensal de Fundos de Investimento",
        "demonstracao": "Demonstração de Desempenho",
        "relatorio_trimestral": "Relatório Trimestral de Gestão",
        "informe_anual": "Informe Anual",
    }

    # ------------------------------------------------------------------ #
    # Core entry point                                                     #
    # ------------------------------------------------------------------ #

    def execute(self, task: str, context: dict, chunks: list) -> dict:
        """
        Main dispatch. Generates a full monthly report pack.

        Args:
            task:    Task description
            context: Fund data dict
            chunks:  Data chunks from other agents

        Returns:
            dict with status, reports (dict of report types), summary
        """
        fund_data = context.get("fund_data", DEMO_FUND_DATA)
        compiled = self.compile_data({"main": fund_data, "chunks": chunks})

        reports: dict[str, str] = {}
        reports["monthly"] = self.generate_monthly_report(compiled)
        reports["cvm_mensal"] = self.generate_cvm_filing(compiled, "informe_mensal")
        reports["investor_letter"] = self.generate_investor_letter(
            compiled, self._current_period()
        )
        if compiled.get("cedentes"):
            cedente = compiled["cedentes"][0]
            reports["cedente_0"] = self.generate_cedente_report(cedente, compiled)

        return {
            "status": "ok",
            "reports": reports,
            "summary": (
                f"Generated {len(reports)} reports for "
                f"{compiled.get('fund_name', self.FUND_NAME_DEFAULT)} | "
                f"NAV: {self.format_brl(compiled.get('nav', 0))}"
            ),
        }

    # ------------------------------------------------------------------ #
    # 1. Monthly Report                                                    #
    # ------------------------------------------------------------------ #

    def generate_monthly_report(self, fund_data: dict) -> str:
        """
        Complete monthly fund report in Markdown.
        """
        now = datetime.utcnow()
        period = fund_data.get("period", now.strftime("%B/%Y"))
        total_receivables = fund_data.get("total_receivables", 0.0)

        lines = [
            f"# {fund_data.get('fund_name', self.FUND_NAME_DEFAULT)}",
            f"## Relatório Mensal — {period}",
            "",
            self._render_report_header(fund_data, now),
            "---",
            self._render_pl_section(fund_data),
            "---",
            self._render_cotas_section(fund_data),
            "---",
            self._render_return_section(fund_data),
            "---",
            self._render_aging_section(fund_data, total_receivables),
            "---",
            self._render_covenants_section(fund_data),
            "---",
            self._render_risk_section(fund_data),
            "---",
            self._render_compliance_section(fund_data),
            "",
            "---",
            "*Relatório gerado automaticamente pelo sistema Paganini AIOS.*",
            "*Este documento é confidencial e destinado exclusivamente aos cotistas e reguladores.*",
        ]
        return "\n".join(lines)

    def _render_report_header(self, fund_data: dict, now: datetime) -> str:
        rows = [
            f"| CNPJ | {fund_data.get('cnpj', '00.000.000/0001-00')} |",
            f"| Administrador | {fund_data.get('administrator', 'Paganini Gestora S.A.')} |",
            f"| Gestor | {fund_data.get('gestor', 'Paganini Capital Ltda.')} |",
            f"| Custodiante | {fund_data.get('custodia', 'Banco XYZ S.A.')} |",
            f"| Competência | {fund_data.get('period', now.strftime('%B/%Y'))} |",
            f"| Data do relatório | {now.strftime('%d/%m/%Y')} |",
        ]
        return "| Campo | Valor |\n|-------|-------|\n" + "\n".join(rows) + "\n"

    def _render_pl_section(self, fund_data: dict) -> str:
        nav = fund_data.get("nav", 0.0)
        total_rec = fund_data.get("total_receivables", 0.0)
        pdd = fund_data.get("pdd", 0.0)
        pdd_pct = (pdd / total_rec * 100) if total_rec else 0
        rows = [
            f"| PL Total | {self.format_brl(nav)} |",
            f"| Recebíveis Totais | {self.format_brl(total_rec)} |",
            f"| PDD | {self.format_brl(pdd)} ({pdd_pct:.2f}% da carteira) |",
            f"| Caixa Disponível | {self.format_brl(fund_data.get('cash', 0.0))} |",
            f"| Subordinação | {fund_data.get('subordination_pct', 0.0):.2f}% do PL |",
        ]
        return "## 1. Patrimônio Líquido (PL)\n\n| Métrica | Valor |\n|---------|-------|\n" + "\n".join(rows) + "\n"

    def _render_cotas_section(self, fund_data: dict) -> str:
        qs = fund_data.get("quotas_senior", 0.0)
        qv = fund_data.get("quota_value", 0.0)
        rows = [
            f"| Sênior | {qs:,.0f} | {self.format_brl(qv)} | {self.format_brl(qs * qv)} |",
            f"| Subordinada | {fund_data.get('quotas_sub', 0.0):,.0f} | — | {self.format_brl(fund_data.get('subordination_value', 0))} |",
        ]
        return "## 2. Cotas\n\n| Tipo | Quantidade | Valor Unitário | Total |\n|------|-----------|----------------|-------|\n" + "\n".join(rows) + "\n"

    def _render_return_section(self, fund_data: dict) -> str:
        mr = fund_data.get("mtd_return", 0.0)
        cm = fund_data.get("cdi_mtd", self.CDI_ANNUAL / 12)
        pct = (mr / cm * 100) if cm else 0
        return f"## 3. Rentabilidade\n\n| Período | Fundo | CDI | % CDI |\n|---------|-------|-----|-------|\n| Mês | {mr*100:.4f}% | {cm*100:.4f}% | {pct:.1f}% |\n"

    def _render_aging_section(self, fund_data: dict, total_receivables: float) -> str:
        lines = ["## 4. Carteira — Aging Schedule", "", "| Faixa | Valor | % Carteira | PDD |", "|-------|-------|-----------|-----|"]
        for bucket in fund_data.get("aging", DEMO_AGING):
            val = bucket.get("value", 0)
            pct = (val / total_receivables * 100) if total_receivables else 0
            lines.append(f"| {bucket.get('range', '')} | {self.format_brl(val)} | {pct:.1f}% | {self.format_brl(bucket.get('pdd', 0))} |")
        return "\n".join(lines) + "\n"

    def _render_covenants_section(self, fund_data: dict) -> str:
        lines = ["## 5. Covenants", "", "| Covenant | Limite | Atual | Status |", "|----------|--------|-------|--------|"]
        for cov in fund_data.get("covenants", DEMO_COVENANTS):
            icon = "✅" if cov.get("ok", True) else "❌"
            lines.append(f"| {cov.get('name', '')} | {cov.get('limit', '')} | {cov.get('actual', '')} | {icon} |")
        return "\n".join(lines) + "\n"

    def _render_risk_section(self, fund_data: dict) -> str:
        tr = fund_data.get("total_receivables", 0.0)
        pdd_pct = (fund_data.get("pdd", 0.0) / tr * 100) if tr else 0
        rows = [
            f"| Rating | {fund_data.get('rating', 'A')} |",
            f"| Índice de Liquidez | {fund_data.get('liquidity_ratio', 0.0):.2f}x |",
            f"| PDD / Carteira | {pdd_pct:.2f}% |",
        ]
        return "## 6. Indicadores de Risco\n\n| Indicador | Valor |\n|-----------|-------|\n" + "\n".join(rows) + "\n"

    def _render_compliance_section(self, fund_data: dict) -> str:
        comp = fund_data.get("compliance", {})
        status = comp.get("status", "OK")
        lines = ["## 7. Compliance", "", f"**Status:** {'✅ Em Conformidade' if status == 'OK' else '❌ Pendências Identificadas'}"]
        if comp.get("findings"):
            lines.append("\n**Pendências:**")
            for item in comp["findings"]:
                lines.append(f"- {item}")
        return "\n".join(lines) + "\n"

    # ------------------------------------------------------------------ #
    # 2. CVM Filing                                                        #
    # ------------------------------------------------------------------ #

    def generate_cvm_filing(self, fund_data: dict, filing_type: str) -> str:
        """
        Generate a CVM-compliant regulatory filing.

        Filing types (CVM Resolução 175):
          - informe_mensal:       Monthly fund disclosure
          - demonstracao:         Performance statement
          - relatorio_trimestral: Quarterly management report
          - informe_anual:        Annual report

        Args:
            fund_data:   Compiled fund data
            filing_type: Filing type key

        Returns:
            Markdown string formatted as regulatory filing
        """
        filing_name = self.FILING_TYPES.get(filing_type, filing_type)
        now = datetime.utcnow()
        fname = fund_data.get("fund_name", self.FUND_NAME_DEFAULT)
        cnpj = fund_data.get("cnpj", "00.000.000/0001-00")
        nav = fund_data.get("nav", 0.0)
        total_rec = fund_data.get("total_receivables", 0.0)
        pdd = fund_data.get("pdd", 0.0)
        cash = fund_data.get("cash", 0.0)
        mtd = fund_data.get("mtd_return", 0.0)
        quotas_s = fund_data.get("quotas_senior", 0.0)
        q_val = fund_data.get("quota_value", 0.0)

        lines = [
            f"# {filing_name}",
            f"## {fname} — CNPJ: {cnpj}",
            "",
            f"**Data de Referência:** {now.strftime('%d/%m/%Y')}",
            f"**Competência:** {now.strftime('%m/%Y')}",
            "**Versão:** 1",
            "**Tipo de Fundo:** FIDC — Fundo de Investimento em Direitos Creditórios",
            "**Regulamentação:** CVM Resolução Nº 175, de 23/12/2022",
            "",
            "---",
            "### I — Patrimônio Líquido",
            "",
            "```",
            f"Patrimônio Líquido Total:   {self.format_brl(nav)}",
            f"Direitos Creditórios:       {self.format_brl(total_rec)}",
            f"PDD (Provisão DD):          {self.format_brl(pdd)}",
            f"Caixa e Equivalentes:       {self.format_brl(cash)}",
            f"Outros Ativos:              {self.format_brl(nav - total_rec - cash + pdd)}",
            "```",
            "",
            "---",
            "### II — Cotas em Circulação",
            "",
            "```",
            f"Cotas Sênior em Circulação: {quotas_s:>15,.0f} cotas",
            f"Valor da Cota Sênior:       {self.format_brl(q_val)}",
            "```",
            "",
            "---",
            "### III — Rentabilidade no Período",
            "",
            "```",
            f"Rentabilidade Mês:          {mtd*100:.6f}%",
            f"CDI Mês (referência):       {self.CDI_ANNUAL/12*100:.6f}%",
            f"% do CDI:                   {(mtd/(self.CDI_ANNUAL/12)*100) if self.CDI_ANNUAL/12 else 0:.2f}%",
            "```",
            "",
            "---",
            "### IV — Cedentes e Sacados",
            "",
        ]

        cedentes = fund_data.get("cedentes", [])
        if cedentes:
            lines += [
                "| Cedente | CNPJ | Valor | % Carteira |",
                "|---------|------|-------|-----------|",
            ]
            for ced in cedentes[:10]:
                c_val = ced.get("total_value", 0)
                pct = (c_val / total_rec * 100) if total_rec else 0
                lines.append(
                    f"| {ced.get('name', '')} | {ced.get('cnpj', '')} | "
                    f"{self.format_brl(c_val)} | {pct:.2f}% |"
                )
        else:
            lines.append("*Informação de cedentes não disponível neste relatório.*")

        lines += [
            "",
            "---",
            "### V — Declarações",
            "",
            "O Administrador declara que as informações contidas neste documento são verdadeiras,",
            "completas e elaboradas em conformidade com a legislação e regulamentação vigentes,",
            "em especial a Resolução CVM Nº 175/2022 e as normas da ANBIMA.",
            "",
            f"**Administrador:** {fund_data.get('administrator', admin_default())}",
            f"**Data:** {now.strftime('%d/%m/%Y')}",
            "",
            "---",
            "*Documento gerado eletronicamente — Paganini AIOS*",
        ]

        return "\n".join(lines)

    # ------------------------------------------------------------------ #
    # 3. Cedente Report                                                    #
    # ------------------------------------------------------------------ #

    def generate_cedente_report(self, cedente_data: dict, portfolio_data: dict) -> str:
        """
        Per-cedente performance and credit quality report.

        Args:
            cedente_data:  dict: name, cnpj, total_value, pdd, pd, lgd, aging, etc.
            portfolio_data: Overall fund data for context

        Returns:
            Markdown string
        """
        now = datetime.utcnow()
        c_name = cedente_data.get("name", "Cedente Desconhecido")
        c_cnpj = cedente_data.get("cnpj", "00.000.000/0001-00")
        c_value = cedente_data.get("total_value", 0.0)
        c_pdd = cedente_data.get("pdd", 0.0)
        c_pd = cedente_data.get("pd", 0.0)
        c_lgd = cedente_data.get("lgd", 0.0)
        c_aging = cedente_data.get("aging", [])
        total_nav = portfolio_data.get("nav", 1.0)
        conc_pct = (c_value / total_nav * 100) if total_nav else 0
        el = c_pd * c_lgd * c_value
        rating_label = _pd_to_rating(c_pd)

        lines = [
            "# Relatório de Cedente",
            f"## {c_name}",
            "",
            f"**CNPJ:** {c_cnpj}",
            f"**Data:** {now.strftime('%d/%m/%Y')}",
            "",
            "---",
            "### Posição na Carteira",
            "",
            "| Métrica | Valor |",
            "|---------|-------|",
            f"| Saldo Devedor | {self.format_brl(c_value)} |",
            f"| % do PL do Fundo | {conc_pct:.2f}% |",
            f"| PDD Alocada | {self.format_brl(c_pdd)} |",
            f"| PDD / Saldo | {(c_pdd/c_value*100) if c_value else 0:.2f}% |",
            "",
            "---",
            "### Qualidade de Crédito",
            "",
            "| Métrica | Valor |",
            "|---------|-------|",
            f"| PD (Probabilidade de Default) | {c_pd*100:.2f}% |",
            f"| LGD (Loss Given Default) | {c_lgd*100:.2f}% |",
            f"| Perda Esperada (EL) | {self.format_brl(el)} |",
            f"| Rating Interno | {rating_label} |",
            "",
            "---",
            f"### Aging Schedule — {c_name}",
            "",
            "| Faixa de Atraso | Valor | % do Total | PDD |",
            "|-----------------|-------|-----------|-----|",
        ]

        for bucket in c_aging:
            bv = bucket.get("value", 0)
            pct = (bv / c_value * 100) if c_value else 0
            lines.append(
                f"| {bucket.get('range', '')} | {self.format_brl(bv)} | "
                f"{pct:.1f}% | {self.format_brl(bucket.get('pdd', 0))} |"
            )

        lines += [
            "",
            "---",
            "*Relatório confidencial — Paganini AIOS*",
        ]

        return "\n".join(lines)

    # ------------------------------------------------------------------ #
    # 4. Investor Letter                                                   #
    # ------------------------------------------------------------------ #

    def generate_investor_letter(self, fund_data: dict, period: str) -> str:
        """
        Monthly investor letter with performance commentary.

        Args:
            fund_data: Compiled fund data
            period:    e.g. "março/2026"

        Returns:
            Markdown string
        """
        fname = fund_data.get("fund_name", self.FUND_NAME_DEFAULT)
        nav = fund_data.get("nav", 0.0)
        mtd = fund_data.get("mtd_return", 0.0)
        ytd = fund_data.get("ytd_return", 0.0)
        cdi_mtd = self.CDI_ANNUAL / 12
        pct_cdi = (mtd / cdi_mtd * 100) if cdi_mtd else 0
        rating = fund_data.get("rating", "A")
        strategy = fund_data.get("strategy", "multissetorial de recebíveis comerciais")
        outlook = fund_data.get(
            "outlook",
            (
                "A carteira apresenta boa diversificação setorial e os indicadores de "
                "inadimplência permanecem dentro dos limites dos covenants. "
                "O fundo continua gerando retornos acima do CDI."
            ),
        )

        now = datetime.utcnow()

        lines = [
            f"# Carta ao Cotista — {period}",
            f"## {fname}",
            "",
            f"**Data:** {now.strftime('%d de %B de %Y')}",
            "",
            "Prezados Cotistas,",
            "",
            f"É com satisfação que apresentamos o relatório de desempenho referente ao período de {period}.",
            "",
            "---",
            "### Destaques do Período",
            "",
            f"O **{fname}**, fundo {strategy}, encerrou o mês de {period} com "
            f"patrimônio líquido de **{self.format_brl(nav)}**.",
            "",
            f"A rentabilidade no mês foi de **{mtd*100:.4f}%**, equivalente a "
            f"**{pct_cdi:.1f}% do CDI** (CDI do período: {cdi_mtd*100:.4f}%).",
            "",
            f"No acumulado do ano, o fundo rentabilizou **{ytd*100:.4f}%**.",
            "",
            "---",
            "### Análise da Carteira",
            "",
            f"{outlook}",
            "",
            "---",
            "### Indicadores-Chave",
            "",
            "| Indicador | Valor |",
            "|-----------|-------|",
            f"| PL | {self.format_brl(nav)} |",
            f"| Rentabilidade Mês | {mtd*100:.4f}% |",
            f"| % CDI (mês) | {pct_cdi:.1f}% |",
            f"| Rentabilidade YTD | {ytd*100:.4f}% |",
            f"| Rating | {rating} |",
            "",
            "---",
            "### Perspectivas",
            "",
            "Para os próximos meses, a equipe de gestão permanece focada na qualidade da "
            "originação, monitoramento ativo dos covenants e manutenção da liquidez do fundo "
            "em patamares adequados às obrigações com cotistas.",
            "",
            "Agradecemos pela confiança depositada.",
            "",
            "Atenciosamente,",
            "",
            f"**Equipe de Gestão — {fname}**",
            "",
            "---",
            "*Esta carta é de caráter informativo e não constitui oferta de investimento. "
            "Rentabilidade passada não é garantia de rentabilidade futura.*",
            "*Regulamentação: CVM Resolução Nº 175/2022 | ANBIMA Código de Melhores Práticas.*",
        ]

        return "\n".join(lines)

    # ------------------------------------------------------------------ #
    # 5. Data Compilation                                                  #
    # ------------------------------------------------------------------ #

    def compile_data(self, sources: dict) -> dict:
        """
        Aggregate data from multiple agent outputs into a report-ready dict.

        Merges keys from 'main' source, then overlays additional agent-specific
        keys (risk.rating, treasury.cash, compliance.status, etc.).

        Args:
            sources: dict of {source_name: data_dict}

        Returns:
            Unified dict ready for report generation methods
        """
        compiled: dict[str, Any] = {}

        # Start with main source
        main = sources.get("main", {})
        compiled.update(main)

        # Overlay agent-specific keys
        risk_data = sources.get("risk", {})
        if risk_data:
            compiled.setdefault("rating", risk_data.get("rating"))
            compiled.setdefault("var_95", risk_data.get("var"))

        treasury_data = sources.get("treasury", {})
        if treasury_data:
            compiled.setdefault("cash", treasury_data.get("cash_balance"))
            compiled.setdefault("liquidity_ratio", treasury_data.get("liquidity_ratio"))

        compliance_data = sources.get("compliance", {})
        if compliance_data:
            compiled.setdefault(
                "compliance",
                {
                    "status": compliance_data.get("status", "OK"),
                    "findings": compliance_data.get("findings", []),
                },
            )

        pricing_data = sources.get("pricing", {})
        if pricing_data:
            compiled.setdefault("pdd", pricing_data.get("pdd"))
            compiled.setdefault(
                "total_receivables", pricing_data.get("total_receivables")
            )

        # Chunks: extract any fund-level overrides
        for chunk in sources.get("chunks", []):
            if isinstance(chunk, dict):
                for k, v in chunk.items():
                    if k not in compiled:
                        compiled[k] = v

        # Defaults for missing fields
        now = datetime.utcnow()
        compiled.setdefault("period", now.strftime("%B/%Y").lower())
        compiled.setdefault("fund_name", self.FUND_NAME_DEFAULT)
        compiled.setdefault("nav", 0.0)
        compiled.setdefault("mtd_return", 0.0)
        compiled.setdefault("ytd_return", 0.0)
        compiled.setdefault("aging", DEMO_AGING)
        compiled.setdefault("covenants", DEMO_COVENANTS)
        compiled.setdefault("compliance", {"status": "OK", "findings": []})
        compiled.setdefault("rating", "A")

        return compiled

    # ------------------------------------------------------------------ #
    # 6. BRL Formatter                                                     #
    # ------------------------------------------------------------------ #

    def format_brl(self, value: float) -> str:
        """
        Format a float as Brazilian Real currency string.

        Examples:
            1234567.89 → "R$ 1.234.567,89"
            -1234.5    → "R$ -1.234,50"
            0.0        → "R$ 0,00"

        Args:
            value: Monetary amount in BRL

        Returns:
            Formatted string
        """
        negative = value < 0
        abs_val = abs(value)

        # Split into integer and cents
        cents_total = round(abs_val * 100)
        cents = cents_total % 100
        integer_part = cents_total // 100

        # Format integer part with thousand separators (dots in BR)
        int_str = f"{integer_part:,}".replace(",", ".")

        result = f"R$ {'-' if negative else ''}{int_str},{cents:02d}"
        return result

    # ------------------------------------------------------------------ #
    # Helpers                                                              #
    # ------------------------------------------------------------------ #

    def _current_period(self) -> str:
        months = [
            "janeiro",
            "fevereiro",
            "março",
            "abril",
            "maio",
            "junho",
            "julho",
            "agosto",
            "setembro",
            "outubro",
            "novembro",
            "dezembro",
        ]
        now = datetime.utcnow()
        return f"{months[now.month-1]}/{now.year}"


def admin_default() -> str:
    return "Paganini Gestora S.A."


def _pd_to_rating(pd: float) -> str:
    score = max(0, min(100, 100 - pd * 500))
    thresholds = [
        (95, "AAA"),
        (85, "AA"),
        (75, "A"),
        (65, "BBB"),
        (55, "BB"),
        (45, "B"),
        (0, "CCC"),
    ]
    for t, r in thresholds:
        if score >= t:
            return r
    return "CCC"


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

DEMO_AGING = [
    {"range": "A vencer", "value": 2_000_000.0, "pdd": 0.0},
    {"range": "1–30 dias", "value": 300_000.0, "pdd": 9_000.0},
    {"range": "31–60 dias", "value": 200_000.0, "pdd": 20_000.0},
    {"range": "61–90 dias", "value": 150_000.0, "pdd": 37_500.0},
    {"range": "91–180 dias", "value": 100_000.0, "pdd": 50_000.0},
    {"range": "> 180 dias", "value": 50_000.0, "pdd": 50_000.0},
]

DEMO_COVENANTS = [
    {"name": "Subordinação Mínima", "limit": "≥ 15%", "actual": "18.5%", "ok": True},
    {"name": "Índice de PDD", "limit": "≤ 8%", "actual": "5.9%", "ok": True},
    {"name": "Liquidez Mínima", "limit": "≥ 1.0x", "actual": "2.3x", "ok": True},
    {"name": "Concentração Máx.", "limit": "≤ 25%", "actual": "22.1%", "ok": True},
    {"name": "Rating Mínimo", "limit": "≥ BBB", "actual": "A", "ok": True},
]

DEMO_FUND_DATA = {
    "fund_name": "FIDC Paganini Multissetorial",
    "cnpj": "12.345.678/0001-90",
    "administrator": "Paganini Gestora S.A.",
    "gestor": "Paganini Capital Ltda.",
    "custodia": "Banco ABC S.A.",
    "nav": 3_000_000.0,
    "total_receivables": 2_800_000.0,
    "pdd": 165_000.0,
    "cash": 500_000.0,
    "quotas_senior": 10_000.0,
    "quotas_sub": 2_000.0,
    "quota_value": 270.0,
    "subordination_value": 540_000.0,
    "subordination_pct": 18.0,
    "mtd_return": 0.011832,
    "ytd_return": 0.034521,
    "cdi_mtd": 0.010833,
    "rating": "A",
    "liquidity_ratio": 2.3,
    "strategy": "multissetorial de recebíveis comerciais",
    "outlook": (
        "A carteira apresenta boa diversificação setorial com exposição a varejo, "
        "agronegócio e distribuição. Os indicadores de inadimplência estão abaixo "
        "dos limites dos covenants e a subordinação mínima é respeitada."
    ),
    "aging": DEMO_AGING,
    "covenants": DEMO_COVENANTS,
    "compliance": {"status": "OK", "findings": []},
    "cedentes": [
        {
            "name": "Empresa Alpha S.A.",
            "cnpj": "11.222.333/0001-44",
            "total_value": 700_000.0,
            "pd": 0.02,
            "lgd": 0.40,
            "pdd": 5_600.0,
            "aging": [{"range": "A vencer", "value": 700_000.0, "pdd": 0}],
        },
        {
            "name": "Agro Theta Cooperativa",
            "cnpj": "55.666.777/0001-88",
            "total_value": 1_000_000.0,
            "pd": 0.015,
            "lgd": 0.35,
            "pdd": 5_250.0,
            "aging": [
                {"range": "A vencer", "value": 950_000.0, "pdd": 0},
                {"range": "1–30 dias", "value": 50_000.0, "pdd": 1_500.0},
            ],
        },
    ],
}


# ---------------------------------------------------------------------------
# CLI demo
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    agent = ReportingAgent()

    # BRL format demo
    print("=== REPORTING AGENT DEMO ===")
    for val in [0, 1234.5, 1_234_567.89, -9_999.99]:
        print(f"  {val:>15,.2f}  →  {agent.format_brl(val)}")

    result = agent.execute("demo reporting", {}, [])
    print(f"\nSummary: {result['summary']}")
    print(f"Reports generated: {list(result['reports'].keys())}")
    print("\n--- Monthly Report (first 800 chars) ---")
    print(result["reports"]["monthly"][:800])
