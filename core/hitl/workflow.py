"""Paganini AIOS — Human-in-the-Loop Workflow Engine.

Manages the full approval lifecycle for regulated FIDC operations:
- Cessão de recebíveis       → HIGH risk, requires admin + operator
- Relatório regulatório      → HIGH risk, requires admin
- Comunicação a cotistas     → MEDIUM risk, requires admin + operator
- Mudança de parâmetro       → MEDIUM risk, requires admin
- Query normal               → LOW risk, auto-approved

Persistence:
    runtime/hitl/pending.json   — active approvals (mutable state)
    runtime/hitl/history.jsonl  — append-only audit log

Thread-safe via threading.Lock.
"""

from __future__ import annotations

import json
import logging
import threading
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Optional

log = logging.getLogger("paganini.hitl")


# ── Enums ──────────────────────────────────────────────────────────────────────


class RiskLevel(str, Enum):
    """Risk classification for HITL operations."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class OperationType(str, Enum):
    """Regulated FIDC operation types."""
    CESSAO = "cessao"                          # Cessão de recebíveis
    RELATORIO_REGULATORIO = "relatorio_regulatorio"
    COMUNICACAO_COTISTA = "comunicacao_cotista"
    MUDANCA_PARAMETRO = "mudanca_parametro"
    QUERY_NORMAL = "query_normal"


# ── Operation Policy ───────────────────────────────────────────────────────────

OPERATION_POLICY: dict[str, dict] = {
    OperationType.CESSAO: {
        "risk_level": RiskLevel.HIGH,
        "approvers": ["admin", "operator"],
        "description": "Cessão de Recebíveis",
        "auto_approve": False,
    },
    OperationType.RELATORIO_REGULATORIO: {
        "risk_level": RiskLevel.HIGH,
        "approvers": ["admin"],
        "description": "Relatório Regulatório",
        "auto_approve": False,
    },
    OperationType.COMUNICACAO_COTISTA: {
        "risk_level": RiskLevel.MEDIUM,
        "approvers": ["admin", "operator"],
        "description": "Comunicação a Cotistas",
        "auto_approve": False,
    },
    OperationType.MUDANCA_PARAMETRO: {
        "risk_level": RiskLevel.MEDIUM,
        "approvers": ["admin"],
        "description": "Mudança de Parâmetro",
        "auto_approve": False,
    },
    OperationType.QUERY_NORMAL: {
        "risk_level": RiskLevel.LOW,
        "approvers": [],
        "description": "Query Normal",
        "auto_approve": True,
    },
}


# ── Dataclasses ────────────────────────────────────────────────────────────────


@dataclass
class ApprovalRequest:
    """A pending HITL approval request.

    Attributes:
        approval_id:   Unique ID (UUID4 string)
        operation_type: One of OperationType values
        description:   Human-readable description of the operation
        agent_id:      ID of the requesting agent
        fund_id:       Fund this operation applies to (None = global)
        risk_level:    RiskLevel classification
        data:          Arbitrary payload (operation details)
        requester:     User or system requesting the approval
        created_at:    Unix timestamp of creation
        escalated_at:  Unix timestamp when escalated (None if not yet)
        timeout_hours: Auto-reject after this many hours (default 24)
        escalation_hours: Escalate to next approver after this many hours (default 4)
        status:        "pending" | "approved" | "rejected" | "timed_out"
        approvers:     List of approver roles required
    """

    operation_type: str
    description: str
    agent_id: str
    requester: str
    approval_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    fund_id: Optional[str] = None
    risk_level: str = RiskLevel.MEDIUM
    data: dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    escalated_at: Optional[float] = None
    timeout_hours: float = 24.0
    escalation_hours: float = 4.0
    status: str = "pending"
    approvers: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "approval_id": self.approval_id,
            "operation_type": self.operation_type,
            "description": self.description,
            "agent_id": self.agent_id,
            "fund_id": self.fund_id,
            "risk_level": self.risk_level,
            "data": self.data,
            "requester": self.requester,
            "created_at": self.created_at,
            "escalated_at": self.escalated_at,
            "timeout_hours": self.timeout_hours,
            "escalation_hours": self.escalation_hours,
            "status": self.status,
            "approvers": self.approvers,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "ApprovalRequest":
        return cls(
            approval_id=d["approval_id"],
            operation_type=d["operation_type"],
            description=d["description"],
            agent_id=d["agent_id"],
            fund_id=d.get("fund_id"),
            risk_level=d.get("risk_level", RiskLevel.MEDIUM),
            data=d.get("data", {}),
            requester=d.get("requester", ""),
            created_at=d.get("created_at", time.time()),
            escalated_at=d.get("escalated_at"),
            timeout_hours=d.get("timeout_hours", 24.0),
            escalation_hours=d.get("escalation_hours", 4.0),
            status=d.get("status", "pending"),
            approvers=d.get("approvers", []),
        )

    def is_timed_out(self) -> bool:
        """True if the approval window has expired."""
        age_hours = (time.time() - self.created_at) / 3600
        return age_hours >= self.timeout_hours

    def needs_escalation(self) -> bool:
        """True if unresolved past the escalation threshold and not yet escalated."""
        if self.escalated_at is not None:
            return False
        age_hours = (time.time() - self.created_at) / 3600
        return age_hours >= self.escalation_hours


@dataclass
class ApprovalResult:
    """Outcome of a HITL approval decision.

    Attributes:
        approval_id: References the ApprovalRequest
        approved:    True if approved, False if rejected
        approver_id: Identity of the approver (user_id or role string)
        timestamp:   Unix timestamp of the decision
        comments:    Optional free-text reason/comments
        operation_type: Copied from the request for convenience
        fund_id:     Copied from the request
    """

    approval_id: str
    approved: bool
    approver_id: str
    timestamp: float = field(default_factory=time.time)
    comments: str = ""
    operation_type: str = ""
    fund_id: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "approval_id": self.approval_id,
            "approved": self.approved,
            "approver_id": self.approver_id,
            "timestamp": self.timestamp,
            "comments": self.comments,
            "operation_type": self.operation_type,
            "fund_id": self.fund_id,
        }


# ── HITL Workflow ──────────────────────────────────────────────────────────────


class HITLWorkflow:
    """Thread-safe HITL approval workflow manager.

    Usage:
        wf = HITLWorkflow()
        aid = wf.request_approval(ApprovalRequest(
            operation_type=OperationType.CESSAO,
            description="Cessão XYZ",
            agent_id="gestor",
            requester="user:42",
            fund_id="alpha",
        ))
        result = wf.process_approval(aid, approved=True, approver_id="admin:7")
    """

    def __init__(self, runtime_dir: str = "runtime"):
        self._dir = Path(runtime_dir) / "hitl"
        self._dir.mkdir(parents=True, exist_ok=True)
        self._pending_file = self._dir / "pending.json"
        self._history_file = self._dir / "history.jsonl"

        self._lock = threading.Lock()
        self._pending: dict[str, ApprovalRequest] = {}

        self._load_pending()

    # ── Persistence ───────────────────────────────────────────────────────────

    def _load_pending(self) -> None:
        """Load pending approvals from disk."""
        if not self._pending_file.exists():
            return
        try:
            raw = json.loads(self._pending_file.read_text(encoding="utf-8"))
            for aid, d in raw.items():
                self._pending[aid] = ApprovalRequest.from_dict(d)
            log.info("HITL: loaded %d pending approvals", len(self._pending))
        except Exception as exc:
            log.warning("HITL: could not load pending state: %s", exc)

    def _save_pending(self) -> None:
        """Persist pending approvals to disk (caller must hold lock)."""
        try:
            data = {aid: req.to_dict() for aid, req in self._pending.items()}
            self._pending_file.write_text(
                json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        except Exception as exc:
            log.error("HITL: save pending failed: %s", exc)

    def _append_history(self, result: ApprovalResult, request: ApprovalRequest) -> None:
        """Append audit entry to history.jsonl."""
        entry = {
            **result.to_dict(),
            "description": request.description,
            "risk_level": request.risk_level,
            "created_at": request.created_at,
        }
        try:
            with self._history_file.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except Exception as exc:
            log.error("HITL: history append failed: %s", exc)

    # ── Core API ──────────────────────────────────────────────────────────────

    def request_approval(self, operation: ApprovalRequest) -> str:
        """Create a pending approval request.

        If the operation is auto-approvable (LOW risk), it is immediately
        approved and the approval_id is returned with status "approved".

        Args:
            operation: The ApprovalRequest to register.

        Returns:
            The approval_id string.
        """
        policy = OPERATION_POLICY.get(operation.operation_type, {})

        # Fill in policy defaults if not overridden
        if not operation.risk_level or operation.risk_level == RiskLevel.MEDIUM:
            operation.risk_level = policy.get("risk_level", RiskLevel.MEDIUM)
        if not operation.approvers:
            operation.approvers = list(policy.get("approvers", []))

        # AUTO-APPROVE low-risk operations
        if policy.get("auto_approve", False):
            operation.status = "approved"
            result = ApprovalResult(
                approval_id=operation.approval_id,
                approved=True,
                approver_id="system:auto",
                comments="Auto-aprovado (risco baixo)",
                operation_type=operation.operation_type,
                fund_id=operation.fund_id,
            )
            with self._lock:
                self._append_history(result, operation)
            log.info("HITL: auto-approved %s (%s)", operation.approval_id, operation.operation_type)
            return operation.approval_id

        with self._lock:
            self._pending[operation.approval_id] = operation
            self._save_pending()

        log.info(
            "HITL: queued approval %s (type=%s, risk=%s, fund=%s)",
            operation.approval_id, operation.operation_type,
            operation.risk_level, operation.fund_id,
        )
        return operation.approval_id

    def process_approval(
        self, approval_id: str, approved: bool, approver_id: str, comments: str = ""
    ) -> ApprovalResult:
        """Record an approval decision.

        Args:
            approval_id: The ID returned by request_approval()
            approved:    True to approve, False to reject
            approver_id: Identity string of the human approver
            comments:    Optional reason / notes

        Returns:
            ApprovalResult with the decision.

        Raises:
            KeyError: If approval_id not found in pending.
            ValueError: If approval is not in "pending" status.
        """
        with self._lock:
            if approval_id not in self._pending:
                raise KeyError(f"Approval not found: {approval_id}")

            req = self._pending[approval_id]
            if req.status != "pending":
                raise ValueError(
                    f"Approval {approval_id} already finalized (status={req.status})"
                )

            req.status = "approved" if approved else "rejected"
            result = ApprovalResult(
                approval_id=approval_id,
                approved=approved,
                approver_id=approver_id,
                comments=comments,
                operation_type=req.operation_type,
                fund_id=req.fund_id,
            )

            # Move from pending → history
            del self._pending[approval_id]
            self._save_pending()
            self._append_history(result, req)

        action = "aprovado" if approved else "rejeitado"
        log.info("HITL: %s %s by %s — %s", action, approval_id, approver_id, comments)
        return result

    def expire_timeouts(self) -> list[str]:
        """Auto-reject all approvals that have exceeded their timeout.

        Returns:
            List of approval_ids that were auto-rejected.
        """
        expired: list[str] = []
        with self._lock:
            for aid, req in list(self._pending.items()):
                if req.status == "pending" and req.is_timed_out():
                    req.status = "timed_out"
                    result = ApprovalResult(
                        approval_id=aid,
                        approved=False,
                        approver_id="system:timeout",
                        comments=f"Auto-rejeitado após {req.timeout_hours}h sem resposta",
                        operation_type=req.operation_type,
                        fund_id=req.fund_id,
                    )
                    del self._pending[aid]
                    self._append_history(result, req)
                    expired.append(aid)
                    log.warning("HITL: timed out %s (%s)", aid, req.operation_type)
            if expired:
                self._save_pending()
        return expired

    def check_escalations(self) -> list[str]:
        """Flag approvals that need escalation to next approver.

        Returns:
            List of approval_ids marked for escalation.
        """
        escalated: list[str] = []
        with self._lock:
            for aid, req in self._pending.items():
                if req.status == "pending" and req.needs_escalation():
                    req.escalated_at = time.time()
                    escalated.append(aid)
                    log.warning("HITL: escalating %s (%s)", aid, req.operation_type)
            if escalated:
                self._save_pending()
        return escalated

    def list_pending(self, fund_id: Optional[str] = None) -> list[ApprovalRequest]:
        """Return pending approvals, optionally filtered by fund.

        Args:
            fund_id: If provided, only return approvals for this fund.

        Returns:
            List of ApprovalRequest in chronological order.
        """
        with self._lock:
            items = list(self._pending.values())

        if fund_id:
            items = [r for r in items if r.fund_id == fund_id]

        return sorted(items, key=lambda r: r.created_at)

    def get_approval(self, approval_id: str) -> ApprovalRequest:
        """Fetch a pending approval by ID.

        Raises:
            KeyError: If not found.
        """
        with self._lock:
            if approval_id not in self._pending:
                raise KeyError(f"Approval not found: {approval_id}")
            return self._pending[approval_id]

    def get_history(self, limit: int = 50, fund_id: Optional[str] = None) -> list[dict]:
        """Read recent history entries.

        Args:
            limit:   Max entries to return (most recent).
            fund_id: Optional filter.

        Returns:
            List of dicts from history.jsonl.
        """
        if not self._history_file.exists():
            return []
        try:
            lines = self._history_file.read_text(encoding="utf-8").strip().splitlines()
        except Exception:
            return []

        entries = []
        for line in lines:
            try:
                e = json.loads(line)
                if fund_id and e.get("fund_id") != fund_id:
                    continue
                entries.append(e)
            except json.JSONDecodeError:
                continue

        return entries[-limit:]


# ── Helper factory ─────────────────────────────────────────────────────────────


def make_request(
    operation_type: str,
    description: str,
    agent_id: str,
    requester: str,
    fund_id: Optional[str] = None,
    data: Optional[dict] = None,
) -> ApprovalRequest:
    """Convenience constructor that fills in policy defaults.

    Args:
        operation_type: One of OperationType values.
        description:    Human-readable description.
        agent_id:       Agent submitting the request.
        requester:      Telegram user or system initiating this.
        fund_id:        Fund scope (optional).
        data:           Operation payload dict.

    Returns:
        ApprovalRequest ready to pass to HITLWorkflow.request_approval().
    """
    policy = OPERATION_POLICY.get(operation_type, {})
    return ApprovalRequest(
        operation_type=operation_type,
        description=description,
        agent_id=agent_id,
        requester=requester,
        fund_id=fund_id,
        risk_level=policy.get("risk_level", RiskLevel.MEDIUM),
        approvers=list(policy.get("approvers", [])),
        data=data or {},
    )
