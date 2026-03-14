"""Tests for AgentRegistry and AgentDispatcher."""
from __future__ import annotations

import pytest
from packages.agents.framework import AgentRegistry, AgentDispatcher


SOULS_DIR = "packages/agents/souls"


def test_registry_loads_nine_souls():
    """AgentRegistry must load exactly 9 SOULs from the souls directory."""
    registry = AgentRegistry(souls_dir=SOULS_DIR)
    agents = registry.list()
    assert len(agents) == 9, f"Expected 9 agents, got {len(agents)}: {[a.slug for a in agents]}"


def test_registry_each_soul_has_slug_name_domains():
    """Every loaded AgentSOUL must have slug, name, and at least one domain."""
    registry = AgentRegistry(souls_dir=SOULS_DIR)
    for agent in registry.list():
        assert agent.slug, f"Agent missing slug: {agent}"
        assert agent.name, f"Agent '{agent.slug}' missing name"
        # domains can be empty for very generic agents, but slug/name are mandatory


def test_dispatcher_routes_concentracao_to_gestor():
    """Query mentioning 'concentração' and 'carteira' routes to gestor."""
    registry = AgentRegistry(souls_dir=SOULS_DIR)
    dispatcher = AgentDispatcher(registry=registry)
    agent, confidence = dispatcher.route("Qual o limite de concentração na carteira do FIDC?")
    assert agent is not None
    assert agent.slug == "gestor", f"Expected gestor, got {agent.slug}"


def test_dispatcher_routes_custodiante_query():
    """Query mentioning 'custódia' and 'reconciliação' routes to custodiante."""
    registry = AgentRegistry(souls_dir=SOULS_DIR)
    dispatcher = AgentDispatcher(registry=registry)
    agent, confidence = dispatcher.route("Quem é responsável pela custódia e reconciliação dos ativos?")
    assert agent is not None
    assert agent.slug == "custodiante", f"Expected custodiante, got {agent.slug}"


def test_dispatcher_routes_pld_to_compliance():
    """Query mentioning 'PLD' and 'AML' routes to compliance."""
    registry = AgentRegistry(souls_dir=SOULS_DIR)
    dispatcher = AgentDispatcher(registry=registry)
    agent, confidence = dispatcher.route("Quais são as obrigações de PLD e AML para o FIDC?")
    assert agent is not None
    assert agent.slug == "compliance", f"Expected compliance, got {agent.slug}"


def test_dispatcher_unknown_query_defaults_to_administrador():
    """A query with no recognised keywords defaults to administrador."""
    registry = AgentRegistry(souls_dir=SOULS_DIR)
    dispatcher = AgentDispatcher(registry=registry)
    # Deliberately generic — no keywords from any routing table
    agent, confidence = dispatcher.route("olá tudo bem")
    assert agent is not None
    assert agent.slug == "administrador", f"Expected administrador, got {agent.slug}"


def test_dispatcher_confidence_is_float():
    """route() always returns a float confidence in [0, 1]."""
    registry = AgentRegistry(souls_dir=SOULS_DIR)
    dispatcher = AgentDispatcher(registry=registry)
    _, confidence = dispatcher.route("risco de concentração e covenant")
    assert isinstance(confidence, float)
    assert 0.0 <= confidence <= 1.0


def test_registry_get_by_slug():
    """registry.get() returns the correct agent by slug."""
    registry = AgentRegistry(souls_dir=SOULS_DIR)
    agent = registry.get("gestor")
    assert agent is not None
    assert agent.slug == "gestor"
