"""Event Bus — Sistema pub/sub para comunicação entre agentes Paganini.

Permite que agentes:
- Publiquem eventos sobre sua execução e estado
- Assinem eventos de outros agentes
- Coordenem com base em mudanças de estado compartilhado

Integration points (não implementados aqui):
    - COST_THRESHOLD_HIT → consumido por core/metering/alerts.py
    - GUARDRAIL_TRIGGERED → consumido por core/guardrails/
    - Todos os eventos alimentam o Pixel Office (visualização de estado)

Debug logging:
    PAGANINI_DEBUG_EVENTS=1      → grava em data/event_logs/<ts>.jsonl
    PAGANINI_DEBUG_EVENTS=/path  → grava no diretório especificado
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from pathlib import Path
from typing import IO, Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Debug event logging — gated by PAGANINI_DEBUG_EVENTS env var
# ---------------------------------------------------------------------------
_DEBUG_RAW = os.environ.get("PAGANINI_DEBUG_EVENTS", "").strip()
_DEBUG_ENABLED = _DEBUG_RAW.lower() in ("1", "true", "full") or (
    bool(_DEBUG_RAW) and _DEBUG_RAW.lower() not in ("0", "false", "")
)

_debug_log_file: IO[str] | None = None
_debug_log_ready: bool = False  # lazy-init guard


def _open_debug_log() -> IO[str] | None:
    """Abre o arquivo de log de eventos JSONL. Retorna None se desabilitado."""
    if not _DEBUG_ENABLED:
        return None
    raw = _DEBUG_RAW
    if raw.lower() in ("1", "true", "full"):
        log_dir = Path("data") / "event_logs"
    else:
        log_dir = Path(raw)
    log_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = log_dir / f"{ts}.jsonl"
    logger.info("Paganini event debug log → %s", path)
    return open(path, "a", encoding="utf-8")  # noqa: SIM115


# ---------------------------------------------------------------------------
# EventType — tipos de eventos do sistema
# ---------------------------------------------------------------------------

class EventType(StrEnum):
    """Tipos de eventos publicáveis no barramento Paganini."""

    # Ciclo de vida do agente
    AGENT_STARTED = "agent_started"
    AGENT_COMPLETED = "agent_completed"
    AGENT_FAILED = "agent_failed"
    AGENT_STALLED = "agent_stalled"

    # Checkpoints e recuperação
    CHECKPOINT_CREATED = "checkpoint_created"

    # Human-in-the-Loop
    HITL_REQUESTED = "hitl_requested"
    HITL_RESOLVED = "hitl_resolved"

    # Guardrails
    GUARDRAIL_TRIGGERED = "guardrail_triggered"

    # Custo e metering
    COST_THRESHOLD_HIT = "cost_threshold_hit"

    # Evolução do grafo de execução
    GRAPH_EVOLVED = "graph_evolved"

    # Wildcard — subscrição em todos os eventos
    WILDCARD = "*"


# ---------------------------------------------------------------------------
# AgentEvent — payload de um evento
# ---------------------------------------------------------------------------

@dataclass
class AgentEvent:
    """Evento publicado no barramento Paganini.

    Attributes:
        event_type: Tipo do evento (ver EventType).
        agent_id:   Identificador do agente que originou o evento.
        fund_id:    Fundo associado, se aplicável.
        timestamp:  Momento da criação (UTC).
        payload:    Dados adicionais específicos do evento.
    """

    event_type: EventType
    agent_id: str
    fund_id: str | None = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    payload: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Serializa o evento para dicionário JSON-safe."""
        return {
            "event_type": str(self.event_type),
            "agent_id": self.agent_id,
            "fund_id": self.fund_id,
            "timestamp": self.timestamp.isoformat(),
            "payload": self.payload,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AgentEvent":
        """Deserializa um evento a partir de dicionário."""
        return cls(
            event_type=EventType(data["event_type"]),
            agent_id=data["agent_id"],
            fund_id=data.get("fund_id"),
            timestamp=datetime.fromisoformat(data["timestamp"]),
            payload=data.get("payload", {}),
        )


# Tipo para handlers de evento
EventHandler = Callable[[AgentEvent], Awaitable[None]]

_WILDCARD = EventType.WILDCARD


# ---------------------------------------------------------------------------
# Subscription — metadados de uma subscrição
# ---------------------------------------------------------------------------

@dataclass
class Subscription:
    """Representa uma subscrição ativa no EventBus."""

    subscription_id: str
    event_type: EventType  # EventType.WILDCARD aceita todos
    handler: EventHandler


# ---------------------------------------------------------------------------
# EventBus — barramento principal
# ---------------------------------------------------------------------------

class EventBus:
    """Barramento pub/sub assíncrono para eventos Paganini.

    Features:
    - Thread-safe via asyncio.Lock
    - Suporte a subscrições wildcard (subscribe a EventType.WILDCARD)
    - Debug logging em JSONL via PAGANINI_DEBUG_EVENTS=1
    - Execução concorrente de handlers com proteção de semáforo

    Example::

        bus = EventBus()

        async def on_agent_started(event: AgentEvent) -> None:
            print(f"Agent {event.agent_id} started")

        sub_id = await bus.subscribe(EventType.AGENT_STARTED, on_agent_started)

        await bus.publish(AgentEvent(
            event_type=EventType.AGENT_STARTED,
            agent_id="gestor",
            fund_id="fic001",
            payload={"task": "allocation"},
        ))

        await bus.unsubscribe(sub_id)
    """

    def __init__(self, max_concurrent_handlers: int = 10) -> None:
        self._subscriptions: dict[str, Subscription] = {}
        self._lock = asyncio.Lock()
        self._semaphore = asyncio.Semaphore(max_concurrent_handlers)

    async def subscribe(
        self,
        event_type: EventType,
        handler: EventHandler,
    ) -> str:
        """Subscribe a handler to an event type.

        Use EventType.WILDCARD to receive all events.

        Args:
            event_type: The event type to subscribe to, or WILDCARD for all.
            handler:    Async callable invoked when a matching event is published.

        Returns:
            A subscription ID that can be used to unsubscribe.
        """
        sub_id = f"sub_{uuid.uuid4().hex[:12]}"
        subscription = Subscription(
            subscription_id=sub_id,
            event_type=event_type,
            handler=handler,
        )
        async with self._lock:
            self._subscriptions[sub_id] = subscription
        logger.debug("EventBus: subscribed %s → %s", sub_id, event_type)
        return sub_id

    async def unsubscribe(self, subscription_id: str) -> None:
        """Remove uma subscrição pelo ID.

        Args:
            subscription_id: ID retornado por subscribe().
        """
        async with self._lock:
            removed = self._subscriptions.pop(subscription_id, None)
        if removed:
            logger.debug("EventBus: unsubscribed %s", subscription_id)
        else:
            logger.warning("EventBus: subscription not found: %s", subscription_id)

    async def publish(self, event: AgentEvent) -> None:
        """Publica um evento para todos os subscribers correspondentes.

        Handlers wildcard recebem todos os eventos.
        Handlers de tipo específico recebem apenas eventos daquele tipo.
        Falhas em handlers individuais não interrompem a entrega aos demais.

        Args:
            event: O evento a publicar.
        """
        # Debug JSONL logging
        await self._write_debug_log(event)

        # Collect matching handlers under lock to avoid mutation during iteration
        async with self._lock:
            matching = [
                sub.handler
                for sub in self._subscriptions.values()
                if sub.event_type is _WILDCARD or sub.event_type == event.event_type
            ]

        if matching:
            await self._dispatch(event, matching)

    async def _dispatch(self, event: AgentEvent, handlers: list[EventHandler]) -> None:
        """Executa todos os handlers concorrentemente com rate limiting."""

        async def _run(handler: EventHandler) -> None:
            async with self._semaphore:
                try:
                    await handler(event)
                except Exception:
                    logger.exception(
                        "EventBus: handler error for event %s (agent=%s)",
                        event.event_type,
                        event.agent_id,
                    )

        await asyncio.gather(*[_run(h) for h in handlers], return_exceptions=True)

    async def _write_debug_log(self, event: AgentEvent) -> None:
        """Grava o evento no arquivo de debug JSONL (se habilitado)."""
        if not _DEBUG_ENABLED:
            return
        global _debug_log_file, _debug_log_ready  # noqa: PLW0603
        if not _debug_log_ready:
            _debug_log_file = _open_debug_log()
            _debug_log_ready = True
        if _debug_log_file is not None:
            try:
                line = json.dumps(event.to_dict(), default=str)
                _debug_log_file.write(line + "\n")
                _debug_log_file.flush()
            except Exception:
                pass  # nunca quebrar a entrega de eventos por falha de log

    def get_subscription_count(self) -> int:
        """Retorna o número de subscrições ativas (útil para testes)."""
        return len(self._subscriptions)


# ---------------------------------------------------------------------------
# Singleton global (opcional — módulos podem criar instâncias próprias)
# ---------------------------------------------------------------------------

_global_bus: EventBus | None = None


def get_event_bus() -> EventBus:
    """Returns the global EventBus singleton.

    Modules that need a shared bus (e.g. metering, guardrails) use this.
    Tests should create their own EventBus() instances for isolation.
    """
    global _global_bus  # noqa: PLW0603
    if _global_bus is None:
        _global_bus = EventBus()
    return _global_bus


def reset_event_bus() -> None:
    """Resets the global singleton. Intended for use in tests only."""
    global _global_bus  # noqa: PLW0603
    _global_bus = None
