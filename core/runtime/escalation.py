"""Escalation — Gerenciamento de tickets HITL (Human-in-the-Loop) Paganini.

Quando agentes encontram falhas irrecuperáveis ou situações que requerem
julgamento humano, um EscalationTicket é criado e publicado no EventBus.

Tickets são armazenados como arquivos JSON em data/escalations/.

Integration points (não implementados aqui):
    - EventBus: publica HITL_REQUESTED ao criar ticket e HITL_RESOLVED ao resolver
    - core/hitl/telegram_approval.py: notifica operadores via Telegram
    - GraphEvolver: cria tickets ao escalar após múltiplas falhas
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from core.runtime.event_bus import EventBus

logger = logging.getLogger(__name__)

_DEFAULT_ESCALATION_DIR = "data/escalations"


# ---------------------------------------------------------------------------
# Severity — níveis de severidade
# ---------------------------------------------------------------------------

class Severity(StrEnum):
    """Nível de severidade de um ticket de escalação."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ---------------------------------------------------------------------------
# EscalationTicket — estrutura do ticket
# ---------------------------------------------------------------------------

@dataclass
class EscalationTicket:
    """Ticket de escalação para intervenção humana.

    Attributes:
        ticket_id:        Identificador único do ticket.
        agent_id:         Agente que originou a escalação.
        fund_id:          Fundo associado.
        severity:         Nível de urgência (low / medium / high / critical).
        cause:            Descrição legível do problema.
        suggested_action: Ação recomendada ao operador.
        evidence:         Dados de contexto (logs, estado, etc.).
        created_at:       Timestamp de criação (UTC).
        resolved_at:      Timestamp de resolução (None se pendente).
        resolution:       Texto da resolução fornecida pelo operador.
    """

    ticket_id: str
    agent_id: str
    fund_id: str
    severity: Severity
    cause: str
    suggested_action: str
    evidence: dict[str, Any]
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: datetime | None = None
    resolution: str | None = None

    @classmethod
    def create(
        cls,
        agent_id: str,
        fund_id: str,
        severity: Severity,
        cause: str,
        suggested_action: str,
        evidence: dict[str, Any] | None = None,
    ) -> "EscalationTicket":
        """Factory method — cria um ticket com ID gerado automaticamente."""
        return cls(
            ticket_id=f"ticket_{uuid.uuid4().hex[:12]}",
            agent_id=agent_id,
            fund_id=fund_id,
            severity=severity,
            cause=cause,
            suggested_action=suggested_action,
            evidence=evidence or {},
        )

    @property
    def is_pending(self) -> bool:
        """True se o ticket ainda não foi resolvido."""
        return self.resolved_at is None

    def to_dict(self) -> dict[str, Any]:
        """Serializa para dicionário JSON-safe."""
        return {
            "ticket_id": self.ticket_id,
            "agent_id": self.agent_id,
            "fund_id": self.fund_id,
            "severity": str(self.severity),
            "cause": self.cause,
            "suggested_action": self.suggested_action,
            "evidence": self.evidence,
            "created_at": self.created_at.isoformat(),
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolution": self.resolution,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "EscalationTicket":
        """Deserializa a partir de dicionário."""
        return cls(
            ticket_id=data["ticket_id"],
            agent_id=data["agent_id"],
            fund_id=data["fund_id"],
            severity=Severity(data["severity"]),
            cause=data["cause"],
            suggested_action=data["suggested_action"],
            evidence=data.get("evidence", {}),
            created_at=datetime.fromisoformat(data["created_at"]),
            resolved_at=(
                datetime.fromisoformat(data["resolved_at"])
                if data.get("resolved_at")
                else None
            ),
            resolution=data.get("resolution"),
        )


# ---------------------------------------------------------------------------
# EscalationManager — gerenciador de tickets
# ---------------------------------------------------------------------------

class EscalationManager:
    """Gerencia o ciclo de vida de tickets de escalação HITL.

    Tickets são armazenados como arquivos JSON individuais em::

        data/escalations/{ticket_id}.json

    Ao criar e resolver tickets, eventos são publicados no EventBus:
        - HITL_REQUESTED → ao criar
        - HITL_RESOLVED  → ao resolver

    Integration:
        Após publicar HITL_REQUESTED, o core/hitl/telegram_approval.py
        pode escutar o evento e notificar operadores via Telegram.
    """

    def __init__(
        self,
        base_dir: str = _DEFAULT_ESCALATION_DIR,
        event_bus: "EventBus | None" = None,
    ) -> None:
        self._base = Path(base_dir)
        self._event_bus = event_bus
        self._lock = asyncio.Lock()

    def _ticket_path(self, ticket_id: str) -> Path:
        """Resolve o caminho do arquivo de um ticket."""
        safe_id = ticket_id.replace("/", "_").replace("..", "_")
        return self._base / f"{safe_id}.json"

    async def create_ticket(self, ticket: EscalationTicket) -> str:
        """Persiste um ticket de escalação e notifica via EventBus.

        Args:
            ticket: O ticket a criar. Use EscalationTicket.create() como factory.

        Returns:
            O ticket_id do ticket criado.
        """
        async with self._lock:
            self._base.mkdir(parents=True, exist_ok=True)
            path = self._ticket_path(ticket.ticket_id)
            path.write_text(
                json.dumps(ticket.to_dict(), indent=2, default=str),
                encoding="utf-8",
            )

        logger.info(
            "Ticket de escalação criado: %s [%s] agent=%s fund=%s",
            ticket.ticket_id,
            ticket.severity,
            ticket.agent_id,
            ticket.fund_id,
        )

        await self._emit_hitl_requested(ticket)
        return ticket.ticket_id

    async def resolve_ticket(self, ticket_id: str, resolution: str) -> None:
        """Resolve um ticket pendente com uma decisão do operador.

        Args:
            ticket_id:  ID do ticket a resolver.
            resolution: Texto descrevendo a ação tomada pelo operador.

        Raises:
            FileNotFoundError: Se o ticket não existir.
            ValueError:        Se o ticket já estiver resolvido.
        """
        async with self._lock:
            path = self._ticket_path(ticket_id)
            if not path.exists():
                raise FileNotFoundError(f"Ticket não encontrado: {ticket_id}")

            data = json.loads(path.read_text(encoding="utf-8"))
            ticket = EscalationTicket.from_dict(data)

            if not ticket.is_pending:
                raise ValueError(f"Ticket {ticket_id} já foi resolvido em {ticket.resolved_at}")

            ticket.resolved_at = datetime.now(timezone.utc)
            ticket.resolution = resolution
            path.write_text(
                json.dumps(ticket.to_dict(), indent=2, default=str),
                encoding="utf-8",
            )

        logger.info("Ticket %s resolvido: %s", ticket_id, resolution[:100])
        await self._emit_hitl_resolved(ticket)

    async def pending_tickets(
        self, fund_id: str | None = None
    ) -> list[EscalationTicket]:
        """Lista todos os tickets pendentes (não resolvidos).

        Args:
            fund_id: Se fornecido, filtra apenas tickets deste fundo.

        Returns:
            Lista de tickets pendentes, mais recente primeiro.
        """
        tickets = await self._load_all_tickets()
        pending = [t for t in tickets if t.is_pending]
        if fund_id is not None:
            pending = [t for t in pending if t.fund_id == fund_id]
        return sorted(pending, key=lambda t: t.created_at, reverse=True)

    async def ticket_stats(self) -> dict[str, Any]:
        """Retorna estatísticas agregadas dos tickets.

        Returns:
            Dicionário com ``total``, ``pending``, ``resolved``, e
            ``by_severity`` (contagem por nível de severidade).
        """
        tickets = await self._load_all_tickets()
        pending = [t for t in tickets if t.is_pending]
        resolved = [t for t in tickets if not t.is_pending]

        by_severity: dict[str, int] = {s: 0 for s in Severity}
        for t in tickets:
            by_severity[str(t.severity)] = by_severity.get(str(t.severity), 0) + 1

        return {
            "total": len(tickets),
            "pending": len(pending),
            "resolved": len(resolved),
            "by_severity": by_severity,
        }

    async def get_ticket(self, ticket_id: str) -> EscalationTicket | None:
        """Carrega um ticket pelo ID.

        Args:
            ticket_id: O ID do ticket.

        Returns:
            O EscalationTicket, ou None se não encontrado.
        """
        path = self._ticket_path(ticket_id)
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return EscalationTicket.from_dict(data)
        except Exception as exc:
            logger.warning("Falha ao carregar ticket %s: %s", ticket_id, exc)
            return None

    # ------------------------------------------------------------------ #
    # Internals                                                             #
    # ------------------------------------------------------------------ #

    async def _load_all_tickets(self) -> list[EscalationTicket]:
        """Carrega todos os tickets do diretório de escalações."""
        if not self._base.exists():
            return []

        tickets: list[EscalationTicket] = []
        for path in self._base.glob("ticket_*.json"):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                tickets.append(EscalationTicket.from_dict(data))
            except Exception as exc:
                logger.warning("Ticket corrompido ignorado %s: %s", path.name, exc)
        return tickets

    async def _emit_hitl_requested(self, ticket: EscalationTicket) -> None:
        """Publica HITL_REQUESTED no EventBus."""
        if self._event_bus is None:
            return
        try:
            from core.runtime.event_bus import AgentEvent, EventType
            event = AgentEvent(
                event_type=EventType.HITL_REQUESTED,
                agent_id=ticket.agent_id,
                fund_id=ticket.fund_id,
                payload={
                    "ticket_id": ticket.ticket_id,
                    "severity": str(ticket.severity),
                    "cause": ticket.cause,
                    "suggested_action": ticket.suggested_action,
                },
            )
            await self._event_bus.publish(event)
        except Exception as exc:
            logger.warning("Falha ao publicar HITL_REQUESTED: %s", exc)

    async def _emit_hitl_resolved(self, ticket: EscalationTicket) -> None:
        """Publica HITL_RESOLVED no EventBus."""
        if self._event_bus is None:
            return
        try:
            from core.runtime.event_bus import AgentEvent, EventType
            event = AgentEvent(
                event_type=EventType.HITL_RESOLVED,
                agent_id=ticket.agent_id,
                fund_id=ticket.fund_id,
                payload={
                    "ticket_id": ticket.ticket_id,
                    "resolution": ticket.resolution,
                    "resolved_at": ticket.resolved_at.isoformat() if ticket.resolved_at else None,
                },
            )
            await self._event_bus.publish(event)
        except Exception as exc:
            logger.warning("Falha ao publicar HITL_RESOLVED: %s", exc)
