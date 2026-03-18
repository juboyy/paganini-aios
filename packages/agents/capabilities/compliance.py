"""
Compliance Agent — 6-gate guardrail pipeline for FIDC operations.

Gates (in order):
  1. Eligibility  — receivable type, maturity, rating, amount
  2. Concentration — cedente ≤ 15% PL, sacado ≤ 10% PL, sector ≤ 25% PL
  3. Covenant     — liquidity ≥ 1.5×, subordination ≥ 25%, delinquency ≤ 5%
  4. PLD/AML      — PEP, sanctions, unusual patterns, structuring detection
  5. Compliance   — CVM 175 / fund regulation rules
  6. Risk         — expected loss, concentration risk, stress impact

Reference: CVM Resolução 175/22 and BACEN Circular 3978/20 (PLD/AML).
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Regulatory constants
# ---------------------------------------------------------------------------

ALLOWED_RECEIVABLE_TYPES = {
    "duplicata_mercantil",
    "cce",  # Cédula de Crédito Empresarial
    "ccb",  # Cédula de Crédito Bancário
    "debênture",
    "cheque",
    "nota_promissoria",
    "crédito_consignado",
    "crédito_pessoal",
    "recebível_imobiliário",
}

MIN_RATING = "BB-"  # Minimum acceptable internal rating
RATING_ORDER = [
    "D",
    "C",
    "CC",
    "CCC-",
    "CCC",
    "CCC+",
    "B-",
    "B",
    "B+",
    "BB-",
    "BB",
    "BB+",
    "BBB-",
    "BBB",
    "BBB+",
    "A-",
    "A",
    "A+",
    "AA-",
    "AA",
    "AA+",
    "AAA",
]

MAX_MATURITY_DAYS = 720  # 24 months max

# Concentration limits (as fraction of PL / NAV)
MAX_CEDENTE_CONCENTRATION = 0.15  # 15% per cedente
MAX_SACADO_CONCENTRATION = 0.10  # 10% per sacado
MAX_SECTOR_CONCENTRATION = 0.25  # 25% per sector

# Covenant thresholds
MIN_LIQUIDITY_RATIO = 1.5
MIN_SUBORDINATION_RATIO = 0.25  # 25%
MAX_DELINQUENCY_RATE = 0.05  # 5%

# Risk thresholds
MAX_EXPECTED_LOSS_RATE = 0.08  # 8% of operation face value
MAX_STRESS_NAV_IMPACT = 0.10  # 10% NAV degradation under stress

# PLD/AML — structuring detection
STRUCTURING_THRESHOLD_BRL = 10_000  # Amounts split below this are suspect
HIGH_VALUE_THRESHOLD_BRL = 50_000  # Operations above this need enhanced DD

# Simplified mock sanctions list (in production: OFAC, TCU, CEIS, Coaf)
_SANCTIONS_LIST: set[str] = {
    "00.000.000/0001-00",  # Placeholder CNPJ
    "111.111.111-11",  # Placeholder CPF
}

_PEP_LIST: set[str] = {
    "JOÃO DA SILVA GOVERNADOR",
    "MARIA SECRETARIA FAZENDA",
}


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


class GateStatus(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    WARNING = "WARNING"
    PENDING = "PENDING"


@dataclass
class GateResult:
    gate: str
    status: GateStatus
    checks: list[dict[str, Any]] = field(default_factory=list)
    score: float = 1.0  # 0.0 (worst) – 1.0 (best)
    details: str = ""
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {
            "gate": self.gate,
            "status": self.status.value,
            "checks": self.checks,
            "score": round(self.score, 4),
            "details": self.details,
            "timestamp": self.timestamp,
        }


@dataclass
class PipelineResult:
    operation_id: str
    overall_status: GateStatus
    gate_results: list[GateResult]
    stopped_at: str | None = None  # Gate name where pipeline stopped on REJECT
    score: float = 1.0
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {
            "operation_id": self.operation_id,
            "overall_status": self.overall_status.value,
            "gate_results": [g.to_dict() for g in self.gate_results],
            "stopped_at": self.stopped_at,
            "score": round(self.score, 4),
            "timestamp": self.timestamp,
        }


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _rating_rank(rating: str) -> int:
    """Return numeric rank for a rating string (higher = better)."""
    try:
        return RATING_ORDER.index(rating.upper())
    except ValueError:
        return -1


# ---------------------------------------------------------------------------
# ComplianceAgent
# ---------------------------------------------------------------------------


class ComplianceAgent:
    """
    6-gate compliance pipeline for FIDC operations.

    Each gate is an independent check. The pipeline runs sequentially and
    halts on the first REJECTED gate.
    """

    def __init__(self):
        self.allowed_types = ALLOWED_RECEIVABLE_TYPES
        self.min_rating = MIN_RATING
        self.max_maturity_days = MAX_MATURITY_DAYS

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
        Dispatch to the correct compliance method.

        Args:
            task: Gate name or 'run_pipeline'.
            context: Operation, portfolio, and fund_state dicts.
            chunks: Optional RAG context.

        Returns:
            Serialisable gate or pipeline result.
        """
        action_map = {
            "check_eligibility": lambda: self.check_eligibility(
                context.get("receivable", context)
            ).to_dict(),
            "check_concentration": lambda: self.check_concentration(
                context.get("portfolio", {}), context.get("new_op", context)
            ).to_dict(),
            "check_covenant": lambda: self.check_covenant(
                context.get("fund_state", context)
            ).to_dict(),
            "check_pld_aml": lambda: self.check_pld_aml(
                context.get("entity", context)
            ).to_dict(),
            "check_compliance": lambda: self.check_compliance(
                context.get("operation", context), context.get("regulatory_context", [])
            ).to_dict(),
            "check_risk": lambda: self.check_risk(
                context.get("operation", context), context.get("portfolio", {})
            ).to_dict(),
            "run_pipeline": lambda: self.run_pipeline(
                context.get("operation", context),
                context.get("portfolio", {}),
                context.get("fund_state", {}),
            ).to_dict(),
        }
        handler = action_map.get(task)
        if handler is None:
            return {"error": f"Unknown action: {task!r}", "available": list(action_map)}
        return handler()

    # ------------------------------------------------------------------
    # Gate 1 — Eligibility
    # ------------------------------------------------------------------

    def check_eligibility(self, receivable: dict[str, Any]) -> GateResult:
        """
        Gate 1: Receivable eligibility.

        Checks:
        - receivable_type is in allowed_types
        - maturity_days <= MAX_MATURITY_DAYS (720)
        - rating >= MIN_RATING ("BB-")
        - face_value > 0

        Args:
            receivable: Dict with type, maturity_days, rating, face_value.

        Returns:
            GateResult.
        """
        checks = []
        failures = 0

        rec_type = receivable.get("type", "")
        maturity_days = int(receivable.get("maturity_days", 0))
        rating = str(receivable.get("rating", "D"))
        face_value = float(receivable.get("face_value", 0.0))

        # Check 1: type
        type_ok = rec_type in self.allowed_types
        checks.append(
            {
                "name": "receivable_type",
                "value": rec_type,
                "expected": f"one of {sorted(self.allowed_types)}",
                "passed": type_ok,
            }
        )
        if not type_ok:
            failures += 1

        # Check 2: maturity
        maturity_ok = maturity_days <= self.max_maturity_days
        checks.append(
            {
                "name": "maturity_days",
                "value": maturity_days,
                "expected": f"<= {self.max_maturity_days}",
                "passed": maturity_ok,
            }
        )
        if not maturity_ok:
            failures += 1

        # Check 3: rating
        rating_ok = _rating_rank(rating) >= _rating_rank(self.min_rating)
        checks.append(
            {
                "name": "credit_rating",
                "value": rating,
                "expected": f">= {self.min_rating}",
                "passed": rating_ok,
            }
        )
        if not rating_ok:
            failures += 1

        # Check 4: positive amount
        amount_ok = face_value > 0
        checks.append(
            {
                "name": "face_value_positive",
                "value": face_value,
                "expected": "> 0",
                "passed": amount_ok,
            }
        )
        if not amount_ok:
            failures += 1

        status = GateStatus.APPROVED if failures == 0 else GateStatus.REJECTED
        score = max(0.0, 1.0 - (failures / 4))

        return GateResult(
            gate="eligibility",
            status=status,
            checks=checks,
            score=score,
            details=f"{4 - failures}/4 checks passed.",
        )

    # ------------------------------------------------------------------
    # Gate 2 — Concentration
    # ------------------------------------------------------------------

    def check_concentration(
        self, portfolio: dict[str, Any], new_op: dict[str, Any]
    ) -> GateResult:
        """
        Gate 2: Concentration limits.

        Checks (all measured as % of portfolio NAV / PL):
        - Cedente exposure <= 15% after new operation
        - Sacado exposure <= 10% after new operation
        - Sector exposure <= 25% after new operation

        Args:
            portfolio: Dict with 'nav' (total), 'by_cedente', 'by_sacado',
                       'by_sector' — each a dict of {name: current_exposure_brl}.
            new_op: Dict with 'cedente', 'sacado', 'sector', 'face_value'.

        Returns:
            GateResult.
        """
        checks = []
        failures = 0
        warnings = 0

        nav = float(portfolio.get("nav", 1.0))
        face_value = float(new_op.get("face_value", 0.0))
        cedente = new_op.get("cedente", "")
        sacado = new_op.get("sacado", "")
        sector = new_op.get("sector", "")

        by_cedente = portfolio.get("by_cedente", {})
        by_sacado = portfolio.get("by_sacado", {})
        by_sector = portfolio.get("by_sector", {})

        # Cedente concentration
        cedente_current = float(by_cedente.get(cedente, 0.0))
        cedente_post = (cedente_current + face_value) / nav if nav > 0 else 1.0
        cedente_ok = cedente_post <= MAX_CEDENTE_CONCENTRATION
        checks.append(
            {
                "name": "cedente_concentration",
                "cedente": cedente,
                "current_brl": cedente_current,
                "new_brl": face_value,
                "post_pct": round(cedente_post * 100, 2),
                "limit_pct": MAX_CEDENTE_CONCENTRATION * 100,
                "passed": cedente_ok,
            }
        )
        if not cedente_ok:
            failures += 1

        # Sacado concentration
        sacado_current = float(by_sacado.get(sacado, 0.0))
        sacado_post = (sacado_current + face_value) / nav if nav > 0 else 1.0
        sacado_ok = sacado_post <= MAX_SACADO_CONCENTRATION
        checks.append(
            {
                "name": "sacado_concentration",
                "sacado": sacado,
                "current_brl": sacado_current,
                "new_brl": face_value,
                "post_pct": round(sacado_post * 100, 2),
                "limit_pct": MAX_SACADO_CONCENTRATION * 100,
                "passed": sacado_ok,
            }
        )
        if not sacado_ok:
            failures += 1

        # Sector concentration
        sector_current = float(by_sector.get(sector, 0.0))
        sector_post = (sector_current + face_value) / nav if nav > 0 else 1.0
        sector_ok = sector_post <= MAX_SECTOR_CONCENTRATION
        checks.append(
            {
                "name": "sector_concentration",
                "sector": sector,
                "current_brl": sector_current,
                "new_brl": face_value,
                "post_pct": round(sector_post * 100, 2),
                "limit_pct": MAX_SECTOR_CONCENTRATION * 100,
                "passed": sector_ok,
            }
        )
        if not sector_ok:
            failures += 1

        # Warning zone: within 80% of any limit
        for chk in checks:
            post = chk["post_pct"] / 100
            lim = chk["limit_pct"] / 100
            if post > 0.80 * lim and chk["passed"]:
                chk["warning"] = (
                    f"Approaching limit ({chk['post_pct']:.1f}% / {chk['limit_pct']:.0f}%)"
                )
                warnings += 1

        if failures > 0:
            status = GateStatus.REJECTED
        elif warnings > 0:
            status = GateStatus.WARNING
        else:
            status = GateStatus.APPROVED

        score = max(0.0, 1.0 - (failures / 3))

        return GateResult(
            gate="concentration",
            status=status,
            checks=checks,
            score=score,
            details=f"{3 - failures}/3 concentration limits respected; {warnings} warning(s).",
        )

    # ------------------------------------------------------------------
    # Gate 3 — Covenant
    # ------------------------------------------------------------------

    def check_covenant(self, fund_state: dict[str, Any]) -> GateResult:
        """
        Gate 3: Fund covenant compliance.

        Checks:
        - Liquidity ratio >= 1.5×  (liquid_assets / short_term_liabilities)
        - Subordination ratio >= 25%
        - Delinquency rate <= 5%

        Args:
            fund_state: Dict with liquid_assets, short_term_liabilities,
                        sub_nav, total_nav, overdue_amount, total_portfolio.

        Returns:
            GateResult.
        """
        checks = []
        failures = 0

        liquid_assets = float(fund_state.get("liquid_assets", 0.0))
        short_term_liab = float(fund_state.get("short_term_liabilities", 1.0))
        sub_nav = float(fund_state.get("sub_nav", 0.0))
        total_nav = float(fund_state.get("total_nav", 1.0))
        overdue_amount = float(fund_state.get("overdue_amount", 0.0))
        total_portfolio = float(fund_state.get("total_portfolio", 1.0))

        # Liquidity
        liquidity_ratio = (
            liquid_assets / short_term_liab if short_term_liab > 0 else 999.0
        )
        liq_ok = liquidity_ratio >= MIN_LIQUIDITY_RATIO
        checks.append(
            {
                "name": "liquidity_ratio",
                "value": round(liquidity_ratio, 4),
                "threshold": MIN_LIQUIDITY_RATIO,
                "passed": liq_ok,
                "liquid_assets": liquid_assets,
                "short_term_liabilities": short_term_liab,
            }
        )
        if not liq_ok:
            failures += 1

        # Subordination
        sub_ratio = sub_nav / total_nav if total_nav > 0 else 0.0
        sub_ok = sub_ratio >= MIN_SUBORDINATION_RATIO
        checks.append(
            {
                "name": "subordination_ratio",
                "value": round(sub_ratio, 4),
                "threshold": MIN_SUBORDINATION_RATIO,
                "passed": sub_ok,
                "sub_nav": sub_nav,
                "total_nav": total_nav,
            }
        )
        if not sub_ok:
            failures += 1

        # Delinquency (inadimplência)
        delinquency_rate = (
            overdue_amount / total_portfolio if total_portfolio > 0 else 0.0
        )
        deliq_ok = delinquency_rate <= MAX_DELINQUENCY_RATE
        checks.append(
            {
                "name": "delinquency_rate",
                "value": round(delinquency_rate, 4),
                "threshold": MAX_DELINQUENCY_RATE,
                "passed": deliq_ok,
                "overdue_amount": overdue_amount,
                "total_portfolio": total_portfolio,
            }
        )
        if not deliq_ok:
            failures += 1

        status = GateStatus.APPROVED if failures == 0 else GateStatus.REJECTED
        score = max(0.0, 1.0 - (failures / 3))

        return GateResult(
            gate="covenant",
            status=status,
            checks=checks,
            score=score,
            details=f"{3 - failures}/3 covenants met.",
        )

    # ------------------------------------------------------------------
    # Gate 4 — PLD/AML
    # ------------------------------------------------------------------

    def check_pld_aml(self, entity: dict[str, Any]) -> GateResult:
        """
        Gate 4: Anti-Money Laundering / Know Your Customer.

        Checks (per BACEN Circular 3978/20):
        - PEP (Politically Exposed Person) status
        - Sanctions list (OFAC, CEIS, TCU, Coaf)
        - Unusual transaction patterns (sudden large amounts vs. history)
        - Structuring detection (multiple sub-threshold operations)

        Args:
            entity: Dict with cnpj, name, pep_names, recent_transactions,
                    current_amount, historical_avg_amount.

        Returns:
            GateResult.
        """
        checks = []
        failures = 0
        warnings = 0

        cnpj = str(entity.get("cnpj", ""))
        name = str(entity.get("name", "")).upper()
        pep_names = [n.upper() for n in entity.get("pep_names", [])]
        recent_transactions = entity.get("recent_transactions", [])
        current_amount = float(entity.get("current_amount", 0.0))
        historical_avg = float(entity.get("historical_avg_amount", 0.0))

        # 1. Sanctions check
        in_sanctions = cnpj in _SANCTIONS_LIST or any(
            name_part in _SANCTIONS_LIST for name_part in [name]
        )
        checks.append(
            {
                "name": "sanctions_list",
                "entity": cnpj or name,
                "passed": not in_sanctions,
                "sources_checked": ["CEIS", "TCU", "Coaf (mock)"],
            }
        )
        if in_sanctions:
            failures += 1

        # 2. PEP check
        pep_hits = [n for n in pep_names if n in _PEP_LIST]
        is_pep = bool(pep_hits)
        checks.append(
            {
                "name": "pep_check",
                "pep_names_screened": pep_names,
                "hits": pep_hits,
                "passed": not is_pep,
                "note": (
                    "PEP requires enhanced due diligence — operation allowed with EDD."
                    if is_pep
                    else ""
                ),
            }
        )
        if is_pep:
            warnings += 1  # PEP ≠ automatic reject; requires EDD

        # 3. Unusual transaction pattern
        if historical_avg > 0 and current_amount > 0:
            ratio = current_amount / historical_avg
            unusual = ratio > 5.0  # Current op is 5× the historical average
            checks.append(
                {
                    "name": "unusual_pattern",
                    "current_amount": current_amount,
                    "historical_avg": historical_avg,
                    "ratio": round(ratio, 2),
                    "threshold": 5.0,
                    "passed": not unusual,
                }
            )
            if unusual:
                warnings += 1
        else:
            checks.append(
                {
                    "name": "unusual_pattern",
                    "passed": True,
                    "note": "Insufficient history.",
                }
            )

        # 4. Structuring detection (smurfing)
        # Flag if multiple recent transactions just below the threshold
        sub_threshold = [
            t
            for t in recent_transactions
            if 0 < float(t.get("amount", 0)) < STRUCTURING_THRESHOLD_BRL
        ]
        structuring_suspected = len(sub_threshold) >= 3
        checks.append(
            {
                "name": "structuring_detection",
                "sub_threshold_transactions": len(sub_threshold),
                "threshold_brl": STRUCTURING_THRESHOLD_BRL,
                "passed": not structuring_suspected,
                "transactions_reviewed": len(recent_transactions),
            }
        )
        if structuring_suspected:
            failures += 1

        if failures > 0:
            status = GateStatus.REJECTED
        elif warnings > 0:
            status = GateStatus.WARNING
        else:
            status = GateStatus.APPROVED

        score = max(0.0, 1.0 - (failures / 4) - (warnings * 0.1))

        return GateResult(
            gate="pld_aml",
            status=status,
            checks=checks,
            score=score,
            details=f"PLD/AML: {failures} failure(s), {warnings} warning(s).",
        )

    # ------------------------------------------------------------------
    # Gate 5 — Regulatory Compliance
    # ------------------------------------------------------------------

    def check_compliance(
        self,
        operation: dict[str, Any],
        regulatory_context: list[dict[str, Any]],
    ) -> GateResult:
        """
        Gate 5: CVM 175 and fund regulation compliance.

        Checks:
        - Operation type is permitted by the fund's regulation
        - Operation does not violate CVM 175 article thresholds
        - Disclosure obligations met (if operation > R$ 1M)
        - Related-party rules (Art. 42 CVM 175)

        Args:
            operation: Dict with amount, type, related_party, fund_regulation_allows.
            regulatory_context: List of regulatory rule dicts from vector search.

        Returns:
            GateResult.
        """
        checks = []
        failures = 0
        warnings = 0

        amount = float(operation.get("amount", 0.0))
        op_type = operation.get("type", "")
        related_party = bool(operation.get("related_party", False))
        fund_allows = operation.get("fund_regulation_allows", True)
        disclosure_done = operation.get("disclosure_done", True)

        # 1. Fund regulation allows this type
        checks.append(
            {
                "name": "fund_regulation_allows",
                "type": op_type,
                "allowed": fund_allows,
                "passed": bool(fund_allows),
            }
        )
        if not fund_allows:
            failures += 1

        # 2. CVM 175 — large operation disclosure
        requires_disclosure = amount >= 1_000_000
        disclosure_ok = not requires_disclosure or disclosure_done
        checks.append(
            {
                "name": "cvm175_disclosure",
                "amount": amount,
                "requires_disclosure": requires_disclosure,
                "disclosure_done": disclosure_done,
                "passed": disclosure_ok,
            }
        )
        if not disclosure_ok:
            warnings += 1

        # 3. Related-party restriction (Art. 42 CVM 175)
        # Related-party ops require 100% quota-holder approval
        related_party_cleared = operation.get(
            "related_party_approval", not related_party
        )
        checks.append(
            {
                "name": "related_party_check",
                "is_related_party": related_party,
                "approval_obtained": related_party_cleared,
                "passed": related_party_cleared,
                "rule": "CVM 175, Art. 42 — relacionadas requerem aprovação unânime.",
            }
        )
        if not related_party_cleared:
            failures += 1

        # 4. Regulatory context rules (from RAG)
        rag_violations = 0
        for rule in regulatory_context[:5]:  # Cap to 5 for performance
            rule_name = rule.get("name", "unknown")
            rule_passed = rule.get("compliant", True)
            checks.append({"name": f"rag_rule_{rule_name}", "passed": rule_passed})
            if not rule_passed:
                rag_violations += 1
                warnings += 1

        if failures > 0:
            status = GateStatus.REJECTED
        elif warnings > 0:
            status = GateStatus.WARNING
        else:
            status = GateStatus.APPROVED

        score = max(0.0, 1.0 - (failures / 3) - (warnings * 0.05))

        return GateResult(
            gate="compliance",
            status=status,
            checks=checks,
            score=score,
            details=f"Compliance: {failures} failure(s), {warnings} warning(s). RAG violations: {rag_violations}.",
        )

    # ------------------------------------------------------------------
    # Gate 6 — Risk
    # ------------------------------------------------------------------

    def check_risk(
        self,
        operation: dict[str, Any],
        portfolio: dict[str, Any],
    ) -> GateResult:
        """
        Gate 6: Credit and concentration risk assessment.

        Checks:
        - Expected loss rate <= 8% of face value
        - Post-addition concentration risk score
        - Stress test impact on NAV <= 10%

        Expected Loss = PD × LGD × EAD
            PD  = probability of default (from rating)
            LGD = loss given default (sector-based)
            EAD = exposure at default (face_value)

        Args:
            operation: Dict with face_value, rating, sector, pd_override, lgd_override.
            portfolio: Dict with nav, total_receivables, sector_concentrations.

        Returns:
            GateResult.
        """
        checks = []
        failures = 0
        warnings = 0

        face_value = float(operation.get("face_value", 0.0))
        rating = str(operation.get("rating", "B"))
        sector = str(operation.get("sector", "geral"))
        nav = float(portfolio.get("nav", 1.0))
        total_receivables = float(portfolio.get("total_receivables", 0.0))

        # PD by rating (annualised, simplified BACEN curves)
        PD_BY_RATING: dict[str, float] = {
            "AAA": 0.0001,
            "AA+": 0.0002,
            "AA": 0.0003,
            "AA-": 0.0005,
            "A+": 0.0008,
            "A": 0.001,
            "A-": 0.0015,
            "BBB+": 0.003,
            "BBB": 0.005,
            "BBB-": 0.008,
            "BB+": 0.015,
            "BB": 0.025,
            "BB-": 0.04,
            "B+": 0.07,
            "B": 0.10,
            "B-": 0.15,
            "CCC+": 0.25,
            "CCC": 0.35,
            "CCC-": 0.50,
            "CC": 0.70,
            "C": 0.85,
            "D": 1.00,
        }
        # LGD by sector (simplified)
        LGD_BY_SECTOR: dict[str, float] = {
            "agronegócio": 0.35,
            "varejo": 0.55,
            "saúde": 0.40,
            "educação": 0.45,
            "construção": 0.50,
            "tecnologia": 0.45,
            "energia": 0.35,
            "financeiro": 0.30,
            "geral": 0.50,
        }

        pd = float(operation.get("pd_override", PD_BY_RATING.get(rating.upper(), 0.10)))
        lgd = float(
            operation.get("lgd_override", LGD_BY_SECTOR.get(sector.lower(), 0.50))
        )
        ead = face_value

        expected_loss = pd * lgd * ead
        expected_loss_rate = expected_loss / face_value if face_value > 0 else 0.0

        el_ok = expected_loss_rate <= MAX_EXPECTED_LOSS_RATE
        checks.append(
            {
                "name": "expected_loss",
                "pd": round(pd, 4),
                "lgd": round(lgd, 4),
                "ead": ead,
                "expected_loss_brl": round(expected_loss, 2),
                "expected_loss_rate": round(expected_loss_rate, 4),
                "limit": MAX_EXPECTED_LOSS_RATE,
                "passed": el_ok,
            }
        )
        if not el_ok:
            failures += 1

        # Concentration risk score (Herfindahl-Hirschman index proxy)
        sector_concentrations = portfolio.get("sector_concentrations", {})
        sector_conc = float(sector_concentrations.get(sector, 0.0))
        new_sector_conc = (
            (sector_conc + face_value) / (total_receivables + face_value)
            if (total_receivables + face_value) > 0
            else 0
        )
        hhi_contribution = new_sector_conc**2
        hhi_ok = new_sector_conc <= MAX_SECTOR_CONCENTRATION
        checks.append(
            {
                "name": "concentration_risk",
                "sector": sector,
                "post_concentration": round(new_sector_conc, 4),
                "hhi_contribution": round(hhi_contribution, 6),
                "limit": MAX_SECTOR_CONCENTRATION,
                "passed": hhi_ok,
            }
        )
        if not hhi_ok:
            warnings += 1

        # Stress impact: worst-case = 3× PD, with 90% LGD
        stress_loss = min(pd * 3, 1.0) * 0.90 * ead
        stress_nav_impact = stress_loss / nav if nav > 0 else 0.0
        stress_ok = stress_nav_impact <= MAX_STRESS_NAV_IMPACT
        checks.append(
            {
                "name": "stress_nav_impact",
                "stress_loss_brl": round(stress_loss, 2),
                "nav_impact_pct": round(stress_nav_impact * 100, 2),
                "limit_pct": MAX_STRESS_NAV_IMPACT * 100,
                "passed": stress_ok,
            }
        )
        if not stress_ok:
            warnings += 1

        if failures > 0:
            status = GateStatus.REJECTED
        elif warnings > 0:
            status = GateStatus.WARNING
        else:
            status = GateStatus.APPROVED

        score = max(
            0.0, 1.0 - expected_loss_rate - (failures * 0.3) - (warnings * 0.05)
        )

        return GateResult(
            gate="risk",
            status=status,
            checks=checks,
            score=score,
            details=f"Expected loss: {expected_loss_rate * 100:.2f}%. Stress NAV impact: {stress_nav_impact * 100:.2f}%.",
        )

    # ------------------------------------------------------------------
    # Full pipeline
    # ------------------------------------------------------------------

    def run_pipeline(
        self,
        operation: dict[str, Any],
        portfolio: dict[str, Any],
        fund_state: dict[str, Any],
    ) -> PipelineResult:
        """
        Run all 6 compliance gates sequentially.

        Stops immediately on first REJECTED gate (fail-fast).

        Args:
            operation: Dict describing the operation (receivable purchase, etc.).
            portfolio: Current portfolio state.
            fund_state: Current fund-level state (covenants, liquidity, etc.).

        Returns:
            PipelineResult with all gate results and overall status.
        """
        operation_id = operation.get(
            "id", hashlib.md5(str(operation).encode()).hexdigest()[:8]
        )

        gate_funcs = [
            ("eligibility", lambda: self.check_eligibility(operation)),
            ("concentration", lambda: self.check_concentration(portfolio, operation)),
            ("covenant", lambda: self.check_covenant(fund_state)),
            ("pld_aml", lambda: self.check_pld_aml(operation.get("entity", operation))),
            (
                "compliance",
                lambda: self.check_compliance(
                    operation, operation.get("regulatory_context", [])
                ),
            ),
            ("risk", lambda: self.check_risk(operation, portfolio)),
        ]

        gate_results: list[GateResult] = []
        stopped_at: str | None = None
        overall_status = GateStatus.APPROVED
        cumulative_score = 1.0

        for gate_name, gate_fn in gate_funcs:
            result = gate_fn()
            gate_results.append(result)
            cumulative_score *= result.score

            if result.status == GateStatus.REJECTED:
                overall_status = GateStatus.REJECTED
                stopped_at = gate_name
                break
            elif (
                result.status == GateStatus.WARNING
                and overall_status == GateStatus.APPROVED
            ):
                overall_status = GateStatus.WARNING

        return PipelineResult(
            operation_id=operation_id,
            overall_status=overall_status,
            gate_results=gate_results,
            stopped_at=stopped_at,
            score=round(cumulative_score, 4),
        )


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

DEMO_OPERATION = {
    "id": "op_demo_001",
    "type": "duplicata_mercantil",
    "face_value": 500_000.00,
    "maturity_days": 90,
    "rating": "BB",
    "cedente": "Empresa Alpha Ltda",
    "sacado": "Varejão Nacional S.A.",
    "sector": "varejo",
    "cnpj": "12.345.678/0001-99",
    "name": "EMPRESA ALPHA LTDA",
    "pep_names": [],
    "recent_transactions": [],
    "current_amount": 500_000.00,
    "historical_avg_amount": 300_000.00,
    "related_party": False,
    "fund_regulation_allows": True,
    "disclosure_done": True,
    "related_party_approval": True,
    "regulatory_context": [],
    "entity": {
        "cnpj": "12.345.678/0001-99",
        "name": "EMPRESA ALPHA LTDA",
        "pep_names": [],
        "recent_transactions": [],
        "current_amount": 500_000.00,
        "historical_avg_amount": 300_000.00,
    },
}

DEMO_PORTFOLIO = {
    "nav": 96_000_000.0,
    "total_receivables": 90_000_000.0,
    "by_cedente": {"Empresa Alpha Ltda": 8_000_000.0},
    "by_sacado": {"Varejão Nacional S.A.": 6_000_000.0},
    "by_sector": {"varejo": 18_000_000.0},
    "sector_concentrations": {"varejo": 18_000_000.0},
}

DEMO_FUND_STATE = {
    "liquid_assets": 9_000_000.0,
    "short_term_liabilities": 4_000_000.0,
    "sub_nav": 24_000_000.0,
    "total_nav": 96_000_000.0,
    "overdue_amount": 2_500_000.0,
    "total_portfolio": 90_000_000.0,
}

if __name__ == "__main__":
    agent = ComplianceAgent()
    result = agent.run_pipeline(DEMO_OPERATION, DEMO_PORTFOLIO, DEMO_FUND_STATE)
    import json

    print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))
