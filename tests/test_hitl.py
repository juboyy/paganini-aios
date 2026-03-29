"""Tests for WS5 — HITL Workflow Engine.

Tests:
    - ApprovalRequest creation and serialization
    - Auto-approval for LOW risk operations
    - Approval workflow (create → approve → history)
    - Rejection workflow
    - Timeout detection
    - Escalation detection
    - Concurrent access (thread safety)
    - list_pending with fund filter
    - history retrieval
"""

from __future__ import annotations

import json
import os
import tempfile
import threading
import time
import uuid
from pathlib import Path

import pytest

from core.hitl.workflow import (
    ApprovalRequest,
    ApprovalResult,
    HITLWorkflow,
    OperationType,
    RiskLevel,
    make_request,
    OPERATION_POLICY,
)


@pytest.fixture
def tmpdir():
    """Temporary directory for runtime state."""
    with tempfile.TemporaryDirectory() as d:
        yield d


@pytest.fixture
def wf(tmpdir):
    """HITLWorkflow with isolated runtime directory."""
    return HITLWorkflow(runtime_dir=tmpdir)


# ── ApprovalRequest ────────────────────────────────────────────────────────────


class TestApprovalRequest:
    def test_defaults(self):
        req = ApprovalRequest(
            operation_type=OperationType.CESSAO,
            description="Test cessão",
            agent_id="gestor",
            requester="user:1",
        )
        assert req.status == "pending"
        assert req.approval_id  # auto-generated UUID
        assert req.risk_level == RiskLevel.MEDIUM  # default
        assert req.timeout_hours == 24.0
        assert req.escalation_hours == 4.0

    def test_serialization_roundtrip(self):
        req = ApprovalRequest(
            operation_type=OperationType.CESSAO,
            description="Cessão de recebíveis empresa X",
            agent_id="gestor",
            requester="telegram:42",
            fund_id="alpha",
            risk_level=RiskLevel.HIGH,
            data={"cedente": "Empresa X", "valor": 2500000.0},
            approvers=["admin", "operator"],
        )
        d = req.to_dict()
        restored = ApprovalRequest.from_dict(d)
        assert restored.approval_id == req.approval_id
        assert restored.fund_id == "alpha"
        assert restored.data["cedente"] == "Empresa X"
        assert restored.approvers == ["admin", "operator"]

    def test_timeout_detection(self):
        req = ApprovalRequest(
            operation_type=OperationType.CESSAO,
            description="Test",
            agent_id="agent",
            requester="user",
            timeout_hours=0.0001,  # ~0.36 seconds
        )
        time.sleep(0.4)
        assert req.is_timed_out()

    def test_not_timed_out_immediately(self):
        req = ApprovalRequest(
            operation_type=OperationType.CESSAO,
            description="Test",
            agent_id="agent",
            requester="user",
        )
        assert not req.is_timed_out()

    def test_escalation_detection(self):
        req = ApprovalRequest(
            operation_type=OperationType.CESSAO,
            description="Test",
            agent_id="agent",
            requester="user",
            escalation_hours=0.0001,
        )
        time.sleep(0.4)
        assert req.needs_escalation()

    def test_no_escalation_after_already_escalated(self):
        req = ApprovalRequest(
            operation_type=OperationType.CESSAO,
            description="Test",
            agent_id="agent",
            requester="user",
            escalation_hours=0.0001,
            escalated_at=time.time() - 100,  # already escalated
        )
        assert not req.needs_escalation()


# ── Operation Policy ───────────────────────────────────────────────────────────


class TestOperationPolicy:
    @pytest.mark.parametrize("op,expected_risk", [
        (OperationType.CESSAO, RiskLevel.HIGH),
        (OperationType.RELATORIO_REGULATORIO, RiskLevel.HIGH),
        (OperationType.COMUNICACAO_COTISTA, RiskLevel.MEDIUM),
        (OperationType.MUDANCA_PARAMETRO, RiskLevel.MEDIUM),
        (OperationType.QUERY_NORMAL, RiskLevel.LOW),
    ])
    def test_risk_levels(self, op, expected_risk):
        assert OPERATION_POLICY[op]["risk_level"] == expected_risk

    @pytest.mark.parametrize("op,auto_approve", [
        (OperationType.CESSAO, False),
        (OperationType.QUERY_NORMAL, True),
    ])
    def test_auto_approve(self, op, auto_approve):
        assert OPERATION_POLICY[op]["auto_approve"] == auto_approve

    def test_cessao_requires_admin_and_operator(self):
        assert "admin" in OPERATION_POLICY[OperationType.CESSAO]["approvers"]
        assert "operator" in OPERATION_POLICY[OperationType.CESSAO]["approvers"]

    def test_relatorio_requires_admin_only(self):
        approvers = OPERATION_POLICY[OperationType.RELATORIO_REGULATORIO]["approvers"]
        assert "admin" in approvers
        assert "operator" not in approvers


# ── HITLWorkflow ───────────────────────────────────────────────────────────────


class TestHITLWorkflow:
    def test_request_high_risk_queued(self, wf):
        req = make_request(
            OperationType.CESSAO, "Cessão Alpha", "gestor", "user:1", fund_id="alpha"
        )
        aid = wf.request_approval(req)
        assert aid == req.approval_id
        assert req.status == "pending"

        pending = wf.list_pending()
        assert any(p.approval_id == aid for p in pending)

    def test_auto_approve_low_risk(self, wf):
        req = make_request(
            OperationType.QUERY_NORMAL, "Query simples", "rag", "user:2"
        )
        aid = wf.request_approval(req)
        assert req.status == "approved"
        # Should NOT be in pending
        pending = wf.list_pending()
        assert not any(p.approval_id == aid for p in pending)

    def test_approve_request(self, wf):
        req = make_request(
            OperationType.CESSAO, "Cessão Teste", "gestor", "user:3", fund_id="beta"
        )
        aid = wf.request_approval(req)
        result = wf.process_approval(aid, approved=True, approver_id="admin:1")

        assert result.approved is True
        assert result.approver_id == "admin:1"
        assert result.approval_id == aid
        assert result.fund_id == "beta"

        # No longer pending
        pending = wf.list_pending()
        assert not any(p.approval_id == aid for p in pending)

    def test_reject_request(self, wf):
        req = make_request(
            OperationType.COMUNICACAO_COTISTA,
            "Email cotistas",
            "investor_relations",
            "user:4",
        )
        aid = wf.request_approval(req)
        result = wf.process_approval(
            aid, approved=False, approver_id="admin:2", comments="Texto inadequado"
        )
        assert result.approved is False
        assert result.comments == "Texto inadequado"

    def test_double_process_raises(self, wf):
        req = make_request(OperationType.CESSAO, "X", "g", "u")
        aid = wf.request_approval(req)
        wf.process_approval(aid, approved=True, approver_id="admin:1")
        with pytest.raises((KeyError, ValueError)):
            wf.process_approval(aid, approved=True, approver_id="admin:1")

    def test_get_approval_found(self, wf):
        req = make_request(OperationType.CESSAO, "Test", "gestor", "user:5")
        aid = wf.request_approval(req)
        fetched = wf.get_approval(aid)
        assert fetched.approval_id == aid

    def test_get_approval_not_found(self, wf):
        with pytest.raises(KeyError):
            wf.get_approval("nonexistent-id")

    def test_list_pending_fund_filter(self, wf):
        r1 = make_request(OperationType.CESSAO, "Alpha", "g", "u", fund_id="alpha")
        r2 = make_request(OperationType.CESSAO, "Beta", "g", "u", fund_id="beta")
        wf.request_approval(r1)
        wf.request_approval(r2)

        alpha_pending = wf.list_pending(fund_id="alpha")
        assert len(alpha_pending) == 1
        assert alpha_pending[0].fund_id == "alpha"

        all_pending = wf.list_pending()
        assert len(all_pending) == 2

    def test_list_pending_sorted_by_time(self, wf):
        for i in range(3):
            req = make_request(OperationType.CESSAO, f"Test {i}", "g", "u")
            req.created_at = time.time() + i  # stagger
            wf.request_approval(req)
        pending = wf.list_pending()
        times = [p.created_at for p in pending]
        assert times == sorted(times)

    def test_expire_timeouts(self, wf):
        req = make_request(OperationType.CESSAO, "Timeout test", "g", "u")
        req.timeout_hours = 0.0001  # ~0.36s
        aid = wf.request_approval(req)
        time.sleep(0.4)
        expired = wf.expire_timeouts()
        assert aid in expired
        assert not wf.list_pending()

    def test_check_escalations(self, wf):
        req = make_request(OperationType.CESSAO, "Escalation test", "g", "u")
        req.escalation_hours = 0.0001
        aid = wf.request_approval(req)
        time.sleep(0.4)
        escalated = wf.check_escalations()
        assert aid in escalated
        # Now marked as escalated — should not escalate again
        escalated2 = wf.check_escalations()
        assert aid not in escalated2

    def test_history_written_on_approve(self, wf, tmpdir):
        req = make_request(OperationType.CESSAO, "History test", "g", "u")
        aid = wf.request_approval(req)
        wf.process_approval(aid, approved=True, approver_id="admin:9")
        history_file = Path(tmpdir) / "hitl" / "history.jsonl"
        assert history_file.exists()
        entries = [json.loads(l) for l in history_file.read_text().splitlines() if l]
        assert any(e["approval_id"] == aid for e in entries)

    def test_persistence_across_instances(self, tmpdir):
        """Pending state persists when a new HITLWorkflow is created."""
        wf1 = HITLWorkflow(runtime_dir=tmpdir)
        req = make_request(OperationType.CESSAO, "Persistence test", "g", "u")
        aid = wf1.request_approval(req)

        wf2 = HITLWorkflow(runtime_dir=tmpdir)
        pending = wf2.list_pending()
        assert any(p.approval_id == aid for p in pending)

    def test_thread_safety(self, wf):
        """Multiple threads can submit approvals without data corruption."""
        aids = []
        lock = threading.Lock()
        errors = []

        def submit():
            try:
                req = make_request(OperationType.CESSAO, f"Concurrent {uuid.uuid4()}", "g", "u")
                aid = wf.request_approval(req)
                with lock:
                    aids.append(aid)
            except Exception as e:
                with lock:
                    errors.append(str(e))

        threads = [threading.Thread(target=submit) for _ in range(20)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert not errors
        assert len(wf.list_pending()) == 20

    def test_get_history(self, wf):
        req = make_request(OperationType.CESSAO, "History test 2", "g", "u", fund_id="alpha")
        aid = wf.request_approval(req)
        wf.process_approval(aid, approved=False, approver_id="op:1")
        history = wf.get_history(limit=10, fund_id="alpha")
        assert len(history) >= 1
        assert history[-1]["approval_id"] == aid

    def test_make_request_fills_policy(self):
        req = make_request(OperationType.CESSAO, "desc", "agent", "requester")
        assert req.risk_level == RiskLevel.HIGH
        assert "admin" in req.approvers
        assert "operator" in req.approvers
