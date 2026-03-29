"""core.runtime — Paganini AIOS Runtime Layer.

Fornece os primitivos de execução resiliente para agentes Paganini:

    from core.runtime import EventBus, EventType, AgentEvent
    from core.runtime import Checkpoint, CheckpointStore, RecoveryManager
    from core.runtime import GraphEvolver, EvolutionDecision
    from core.runtime import EscalationTicket, EscalationManager, Severity

Módulos:
    event_bus     — Barramento pub/sub assíncrono para eventos inter-agente
    checkpoint    — Persistência de estado e recuperação de crashes
    graph_evolver — Auto-recuperação e evolução de grafos de execução
    escalation    — Tickets HITL para intervenção humana

Integration points:
    EventBus.COST_THRESHOLD_HIT  → core/metering/alerts.py
    EventBus.GUARDRAIL_TRIGGERED → core/guardrails/
    GraphEvolver → EscalationManager → Telegram HITL notification
    CheckpointStore → AgentDispatcher crash recovery
    All events → Pixel Office visualization
"""

from core.runtime.event_bus import (
    AgentEvent,
    EventBus,
    EventHandler,
    EventType,
    Subscription,
    get_event_bus,
    reset_event_bus,
)
from core.runtime.checkpoint import (
    Checkpoint,
    CheckpointConfig,
    CheckpointStore,
    RecoveryManager,
)
from core.runtime.graph_evolver import (
    EvolutionDecision,
    EvolutionRecord,
    GraphEvolver,
    EVOLUTION_ESCALATE,
    EVOLUTION_RETRY,
    EVOLUTION_RETRY_MODIFIED,
    EVOLUTION_REROUTE,
    EVOLUTION_SKIP,
)
from core.runtime.escalation import (
    EscalationManager,
    EscalationTicket,
    Severity,
)

__all__ = [
    # Event Bus
    "AgentEvent",
    "EventBus",
    "EventHandler",
    "EventType",
    "Subscription",
    "get_event_bus",
    "reset_event_bus",
    # Checkpoint
    "Checkpoint",
    "CheckpointConfig",
    "CheckpointStore",
    "RecoveryManager",
    # Graph Evolver
    "EvolutionDecision",
    "EvolutionRecord",
    "GraphEvolver",
    "EVOLUTION_ESCALATE",
    "EVOLUTION_RETRY",
    "EVOLUTION_RETRY_MODIFIED",
    "EVOLUTION_REROUTE",
    "EVOLUTION_SKIP",
    # Escalation
    "EscalationManager",
    "EscalationTicket",
    "Severity",
]
