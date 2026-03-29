"""Tests for core.runtime.checkpoint — CheckpointStore and RecoveryManager.

Run with:
    cd /path/to/paganini && python -m pytest tests/test_runtime/test_checkpoint.py -v
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from core.runtime.checkpoint import (
    Checkpoint,
    CheckpointConfig,
    CheckpointStore,
    RecoveryManager,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_checkpoint(
    agent_id: str = "gestor",
    fund_id: str = "fic001",
    node_id: str = "risk_analysis",
    state: dict | None = None,
    memory: dict | None = None,
) -> Checkpoint:
    return Checkpoint.create(
        agent_id=agent_id,
        fund_id=fund_id,
        node_id=node_id,
        state=state or {"step": 1, "data": {"x": 42}},
        memory=memory or {"shared_key": "shared_value"},
    )


# ---------------------------------------------------------------------------
# Tests: CheckpointConfig
# ---------------------------------------------------------------------------

def test_checkpoint_config_defaults():
    """CheckpointConfig tem valores padrão corretos."""
    cfg = CheckpointConfig()
    assert cfg.enabled is True
    assert cfg.checkpoint_on_start is True
    assert cfg.checkpoint_on_complete is True
    assert cfg.max_age_days == 7
    assert cfg.async_write is True


def test_checkpoint_config_custom():
    """CheckpointConfig aceita valores customizados."""
    cfg = CheckpointConfig(enabled=False, max_age_days=30, async_write=False)
    assert cfg.enabled is False
    assert cfg.max_age_days == 30
    assert cfg.async_write is False


# ---------------------------------------------------------------------------
# Tests: Checkpoint serialization
# ---------------------------------------------------------------------------

def test_checkpoint_create_generates_id():
    """Checkpoint.create() gera um checkpoint_id único."""
    c1 = make_checkpoint()
    c2 = make_checkpoint()
    assert c1.checkpoint_id != c2.checkpoint_id
    assert c1.checkpoint_id.startswith("ckpt_")


def test_checkpoint_serialization_roundtrip():
    """Checkpoint serializa e deserializa sem perda de dados."""
    original = make_checkpoint(
        agent_id="risk",
        fund_id="fic002",
        node_id="portfolio_analysis",
        state={"positions": [1, 2, 3], "cash": 1000.0},
        memory={"market_data": {"PETR4": 35.5}},
    )
    data = original.to_dict()
    restored = Checkpoint.from_dict(data)

    assert restored.checkpoint_id == original.checkpoint_id
    assert restored.agent_id == original.agent_id
    assert restored.fund_id == original.fund_id
    assert restored.node_id == original.node_id
    assert restored.state == original.state
    assert restored.memory == original.memory


# ---------------------------------------------------------------------------
# Tests: CheckpointStore save & load
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_save_creates_file(tmp_checkpoint_dir: Path):
    """save() cria arquivo JSON no diretório correto."""
    store = CheckpointStore(base_dir=str(tmp_checkpoint_dir))
    checkpoint = make_checkpoint(agent_id="gestor", fund_id="fic001")

    path = await store.save(checkpoint)

    assert Path(path).exists()
    data = json.loads(Path(path).read_text())
    assert data["checkpoint_id"] == checkpoint.checkpoint_id
    assert data["node_id"] == checkpoint.node_id


@pytest.mark.anyio
async def test_save_creates_correct_directory_structure(tmp_checkpoint_dir: Path):
    """save() cria subdiretórios {agent_id}/{fund_id}/."""
    store = CheckpointStore(base_dir=str(tmp_checkpoint_dir))
    checkpoint = make_checkpoint(agent_id="auditor", fund_id="fic003")

    await store.save(checkpoint)

    expected_dir = tmp_checkpoint_dir / "auditor" / "fic003"
    assert expected_dir.is_dir()
    assert any(expected_dir.glob("*.json"))


@pytest.mark.anyio
async def test_load_by_id(tmp_checkpoint_dir: Path):
    """load() recupera checkpoint pelo checkpoint_id."""
    store = CheckpointStore(base_dir=str(tmp_checkpoint_dir))
    checkpoint = make_checkpoint()

    await store.save(checkpoint)
    loaded = await store.load(checkpoint.checkpoint_id)

    assert loaded is not None
    assert loaded.checkpoint_id == checkpoint.checkpoint_id
    assert loaded.state == checkpoint.state


@pytest.mark.anyio
async def test_load_nonexistent_returns_none(tmp_checkpoint_dir: Path):
    """load() retorna None para ID inexistente."""
    store = CheckpointStore(base_dir=str(tmp_checkpoint_dir))
    result = await store.load("ckpt_nonexistent_0000")
    assert result is None


@pytest.mark.anyio
async def test_latest_for_agent_returns_most_recent(tmp_checkpoint_dir: Path):
    """latest_for_agent() retorna o checkpoint mais recente."""
    store = CheckpointStore(base_dir=str(tmp_checkpoint_dir))

    c1 = make_checkpoint(node_id="node_a", state={"step": 1})
    c2 = make_checkpoint(node_id="node_b", state={"step": 2})

    await store.save(c1)
    import asyncio; await asyncio.sleep(0.01)  # ensure different mtime
    await store.save(c2)

    latest = await store.latest_for_agent("gestor", "fic001")

    assert latest is not None
    assert latest.node_id == "node_b"
    assert latest.state["step"] == 2


@pytest.mark.anyio
async def test_latest_for_agent_no_checkpoints(tmp_checkpoint_dir: Path):
    """latest_for_agent() retorna None quando não há checkpoints."""
    store = CheckpointStore(base_dir=str(tmp_checkpoint_dir))
    result = await store.latest_for_agent("nonexistent_agent", "fic999")
    assert result is None


# ---------------------------------------------------------------------------
# Tests: CheckpointStore.prune
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_prune_removes_old_checkpoints(tmp_checkpoint_dir: Path):
    """prune() remove checkpoints mais antigos que max_age_days."""
    store = CheckpointStore(base_dir=str(tmp_checkpoint_dir))

    # Create an old checkpoint by writing directly with old timestamp
    old_checkpoint = make_checkpoint(agent_id="risk", fund_id="fic001")
    # Override timestamp to be 10 days old
    old_checkpoint.created_at = datetime.now(timezone.utc) - timedelta(days=10)
    agent_dir = tmp_checkpoint_dir / "risk" / "fic001"
    agent_dir.mkdir(parents=True)
    old_path = agent_dir / f"{old_checkpoint.checkpoint_id}_old.json"
    old_path.write_text(json.dumps(old_checkpoint.to_dict()), encoding="utf-8")

    # Create a recent checkpoint
    recent = make_checkpoint(agent_id="risk", fund_id="fic001", node_id="recent_node")
    await store.save(recent)

    removed = await store.prune(max_age_days=7)

    assert removed == 1
    assert not old_path.exists()
    # Recent checkpoint should still be there
    latest = await store.latest_for_agent("risk", "fic001")
    assert latest is not None
    assert latest.node_id == "recent_node"


@pytest.mark.anyio
async def test_prune_empty_store_returns_zero(tmp_checkpoint_dir: Path):
    """prune() em store vazio retorna 0."""
    store = CheckpointStore(base_dir=str(tmp_checkpoint_dir))
    removed = await store.prune(max_age_days=7)
    assert removed == 0


@pytest.mark.anyio
async def test_prune_keeps_recent_checkpoints(tmp_checkpoint_dir: Path):
    """prune() não remove checkpoints dentro do prazo de retenção."""
    store = CheckpointStore(base_dir=str(tmp_checkpoint_dir))
    checkpoint = make_checkpoint()
    await store.save(checkpoint)

    removed = await store.prune(max_age_days=30)
    assert removed == 0

    # Checkpoint still there
    result = await store.load(checkpoint.checkpoint_id)
    assert result is not None


# ---------------------------------------------------------------------------
# Tests: RecoveryManager
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_can_resume_true_when_checkpoint_exists(tmp_checkpoint_dir: Path, tmp_path: Path):
    """can_resume() retorna True quando existe checkpoint e nenhum marcador de conclusão."""
    store = CheckpointStore(base_dir=str(tmp_checkpoint_dir))
    manager = RecoveryManager(store=store)
    manager._completed_dir = tmp_path / "completed"

    checkpoint = make_checkpoint()
    await store.save(checkpoint)

    result = await manager.can_resume("gestor", "fic001")
    assert result is True


@pytest.mark.anyio
async def test_can_resume_false_when_no_checkpoint(tmp_checkpoint_dir: Path, tmp_path: Path):
    """can_resume() retorna False quando não há checkpoints."""
    store = CheckpointStore(base_dir=str(tmp_checkpoint_dir))
    manager = RecoveryManager(store=store)
    manager._completed_dir = tmp_path / "completed"

    result = await manager.can_resume("gestor", "fic999")
    assert result is False


@pytest.mark.anyio
async def test_can_resume_false_after_mark_completed(tmp_checkpoint_dir: Path, tmp_path: Path):
    """can_resume() retorna False após mark_completed()."""
    store = CheckpointStore(base_dir=str(tmp_checkpoint_dir))
    manager = RecoveryManager(store=store)
    manager._completed_dir = tmp_path / "completed"

    checkpoint = make_checkpoint()
    await store.save(checkpoint)

    await manager.mark_completed("gestor", "fic001")
    result = await manager.can_resume("gestor", "fic001")
    assert result is False


@pytest.mark.anyio
async def test_resume_returns_correct_state(tmp_checkpoint_dir: Path, tmp_path: Path):
    """resume() retorna dicionário com node_id, state e memory corretos."""
    store = CheckpointStore(base_dir=str(tmp_checkpoint_dir))
    manager = RecoveryManager(store=store)
    manager._completed_dir = tmp_path / "completed"

    checkpoint = make_checkpoint(
        node_id="portfolio_rebalance",
        state={"allocation": {"PETR4": 0.3}},
        memory={"market_snapshot": "2026-01-01"},
    )
    await store.save(checkpoint)

    state = await manager.resume("gestor", "fic001")

    assert state["node_id"] == "portfolio_rebalance"
    assert state["state"]["allocation"]["PETR4"] == 0.3
    assert state["memory"]["market_snapshot"] == "2026-01-01"
    assert "checkpoint_id" in state
    assert "created_at" in state


@pytest.mark.anyio
async def test_resume_raises_when_no_checkpoint(tmp_checkpoint_dir: Path, tmp_path: Path):
    """resume() levanta RuntimeError quando não há checkpoint disponível."""
    store = CheckpointStore(base_dir=str(tmp_checkpoint_dir))
    manager = RecoveryManager(store=store)
    manager._completed_dir = tmp_path / "completed"

    with pytest.raises(RuntimeError, match="Nenhum checkpoint disponível"):
        await manager.resume("nonexistent_agent", "fic999")
