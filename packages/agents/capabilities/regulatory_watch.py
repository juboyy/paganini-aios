"""
regulatory_watch.py — Regulatory Monitoring for FIDC funds.

Simulates CVM and BACEN publication feeds, assesses impact on FIDC funds,
manages compliance calendars, and generates regulatory alerts.

Brazilian regulatory framework:
  - CVM Resolução 175/2022 (main FIDC regulation)
  - BACEN Resolução 3.978/2020 (PLD/FT)
  - BACEN Resolução 4.966/2021 (credit risk)
  - ANBIMA Código de Melhores Práticas para FII/FIDC
  - CVM Instrução 356 (legacy, superseded by Res. 175)
  - Lei 14.430/2022 (FIDC modernisation)
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from typing import Optional


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class Publication:
    """A regulatory publication from CVM or BACEN."""
    id: str
    source: str                  # "CVM" | "BACEN" | "ANBIMA" | "CMN"
    reference: str               # e.g. "Resolução CVM Nº 212"
    title: str
    summary: str
    published_date: str          # ISO date
    effective_date: str          # ISO date (when it comes into force)
    url: str
    topics: list[str]            # e.g. ["FIDC", "PLD", "risco_credito"]
    impact_level: str            # "high" | "medium" | "low" | "none" (set after assessment)
    full_text_snippet: str       # First 500 chars of text


@dataclass
class ImpactAssessment:
    """Impact assessment of a regulatory publication on a specific fund."""
    publication_id: str
    fund_type: str
    impact_level: str            # "high" | "medium" | "low" | "none"
    impact_score: int            # 0–100
    affected_areas: list[str]    # e.g. ["PDD", "concentracao", "relatorio"]
    rationale: str
    action_required: bool
    recommended_actions: list[str]
    deadline: Optional[str]      # ISO date for compliance deadline
    regulatory_risk: str         # "ENFORCEMENT_RISK" | "AUDIT_RISK" | "REPORTING_RISK" | "NONE"


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class RegulatoryWatchAgent:
    """
    Regulatory monitoring agent for FIDC structures.

    Monitors CVM and BACEN publications, assesses fund impact,
    manages compliance calendars, and generates stakeholder alerts.

    Key regulations tracked:
      - CVM Resolução 175/2022: FIDC structure and disclosure
      - BACEN Resolução 3.978/2020: AML/CFT (PLD/FT)
      - BACEN Resolução 4.966/2021: Credit risk classification
      - CMN Resolução 4.557/2017: Risk management framework
      - ANBIMA Codes: Best practices for fund administration
    """

    # ------------------------------------------------------------------ #
    # Constants                                                            #
    # ------------------------------------------------------------------ #

    # Applicable regulations catalogue for FIDCs
    APPLICABLE_REGULATIONS: list[dict] = [
        {
            "id":          "CVM-175",
            "reference":   "Resolução CVM Nº 175, de 23/12/2022",
            "authority":   "CVM",
            "title":       "Norma Geral sobre Fundos de Investimento",
            "description": "Regulamenta a constituição, o funcionamento e a divulgação de informações dos fundos de investimento, incluindo FIDC.",
            "effective":   "2023-04-01",
            "topics":      ["FIDC", "constituicao", "divulgacao", "relatorio_mensal", "cota"],
            "mandatory":   True,
            "url":         "https://www.gov.br/cvm/resolucao175",
        },
        {
            "id":          "BACEN-3978",
            "reference":   "Resolução BACEN Nº 3.978, de 23/01/2020",
            "authority":   "BACEN",
            "title":       "Política de Prevenção à Lavagem de Dinheiro e ao Financiamento do Terrorismo (PLD/FT)",
            "description": "Dispõe sobre a política de PLD/FT para instituições autorizadas a funcionar pelo BACEN e administradores de valores mobiliários.",
            "effective":   "2021-01-01",
            "topics":      ["PLD", "FT", "KYC", "monitoramento", "cedente"],
            "mandatory":   True,
            "url":         "https://www.bcb.gov.br/resolucao3978",
        },
        {
            "id":          "BACEN-4966",
            "reference":   "Resolução BACEN Nº 4.966, de 25/11/2021",
            "authority":   "BACEN",
            "title":       "Critérios de Classificação de Ativos e Constituição de Provisões",
            "description": "Estabelece critérios para classificação de operações de crédito e constituição de provisão para perdas esperadas (IFRS 9 adaptado).",
            "effective":   "2025-01-01",
            "topics":      ["PDD", "provisao", "risco_credito", "IFRS9", "inadimplencia"],
            "mandatory":   True,
            "url":         "https://www.bcb.gov.br/resolucao4966",
        },
        {
            "id":          "CMN-4557",
            "reference":   "Resolução CMN Nº 4.557, de 23/02/2017",
            "authority":   "CMN",
            "title":       "Gerenciamento de Riscos e Política de Divulgação",
            "description": "Dispõe sobre a estrutura de gerenciamento de riscos e a política de divulgação de informações.",
            "effective":   "2017-07-01",
            "topics":      ["gestao_risco", "concentracao", "liquidez", "operacional"],
            "mandatory":   True,
            "url":         "https://www.bcb.gov.br/cmn4557",
        },
        {
            "id":          "CVM-356",
            "reference":   "CVM Instrução Nº 356, de 17/12/2001 (revogada por CVM 175)",
            "authority":   "CVM",
            "title":       "Regulamentação de FIDC (revogada)",
            "description": "Regulamentação original de FIDC — revogada pela Resolução CVM 175/2022. Algumas cláusulas de fundos antigos ainda podem fazer referência a esta instrução.",
            "effective":   "2002-01-01",
            "topics":      ["FIDC", "historico", "legado"],
            "mandatory":   False,
            "url":         "https://www.gov.br/cvm/instrucao356",
        },
        {
            "id":          "LEI-14430",
            "reference":   "Lei Nº 14.430, de 03/08/2022",
            "authority":   "Congresso Nacional",
            "title":       "Modernização dos Fundos de Investimento em Direitos Creditórios",
            "description": "Cria o FIDC de condomínio aberto e simplifica requisitos para FIDC destinados a investidores qualificados.",
            "effective":   "2022-08-03",
            "topics":      ["FIDC", "condominio_aberto", "investidor_qualificado", "modernizacao"],
            "mandatory":   True,
            "url":         "https://www.planalto.gov.br/lei14430",
        },
        {
            "id":          "ANBIMA-FIDC",
            "reference":   "ANBIMA Código de Administração de Recursos de Terceiros",
            "authority":   "ANBIMA",
            "title":       "Código de Melhores Práticas para Gestão de Recursos de Terceiros",
            "description": "Estabelece padrões de conduta e melhores práticas para gestores e administradores de fundos, incluindo FIDC.",
            "effective":   "2023-01-01",
            "topics":      ["boas_praticas", "compliance", "divulgacao", "gestor"],
            "mandatory":   False,  # voluntary but strongly encouraged
            "url":         "https://www.anbima.com.br/codigos",
        },
        {
            "id":          "BACEN-CADOC",
            "reference":   "BACEN CADOC 3040 — Demonstrativo de Risco de Mercado",
            "authority":   "BACEN",
            "title":       "Sistema CADOC — Documento 3040",
            "description": "Obrigação de reporte mensal do risco de mercado por instituições financeiras autorizadas.",
            "effective":   "2006-01-01",
            "topics":      ["risco_mercado", "reporte", "CADOC", "mensal"],
            "mandatory":   True,
            "url":         "https://www.bcb.gov.br/cadoc3040",
        },
    ]

    # Compliance calendar: (month, day, filing type, description, days_notice)
    FILING_DEADLINES: list[dict] = [
        # CVM monthly — by 15th of following month
        {"name": "Informe Mensal CVM (Res. 175)",     "type": "cvm_mensal",     "day_of_month": 15, "recurring": "monthly",   "days_before_alert": 7},
        # CVM quarterly report — 45 days after quarter end
        {"name": "Relatório Trimestral de Gestão",    "type": "cvm_trimestral", "months": [1, 4, 7, 10], "day_of_month": 15, "days_before_alert": 15},
        # BACEN CADOC 3040 — 15th business day of following month
        {"name": "BACEN CADOC 3040",                  "type": "bacen_cadoc",    "day_of_month": 20, "recurring": "monthly",   "days_before_alert": 10},
        # Annual meeting / Assembléia
        {"name": "Assembléia Geral Ordinária (AGO)",  "type": "ago",            "months": [3], "day_of_month": 31, "days_before_alert": 30},
        # Annual report
        {"name": "Informe Anual CVM",                 "type": "cvm_anual",      "months": [3], "day_of_month": 31, "days_before_alert": 30},
    ]

    def __init__(self):
        # Simulated publication store (keyed by id)
        self._publications: dict[str, Publication] = {}
        self._load_simulated_feed()

    # ------------------------------------------------------------------ #
    # Core entry point                                                     #
    # ------------------------------------------------------------------ #

    def execute(self, task: str, context: dict, chunks: list) -> dict:
        """
        Main dispatch. Runs full regulatory monitoring cycle.

        Args:
            task:    Task description
            context: fund_profile, current_date
            chunks:  Document chunks (ignored here — we use simulated feeds)

        Returns:
            dict with status, publications, assessments, calendar, alerts, summary
        """
        fund_profile = context.get("fund_profile", DEMO_FUND_PROFILE)
        current_date = context.get("current_date", datetime.utcnow().strftime("%Y-%m-%d"))

        # 1. Fetch new publications
        cvm_pubs   = self.check_cvm_publications()
        bacen_pubs = self.check_bacen_publications()
        all_pubs   = cvm_pubs + bacen_pubs

        # 2. Assess impact
        assessments = []
        for pub in all_pubs:
            impact = self.assess_impact(
                {"id": pub.id, "topics": pub.topics, "reference": pub.reference, "title": pub.title},
                fund_profile,
            )
            assessments.append({"publication": pub, "impact": impact})

        # 3. Check calendar
        calendar = self.check_compliance_calendar(current_date)

        # 4. Generate alerts for high-impact publications
        alerts = []
        for entry in assessments:
            if entry["impact"].impact_level in ("high", "medium"):
                alert = self.generate_regulatory_alert(
                    {"id": entry["publication"].id, "reference": entry["publication"].reference,
                     "title": entry["publication"].title, "summary": entry["publication"].summary},
                    {"impact_level": entry["impact"].impact_level,
                     "affected_areas": entry["impact"].affected_areas,
                     "rationale": entry["impact"].rationale,
                     "recommended_actions": entry["impact"].recommended_actions,
                     "deadline": entry["impact"].deadline},
                )
                alerts.append(alert)

        high_count = sum(1 for a in assessments if a["impact"].impact_level == "high")
        return {
            "status": "ok",
            "publications_found": len(all_pubs),
            "assessments": assessments,
            "calendar": calendar,
            "alerts": alerts,
            "applicable_regulations": self.get_applicable_regulations("fidc"),
            "summary": (
                f"Found {len(all_pubs)} publications | "
                f"High impact: {high_count} | "
                f"Upcoming deadlines: {len(calendar)}"
            ),
        }

    # ------------------------------------------------------------------ #
    # 1. CVM Publications                                                  #
    # ------------------------------------------------------------------ #

    def check_cvm_publications(self, since_date: str = None) -> list[Publication]:
        """
        Return simulated CVM publication feed.

        In production: scrape https://www.gov.br/cvm/pt-br/assuntos/normas/
        or call CVM's data API.

        Args:
            since_date: ISO date string — return only newer publications

        Returns:
            List of Publication objects from CVM
        """
        cvm_pubs = [p for p in self._publications.values() if p.source == "CVM"]
        if since_date:
            cvm_pubs = [p for p in cvm_pubs if p.published_date >= since_date]
        return sorted(cvm_pubs, key=lambda p: p.published_date, reverse=True)

    # ------------------------------------------------------------------ #
    # 2. BACEN Publications                                                #
    # ------------------------------------------------------------------ #

    def check_bacen_publications(self, since_date: str = None) -> list[Publication]:
        """
        Return simulated BACEN publication feed.

        In production: scrape https://www.bcb.gov.br/estabilidadefinanceira/resolucaoConsultar
        or use BACEN's Open Data APIs.

        Args:
            since_date: ISO date string — return only newer publications

        Returns:
            List of Publication objects from BACEN
        """
        bacen_pubs = [p for p in self._publications.values() if p.source == "BACEN"]
        if since_date:
            bacen_pubs = [p for p in bacen_pubs if p.published_date >= since_date]
        return sorted(bacen_pubs, key=lambda p: p.published_date, reverse=True)

    # ------------------------------------------------------------------ #
    # 3. Impact Assessment                                                 #
    # ------------------------------------------------------------------ #

    def assess_impact(
        self,
        publication: dict,
        fund_profile: dict,
    ) -> ImpactAssessment:
        """
        Classify regulatory impact on a specific FIDC fund profile.

        Scoring model:
          - Topic overlap with fund activities: +10–30 per match
          - Mandatory regulation: +20
          - Fund type exact match: +25
          - New regulation (< 60 days old): +10

        Impact levels:
          score ≥ 70 → high
          score ≥ 40 → medium
          score ≥ 15 → low
          score <  15 → none

        Args:
            publication:  dict with id, topics, reference, title
            fund_profile: dict describing the fund's activities

        Returns:
            ImpactAssessment dataclass
        """
        score         = 0
        affected_areas: list[str] = []
        actions: list[str]        = []
        rationale_parts: list[str] = []

        pub_topics  = set(publication.get("topics", []))
        fund_topics = set(fund_profile.get("activities", []))
        fund_type   = fund_profile.get("type", "fidc").lower()

        # Topic overlap
        TOPIC_WEIGHTS = {
            "FIDC":          30,
            "PDD":           25,
            "provisao":      25,
            "risco_credito": 20,
            "concentracao":  20,
            "liquidez":      20,
            "PLD":           20,
            "relatorio_mensal": 15,
            "cedente":       15,
            "cota":          10,
            "IFRS9":         20,
            "CADOC":         15,
            "divulgacao":    10,
        }

        for topic in pub_topics:
            weight = TOPIC_WEIGHTS.get(topic, 5)
            if topic in fund_topics or topic == "FIDC":
                score += weight
                affected_areas.append(topic)
                rationale_parts.append(f"topic '{topic}' directly applicable to fund")

        # Fund type match
        if "FIDC" in pub_topics and fund_type == "fidc":
            score += 25
            rationale_parts.append("publication explicitly targets FIDC fund type")

        # BACEN compliance for administrators authorised by BACEN
        if publication.get("source", "") == "BACEN" and fund_profile.get("bacen_authorised", True):
            score += 15
            rationale_parts.append("fund administrator is BACEN-authorised entity")

        # Compute impact level
        if score >= 70:
            impact_level = "high"
            regulatory_risk = "ENFORCEMENT_RISK"
        elif score >= 40:
            impact_level = "medium"
            regulatory_risk = "AUDIT_RISK"
        elif score >= 15:
            impact_level = "low"
            regulatory_risk = "REPORTING_RISK"
        else:
            impact_level = "none"
            regulatory_risk = "NONE"

        # Build recommended actions
        action_required = impact_level in ("high", "medium")
        if impact_level == "high":
            actions = [
                "Convoke immediate compliance review meeting",
                "Update fund policies and procedures within 30 days",
                "Notify cotistas (investors) if material impact confirmed",
                "Update regulamento if required — seek CVM/BACEN guidance",
            ]
            deadline = _add_business_days(datetime.utcnow().date(), 30).isoformat()
        elif impact_level == "medium":
            actions = [
                "Review internal controls and procedures",
                "Assess need for policy update",
                "Monitor for further guidance from regulator",
            ]
            deadline = _add_business_days(datetime.utcnow().date(), 60).isoformat()
        else:
            actions = ["Monitor for further developments"]
            deadline = None

        return ImpactAssessment(
            publication_id=publication.get("id", ""),
            fund_type=fund_type,
            impact_level=impact_level,
            impact_score=min(score, 100),
            affected_areas=list(set(affected_areas)),
            rationale=" | ".join(rationale_parts) or "No direct applicability found.",
            action_required=action_required,
            recommended_actions=actions,
            deadline=deadline,
            regulatory_risk=regulatory_risk,
        )

    # ------------------------------------------------------------------ #
    # 4. Compliance Calendar                                               #
    # ------------------------------------------------------------------ #

    def check_compliance_calendar(self, current_date: str) -> list[dict]:
        """
        Return upcoming filing deadlines within next 90 days.

        Args:
            current_date: ISO date string (YYYY-MM-DD)

        Returns:
            List of deadline dicts, sorted by due date ascending
        """
        today  = date.fromisoformat(current_date)
        cutoff = today + timedelta(days=90)
        upcoming: list[dict] = []

        for filing in self.FILING_DEADLINES:
            # Monthly filings
            if filing.get("recurring") == "monthly":
                # Check current and next 3 months
                for delta_months in range(3):
                    m = today.month + delta_months
                    y = today.year
                    while m > 12:
                        m -= 12
                        y += 1
                    dom = min(filing["day_of_month"], _days_in_month(m, y))
                    due = date(y, m, dom)
                    if today <= due <= cutoff:
                        days_until = (due - today).days
                        upcoming.append({
                            "name":          filing["name"],
                            "type":          filing["type"],
                            "due_date":      due.isoformat(),
                            "days_until":    days_until,
                            "urgency":       "URGENT" if days_until <= filing.get("days_before_alert", 7) else "NORMAL",
                            "days_notice":   filing.get("days_before_alert", 7),
                        })

            # Specific months
            elif "months" in filing:
                for m in filing["months"]:
                    y = today.year
                    dom = min(filing["day_of_month"], _days_in_month(m, y))
                    due = date(y, m, dom)
                    if due < today:
                        due = date(y + 1, m, dom)
                    if today <= due <= cutoff:
                        days_until = (due - today).days
                        upcoming.append({
                            "name":        filing["name"],
                            "type":        filing["type"],
                            "due_date":    due.isoformat(),
                            "days_until":  days_until,
                            "urgency":     "URGENT" if days_until <= filing.get("days_before_alert", 15) else "NORMAL",
                            "days_notice": filing.get("days_before_alert", 15),
                        })

        return sorted(upcoming, key=lambda x: x["due_date"])

    # ------------------------------------------------------------------ #
    # 5. Regulatory Alert                                                  #
    # ------------------------------------------------------------------ #

    def generate_regulatory_alert(
        self,
        publication: dict,
        impact: dict,
    ) -> str:
        """
        Generate a formatted regulatory alert for stakeholders.

        Args:
            publication: dict with reference, title, summary
            impact:      dict with impact_level, affected_areas, rationale,
                         recommended_actions, deadline

        Returns:
            Formatted Markdown alert string
        """
        now     = datetime.utcnow().strftime("%d/%m/%Y %H:%M UTC")
        ref     = publication.get("reference", "")
        title   = publication.get("title", "")
        summary = publication.get("summary", "")
        level   = impact.get("impact_level", "low").upper()
        areas   = impact.get("affected_areas", [])
        actions = impact.get("recommended_actions", [])
        deadline = impact.get("deadline", "N/D")
        rationale = impact.get("rationale", "")

        icon = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢", "NONE": "⚪"}.get(level, "⚪")

        action_lines = "\n".join(f"  {i+1}. {a}" for i, a in enumerate(actions))

        return f"""# {icon} ALERTA REGULATÓRIO — {level}
**Referência:** {ref}
**Gerado em:** {now}

---

## Publicação

**Título:** {title}

**Resumo:**
{summary}

---

## Avaliação de Impacto

| Campo | Detalhe |
|-------|---------|
| Nível de Impacto | {level} |
| Áreas Afetadas | {', '.join(areas) or 'N/A'} |
| Prazo para Adequação | {deadline} |

**Fundamentação:** {rationale}

---

## Ações Recomendadas

{action_lines}

---

*Alerta gerado automaticamente pelo Paganini AIOS — Regulatory Watch Agent.*
*Consulte a equipe jurídica e de compliance antes de implementar mudanças.*
"""

    # ------------------------------------------------------------------ #
    # 6. Applicable Regulations                                            #
    # ------------------------------------------------------------------ #

    def get_applicable_regulations(self, fund_type: str = "fidc") -> list[dict]:
        """
        Return list of applicable regulations for the given fund type.

        Args:
            fund_type: "fidc" | "fii" | "fim" | "fic"

        Returns:
            List of regulation dicts from APPLICABLE_REGULATIONS
        """
        if fund_type.lower() == "fidc":
            # All regulations in our catalogue apply to FIDC
            return [r for r in self.APPLICABLE_REGULATIONS if r.get("mandatory", False)]
        # For other fund types, return only general regulations
        return [r for r in self.APPLICABLE_REGULATIONS
                if "FIDC" not in r.get("topics", []) and r.get("mandatory", False)]

    # ------------------------------------------------------------------ #
    # Helpers                                                              #
    # ------------------------------------------------------------------ #

    def _load_simulated_feed(self):
        """Load realistic simulated publications into the in-memory feed."""
        simulated: list[dict] = [
            {
                "source": "CVM",
                "reference": "Resolução CVM Nº 212, de 15/01/2026",
                "title": "Alteração dos critérios de divulgação para FIDCs abertos",
                "summary": (
                    "Altera os requisitos de divulgação de informações financeiras para FIDCs "
                    "de condomínio aberto criados ao amparo da Lei 14.430/2022, exigindo "
                    "publicação do informe diário de cota em até D+1 e novo formato XML para "
                    "entrega do informe mensal a partir de 01/07/2026."
                ),
                "published_date": "2026-01-15",
                "effective_date":  "2026-07-01",
                "topics": ["FIDC", "divulgacao", "cota", "relatorio_mensal", "condominio_aberto"],
                "url": "https://www.gov.br/cvm/resolucao212",
            },
            {
                "source": "CVM",
                "reference": "Ofício-Circular CVM/SIN Nº 03/2026",
                "title": "Orientações sobre Concentração de Risco em FIDCs Multissetoriais",
                "summary": (
                    "Esclarece a interpretação dos limites de concentração por cedente previstos "
                    "no art. 23 da Resolução CVM 175/2022, orientando que a exposição máxima por "
                    "cedente não deve ultrapassar 20% do patrimônio líquido do fundo para FIDCs "
                    "classificados como multissetoriais."
                ),
                "published_date": "2026-02-10",
                "effective_date":  "2026-02-10",
                "topics": ["FIDC", "concentracao", "cedente", "risco_credito"],
                "url": "https://www.gov.br/cvm/oficio03-2026",
            },
            {
                "source": "BACEN",
                "reference": "Resolução BACEN Nº 5.089, de 20/02/2026",
                "title": "Aprimoramento dos Critérios de PDD para Operações de Crédito Cedidas a FIDCs",
                "summary": (
                    "Atualiza os critérios de provisão para devedores duvidosos (PDD) aplicáveis "
                    "a carteiras de direitos creditórios cedidas a FIDCs, alinhando os parâmetros "
                    "ao IFRS 9 (perda esperada). Vigência: 01/01/2027."
                ),
                "published_date": "2026-02-20",
                "effective_date":  "2027-01-01",
                "topics": ["PDD", "provisao", "FIDC", "IFRS9", "risco_credito", "inadimplencia"],
                "url": "https://www.bcb.gov.br/resolucao5089",
            },
            {
                "source": "BACEN",
                "reference": "Nota Técnica BACEN Nº 18/2026",
                "title": "Critérios de Elegibilidade de Cedentes no Contexto de PLD/FT",
                "summary": (
                    "Orienta sobre os procedimentos de KYC para cedentes em FIDCs, reforçando a "
                    "necessidade de due diligence reforçada para cedentes com saldo devedor acima "
                    "de R$ 10 milhões, em linha com a Resolução BACEN 3.978/2020."
                ),
                "published_date": "2026-03-01",
                "effective_date":  "2026-03-01",
                "topics": ["PLD", "KYC", "cedente", "FIDC", "FT", "due_diligence"],
                "url": "https://www.bcb.gov.br/notatecnica18-2026",
            },
            {
                "source": "CVM",
                "reference": "Deliberação CVM Nº 975, de 05/03/2026",
                "title": "Novo Formulário de Informe Mensal de FIDC",
                "summary": (
                    "Aprova novo layout do informe mensal de FIDC com campos adicionais sobre "
                    "concentração por setor, aging da carteira e indicadores de liquidez."
                ),
                "published_date": "2026-03-05",
                "effective_date":  "2026-06-01",
                "topics": ["FIDC", "relatorio_mensal", "divulgacao", "concentracao", "liquidez", "aging"],
                "url": "https://www.gov.br/cvm/deliberacao975",
            },
        ]

        for pub_data in simulated:
            pub_id = hashlib.md5(pub_data["reference"].encode()).hexdigest()[:8]
            self._publications[pub_id] = Publication(
                id=pub_id,
                source=pub_data["source"],
                reference=pub_data["reference"],
                title=pub_data["title"],
                summary=pub_data["summary"],
                published_date=pub_data["published_date"],
                effective_date=pub_data["effective_date"],
                url=pub_data["url"],
                topics=pub_data["topics"],
                impact_level="unassessed",
                full_text_snippet=pub_data["summary"][:500],
            )


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def _add_business_days(start: date, days: int) -> date:
    """Add `days` business days (Mon–Fri) to `start`."""
    current = start
    added   = 0
    while added < days:
        current += timedelta(days=1)
        if current.weekday() < 5:  # Mon=0 … Fri=4
            added += 1
    return current


def _days_in_month(month: int, year: int) -> int:
    """Return number of days in a given month/year."""
    if month == 12:
        return (date(year + 1, 1, 1) - date(year, 12, 1)).days
    return (date(year, month + 1, 1) - date(year, month, 1)).days


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

DEMO_FUND_PROFILE = {
    "type":             "fidc",
    "name":             "FIDC Paganini Multissetorial",
    "cnpj":             "12.345.678/0001-90",
    "bacen_authorised": True,
    "activities": [
        "FIDC", "cedente", "risco_credito", "PDD", "provisao", "concentracao",
        "liquidez", "relatorio_mensal", "divulgacao", "PLD", "KYC",
    ],
    "size_brl":         3_000_000.0,
    "investor_type":    "qualificado",
}


# ---------------------------------------------------------------------------
# CLI demo
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    agent = RegulatoryWatchAgent()
    result = agent.execute("demo regulatory watch", {}, [])
    print("=== REGULATORY WATCH AGENT DEMO ===")
    print(f"Summary: {result['summary']}")
    print(f"\nPublications found: {result['publications_found']}")

    print("\n--- Assessments ---")
    for entry in result["assessments"]:
        pub    = entry["publication"]
        impact = entry["impact"]
        icon   = {"high": "🔴", "medium": "🟡", "low": "🟢", "none": "⚪"}.get(impact.impact_level, "⚪")
        print(f"  {icon} [{impact.impact_level.upper():6}] {pub.reference[:60]}")

    print("\n--- Compliance Calendar (next 90 days) ---")
    for item in result["calendar"][:5]:
        urgency_icon = "⚠️" if item["urgency"] == "URGENT" else "📅"
        print(f"  {urgency_icon} {item['due_date']} ({item['days_until']}d) — {item['name']}")

    print("\n--- Applicable Regulations ---")
    for reg in result["applicable_regulations"]:
        print(f"  📋 {reg['reference'][:60]}")

    print("\n--- Sample Alert ---")
    if result["alerts"]:
        print(result["alerts"][0][:500])
