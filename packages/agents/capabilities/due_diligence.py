"""
Due Diligence Agent — Cedente scoring, CNPJ validation, PEP screening, onboarding.

Implements:
- Brazilian CNPJ validation (mod-11 check digits per Receita Federal algorithm)
- 5-criteria weighted scoring for cedente risk assessment
- PEP (Politically Exposed Person) screening
- Financial health analysis (key accounting ratios)
- Full onboarding pipeline with go/no-go decision

Scoring criteria and weights:
  1. tempo_mercado      (20%) — Years in business
  2. saude_financeira   (30%) — Financial health (current ratio, D/E, revenue growth)
  3. historico_judicial (15%) — Lawsuits / judicial proceedings
  4. pep_sanctions      (20%) — PEP / sanctions exposure of key people
  5. setor_atuacao      (15%) — Sector risk profile

Risk levels:
  score >= 70  → baixo
  score >= 50  → medio
  score >= 30  → alto
  score <  30  → critico
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Scoring weights & thresholds
# ---------------------------------------------------------------------------

SCORING_WEIGHTS: dict[str, float] = {
    "tempo_mercado": 0.20,
    "saude_financeira": 0.30,
    "historico_judicial": 0.15,
    "pep_sanctions": 0.20,
    "setor_atuacao": 0.15,
}

RISK_LEVELS: list[tuple[float, str]] = [
    (70.0, "baixo"),
    (50.0, "medio"),
    (30.0, "alto"),
    (0.0, "critico"),
]

# Sector risk multipliers (higher = higher risk sector)
SECTOR_RISK: dict[str, float] = {
    "agronegócio": 0.85,
    "saúde": 0.80,
    "educação": 0.80,
    "tecnologia": 0.75,
    "energia": 0.70,
    "manufatura": 0.70,
    "construção": 0.55,
    "varejo": 0.60,
    "financeiro": 0.65,
    "entretenimento": 0.50,
    "geral": 0.60,
}

# Minimum financial ratios for "acceptable" rating
MIN_CURRENT_RATIO = 1.2
MIN_REVENUE_GROWTH = -0.10  # Up to -10% is still acceptable

# Mock PEP database (in production: government datasets, Receita Federal)
PEP_DATABASE: dict[str, dict[str, Any]] = {
    "JOÃO DA SILVA": {
        "cpf_partial": "***123456**",
        "role": "Secretário de Estado",
        "jurisdiction": "São Paulo",
        "since": "2020-01-01",
        "risk": "HIGH",
    },
    "MARIA SOUZA GOVERNADORA": {
        "cpf_partial": "***987654**",
        "role": "Governadora",
        "jurisdiction": "Minas Gerais",
        "since": "2022-01-01",
        "risk": "VERY_HIGH",
    },
    "CARLOS MINISTRO": {
        "cpf_partial": "***555666**",
        "role": "Ministro",
        "jurisdiction": "Federal",
        "since": "2023-01-01",
        "risk": "HIGH",
    },
}

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class CedenteScore:
    cnpj: str
    company_name: str
    overall_score: float
    risk_level: str
    criteria_scores: dict[str, float]
    criteria_details: dict[str, Any]
    recommendation: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {
            "cnpj": self.cnpj,
            "company_name": self.company_name,
            "overall_score": round(self.overall_score, 2),
            "risk_level": self.risk_level,
            "criteria_scores": {
                k: round(v, 2) for k, v in self.criteria_scores.items()
            },
            "criteria_details": self.criteria_details,
            "recommendation": self.recommendation,
            "timestamp": self.timestamp,
        }


@dataclass
class OnboardingResult:
    cnpj: str
    company_name: str
    status: str  # APPROVED | REJECTED | PENDING_EDD
    cedente_score: CedenteScore | None
    checks: list[dict[str, Any]]
    blockers: list[str]
    warnings: list[str]
    credit_limit_suggested_brl: float
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {
            "cnpj": self.cnpj,
            "company_name": self.company_name,
            "status": self.status,
            "cedente_score": (
                self.cedente_score.to_dict() if self.cedente_score else None
            ),
            "checks": self.checks,
            "blockers": self.blockers,
            "warnings": self.warnings,
            "credit_limit_suggested_brl": round(self.credit_limit_suggested_brl, 2),
            "timestamp": self.timestamp,
        }


# ---------------------------------------------------------------------------
# DueDiligenceAgent
# ---------------------------------------------------------------------------


class DueDiligenceAgent:
    """
    Due Diligence agent for FIDC cedente onboarding.

    Performs CNPJ validation, risk scoring, PEP screening, financial analysis,
    and produces a full onboarding decision with suggested credit limit.
    """

    def __init__(self):
        self.pep_db = PEP_DATABASE
        self.scoring_weights = SCORING_WEIGHTS

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
        Dispatch due diligence operations.

        Args:
            task: Action name.
            context: Data context dict.
            chunks: Optional RAG chunks.

        Returns:
            Serialisable result dict.
        """
        action_map = {
            "validate_cnpj": lambda: {
                "cnpj": context.get("cnpj", ""),
                "valid": self.validate_cnpj(str(context.get("cnpj", ""))),
            },
            "check_pep": lambda: {"hits": self.check_pep(context.get("names", []))},
            "analyze_financials": lambda: self.analyze_financials(
                context.get("balance_sheet", context)
            ),
            "score_cedente": lambda: self.score_cedente(
                str(context.get("cnpj", "")),
                context,
            ).to_dict(),
            "run_onboarding_pipeline": lambda: self.run_onboarding_pipeline(
                str(context.get("cnpj", "")),
                context,
            ).to_dict(),
        }
        handler = action_map.get(task)
        if handler is None:
            return {"error": f"Unknown action: {task!r}", "available": list(action_map)}
        return handler()

    # ------------------------------------------------------------------
    # Core capabilities
    # ------------------------------------------------------------------

    def validate_cnpj(self, cnpj: str) -> bool:
        """
        Validate a Brazilian CNPJ using the official Receita Federal algorithm.

        CNPJ format: XX.XXX.XXX/XXXX-DD
        Validation:
        1. Strip non-digits.
        2. Must be 14 digits.
        3. Cannot be all-same-digit (e.g., 000...0).
        4. Compute first check digit using weights [5,4,3,2,9,8,7,6,5,4,3,2].
        5. Compute second check digit using weights [6,5,4,3,2,9,8,7,6,5,4,3,2].

        Args:
            cnpj: CNPJ string (with or without formatting).

        Returns:
            True if valid, False otherwise.
        """
        digits = re.sub(r"\D", "", cnpj)

        if len(digits) != 14:
            return False

        # Reject trivial sequences
        if len(set(digits)) == 1:
            return False

        def mod11_check(body: str, weights: list[int]) -> int:
            """Compute mod-11 check digit."""
            total = sum(int(d) * w for d, w in zip(body, weights))
            remainder = total % 11
            return 0 if remainder < 2 else 11 - remainder

        # First check digit (position 13, 0-indexed = index 12)
        weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        check1 = mod11_check(digits[:12], weights1)
        if int(digits[12]) != check1:
            return False

        # Second check digit (position 14, 0-indexed = index 13)
        weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        check2 = mod11_check(digits[:13], weights2)
        return int(digits[13]) == check2

    def check_pep(self, names: list[str]) -> list[dict[str, Any]]:
        """
        Screen a list of names against the PEP (Politically Exposed Person) database.

        Matching: case-insensitive substring match to catch partial names.

        Args:
            names: List of person names (beneficiários, administradores, sócios).

        Returns:
            List of PEP hit dicts with role, jurisdiction, risk level.
        """
        hits: list[dict[str, Any]] = []
        for name in names:
            name_upper = name.strip().upper()
            for pep_name, pep_data in self.pep_db.items():
                # Substring match: name token overlap
                name_tokens = set(name_upper.split())
                pep_tokens = set(pep_name.split())
                overlap = name_tokens & pep_tokens
                match_score = len(overlap) / max(len(pep_tokens), 1)

                if match_score >= 0.6:  # 60%+ token overlap
                    hits.append(
                        {
                            "queried_name": name,
                            "matched_pep": pep_name,
                            "match_score": round(match_score, 2),
                            "role": pep_data["role"],
                            "jurisdiction": pep_data["jurisdiction"],
                            "pep_since": pep_data["since"],
                            "risk_level": pep_data["risk"],
                            "action_required": "Enhanced Due Diligence (EDD) mandatory.",
                        }
                    )
        return hits

    def analyze_financials(self, balance_sheet: dict[str, Any]) -> dict[str, Any]:
        """
        Compute key financial ratios from a balance sheet.

        Ratios computed:
        - current_ratio = current_assets / current_liabilities
        - quick_ratio = (current_assets - inventory) / current_liabilities
        - debt_to_equity = total_debt / equity
        - gross_margin = (revenue - cogs) / revenue
        - ebitda_margin = ebitda / revenue
        - revenue_growth = (revenue_current - revenue_prior) / revenue_prior
        - net_profit_margin = net_income / revenue
        - asset_turnover = revenue / total_assets

        Args:
            balance_sheet: Dict with financial data fields.

        Returns:
            Dict with all ratios, their values, benchmarks, and status flags.
        """
        # Extract with defaults
        current_assets = float(balance_sheet.get("current_assets", 0.0))
        current_liab = float(balance_sheet.get("current_liabilities", 1.0))
        inventory = float(balance_sheet.get("inventory", 0.0))
        total_debt = float(balance_sheet.get("total_debt", 0.0))
        equity = float(balance_sheet.get("equity", 1.0))
        revenue = float(balance_sheet.get("revenue", 0.0))
        cogs = float(balance_sheet.get("cogs", 0.0))
        ebitda = float(balance_sheet.get("ebitda", 0.0))
        net_income = float(balance_sheet.get("net_income", 0.0))
        total_assets = float(balance_sheet.get("total_assets", 1.0))
        revenue_prior = float(balance_sheet.get("revenue_prior_year", revenue))

        def safe_div(n: float, d: float) -> float:
            return round(n / d, 4) if d != 0 else 0.0

        current_ratio = safe_div(current_assets, current_liab)
        quick_ratio = safe_div(current_assets - inventory, current_liab)
        debt_to_equity = safe_div(total_debt, equity)
        gross_margin = safe_div(revenue - cogs, revenue)
        ebitda_margin = safe_div(ebitda, revenue)
        revenue_growth = (
            safe_div(revenue - revenue_prior, revenue_prior) if revenue_prior else 0.0
        )
        net_profit_margin = safe_div(net_income, revenue)
        asset_turnover = safe_div(revenue, total_assets)

        # Benchmarks and status
        benchmarks = {
            "current_ratio": {
                "value": current_ratio,
                "min": 1.2,
                "ok": current_ratio >= 1.2,
            },
            "quick_ratio": {"value": quick_ratio, "min": 0.8, "ok": quick_ratio >= 0.8},
            "debt_to_equity": {
                "value": debt_to_equity,
                "max": 2.5,
                "ok": debt_to_equity <= 2.5,
            },
            "gross_margin": {
                "value": gross_margin,
                "min": 0.10,
                "ok": gross_margin >= 0.10,
            },
            "ebitda_margin": {
                "value": ebitda_margin,
                "min": 0.05,
                "ok": ebitda_margin >= 0.05,
            },
            "revenue_growth": {
                "value": revenue_growth,
                "min": MIN_REVENUE_GROWTH,
                "ok": revenue_growth >= MIN_REVENUE_GROWTH,
            },
            "net_profit_margin": {
                "value": net_profit_margin,
                "min": 0.02,
                "ok": net_profit_margin >= 0.02,
            },
            "asset_turnover": {
                "value": asset_turnover,
                "min": 0.30,
                "ok": asset_turnover >= 0.30,
            },
        }

        passing = sum(1 for v in benchmarks.values() if v["ok"])
        health_score = passing / len(benchmarks) * 100

        return {
            "ratios": benchmarks,
            "health_score": round(health_score, 1),
            "health_grade": (
                "A"
                if health_score >= 80
                else "B" if health_score >= 60 else "C" if health_score >= 40 else "D"
            ),
            "passing_checks": passing,
            "total_checks": len(benchmarks),
        }

    def score_cedente(self, cnpj: str, data: dict[str, Any]) -> CedenteScore:
        """
        Score a cedente across 5 weighted criteria. Returns 0–100 score.

        Criteria:
        1. tempo_mercado (20%): Years in business.
           0-1y: 20, 1-3y: 40, 3-5y: 60, 5-10y: 80, >10y: 100
        2. saude_financeira (30%): From analyze_financials health_score.
        3. historico_judicial (15%): Fewer lawsuits = higher score.
           0 suits: 100, 1-2: 70, 3-5: 40, >5: 10
        4. pep_sanctions (20%): PEP/sanctions exposure.
           No hits: 100, Warnings: 60, Hits: 0
        5. setor_atuacao (15%): Sector risk multiplier × 100.

        Args:
            cnpj: CNPJ of the cedente.
            data: Company data dict with:
                company_name, years_in_business, balance_sheet,
                lawsuit_count, key_people_names, sector.

        Returns:
            CedenteScore dataclass.
        """
        company_name = data.get("company_name", "N/A")
        years = float(data.get("years_in_business", 0))
        lawsuit_count = int(data.get("lawsuit_count", 0))
        sector = str(data.get("sector", "geral")).lower()
        key_people = data.get("key_people_names", [])
        balance_sheet = data.get("balance_sheet", {})

        criteria_scores: dict[str, float] = {}
        criteria_details: dict[str, Any] = {}

        # 1. tempo_mercado
        if years > 10:
            tm_score = 100.0
        elif years > 5:
            tm_score = 80.0
        elif years > 3:
            tm_score = 60.0
        elif years > 1:
            tm_score = 40.0
        else:
            tm_score = 20.0
        criteria_scores["tempo_mercado"] = tm_score
        criteria_details["tempo_mercado"] = {"years": years, "raw_score": tm_score}

        # 2. saude_financeira
        fin_analysis = self.analyze_financials(balance_sheet) if balance_sheet else {}
        sf_score = fin_analysis.get("health_score", 50.0)
        criteria_scores["saude_financeira"] = sf_score
        criteria_details["saude_financeira"] = fin_analysis

        # 3. historico_judicial
        if lawsuit_count == 0:
            hj_score = 100.0
        elif lawsuit_count <= 2:
            hj_score = 70.0
        elif lawsuit_count <= 5:
            hj_score = 40.0
        else:
            hj_score = 10.0
        criteria_scores["historico_judicial"] = hj_score
        criteria_details["historico_judicial"] = {
            "lawsuit_count": lawsuit_count,
            "raw_score": hj_score,
        }

        # 4. pep_sanctions
        pep_hits = self.check_pep(key_people) if key_people else []
        high_risk_pep = [
            h for h in pep_hits if h.get("risk_level") in ("HIGH", "VERY_HIGH")
        ]
        if high_risk_pep:
            ps_score = 0.0
        elif pep_hits:
            ps_score = 60.0
        else:
            ps_score = 100.0
        criteria_scores["pep_sanctions"] = ps_score
        criteria_details["pep_sanctions"] = {
            "pep_hits": pep_hits,
            "raw_score": ps_score,
        }

        # 5. setor_atuacao
        sector_mult = SECTOR_RISK.get(sector, 0.60)
        sa_score = sector_mult * 100
        criteria_scores["setor_atuacao"] = sa_score
        criteria_details["setor_atuacao"] = {
            "sector": sector,
            "risk_multiplier": sector_mult,
            "raw_score": sa_score,
        }

        # Weighted aggregate
        overall = sum(
            criteria_scores[criterion] * weight
            for criterion, weight in self.scoring_weights.items()
        )

        # Risk level
        risk_level = "critico"
        for threshold, level in RISK_LEVELS:
            if overall >= threshold:
                risk_level = level
                break

        # Recommendation
        if overall >= 70:
            recommendation = "APROVADO — baixo risco, crédito padrão."
        elif overall >= 50:
            recommendation = (
                "APROVADO COM RESSALVAS — diligência adicional recomendada."
            )
        elif overall >= 30:
            recommendation = (
                "PENDING_EDD — due diligence aprimorada obrigatória antes da aprovação."
            )
        else:
            recommendation = (
                "REJEITADO — risco crítico. Não onboar sem aprovação do comitê."
            )

        return CedenteScore(
            cnpj=cnpj,
            company_name=company_name,
            overall_score=round(overall, 2),
            risk_level=risk_level,
            criteria_scores=criteria_scores,
            criteria_details=criteria_details,
            recommendation=recommendation,
        )

    def run_onboarding_pipeline(
        self,
        cnpj: str,
        company_data: dict[str, Any],
    ) -> OnboardingResult:
        """
        Full cedente onboarding pipeline.

        Steps:
        1. CNPJ validation
        2. PEP screening of key people
        3. Financial analysis
        4. Cedente scoring (5 criteria)
        5. Credit limit suggestion based on score and revenue
        6. Go/no-go decision

        Args:
            cnpj: CNPJ of the cedente.
            company_data: Full company data dict.

        Returns:
            OnboardingResult with status, score, credit limit, and blockers.
        """
        company_name = company_data.get("company_name", "N/A")
        checks: list[dict[str, Any]] = []
        blockers: list[str] = []
        warnings_list: list[str] = []

        # Step 1: CNPJ validation
        cnpj_valid = self.validate_cnpj(cnpj)
        checks.append({"step": "cnpj_validation", "cnpj": cnpj, "passed": cnpj_valid})
        if not cnpj_valid:
            blockers.append(f"CNPJ inválido: {cnpj}")

        # Step 2: PEP screening
        key_people = company_data.get("key_people_names", [])
        pep_hits = self.check_pep(key_people)
        high_risk_hits = [
            h for h in pep_hits if h.get("risk_level") in ("HIGH", "VERY_HIGH")
        ]
        checks.append(
            {
                "step": "pep_screening",
                "screened": len(key_people),
                "hits": len(pep_hits),
                "high_risk_hits": len(high_risk_hits),
                "passed": len(high_risk_hits) == 0,
            }
        )
        if high_risk_hits:
            blockers.append(
                f"{len(high_risk_hits)} PEP de alto risco detectado(s). EDD obrigatório."
            )
        elif pep_hits:
            warnings_list.append(
                f"{len(pep_hits)} PEP detectado(s). Monitoramento contínuo recomendado."
            )

        # Step 3: Financial analysis
        balance_sheet = company_data.get("balance_sheet", {})
        fin_result: dict[str, Any] = {}
        if balance_sheet:
            fin_result = self.analyze_financials(balance_sheet)
            fin_ok = fin_result.get("health_score", 0) >= 40
            checks.append(
                {
                    "step": "financial_analysis",
                    "health_score": fin_result.get("health_score"),
                    "health_grade": fin_result.get("health_grade"),
                    "passed": fin_ok,
                }
            )
            if not fin_ok:
                warnings_list.append(
                    f"Saúde financeira abaixo do limiar (score: {fin_result.get('health_score'):.1f})."
                )
        else:
            checks.append(
                {
                    "step": "financial_analysis",
                    "passed": None,
                    "note": "Balance sheet not provided.",
                }
            )

        # Step 4: Cedente scoring
        score_obj = self.score_cedente(cnpj, company_data)
        checks.append(
            {
                "step": "cedente_scoring",
                "overall_score": score_obj.overall_score,
                "risk_level": score_obj.risk_level,
                "passed": score_obj.overall_score >= 30,
            }
        )
        if score_obj.overall_score < 30:
            blockers.append(
                f"Score crítico ({score_obj.overall_score:.1f}). Operação bloqueada."
            )

        # Step 5: Credit limit suggestion
        # Base: % of annual revenue; adjusted by score
        revenue = float(balance_sheet.get("revenue", 0)) if balance_sheet else 0.0
        score_factor = score_obj.overall_score / 100  # 0–1
        if revenue > 0 and score_obj.overall_score >= 50:
            # Suggest 10–25% of annual revenue, scaled by score
            credit_pct = 0.10 + (0.15 * score_factor)
            credit_limit = revenue * credit_pct
        elif score_obj.overall_score >= 30:
            credit_limit = 500_000.0  # Conservative floor
        else:
            credit_limit = 0.0

        # Final status
        if blockers:
            status = "REJECTED"
        elif score_obj.overall_score >= 70 and not warnings_list:
            status = "APPROVED"
        elif score_obj.overall_score >= 50:
            status = "APPROVED"
        else:
            status = "PENDING_EDD"

        return OnboardingResult(
            cnpj=cnpj,
            company_name=company_name,
            status=status,
            cedente_score=score_obj,
            checks=checks,
            blockers=blockers,
            warnings=warnings_list,
            credit_limit_suggested_brl=round(credit_limit, 2),
        )


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

DEMO_COMPANY = {
    "company_name": "Indústria Beta S.A.",
    "cnpj": "11.222.333/0001-81",  # Will fail validation (illustrative)
    "years_in_business": 8,
    "sector": "manufatura",
    "lawsuit_count": 1,
    "key_people_names": ["João da Silva CEO", "Ana Costa CFO"],
    "balance_sheet": {
        "current_assets": 12_000_000,
        "current_liabilities": 8_000_000,
        "inventory": 2_000_000,
        "total_debt": 15_000_000,
        "equity": 20_000_000,
        "revenue": 50_000_000,
        "revenue_prior_year": 45_000_000,
        "cogs": 30_000_000,
        "ebitda": 8_000_000,
        "net_income": 3_500_000,
        "total_assets": 40_000_000,
    },
}

# Real valid CNPJ for demo (Petrobras)
DEMO_VALID_CNPJ = "33.000.167/0001-01"

if __name__ == "__main__":
    agent = DueDiligenceAgent()

    print("CNPJ validation:")
    print(f"  {DEMO_VALID_CNPJ} → {agent.validate_cnpj(DEMO_VALID_CNPJ)}")
    print(f"  {DEMO_COMPANY['cnpj']} → {agent.validate_cnpj(DEMO_COMPANY['cnpj'])}")

    result = agent.run_onboarding_pipeline(DEMO_VALID_CNPJ, DEMO_COMPANY)
    import json

    print("\nOnboarding Result:")
    print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))
