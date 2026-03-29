"""Checkpoint & Recovery — Persistência de estado e recuperação de falhas Paganini.

Armazena snapshots do estado do agente em arquivos JSON estruturados sob:
    data/checkpoints/{agent_id}/{fund_id}/

Ao reiniciar após uma falha, o RecoveryManager localiza o último checkpoint
e retoma a execução a partir do nó que foi interrompido.

Integration point (não implementado aqui):
    - CheckpointStore é usado pelo AgentDispatcher para recuperação de crashes
    - Evento CHECKPOINT_CREATED é publicado no EventBus após cada checkpoint salvo
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Diretório base para checkpoints (relativo à raiz do projeto)
_DEFAULT_CHECKPOINT_DIR = "data/checkpoints"
_DEFAULT_COMPLETED_DIR = "data/checkpoints/.completed"


# ---------------------------------------------------------------------------
# CheckpointConfig
# ---------------------------------------------------------------------------

@dataclass
class CheckpointConfig:
    """Configuração de comportamento do sistema de checkpoints.

    Attributes:
        enabled:              Habilita/desabilita checkpoints globalmente.
        checkpoint_on_start:  Cria checkpoint ao iniciar um nó.
        checkpoint_on_complete: Cria checkpoint ao completar um nó.
        max_age_days:         Máximo de dias antes de um checkpoint ser purgado.
        async_write:          Grava checkpoints de forma assíncrona (não bloqueia execução).
    """

    enabled: bool = True
    checkpoint_on_start: bool = True
    checkpoint_on_complete: bool = True
    max_age_days: int = 7
    async_write: bool = True


# ---------------------------------------------------------------------------
# Checkpoint — snapshot de estado de um agente
# ---------------------------------------------------------------------------

@dataclass
class Checkpoint:
    """Snapshot completo do estado de um agente em um dado momento.

    Attributes:
        checkpoint_id: Identificador único do checkpoint.
        agent_id:      Agente que gerou este checkpoint.
        fund_id:       Fundo associado à execução.
        node_id:       Nó do grafo de execução em que foi criado.
        state:         Estado serializado do agente (deve ser JSON-safe).
        memory:        Snapshot da memória compartilhada no momento do checkpoint.
        created_at:    Timestamp de criação (UTC).
    """

    checkpoint_id: str
    agent_id: str
    fund_id: str
    node_id: str
    state: dict[str, Any]
    memory: dict[str, Any]
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict[str, Any]:
        """Serializa o checkpoint para dicionário JSON-safe."""
        return {
            "checkpoint_id": self.checkpoint_id,
            "agent_id": self.agent_id,
            "fund_id": self.fund_id,
            "node_id": self.node_id,
            "state": self.state,
            "memory": self.memory,
            "created_at": self.created_at.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Checkpoint":
        """Deserializa um checkpoint a partir de dicionário."""
        return cls(
            checkpoint_id=data["checkpoint_id"],
            agent_id=data["agent_id"],
            fund_id=data["fund_id"],
            node_id=data["node_id"],
            state=data.get("state", {}),
            memory=data.get("memory", {}),
            created_at=datetime.fromisoformat(data["created_at"]),
        )

    @classmethod
    def create(
        cls,
        agent_id: str,
        fund_id: str,
        node_id: str,
        state: dict[str, Any],
        memory: dict[str, Any] | None = None,
    ) -> "Checkpoint":
        """Factory method — cria um checkpoint com ID gerado automaticamente."""
        return cls(
            checkpoint_id=f"ckpt_{uuid.uuid4().hex[:16]}",
            agent_id=agent_id,
            fund_id=fund_id,
            node_id=node_id,
            state=state,
            memory=memory or {},
        )


# ---------------------------------------------------------------------------
# CheckpointStore — persistência em arquivo JSON
# ---------------------------------------------------------------------------

class CheckpointStore:
    """Armazena e recupera checkpoints como arquivos JSON.

    Estrutura de diretórios::

        data/checkpoints/
        └── {agent_id}/
            └── {fund_id}/
                ├── ckpt_abc123_20260101T120000.json
                └── ckpt_def456_20260101T130000.json

    Thread-safe via asyncio.Lock por caminho de agente+fundo.
    """

    def __init__(self, base_dir: str = _DEFAULT_CHECKPOINT_DIR) -> None:
        self._base = Path(base_dir)
        self._lock = asyncio.Lock()

    def _agent_dir(self, agent_id: str, fund_id: str) -> Path:
        """Resolve o diretório para um par (agent_id, fund_id)."""
        # Sanitize to avoid path traversal
        safe_agent = agent_id.replace("/", "_").replace("..", "_")
        safe_fund = fund_id.replace("/", "_").replace("..", "_")
        return self._base / safe_agent / safe_fund

    def _checkpoint_filename(self, checkpoint: Checkpoint) -> str:
        """Gera o nome do arquivo para um checkpoint."""
        ts = checkpoint.created_at.strftime("%Y%m%dT%H%M%S")
        return f"{checkpoint.checkpoint_id}_{ts}.json"

    async def save(self, checkpoint: Checkpoint) -> str:
        """Persiste um checkpoint em disco.

        Args:
            checkpoint: O checkpoint a salvar.

        Returns:
            O caminho absoluto do arquivo criado.
        """
        target_dir = self._agent_dir(checkpoint.agent_id, checkpoint.fund_id)
        async with self._lock:
            target_dir.mkdir(parents=True, exist_ok=True)
            filename = self._checkpoint_filename(checkpoint)
            path = target_dir / filename
            data = json.dumps(checkpoint.to_dict(), indent=2, default=str)
            path.write_text(data, encoding="utf-8")
        logger.debug(
            "Checkpoint salvo: %s (agent=%s, fund=%s, node=%s)",
            path.name,
            checkpoint.agent_id,
            checkpoint.fund_id,
            checkpoint.node_id,
        )
        return str(path)

    async def load(self, checkpoint_id: str) -> Checkpoint | None:
        """Carrega um checkpoint pelo ID, buscando em todos os diretórios.

        Args:
            checkpoint_id: O checkpoint_id a localizar.

        Returns:
            O Checkpoint carregado, ou None se não encontrado.
        """
        # Search recursively — checkpoint_id is unique across all agents
        for path in self._base.rglob(f"{checkpoint_id}_*.json"):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                return Checkpoint.from_dict(data)
            except Exception as exc:
                logger.warning("Falha ao carregar checkpoint %s: %s", path, exc)
        return None

    async def latest_for_agent(
        self, agent_id: str, fund_id: str
    ) -> Checkpoint | None:
        """Retorna o checkpoint mais recente para um dado agente+fundo.

        Args:
            agent_id: Identificador do agente.
            fund_id:  Identificador do fundo.

        Returns:
            O Checkpoint mais recente, ou None se não houver nenhum.
        """
        target_dir = self._agent_dir(agent_id, fund_id)
        if not target_dir.exists():
            return None

        candidates = sorted(target_dir.glob("*.json"), key=lambda p: p.stat().st_mtime)
        if not candidates:
            return None

        # Mais recente é o último após ordenação por mtime
        for path in reversed(candidates):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                return Checkpoint.from_dict(data)
            except Exception as exc:
                logger.warning("Checkpoint corrompido ignorado %s: %s", path, exc)
        return None

    async def prune(self, max_age_days: int) -> int:
        """Remove checkpoints mais antigos que max_age_days.

        Args:
            max_age_days: Máximo de dias de retenção.

        Returns:
            Número de arquivos removidos.
        """
        if not self._base.exists():
            return 0

        cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)
        removed = 0

        async with self._lock:
            for path in self._base.rglob("*.json"):
                try:
                    data = json.loads(path.read_text(encoding="utf-8"))
                    created_at_str = data.get("created_at", "")
                    created_at = datetime.fromisoformat(created_at_str)
                    # Normalize to UTC if naive
                    if created_at.tzinfo is None:
                        created_at = created_at.replace(tzinfo=timezone.utc)
                    if created_at < cutoff:
                        path.unlink()
                        removed += 1
                        logger.debug("Checkpoint purgado: %s", path.name)
                except Exception as exc:
                    logger.warning("Falha ao verificar checkpoint para purga %s: %s", path, exc)

        logger.info("Purga de checkpoints: %d removidos (max_age=%d dias)", removed, max_age_days)
        return removed

    async def list_for_agent(self, agent_id: str, fund_id: str) -> list[Checkpoint]:
        """Lista todos os checkpoints para um agente+fundo, ordenados por data.

        Útil para auditoria e depuração.
        """
        target_dir = self._agent_dir(agent_id, fund_id)
        if not target_dir.exists():
            return []

        checkpoints = []
        for path in sorted(target_dir.glob("*.json"), key=lambda p: p.stat().st_mtime):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                checkpoints.append(Checkpoint.from_dict(data))
            except Exception:
                pass
        return checkpoints


# ---------------------------------------------------------------------------
# RecoveryManager — recuperação de crashes via checkpoints
# ---------------------------------------------------------------------------

class RecoveryManager:
    """Gerencia a recuperação de agentes após falhas usando checkpoints.

    Fluxo típico::

        manager = RecoveryManager(store)
        if await manager.can_resume("gestor", "fic001"):
            state = await manager.resume("gestor", "fic001")
            # retomar execução a partir de state["node_id"]
        ...
        await manager.mark_completed("gestor", "fic001")

    Integration point:
        - Utilizado pelo AgentDispatcher para verificar se um agente pode
          ser retomado após crash, antes de criar uma nova instância.
    """

    def __init__(self, store: CheckpointStore | None = None) -> None:
        self._store = store or CheckpointStore()
        # Rastreia completions para evitar retomadas desnecessárias
        self._completed_dir = Path(_DEFAULT_COMPLETED_DIR)

    def _completion_marker(self, agent_id: str, fund_id: str) -> Path:
        """Caminho do marcador de conclusão para um agente+fundo."""
        safe_agent = agent_id.replace("/", "_")
        safe_fund = fund_id.replace("/", "_")
        return self._completed_dir / f"{safe_agent}__{safe_fund}.done"

    async def can_resume(self, agent_id: str, fund_id: str) -> bool:
        """Verifica se há um checkpoint disponível para retomada.

        Returns True se existe um checkpoint e o agente não foi marcado
        como concluído (o que indicaria término normal, não crash).

        Args:
            agent_id: Identificador do agente.
            fund_id:  Identificador do fundo.

        Returns:
            True se o agente pode ser retomado a partir de um checkpoint.
        """
        # Se foi marcado como concluído, não retomar
        if self._completion_marker(agent_id, fund_id).exists():
            return False
        checkpoint = await self._store.latest_for_agent(agent_id, fund_id)
        return checkpoint is not None

    async def resume(self, agent_id: str, fund_id: str) -> dict[str, Any]:
        """Carrega o estado para retomada a partir do último checkpoint.

        Args:
            agent_id: Identificador do agente.
            fund_id:  Identificador do fundo.

        Returns:
            Dicionário com ``checkpoint_id``, ``node_id``, ``state``,
            ``memory``, e ``created_at`` — suficiente para o dispatcher
            retomar a execução de onde parou.

        Raises:
            RuntimeError: Se não houver checkpoint disponível.
        """
        checkpoint = await self._store.latest_for_agent(agent_id, fund_id)
        if checkpoint is None:
            raise RuntimeError(
                f"Nenhum checkpoint disponível para retomada: agent={agent_id}, fund={fund_id}"
            )
        logger.info(
            "Retomando agent=%s fund=%s a partir do nó '%s' (checkpoint=%s)",
            agent_id,
            fund_id,
            checkpoint.node_id,
            checkpoint.checkpoint_id,
        )
        return {
            "checkpoint_id": checkpoint.checkpoint_id,
            "node_id": checkpoint.node_id,
            "state": checkpoint.state,
            "memory": checkpoint.memory,
            "created_at": checkpoint.created_at.isoformat(),
        }

    async def mark_completed(self, agent_id: str, fund_id: str) -> None:
        """Marca um agente+fundo como concluído com sucesso.

        Após marcado, can_resume() retorna False, impedindo retomadas
        desnecessárias de execuções que terminaram normalmente.

        Args:
            agent_id: Identificador do agente.
            fund_id:  Identificador do fundo.
        """
        self._completed_dir.mkdir(parents=True, exist_ok=True)
        marker = self._completion_marker(agent_id, fund_id)
        marker.write_text(
            json.dumps({
                "agent_id": agent_id,
                "fund_id": fund_id,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }),
            encoding="utf-8",
        )
        logger.info("Agente marcado como concluído: agent=%s fund=%s", agent_id, fund_id)
