"""Tests for core.runtime.escalation — EscalationManager and EscalationTicket.

Run with:
    cd /path/to/paganini && python -m pytest tests/test_runtime/test_escalation.py -v
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from core.runtime.escalation import (
    EscalationManager,
    EscalationTicket,
    Severity,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_ticket(
    agent_id: str = "gestor",
    fund_id: str = "fic001",
    severity: Severity = Severity.HIGH,
    cause: str = "Node failed 4 times",
    suggested_action: str = "Review logs and retry",
    evidence: dict | None = None,
) -> EscalationTicket:
    return EscalationTicket.create(
        agent_id=agent_id,
        fund_id=fund_id,
        severity=severity,
        cause=cause,
        suggested_action=suggested_action,
        evidence=evidence or {"node": "risk_analysis", "attempts": 4},
    )


def make_manager(tmp_escalation_dir: Path, event_bus=None) -> EscalationManager:
    return EscalationManager(
        base_dir=str(tmp_escalation_dir),
        event_bus=event_bus,
    )


# ---------------------------------------------------------------------------
# Tests: EscalationTicket
# ---------------------------------------------------------------------------

def test_ticket_create_generates_id():
    """EscalationTicket.create() gera ticket_id único."""
    t1 = make_ticket()
    t2 = make_ticket()
    assert t1.ticket_id != t2.ticket_id
    assert t1.ticket_id.startswith("ticket_")


def test_ticket_is_pending_when_unresolved():
    """Ticket recém-criado é marcado como pendente."""
    ticket = make_ticket()
    assert ticket.is_pending is True


def test_ticket_serialization_roundtrip():
    """EscalationTicket serializa e deserializa sem perda de dados."""
    original = make_ticket(
        agent_id="auditor",
        fund_id="fic002",
        severity=Severity.CRITICAL,
        cause="Portfolio allocation exceeded risk limits",
        evidence={"max_drawdown": 0.15, "threshold": 0.10},
    )
    data = original.to_dict()
    restored = EscalationTicket.from_dict(data)

    assert restored.ticket_id == original.ticket_id
    assert restored.severity == Severity.CRITICAL
    assert restored.cause == original.cause
    assert restored.evidence["max_drawdown"] == 0.15
    assert restored.resolved_at is None
    assert restored.resolution is None


def test_severity_enum_values():
    """Severity tem os valores corretos."""
    assert Severity.LOW == "low"
    assert Severity.MEDIUM == "medium"
    assert Severity.HIGH == "high"
    assert Severity.CRITICAL == "critical"


# ---------------------------------------------------------------------------
# Tests: EscalationManager.create_ticket
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_create_ticket_persists_to_disk(tmp_escalation_dir: Path):
    """create_ticket() salva arquivo JSON no diretório de escalações."""
    manager = make_manager(tmp_escalation_dir)
    ticket = make_ticket()

    ticket_id = await manager.create_ticket(ticket)

    assert ticket_id == ticket.ticket_id
    ticket_file = tmp_escalation_dir / f"{ticket_id}.json"
    assert ticket_file.exists()

    data = json.loads(ticket_file.read_text())
    assert data["ticket_id"] == ticket_id
    assert data["severity"] == "high"


@pytest.mark.anyio
async def test_create_ticket_returns_ticket_id(tmp_escalation_dir: Path):
    """create_ticket() retorna o ticket_id do ticket criado."""
    manager = make_manager(tmp_escalation_dir)
    ticket = make_ticket()

    returned_id = await manager.create_ticket(ticket)
    assert returned_id == ticket.ticket_id


# ---------------------------------------------------------------------------
# Tests: EscalationManager.resolve_ticket
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_resolve_ticket_marks_as_resolved(tmp_escalation_dir: Path):
    """resolve_ticket() define resolved_at e resolution no ticket."""
    manager = make_manager(tmp_escalation_dir)
    ticket = make_ticket()
    await manager.create_ticket(ticket)

    await manager.resolve_ticket(ticket.ticket_id, resolution="Rolled back position manually")

    loaded = await manager.get_ticket(ticket.ticket_id)
    assert loaded is not None
    assert loaded.is_pending is False
    assert loaded.resolution == "Rolled back position manually"
    assert loaded.resolved_at is not None


@pytest.mark.anyio
async def test_resolve_nonexistent_ticket_raises(tmp_escalation_dir: Path):
    """resolve_ticket() levanta FileNotFoundError para ticket inexistente."""
    manager = make_manager(tmp_escalation_dir)

    with pytest.raises(FileNotFoundError):
        await manager.resolve_ticket("ticket_nonexistent000", "some resolution")


@pytest.mark.anyio
async def test_resolve_already_resolved_ticket_raises(tmp_escalation_dir: Path):
    """resolve_ticket() levanta ValueError se ticket já foi resolvido."""
    manager = make_manager(tmp_escalation_dir)
    ticket = make_ticket()
    await manager.create_ticket(ticket)
    await manager.resolve_ticket(ticket.ticket_id, "First resolution")

    with pytest.raises(ValueError, match="já foi resolvido"):
        await manager.resolve_ticket(ticket.ticket_id, "Second resolution")


# ---------------------------------------------------------------------------
# Tests: EscalationManager.pending_tickets
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_pending_tickets_returns_unresolved(tmp_escalation_dir: Path):
    """pending_tickets() retorna apenas tickets não resolvidos."""
    manager = make_manager(tmp_escalation_dir)

    t1 = make_ticket(fund_id="fic001", cause="Issue A")
    t2 = make_ticket(fund_id="fic001", cause="Issue B")
    t3 = make_ticket(fund_id="fic002", cause="Issue C")

    await manager.create_ticket(t1)
    await manager.create_ticket(t2)
    await manager.create_ticket(t3)
    await manager.resolve_ticket(t1.ticket_id, "Fixed")

    pending = await manager.pending_tickets()
    assert len(pending) == 2
    pending_ids = {t.ticket_id for t in pending}
    assert t1.ticket_id not in pending_ids
    assert t2.ticket_id in pending_ids
    assert t3.ticket_id in pending_ids


@pytest.mark.anyio
async def test_pending_tickets_filtered_by_fund(tmp_escalation_dir: Path):
    """pending_tickets(fund_id=...) filtra por fundo."""
    manager = make_manager(tmp_escalation_dir)

    t1 = make_ticket(fund_id="fic001")
    t2 = make_ticket(fund_id="fic002")

    await manager.create_ticket(t1)
    await manager.create_ticket(t2)

    pending_fic001 = await manager.pending_tickets(fund_id="fic001")
    assert len(pending_fic001) == 1
    assert pending_fic001[0].fund_id == "fic001"


# ---------------------------------------------------------------------------
# Tests: EscalationManager.ticket_stats
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_ticket_stats_empty(tmp_escalation_dir: Path):
    """ticket_stats() em store vazio retorna zeros."""
    manager = make_manager(tmp_escalation_dir)
    stats = await manager.ticket_stats()

    assert stats["total"] == 0
    assert stats["pending"] == 0
    assert stats["resolved"] == 0


@pytest.mark.anyio
async def test_ticket_stats_counts_correctly(tmp_escalation_dir: Path):
    """ticket_stats() conta total, pendentes, resolvidos e por severidade."""
    manager = make_manager(tmp_escalation_dir)

    t1 = make_ticket(severity=Severity.HIGH)
    t2 = make_ticket(severity=Severity.CRITICAL)
    t3 = make_ticket(severity=Severity.LOW)

    await manager.create_ticket(t1)
    await manager.create_ticket(t2)
    await manager.create_ticket(t3)
    await manager.resolve_ticket(t3.ticket_id, "Resolved low severity")

    stats = await manager.ticket_stats()

    assert stats["total"] == 3
    assert stats["pending"] == 2
    assert stats["resolved"] == 1
    assert stats["by_severity"]["high"] == 1
    assert stats["by_severity"]["critical"] == 1
    assert stats["by_severity"]["low"] == 1


# ---------------------------------------------------------------------------
# Tests: EventBus integration
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_create_ticket_emits_hitl_requested(tmp_escalation_dir: Path):
    """create_ticket() publica HITL_REQUESTED no EventBus."""
    from core.runtime.event_bus import EventBus, EventType

    bus = EventBus()
    received = []

    async def handler(event):
        received.append(event)

    await bus.subscribe(EventType.HITL_REQUESTED, handler)
    manager = make_manager(tmp_escalation_dir, event_bus=bus)

    ticket = make_ticket(severity=Severity.CRITICAL)
    await manager.create_ticket(ticket)

    assert len(received) == 1
    assert received[0].event_type == EventType.HITL_REQUESTED
    assert received[0].payload["ticket_id"] == ticket.ticket_id
    assert received[0].payload["severity"] == "critical"


@pytest.mark.anyio
async def test_resolve_ticket_emits_hitl_resolved(tmp_escalation_dir: Path):
    """resolve_ticket() publica HITL_RESOLVED no EventBus."""
    from core.runtime.event_bus import EventBus, EventType

    bus = EventBus()
    resolved_events = []

    async def handler(event):
        resolved_events.append(event)

    await bus.subscribe(EventType.HITL_RESOLVED, handler)
    manager = make_manager(tmp_escalation_dir, event_bus=bus)

    ticket = make_ticket()
    await manager.create_ticket(ticket)
    await manager.resolve_ticket(ticket.ticket_id, "Operator intervened successfully")

    assert len(resolved_events) == 1
    assert resolved_events[0].event_type == EventType.HITL_RESOLVED
    assert resolved_events[0].payload["resolution"] == "Operator intervened successfully"
