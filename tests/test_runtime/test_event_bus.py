"""Tests for core.runtime.event_bus — EventBus pub/sub system.

Run with:
    cd /path/to/paganini && python -m pytest tests/test_runtime/test_event_bus.py -v
"""

from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime
from pathlib import Path

import pytest

from core.runtime.event_bus import (
    AgentEvent,
    EventBus,
    EventType,
    get_event_bus,
    reset_event_bus,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_event(
    event_type: EventType = EventType.AGENT_STARTED,
    agent_id: str = "gestor",
    fund_id: str | None = "fic001",
    payload: dict | None = None,
) -> AgentEvent:
    return AgentEvent(
        event_type=event_type,
        agent_id=agent_id,
        fund_id=fund_id,
        payload=payload or {},
    )


# ---------------------------------------------------------------------------
# Tests: subscribe & publish
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_basic_publish_subscribe():
    """Handler é chamado quando o evento correto é publicado."""
    bus = EventBus()
    received: list[AgentEvent] = []

    async def handler(event: AgentEvent) -> None:
        received.append(event)

    await bus.subscribe(EventType.AGENT_STARTED, handler)
    await bus.publish(make_event(EventType.AGENT_STARTED))

    assert len(received) == 1
    assert received[0].event_type == EventType.AGENT_STARTED


@pytest.mark.anyio
async def test_handler_not_called_for_different_event_type():
    """Handler NÃO é chamado para tipo de evento diferente do assinado."""
    bus = EventBus()
    received: list[AgentEvent] = []

    async def handler(event: AgentEvent) -> None:
        received.append(event)

    await bus.subscribe(EventType.AGENT_STARTED, handler)
    await bus.publish(make_event(EventType.AGENT_COMPLETED))

    assert len(received) == 0


@pytest.mark.anyio
async def test_multiple_subscribers_for_same_event():
    """Múltiplos handlers para o mesmo tipo são todos chamados."""
    bus = EventBus()
    call_counts = [0, 0]

    async def handler_a(event: AgentEvent) -> None:
        call_counts[0] += 1

    async def handler_b(event: AgentEvent) -> None:
        call_counts[1] += 1

    await bus.subscribe(EventType.AGENT_FAILED, handler_a)
    await bus.subscribe(EventType.AGENT_FAILED, handler_b)
    await bus.publish(make_event(EventType.AGENT_FAILED))

    assert call_counts == [1, 1]


@pytest.mark.anyio
async def test_subscriber_receives_correct_payload():
    """Payload do evento é entregue corretamente ao handler."""
    bus = EventBus()
    received: list[AgentEvent] = []

    async def handler(event: AgentEvent) -> None:
        received.append(event)

    await bus.subscribe(EventType.AGENT_COMPLETED, handler)
    await bus.publish(make_event(
        EventType.AGENT_COMPLETED,
        agent_id="risk",
        fund_id="fic002",
        payload={"output": "done", "tokens": 42},
    ))

    assert received[0].agent_id == "risk"
    assert received[0].fund_id == "fic002"
    assert received[0].payload["tokens"] == 42


# ---------------------------------------------------------------------------
# Tests: wildcard subscription
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_wildcard_receives_all_events():
    """Subscrição wildcard recebe todos os tipos de evento."""
    bus = EventBus()
    received: list[EventType] = []

    async def handler(event: AgentEvent) -> None:
        received.append(event.event_type)

    await bus.subscribe(EventType.WILDCARD, handler)

    for event_type in [
        EventType.AGENT_STARTED,
        EventType.AGENT_COMPLETED,
        EventType.COST_THRESHOLD_HIT,
        EventType.GUARDRAIL_TRIGGERED,
    ]:
        await bus.publish(make_event(event_type))

    assert len(received) == 4
    assert EventType.AGENT_STARTED in received
    assert EventType.GUARDRAIL_TRIGGERED in received


@pytest.mark.anyio
async def test_wildcard_and_specific_subscriber_both_fire():
    """Wildcard e subscriber específico recebem o mesmo evento."""
    bus = EventBus()
    wildcard_count = [0]
    specific_count = [0]

    async def wildcard_handler(event: AgentEvent) -> None:
        wildcard_count[0] += 1

    async def specific_handler(event: AgentEvent) -> None:
        specific_count[0] += 1

    await bus.subscribe(EventType.WILDCARD, wildcard_handler)
    await bus.subscribe(EventType.AGENT_STALLED, specific_handler)
    await bus.publish(make_event(EventType.AGENT_STALLED))

    assert wildcard_count[0] == 1
    assert specific_count[0] == 1


# ---------------------------------------------------------------------------
# Tests: unsubscribe
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_unsubscribe_stops_delivery():
    """Após unsubscribe, handler não recebe mais eventos."""
    bus = EventBus()
    received: list[AgentEvent] = []

    async def handler(event: AgentEvent) -> None:
        received.append(event)

    sub_id = await bus.subscribe(EventType.AGENT_STARTED, handler)
    await bus.publish(make_event(EventType.AGENT_STARTED))
    assert len(received) == 1

    await bus.unsubscribe(sub_id)
    await bus.publish(make_event(EventType.AGENT_STARTED))
    assert len(received) == 1  # nenhum novo evento


@pytest.mark.anyio
async def test_unsubscribe_nonexistent_id_does_not_raise():
    """Unsubscribe de ID inexistente não deve levantar exceção."""
    bus = EventBus()
    # Should not raise
    await bus.unsubscribe("sub_nonexistent_000")


@pytest.mark.anyio
async def test_subscription_count():
    """get_subscription_count() retorna número correto de subscrições ativas."""
    bus = EventBus()

    assert bus.get_subscription_count() == 0

    id1 = await bus.subscribe(EventType.AGENT_STARTED, lambda e: None)
    id2 = await bus.subscribe(EventType.AGENT_COMPLETED, lambda e: None)
    assert bus.get_subscription_count() == 2

    await bus.unsubscribe(id1)
    assert bus.get_subscription_count() == 1

    await bus.unsubscribe(id2)
    assert bus.get_subscription_count() == 0


# ---------------------------------------------------------------------------
# Tests: event metadata
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_event_has_timestamp():
    """Todo evento possui timestamp preenchido automaticamente."""
    event = make_event()
    assert isinstance(event.timestamp, datetime)


@pytest.mark.anyio
async def test_event_serialization_roundtrip():
    """AgentEvent serializa e deserializa sem perda de dados."""
    original = AgentEvent(
        event_type=EventType.CHECKPOINT_CREATED,
        agent_id="auditor",
        fund_id="fic003",
        payload={"node": "risk_analysis", "tokens": 100},
    )
    data = original.to_dict()
    restored = AgentEvent.from_dict(data)

    assert restored.event_type == original.event_type
    assert restored.agent_id == original.agent_id
    assert restored.fund_id == original.fund_id
    assert restored.payload == original.payload


@pytest.mark.anyio
async def test_event_with_none_fund_id():
    """Evento com fund_id=None é aceito e serializado corretamente."""
    bus = EventBus()
    received: list[AgentEvent] = []

    async def handler(event: AgentEvent) -> None:
        received.append(event)

    await bus.subscribe(EventType.AGENT_STARTED, handler)
    await bus.publish(make_event(EventType.AGENT_STARTED, fund_id=None))

    assert received[0].fund_id is None


# ---------------------------------------------------------------------------
# Tests: handler failure isolation
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_failing_handler_does_not_block_others():
    """Handler que lança exceção não impede que outros handlers sejam chamados."""
    bus = EventBus()
    good_received: list[AgentEvent] = []

    async def bad_handler(event: AgentEvent) -> None:
        raise RuntimeError("Simulated handler failure")

    async def good_handler(event: AgentEvent) -> None:
        good_received.append(event)

    await bus.subscribe(EventType.AGENT_STARTED, bad_handler)
    await bus.subscribe(EventType.AGENT_STARTED, good_handler)

    # Should not raise
    await bus.publish(make_event(EventType.AGENT_STARTED))

    assert len(good_received) == 1


# ---------------------------------------------------------------------------
# Tests: debug log (PAGANINI_DEBUG_EVENTS)
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_debug_log_writes_jsonl(tmp_path: Path, monkeypatch):
    """Com PAGANINI_DEBUG_EVENTS apontando para diretório, eventos são gravados em JSONL."""
    import core.runtime.event_bus as eb_module

    log_dir = tmp_path / "event_logs"

    # Patch module-level state for isolation
    monkeypatch.setattr(eb_module, "_DEBUG_ENABLED", True)
    monkeypatch.setattr(eb_module, "_DEBUG_RAW", str(log_dir))
    monkeypatch.setattr(eb_module, "_debug_log_file", None)
    monkeypatch.setattr(eb_module, "_debug_log_ready", False)

    bus = EventBus()
    await bus.publish(make_event(EventType.GRAPH_EVOLVED, payload={"test": True}))

    # Find the written log
    log_files = list(log_dir.glob("*.jsonl"))
    assert len(log_files) == 1

    lines = [l for l in log_files[0].read_text().splitlines() if l.strip()]
    assert len(lines) == 1
    data = json.loads(lines[0])
    assert data["event_type"] == "graph_evolved"
    assert data["payload"]["test"] is True


# ---------------------------------------------------------------------------
# Tests: global singleton
# ---------------------------------------------------------------------------

def test_get_event_bus_returns_singleton():
    """get_event_bus() retorna sempre a mesma instância."""
    reset_event_bus()
    bus1 = get_event_bus()
    bus2 = get_event_bus()
    assert bus1 is bus2


def test_reset_event_bus_clears_singleton():
    """reset_event_bus() cria nova instância na próxima chamada."""
    reset_event_bus()
    bus1 = get_event_bus()
    reset_event_bus()
    bus2 = get_event_bus()
    assert bus1 is not bus2
