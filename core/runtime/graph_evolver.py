"""Graph Evolver — Auto-recuperação e evolução de grafos de execução Paganini.

Quando um nó do grafo de agente falha, o GraphEvolver implementa uma árvore
de decisão para determinar como prosseguir:

    Tentativa 1 → RETRY (mesmos parâmetros)
    Tentativa 2 → RETRY com backoff e input simplificado
    Tentativa 3 → SKIP (se nó opcional) ou REROUTE (se alternativa existe)
    Tentativa 4+ → ESCALATE (criar ticket HITL)

Todas as evoluções são registradas em JSONL para aprendizado futuro.

Integration points (não implementados aqui):
    - Publica GRAPH_EVOLVED no EventBus
    - Cria EscalationTicket via EscalationManager ao escalar
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from core.runtime.event_bus import EventBus
    from core.runtime.escalation import EscalationManager

logger = logging.getLogger(__name__)

_DEFAULT_EVOLUTION_LOG_PATH = "data/evolutions"

# ---------------------------------------------------------------------------
# EvolutionType — decisões possíveis do evolver
# ---------------------------------------------------------------------------

EVOLUTION_RETRY = "retry"
EVOLUTION_RETRY_MODIFIED = "retry_modified"
EVOLUTION_SKIP = "skip"
EVOLUTION_REROUTE = "reroute"
EVOLUTION_ESCALATE = "escalate"


# ---------------------------------------------------------------------------
# EvolutionRecord — registro histórico de uma evolução
# ---------------------------------------------------------------------------

@dataclass
class EvolutionRecord:
    """Registro de uma evolução do grafo de execução.

    Attributes:
        record_id:       Identificador único do registro.
        agent_id:        Agente que sofreu a evolução.
        fund_id:         Fundo associado.
        original_graph:  Sequência de nós que falhou.
        failure_node:    Nó específico onde ocorreu a falha.
        failure_reason:  Mensagem de erro ou causa da falha.
        evolved_graph:   Nova sequência de nós após a evolução.
        evolution_type:  Tipo da evolução aplicada (retry, skip, reroute, escalate).
        attempt:         Número da tentativa que gerou esta evolução.
        timestamp:       Momento da evolução (UTC).
        extra:           Dados adicionais (backoff, simplified_input, etc.).
    """

    record_id: str
    agent_id: str
    fund_id: str
    original_graph: list[str]
    failure_node: str
    failure_reason: str
    evolved_graph: list[str]
    evolution_type: str
    attempt: int
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Serializa para dicionário JSON-safe."""
        return {
            "record_id": self.record_id,
            "agent_id": self.agent_id,
            "fund_id": self.fund_id,
            "original_graph": self.original_graph,
            "failure_node": self.failure_node,
            "failure_reason": self.failure_reason,
            "evolved_graph": self.evolved_graph,
            "evolution_type": self.evolution_type,
            "attempt": self.attempt,
            "timestamp": self.timestamp.isoformat(),
            "extra": self.extra,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "EvolutionRecord":
        """Deserializa a partir de dicionário."""
        return cls(
            record_id=data["record_id"],
            agent_id=data["agent_id"],
            fund_id=data["fund_id"],
            original_graph=data["original_graph"],
            failure_node=data["failure_node"],
            failure_reason=data["failure_reason"],
            evolved_graph=data["evolved_graph"],
            evolution_type=data["evolution_type"],
            attempt=data["attempt"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            extra=data.get("extra", {}),
        )


# ---------------------------------------------------------------------------
# EvolutionDecision — resultado da decisão do evolver
# ---------------------------------------------------------------------------

@dataclass
class EvolutionDecision:
    """Resultado de uma decisão de evolução do grafo.

    Attributes:
        evolution_type:   O que fazer (retry, retry_modified, skip, reroute, escalate).
        evolved_graph:    Nova sequência de nós a executar.
        record:           O EvolutionRecord associado, para logging.
        backoff_seconds:  Tempo de espera antes de nova tentativa (0 se não aplicável).
        escalation_id:    ID do ticket criado, se evolution_type == "escalate".
        message:          Mensagem descritiva da decisão.
    """

    evolution_type: str
    evolved_graph: list[str]
    record: EvolutionRecord
    backoff_seconds: float = 0.0
    escalation_id: str | None = None
    message: str = ""


# ---------------------------------------------------------------------------
# GraphEvolver — motor de auto-recuperação
# ---------------------------------------------------------------------------

class GraphEvolver:
    """Evolui o grafo de execução de agentes quando falhas ocorrem.

    Implementa a árvore de decisão de recuperação:
    - Tentativa 1: RETRY com os mesmos parâmetros
    - Tentativa 2: RETRY com backoff exponencial e input simplificado
    - Tentativa 3: SKIP (se nó marcado como opcional) ou REROUTE (se alternativa existe)
    - Tentativa 4+: ESCALATE — cria ticket HITL para intervenção humana

    O histórico de evoluções é gravado em JSONL para análise e aprendizado.

    Integration:
        Ao escalar (tentativa 4+), o GraphEvolver chama EscalationManager.create_ticket()
        e publica EventType.GRAPH_EVOLVED no EventBus.
    """

    def __init__(
        self,
        max_retries: int = 3,
        evolution_log_path: str = _DEFAULT_EVOLUTION_LOG_PATH,
        event_bus: "EventBus | None" = None,
        escalation_manager: "EscalationManager | None" = None,
        # Nós considerados opcionais (podem ser skipped)
        optional_nodes: set[str] | None = None,
        # Mapa de nós alternativos: {node_id: [alt_node_id, ...]}
        alternative_routes: dict[str, list[str]] | None = None,
    ) -> None:
        self._max_retries = max_retries
        self._log_path = Path(evolution_log_path)
        self._event_bus = event_bus
        self._escalation_manager = escalation_manager
        self._optional_nodes: set[str] = optional_nodes or set()
        self._alternative_routes: dict[str, list[str]] = alternative_routes or {}
        self._lock = asyncio.Lock()

    async def handle_failure(
        self,
        agent_id: str,
        fund_id: str,
        failed_node: str,
        error: str,
        graph: list[str],
        attempt: int,
    ) -> EvolutionDecision:
        """Decide como tratar uma falha de nó e registra a evolução.

        Args:
            agent_id:    Agente em execução.
            fund_id:     Fundo associado.
            failed_node: Nó que falhou.
            error:       Mensagem de erro ou exceção.
            graph:       Sequência de nós atual (order matters).
            attempt:     Número da tentativa (1-based).

        Returns:
            EvolutionDecision com o plano de ação.
        """
        record_id = f"evo_{uuid.uuid4().hex[:12]}"

        if attempt == 1:
            # Tentativa 1: Retry com mesmos parâmetros
            decision = self._decide_retry(
                record_id, agent_id, fund_id, failed_node, error, graph, attempt,
                modified=False,
            )

        elif attempt == 2:
            # Tentativa 2: Retry com backoff e input simplificado
            decision = self._decide_retry(
                record_id, agent_id, fund_id, failed_node, error, graph, attempt,
                modified=True,
            )

        elif attempt == 3:
            # Tentativa 3: Skip se opcional, Reroute se alternativa existe
            decision = self._decide_skip_or_reroute(
                record_id, agent_id, fund_id, failed_node, error, graph, attempt,
            )

        else:
            # Tentativa 4+: Escalate para humano
            decision = await self._decide_escalate(
                record_id, agent_id, fund_id, failed_node, error, graph, attempt,
            )

        # Persiste o registro de evolução
        await self.record_evolution(decision.record)

        # Publica evento GRAPH_EVOLVED no EventBus (se disponível)
        await self._publish_evolution_event(decision)

        logger.info(
            "GraphEvolver [%s/%s] nó='%s' attempt=%d → %s",
            agent_id, fund_id, failed_node, attempt, decision.evolution_type,
        )

        return decision

    # ------------------------------------------------------------------ #
    # Helpers de decisão                                                    #
    # ------------------------------------------------------------------ #

    def _make_record(
        self,
        record_id: str,
        agent_id: str,
        fund_id: str,
        failed_node: str,
        error: str,
        graph: list[str],
        evolved_graph: list[str],
        evolution_type: str,
        attempt: int,
        extra: dict[str, Any] | None = None,
    ) -> EvolutionRecord:
        return EvolutionRecord(
            record_id=record_id,
            agent_id=agent_id,
            fund_id=fund_id,
            original_graph=list(graph),
            failure_node=failed_node,
            failure_reason=error,
            evolved_graph=evolved_graph,
            evolution_type=evolution_type,
            attempt=attempt,
            extra=extra or {},
        )

    def _decide_retry(
        self,
        record_id: str,
        agent_id: str,
        fund_id: str,
        failed_node: str,
        error: str,
        graph: list[str],
        attempt: int,
        modified: bool,
    ) -> EvolutionDecision:
        """Gera decisão de retry (simples ou modificado)."""
        backoff = 0.0
        evolution_type = EVOLUTION_RETRY
        extra: dict[str, Any] = {}

        if modified:
            # Backoff exponencial: 2^(attempt-1) segundos, máx 30s
            backoff = min(2 ** (attempt - 1), 30.0)
            evolution_type = EVOLUTION_RETRY_MODIFIED
            extra = {"backoff_seconds": backoff, "simplified_input": True}

        record = self._make_record(
            record_id, agent_id, fund_id, failed_node, error,
            graph, list(graph), evolution_type, attempt, extra,
        )
        return EvolutionDecision(
            evolution_type=evolution_type,
            evolved_graph=list(graph),
            record=record,
            backoff_seconds=backoff,
            message=f"Retrying node '{failed_node}' (attempt {attempt})" + (
                f" with {backoff:.0f}s backoff" if modified else ""
            ),
        )

    def _decide_skip_or_reroute(
        self,
        record_id: str,
        agent_id: str,
        fund_id: str,
        failed_node: str,
        error: str,
        graph: list[str],
        attempt: int,
    ) -> EvolutionDecision:
        """Tenta skip (se nó opcional) ou reroute (se alternativa existe)."""
        # Tenta reroute primeiro — alternativa pode oferecer comportamento equivalente
        alternatives = self._alternative_routes.get(failed_node, [])
        if alternatives:
            # Substitui o nó falho pelo primeiro alternativo no grafo
            evolved = []
            for node in graph:
                if node == failed_node:
                    evolved.append(alternatives[0])
                else:
                    evolved.append(node)
            record = self._make_record(
                record_id, agent_id, fund_id, failed_node, error,
                graph, evolved, EVOLUTION_REROUTE, attempt,
                extra={"alternative_node": alternatives[0]},
            )
            return EvolutionDecision(
                evolution_type=EVOLUTION_REROUTE,
                evolved_graph=evolved,
                record=record,
                message=f"Rerouting '{failed_node}' → '{alternatives[0]}'",
            )

        # Tenta skip se o nó é opcional
        if failed_node in self._optional_nodes:
            evolved = [n for n in graph if n != failed_node]
            record = self._make_record(
                record_id, agent_id, fund_id, failed_node, error,
                graph, evolved, EVOLUTION_SKIP, attempt,
                extra={"skipped_node": failed_node},
            )
            return EvolutionDecision(
                evolution_type=EVOLUTION_SKIP,
                evolved_graph=evolved,
                record=record,
                message=f"Skipping optional node '{failed_node}'",
            )

        # Nem skip nem reroute possível — forçar escalate
        logger.warning(
            "GraphEvolver: nó '%s' não é opcional e não tem rota alternativa — forçando escalate",
            failed_node,
        )
        # Retorna escalate síncrono com record de escalate (sem criar ticket aqui)
        record = self._make_record(
            record_id, agent_id, fund_id, failed_node, error,
            graph, list(graph), EVOLUTION_ESCALATE, attempt,
            extra={"reason": "no_skip_or_reroute_available"},
        )
        return EvolutionDecision(
            evolution_type=EVOLUTION_ESCALATE,
            evolved_graph=list(graph),
            record=record,
            message=(
                f"Cannot skip or reroute '{failed_node}' — escalating to HITL"
            ),
        )

    async def _decide_escalate(
        self,
        record_id: str,
        agent_id: str,
        fund_id: str,
        failed_node: str,
        error: str,
        graph: list[str],
        attempt: int,
    ) -> EvolutionDecision:
        """Gera decisão de escalate e cria ticket HITL se EscalationManager disponível."""
        escalation_id: str | None = None

        if self._escalation_manager is not None:
            from core.runtime.escalation import EscalationTicket, Severity
            ticket = EscalationTicket(
                ticket_id=f"ticket_{uuid.uuid4().hex[:12]}",
                agent_id=agent_id,
                fund_id=fund_id,
                severity=Severity.HIGH,
                cause=f"Node '{failed_node}' failed {attempt} times: {error[:200]}",
                suggested_action=(
                    "Review agent execution logs and retry manually, or modify the agent graph."
                ),
                evidence={
                    "failed_node": failed_node,
                    "error": error,
                    "attempt": attempt,
                    "graph": graph,
                },
            )
            escalation_id = await self._escalation_manager.create_ticket(ticket)

        record = self._make_record(
            record_id, agent_id, fund_id, failed_node, error,
            graph, list(graph), EVOLUTION_ESCALATE, attempt,
            extra={"escalation_id": escalation_id, "attempts_exhausted": attempt},
        )
        return EvolutionDecision(
            evolution_type=EVOLUTION_ESCALATE,
            evolved_graph=list(graph),
            record=record,
            escalation_id=escalation_id,
            message=(
                f"Escalating after {attempt} failed attempts on '{failed_node}'. "
                f"Ticket: {escalation_id}"
            ),
        )

    # ------------------------------------------------------------------ #
    # Persistência e histórico                                              #
    # ------------------------------------------------------------------ #

    async def record_evolution(self, record: EvolutionRecord) -> None:
        """Grava um EvolutionRecord no log JSONL do agente.

        Args:
            record: O registro a persistir.
        """
        async with self._lock:
            self._log_path.mkdir(parents=True, exist_ok=True)
            log_file = self._log_path / f"{record.agent_id}.jsonl"
            try:
                with open(log_file, "a", encoding="utf-8") as f:
                    f.write(json.dumps(record.to_dict(), default=str) + "\n")
            except Exception as exc:
                logger.warning("Falha ao gravar evolution log: %s", exc)

    async def get_evolution_history(self, agent_id: str) -> list[EvolutionRecord]:
        """Retorna o histórico de evoluções de um agente, mais recente primeiro.

        Args:
            agent_id: Identificador do agente.

        Returns:
            Lista de EvolutionRecord ordenados por timestamp desc.
        """
        log_file = self._log_path / f"{agent_id}.jsonl"
        if not log_file.exists():
            return []

        records: list[EvolutionRecord] = []
        try:
            for line in log_file.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(EvolutionRecord.from_dict(json.loads(line)))
                except Exception as exc:
                    logger.warning("Linha inválida no evolution log: %s", exc)
        except Exception as exc:
            logger.warning("Falha ao ler evolution log de %s: %s", agent_id, exc)

        return sorted(records, key=lambda r: r.timestamp, reverse=True)

    # ------------------------------------------------------------------ #
    # EventBus integration                                                  #
    # ------------------------------------------------------------------ #

    async def _publish_evolution_event(self, decision: EvolutionDecision) -> None:
        """Publica GRAPH_EVOLVED no EventBus se disponível."""
        if self._event_bus is None:
            return
        try:
            from core.runtime.event_bus import AgentEvent, EventType
            event = AgentEvent(
                event_type=EventType.GRAPH_EVOLVED,
                agent_id=decision.record.agent_id,
                fund_id=decision.record.fund_id,
                payload={
                    "evolution_type": decision.evolution_type,
                    "failed_node": decision.record.failure_node,
                    "attempt": decision.record.attempt,
                    "evolved_graph": decision.evolved_graph,
                    "escalation_id": decision.escalation_id,
                },
            )
            await self._event_bus.publish(event)
        except Exception as exc:
            logger.warning("Falha ao publicar GRAPH_EVOLVED no EventBus: %s", exc)
