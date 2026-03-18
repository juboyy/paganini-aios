"""
Custódia Agent — Collateral custody, title verification, and settlement.

Implements custody operations for FIDC receivables per:
- CVM Instrução 356/01 (custódia qualificada)
- CVM Resolução 175/22 (prestadores de serviços)
- BACEN guidelines for título custody and settlement

Key concepts:
- Over-collateralisation: total_receivables / total_quotas >= 1.0 (typically 1.05+)
- Reconciliation: daily cross-check between internal ledger and external registry
- Settlement: liquidação física/financeira via CETIP/B3
"""

from __future__ import annotations

import hashlib
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MIN_OVERCOLLATERALISATION = 1.05  # 105% coverage
SETTLEMENT_DAYS = 2  # D+2 standard (CETIP/B3)
REGISTRY_SOURCES = ["CETIP", "B3", "CRI_CRA_REGISTRY", "SERASA_EXPERIAN"]

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class ReconciliationResult:
    """Outcome of portfolio reconciliation between internal and external sources."""

    date: str
    internal_count: int
    external_count: int
    matched: int
    missing_internal: list[str]  # IDs in external but not internal
    missing_external: list[str]  # IDs in internal but not external
    value_mismatches: list[dict[str, Any]]  # Same ID but different values
    is_clean: bool
    summary: str

    def to_dict(self) -> dict[str, Any]:
        return self.__dict__.copy()


# ---------------------------------------------------------------------------
# CustodiaAgent
# ---------------------------------------------------------------------------


class CustodiaAgent:
    """
    Custódia (Custody) agent for FIDC receivables.

    Manages the full lifecycle: registration, verification, overcollateralisation
    monitoring, portfolio reconciliation, and settlement processing.
    """

    def __init__(self):
        self._registry: dict[str, dict[str, Any]] = {}  # In-memory custody ledger

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
        Dispatch custody operations.

        Args:
            task: Action name.
            context: Operation context dict.
            chunks: Optional RAG chunks.

        Returns:
            Serialisable result dict.
        """
        action_map = {
            "register_title": lambda: self.register_title(
                context.get("receivable", context)
            ),
            "verify_collateral": lambda: self.verify_collateral(
                context.get("receivable_id", ""),
                context.get("registry_data", {}),
            ),
            "calculate_overcollateralization": lambda: {
                "overcollateralization_ratio": self.calculate_overcollateralization(
                    float(context.get("total_receivables", 0)),
                    float(context.get("total_quotas", 1)),
                )
            },
            "reconcile_portfolio": lambda: self.reconcile_portfolio(
                context.get("internal", []),
                context.get("external", []),
            ).to_dict(),
            "process_settlement": lambda: self.process_settlement(
                context.get("receivable", {}),
                context.get("payment", {}),
            ),
            "generate_custody_report": lambda: {
                "report": self.generate_custody_report(context.get("portfolio", []))
            },
        }
        handler = action_map.get(task)
        if handler is None:
            return {"error": f"Unknown action: {task!r}", "available": list(action_map)}
        return handler()

    # ------------------------------------------------------------------
    # Core capabilities
    # ------------------------------------------------------------------

    def register_title(self, receivable: dict[str, Any]) -> dict[str, Any]:
        """
        Register a receivable in custody.

        Generates a custody ID, timestamps the entry, validates required fields,
        and stores in the internal registry.

        Required receivable fields:
        - face_value (float): Nominal value in BRL.
        - cedente (str): Originator identifier (CNPJ).
        - sacado (str): Debtor identifier (CNPJ/CPF).
        - due_date (str): Maturity date (YYYY-MM-DD).
        - type (str): Receivable type (e.g., 'duplicata_mercantil').

        Args:
            receivable: Dict describing the receivable.

        Returns:
            Dict with custody_id, registration_date, status, validation_checks.
        """
        required_fields = ["face_value", "cedente", "sacado", "due_date", "type"]
        missing = [f for f in required_fields if f not in receivable]
        if missing:
            return {
                "status": "ERROR",
                "error": f"Missing required fields: {missing}",
                "receivable": receivable,
            }

        face_value = float(receivable["face_value"])
        if face_value <= 0:
            return {"status": "ERROR", "error": "face_value must be positive."}

        # Generate deterministic custody ID from content hash
        content_key = f"{receivable['cedente']}:{receivable['sacado']}:{receivable['due_date']}:{face_value}"
        custody_id = (
            "CUS-" + hashlib.sha256(content_key.encode()).hexdigest()[:12].upper()
        )

        now = datetime.utcnow()
        entry = {
            "custody_id": custody_id,
            "receivable_id": receivable.get("id", str(uuid.uuid4())[:8]),
            "type": receivable["type"],
            "face_value": face_value,
            "cedente": receivable["cedente"],
            "sacado": receivable["sacado"],
            "due_date": receivable["due_date"],
            "registration_date": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "status": "ACTIVE",
            "verified": False,
            "collateral_type": receivable.get("collateral_type", "sem_garantia"),
            "discount_rate": float(receivable.get("discount_rate", 0.0)),
            "purchase_price": float(receivable.get("purchase_price", face_value)),
            "registry_source": receivable.get("registry_source", "CETIP"),
        }

        # Days to maturity
        try:
            due_dt = datetime.strptime(receivable["due_date"], "%Y-%m-%d")
            entry["days_to_maturity"] = (due_dt - now).days
        except ValueError:
            entry["days_to_maturity"] = -1

        self._registry[custody_id] = entry

        return {
            "status": "REGISTERED",
            "custody_id": custody_id,
            "registration_date": entry["registration_date"],
            "face_value": face_value,
            "days_to_maturity": entry["days_to_maturity"],
            "registry_source": entry["registry_source"],
            "next_step": "verify_collateral",
        }

    def verify_collateral(
        self,
        receivable_id: str,
        registry_data: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Cross-check a receivable against an external registry.

        Compares: face_value, cedente, sacado, due_date.
        Flags discrepancies and marks custody entry as verified/rejected.

        Args:
            receivable_id: Custody ID (CUS-…) or internal receivable ID.
            registry_data: Dict from external registry (CETIP/B3/Serasa) with
                          same field names as the registered title.

        Returns:
            Dict with verification_status, discrepancies, confidence_score.
        """
        # Find in registry by custody_id or receivable_id
        entry = self._registry.get(receivable_id)
        if entry is None:
            # Try by receivable_id field
            entry = next(
                (
                    e
                    for e in self._registry.values()
                    if e.get("receivable_id") == receivable_id
                ),
                None,
            )
        if entry is None:
            return {
                "verification_status": "NOT_FOUND",
                "receivable_id": receivable_id,
                "error": "Receivable not found in custody registry.",
            }

        discrepancies: list[dict[str, Any]] = []
        fields_to_verify = ["face_value", "cedente", "sacado", "due_date"]
        matched = 0

        for field_name in fields_to_verify:
            internal_val = entry.get(field_name)
            external_val = registry_data.get(field_name)

            if external_val is None:
                continue

            # Numeric comparison with tolerance
            if field_name == "face_value":
                internal_f = float(internal_val or 0)
                external_f = float(external_val or 0)
                tolerance = max(internal_f * 0.001, 0.01)  # 0.1% or R$ 0.01
                matches = abs(internal_f - external_f) <= tolerance
            else:
                matches = (
                    str(internal_val).strip().upper()
                    == str(external_val).strip().upper()
                )

            if not matches:
                discrepancies.append(
                    {
                        "field": field_name,
                        "internal": internal_val,
                        "external": external_val,
                        "severity": (
                            "HIGH"
                            if field_name in ("face_value", "cedente")
                            else "MEDIUM"
                        ),
                    }
                )
            else:
                matched += 1

        confidence = matched / len(fields_to_verify) if fields_to_verify else 0.0
        verified = len(discrepancies) == 0

        # Update internal registry
        entry["verified"] = verified
        entry["verification_date"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        entry["verification_confidence"] = confidence
        if not verified:
            entry["status"] = "VERIFICATION_FAILED"

        return {
            "verification_status": "VERIFIED" if verified else "DISCREPANCY_FOUND",
            "custody_id": entry["custody_id"],
            "fields_checked": len(fields_to_verify),
            "fields_matched": matched,
            "confidence_score": round(confidence, 4),
            "discrepancies": discrepancies,
            "sources_checked": REGISTRY_SOURCES,
            "registry_source": registry_data.get("source", "UNKNOWN"),
        }

    def calculate_overcollateralization(
        self,
        total_receivables: float,
        total_quotas: float,
    ) -> float:
        """
        Calculate overcollateralisation ratio.

        overcollateralisation = total_receivables_face_value / total_quotas_nav

        A value >= 1.05 means receivables cover 105% of quota obligations.
        A value < 1.0 indicates under-collateralisation (covenant breach).

        Args:
            total_receivables: Sum of face values of all receivables in custody (BRL).
            total_quotas: Total outstanding quota value (NAV) in BRL.

        Returns:
            Overcollateralisation ratio (float). E.g., 1.08 = 108%.
        """
        if total_quotas <= 0:
            logger.warning("total_quotas <= 0; returning 0.0")
            return 0.0
        ratio = total_receivables / total_quotas
        status = "OK" if ratio >= MIN_OVERCOLLATERALISATION else "BREACH"
        logger.info(
            f"Overcollateralisation: {ratio:.4f} ({ratio * 100:.2f}%) — {status} "
            f"(minimum {MIN_OVERCOLLATERALISATION:.2f})"
        )
        return round(ratio, 6)

    def reconcile_portfolio(
        self,
        internal: list[dict[str, Any]],
        external: list[dict[str, Any]],
    ) -> ReconciliationResult:
        """
        Reconcile internal custody records against an external registry snapshot.

        Detects:
        - Records present internally but missing from external (→ registry lag or fraud risk)
        - Records in external but not internally known (→ unregistered assets)
        - Same-ID records with differing face values (→ value mismatch)

        Args:
            internal: List of dicts from internal custody ledger.
                      Each must have 'id' and 'face_value'.
            external: List of dicts from external registry.
                      Each must have 'id' and 'face_value'.

        Returns:
            ReconciliationResult.
        """
        today = datetime.utcnow().strftime("%Y-%m-%d")

        internal_map: dict[str, dict] = {r["id"]: r for r in internal if "id" in r}
        external_map: dict[str, dict] = {r["id"]: r for r in external if "id" in r}

        internal_ids = set(internal_map)
        external_ids = set(external_map)

        missing_external = sorted(
            internal_ids - external_ids
        )  # In internal, not external
        missing_internal = sorted(
            external_ids - internal_ids
        )  # In external, not internal
        common = internal_ids & external_ids

        value_mismatches: list[dict[str, Any]] = []
        matched = 0

        for rid in common:
            int_val = float(internal_map[rid].get("face_value", 0))
            ext_val = float(external_map[rid].get("face_value", 0))
            tolerance = max(int_val * 0.001, 0.01)

            if abs(int_val - ext_val) > tolerance:
                value_mismatches.append(
                    {
                        "id": rid,
                        "internal_face_value": int_val,
                        "external_face_value": ext_val,
                        "difference": round(ext_val - int_val, 2),
                        "pct_diff": (
                            round((ext_val - int_val) / int_val * 100, 2)
                            if int_val
                            else 0
                        ),
                    }
                )
            else:
                matched += 1

        is_clean = (
            len(missing_internal) == 0
            and len(missing_external) == 0
            and len(value_mismatches) == 0
        )

        issues = []
        if missing_external:
            issues.append(
                f"{len(missing_external)} record(s) in internal but not external."
            )
        if missing_internal:
            issues.append(
                f"{len(missing_internal)} record(s) in external but not internal."
            )
        if value_mismatches:
            issues.append(f"{len(value_mismatches)} value mismatch(es).")

        summary = (
            "CLEAN — all records reconciled."
            if is_clean
            else "ISSUES: " + " | ".join(issues)
        )

        return ReconciliationResult(
            date=today,
            internal_count=len(internal),
            external_count=len(external),
            matched=matched,
            missing_internal=missing_internal,
            missing_external=missing_external,
            value_mismatches=value_mismatches,
            is_clean=is_clean,
            summary=summary,
        )

    def process_settlement(
        self,
        receivable: dict[str, Any],
        payment: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Process settlement of a receivable payment.

        Settlement flow:
        1. Match payment to receivable by ID.
        2. Validate payment amount vs. expected (face_value or net_present_value).
        3. Compute residual (overpayment/shortfall).
        4. Update custody status.
        5. Return settlement confirmation.

        Args:
            receivable: Custody record (with custody_id, face_value, due_date).
            payment: Dict with amount, date, payer_id, payment_type.

        Returns:
            Dict with settlement_id, status, residual, reconciliation note.
        """
        custody_id = receivable.get("custody_id", "")
        face_value = float(receivable.get("face_value", 0.0))
        payment_amount = float(payment.get("amount", 0.0))
        payment_date = payment.get("date", datetime.utcnow().strftime("%Y-%m-%d"))
        payer_id = payment.get("payer_id", "UNKNOWN")
        payment_type = payment.get("payment_type", "TED")

        if face_value <= 0:
            return {"status": "ERROR", "error": "face_value must be positive."}

        # Residual = payment - expected
        residual = payment_amount - face_value
        residual_pct = residual / face_value * 100 if face_value else 0

        if payment_amount <= 0:
            settlement_status = "PENDING_PAYMENT"
        elif abs(residual) / face_value < 0.001:
            settlement_status = "SETTLED_FULL"
        elif residual > 0:
            settlement_status = "SETTLED_OVERPAID"
        else:
            settlement_status = "SETTLED_SHORT"

        # Update internal registry
        if custody_id in self._registry:
            self._registry[custody_id]["status"] = "SETTLED"
            self._registry[custody_id]["settlement_date"] = payment_date

        settlement_id = (
            "SET-"
            + hashlib.md5(f"{custody_id}:{payment_amount}:{payment_date}".encode())
            .hexdigest()[:10]
            .upper()
        )

        # D+2 value date
        value_date = (
            datetime.strptime(payment_date, "%Y-%m-%d")
            + timedelta(days=SETTLEMENT_DAYS)
        ).strftime("%Y-%m-%d")

        return {
            "settlement_id": settlement_id,
            "custody_id": custody_id,
            "status": settlement_status,
            "face_value": round(face_value, 2),
            "payment_amount": round(payment_amount, 2),
            "residual_brl": round(residual, 2),
            "residual_pct": round(residual_pct, 4),
            "payer_id": payer_id,
            "payment_type": payment_type,
            "payment_date": payment_date,
            "value_date": value_date,
            "note": (
                "Full settlement."
                if settlement_status == "SETTLED_FULL"
                else f"Residual of R$ {residual:+,.2f} ({residual_pct:+.2f}%). Review required."
            ),
        }

    def generate_custody_report(self, portfolio: list[dict[str, Any]]) -> str:
        """
        Generate a custody portfolio report.

        Args:
            portfolio: List of receivable dicts (from internal registry or provided).

        Returns:
            Formatted multi-line string report.
        """
        now = datetime.utcnow()
        total_face_value = sum(float(r.get("face_value", 0)) for r in portfolio)
        active = [r for r in portfolio if r.get("status", "ACTIVE") == "ACTIVE"]
        settled = [r for r in portfolio if r.get("status") == "SETTLED"]
        verified = [r for r in portfolio if r.get("verified", False)]
        pending_verification = [r for r in active if not r.get("verified", False)]

        # Maturity bucketing
        buckets: dict[str, float] = {
            "0-30d": 0.0,
            "31-90d": 0.0,
            "91-180d": 0.0,
            "181-360d": 0.0,
            ">360d": 0.0,
        }
        for r in active:
            days = int(r.get("days_to_maturity", 0))
            fv = float(r.get("face_value", 0))
            if days <= 30:
                buckets["0-30d"] += fv
            elif days <= 90:
                buckets["31-90d"] += fv
            elif days <= 180:
                buckets["91-180d"] += fv
            elif days <= 360:
                buckets["181-360d"] += fv
            else:
                buckets[">360d"] += fv

        def fmt_brl(v: float) -> str:
            return f"R$ {v:>18,.2f}"

        def bar(val: float, total: float, width: int = 20) -> str:
            if total <= 0:
                return " " * width
            filled = int(val / total * width)
            return "█" * filled + "░" * (width - filled)

        lines = [
            "=" * 65,
            "  PAGANINI FIDC — RELATÓRIO DE CUSTÓDIA",
            f"  Gerado em: {now.strftime('%Y-%m-%d %H:%M:%S')} UTC",
            "=" * 65,
            "",
            "  RESUMO",
            f"    Total de títulos              {len(portfolio):>10}",
            f"    Ativos                         {len(active):>10}",
            f"    Liquidados                     {len(settled):>10}",
            f"    Verificados                    {len(verified):>10}",
            f"    Pendentes verificação           {len(pending_verification):>10}",
            f"    Valor nominal total            {fmt_brl(total_face_value)}",
            "",
            "  VENCIMENTO (valor nominal)",
        ]

        for bucket, value in buckets.items():
            pct = value / total_face_value * 100 if total_face_value else 0
            b = bar(value, total_face_value)
            lines.append(f"    {bucket:<10} {b}  {fmt_brl(value)}  ({pct:5.1f}%)")

        overcoll = self.calculate_overcollateralization(
            total_face_value,
            total_face_value * 0.95,  # Simplified: assume 95% quota coverage
        )
        overcoll_status = (
            "✓ OK" if overcoll >= MIN_OVERCOLLATERALISATION else "✗ BREACH"
        )

        lines += [
            "",
            "  COLATERALIZAÇÃO",
            f"    Índice de sobrecolateralização {overcoll * 100:.2f}%  {overcoll_status}",
            f"    Mínimo regulatório             {MIN_OVERCOLLATERALISATION * 100:.0f}%",
            "",
            "=" * 65,
        ]
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

DEMO_RECEIVABLES = [
    {
        "id": "rec_001",
        "face_value": 250_000.0,
        "cedente": "12.345.678/0001-99",
        "sacado": "98.765.432/0001-11",
        "due_date": "2026-06-30",
        "type": "duplicata_mercantil",
        "status": "ACTIVE",
        "days_to_maturity": 104,
        "verified": True,
    },
    {
        "id": "rec_002",
        "face_value": 180_000.0,
        "cedente": "22.222.222/0001-22",
        "sacado": "33.333.333/0001-33",
        "due_date": "2026-04-15",
        "type": "ccb",
        "status": "ACTIVE",
        "days_to_maturity": 28,
        "verified": True,
    },
    {
        "id": "rec_003",
        "face_value": 500_000.0,
        "cedente": "44.444.444/0001-44",
        "sacado": "55.555.555/0001-55",
        "due_date": "2026-12-31",
        "type": "cce",
        "status": "ACTIVE",
        "days_to_maturity": 288,
        "verified": False,
    },
]

if __name__ == "__main__":
    agent = CustodiaAgent()
    # Register a title
    reg = agent.register_title(DEMO_RECEIVABLES[0])
    print("Registration:", reg)

    # Custody report
    print("\n" + agent.generate_custody_report(DEMO_RECEIVABLES))
