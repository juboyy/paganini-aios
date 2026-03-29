"""Tests for core.runtime.graph_evolver — GraphEvolver decision tree.

Run with:
    cd /path/to/paganini && python -m pytest tests/test_runtime/test_graph_evolver.py -v
"""

from __future__ import annotations

from pathlib import Path

import pytest

from core.runtime.graph_evolver import (
    EVOLUTION_ESCALATE,
    EVOLUTION_RETRY,
    EVOLUTION_RETRY_MODIFIED,
    EVOLUTION_REROUTE,
    EVOLUTION_SKIP,
    EvolutionRecord,
    GraphEvolver,
)

# Standard test graph
_GRAPH = ["fetch_data", "risk_analysis", "portfolio_rebalance", "report"]
_AGENT = "gestor"
_FUND = "fic001"
_FAILED_NODE = "risk_analysis"
_ERROR = "TimeoutError: LLM call timed out after 30s"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_evolver(
    tmp_path: Path,
    optional_nodes: set[str] | None = None,
    alternative_routes: dict[str, list[str]] | None = None,
    event_bus=None,
    escalation_manager=None,
) -> GraphEvolver:
    return GraphEvolver(
        max_retries=3,
        evolution_log_path=str(tmp_path / "evolutions"),
        optional_nodes=optional_nodes,
        alternative_routes=alternative_routes,
        event_bus=event_bus,
        escalation_manager=escalation_manager,
    )


# ---------------------------------------------------------------------------
# Tests: Attempt 1 → RETRY
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_attempt_1_returns_retry(tmp_path: Path):
    """Primeira tentativa retorna RETRY com o mesmo grafo."""
    evolver = make_evolver(tmp_path)
    decision = await evolver.handle_failure(
        _AGENT, _FUND, _FAILED_NODE, _ERROR, _GRAPH, attempt=1
    )

    assert decision.evolution_type == EVOLUTION_RETRY
    assert decision.evolved_graph == _GRAPH
    assert decision.backoff_seconds == 0.0


@pytest.mark.anyio
async def test_attempt_1_record_has_correct_fields(tmp_path: Path):
    """Registro da primeira tentativa tem campos corretos."""
    evolver = make_evolver(tmp_path)
    decision = await evolver.handle_failure(
        _AGENT, _FUND, _FAILED_NODE, _ERROR, _GRAPH, attempt=1
    )

    record = decision.record
    assert record.agent_id == _AGENT
    assert record.fund_id == _FUND
    assert record.failure_node == _FAILED_NODE
    assert record.failure_reason == _ERROR
    assert record.attempt == 1
    assert record.evolution_type == EVOLUTION_RETRY
    assert record.original_graph == _GRAPH


# ---------------------------------------------------------------------------
# Tests: Attempt 2 → RETRY_MODIFIED
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_attempt_2_returns_retry_modified(tmp_path: Path):
    """Segunda tentativa retorna RETRY_MODIFIED com backoff."""
    evolver = make_evolver(tmp_path)
    decision = await evolver.handle_failure(
        _AGENT, _FUND, _FAILED_NODE, _ERROR, _GRAPH, attempt=2
    )

    assert decision.evolution_type == EVOLUTION_RETRY_MODIFIED
    assert decision.backoff_seconds > 0


@pytest.mark.anyio
async def test_attempt_2_backoff_is_exponential(tmp_path: Path):
    """Backoff da segunda tentativa é exponencial (2^1 = 2s)."""
    evolver = make_evolver(tmp_path)
    decision = await evolver.handle_failure(
        _AGENT, _FUND, _FAILED_NODE, _ERROR, _GRAPH, attempt=2
    )
    assert decision.backoff_seconds == 2.0


@pytest.mark.anyio
async def test_attempt_2_record_marks_simplified_input(tmp_path: Path):
    """Registro da segunda tentativa indica simplified_input=True."""
    evolver = make_evolver(tmp_path)
    decision = await evolver.handle_failure(
        _AGENT, _FUND, _FAILED_NODE, _ERROR, _GRAPH, attempt=2
    )
    assert decision.record.extra.get("simplified_input") is True


# ---------------------------------------------------------------------------
# Tests: Attempt 3 → SKIP or REROUTE
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_attempt_3_skip_optional_node(tmp_path: Path):
    """Terceira tentativa faz SKIP se nó é opcional."""
    evolver = make_evolver(tmp_path, optional_nodes={_FAILED_NODE})
    decision = await evolver.handle_failure(
        _AGENT, _FUND, _FAILED_NODE, _ERROR, _GRAPH, attempt=3
    )

    assert decision.evolution_type == EVOLUTION_SKIP
    assert _FAILED_NODE not in decision.evolved_graph
    assert len(decision.evolved_graph) == len(_GRAPH) - 1


@pytest.mark.anyio
async def test_attempt_3_reroute_with_alternative(tmp_path: Path):
    """Terceira tentativa faz REROUTE se alternativa existe (prioridade sobre skip)."""
    alt_routes = {_FAILED_NODE: ["risk_analysis_simplified"]}
    evolver = make_evolver(
        tmp_path,
        optional_nodes={_FAILED_NODE},  # also optional, but reroute takes priority
        alternative_routes=alt_routes,
    )
    decision = await evolver.handle_failure(
        _AGENT, _FUND, _FAILED_NODE, _ERROR, _GRAPH, attempt=3
    )

    assert decision.evolution_type == EVOLUTION_REROUTE
    assert "risk_analysis_simplified" in decision.evolved_graph
    assert _FAILED_NODE not in decision.evolved_graph


@pytest.mark.anyio
async def test_attempt_3_escalates_if_no_skip_or_reroute(tmp_path: Path):
    """Terceira tentativa escala se nó não é opcional e não tem alternativa."""
    evolver = make_evolver(tmp_path)  # no optional nodes, no alternatives
    decision = await evolver.handle_failure(
        _AGENT, _FUND, _FAILED_NODE, _ERROR, _GRAPH, attempt=3
    )

    assert decision.evolution_type == EVOLUTION_ESCALATE


# ---------------------------------------------------------------------------
# Tests: Attempt 4+ → ESCALATE
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_attempt_4_returns_escalate(tmp_path: Path):
    """Quarta tentativa e além retorna ESCALATE."""
    evolver = make_evolver(tmp_path)
    decision = await evolver.handle_failure(
        _AGENT, _FUND, _FAILED_NODE, _ERROR, _GRAPH, attempt=4
    )

    assert decision.evolution_type == EVOLUTION_ESCALATE


@pytest.mark.anyio
async def test_attempt_5_also_escalates(tmp_path: Path):
    """Quinta tentativa também retorna ESCALATE."""
    evolver = make_evolver(tmp_path)
    decision = await evolver.handle_failure(
        _AGENT, _FUND, _FAILED_NODE, _ERROR, _GRAPH, attempt=5
    )
    assert decision.evolution_type == EVOLUTION_ESCALATE


@pytest.mark.anyio
async def test_escalate_creates_hitl_ticket(tmp_path: Path, tmp_path_factory):
    """Escalation com EscalationManager presente cria ticket HITL."""
    from core.runtime.escalation import EscalationManager

    escalation_dir = tmp_path_factory.mktemp("escalations")
    manager = EscalationManager(base_dir=str(escalation_dir))
    evolver = make_evolver(tmp_path, escalation_manager=manager)

    decision = await evolver.handle_failure(
        _AGENT, _FUND, _FAILED_NODE, _ERROR, _GRAPH, attempt=4
    )

    assert decision.escalation_id is not None
    # Ticket should exist in the escalation store
    tickets = await manager.pending_tickets()
    assert len(tickets) == 1
    assert tickets[0].agent_id == _AGENT


# ---------------------------------------------------------------------------
# Tests: Evolution history (JSONL logging)
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_evolution_history_is_recorded(tmp_path: Path):
    """Evoluções são gravadas em JSONL e recuperáveis por agent_id."""
    evolver = make_evolver(tmp_path)

    await evolver.handle_failure(_AGENT, _FUND, _FAILED_NODE, _ERROR, _GRAPH, attempt=1)
    await evolver.handle_failure(_AGENT, _FUND, _FAILED_NODE, _ERROR, _GRAPH, attempt=2)

    history = await evolver.get_evolution_history(_AGENT)

    assert len(history) == 2
    # Most recent first
    assert history[0].attempt == 2
    assert history[1].attempt == 1


@pytest.mark.anyio
async def test_evolution_history_empty_for_unknown_agent(tmp_path: Path):
    """get_evolution_history() retorna lista vazia para agente sem histórico."""
    evolver = make_evolver(tmp_path)
    history = await evolver.get_evolution_history("unknown_agent")
    assert history == []


@pytest.mark.anyio
async def test_evolution_record_serialization():
    """EvolutionRecord serializa e deserializa corretamente."""
    from datetime import timezone
    from datetime import datetime as dt

    record = EvolutionRecord(
        record_id="evo_abc123",
        agent_id="auditor",
        fund_id="fic004",
        original_graph=["node_a", "node_b"],
        failure_node="node_b",
        failure_reason="Connection refused",
        evolved_graph=["node_a"],
        evolution_type=EVOLUTION_SKIP,
        attempt=3,
        extra={"skipped_node": "node_b"},
    )
    data = record.to_dict()
    restored = EvolutionRecord.from_dict(data)

    assert restored.record_id == record.record_id
    assert restored.evolution_type == record.evolution_type
    assert restored.extra["skipped_node"] == "node_b"


# ---------------------------------------------------------------------------
# Tests: EventBus integration
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_graph_evolved_event_published(tmp_path: Path):
    """GraphEvolver publica GRAPH_EVOLVED no EventBus após cada decisão."""
    from core.runtime.event_bus import EventBus, EventType

    bus = EventBus()
    received = []

    async def handler(event):
        received.append(event)

    await bus.subscribe(EventType.GRAPH_EVOLVED, handler)
    evolver = make_evolver(tmp_path, event_bus=bus)

    await evolver.handle_failure(_AGENT, _FUND, _FAILED_NODE, _ERROR, _GRAPH, attempt=1)

    assert len(received) == 1
    assert received[0].event_type == EventType.GRAPH_EVOLVED
    assert received[0].payload["evolution_type"] == EVOLUTION_RETRY
