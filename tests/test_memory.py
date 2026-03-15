"""Tests for MemoryManager and its four memory layers."""
from __future__ import annotations

import pytest
from packages.kernel.memory import MemoryManager, SessionMemory


def _manager(tmp_dir, fund_id: str = "test-fund") -> MemoryManager:
    return MemoryManager(config={
        "state_dir": str(tmp_dir / "state"),
        "fund_id": fund_id,
    })


def test_record_interaction_stores_to_episodic(tmp_dir):
    """record_interaction persists to episodic layer."""
    mm = _manager(tmp_dir)
    record = mm.record_interaction(
        query="O que é FIDC?",
        response="FIDC é um fundo de investimento em direitos creditórios.",
        confidence=0.9,
        agent="administrador",
    )
    assert record["id"]
    assert mm.episodic.count() == 1


def test_recall_returns_results(tmp_dir):
    """recall() searches all layers and returns a dict with layer keys."""
    mm = _manager(tmp_dir)
    mm.record_interaction(
        query="concentração por cedente",
        response="O limite é de 10%.",
        confidence=0.9,
    )
    results = mm.recall("concentração")
    assert isinstance(results, dict)
    assert "episodic" in results
    assert "semantic" in results
    assert len(results["episodic"]) > 0


def test_promote_episodic_to_semantic(tmp_dir):
    """promote_episodic_to_semantic promotes high-confidence records."""
    mm = _manager(tmp_dir)
    mm.record_interaction(
        query="PDD IFRS9",
        response="A provisão segue IFRS9.",
        confidence=0.95,
    )
    promoted = mm.promote_episodic_to_semantic()
    # At least one fact should be in semantic after promotion
    assert mm.semantic.count() >= 1


def test_stats_returns_correct_counts(tmp_dir):
    """stats() returns a dict with all four layer counts."""
    mm = _manager(tmp_dir)
    mm.record_interaction("q1", "r1", confidence=0.9)
    mm.record_interaction("q2", "r2", confidence=0.9)
    stats = mm.stats()
    assert "episodic" in stats
    assert "semantic" in stats
    assert "procedural" in stats
    assert "relational" in stats
    assert stats["episodic"] == 2


def test_fund_id_partitioning_creates_separate_directories(tmp_dir):
    """Different fund_id values create separate state directories."""
    mm_a = _manager(tmp_dir, fund_id="fund-alpha")
    mm_b = _manager(tmp_dir, fund_id="fund-beta")
    mm_a.record_interaction("query alpha", "response alpha", confidence=0.9)
    mm_b.record_interaction("query beta", "response beta", confidence=0.9)
    # Each fund has its own count
    assert mm_a.episodic.count() == 1
    assert mm_b.episodic.count() == 1
    # State dirs are different
    assert mm_a._state_dir != mm_b._state_dir


def test_episodic_persistence_across_instances(tmp_dir):
    """EpisodicMemory persists to disk and loads on new instance."""
    mm1 = _manager(tmp_dir)
    mm1.record_interaction("query persist", "response persist", confidence=0.9)
    # New instance, same state_dir + fund_id
    mm2 = _manager(tmp_dir)
    assert mm2.episodic.count() == 1


def test_relational_memory_add_and_search(tmp_dir):
    """Relational memory can store and retrieve entity relations."""
    mm = _manager(tmp_dir)
    mm.relational.add("CVM", "regula", "FIDC", confidence=1.0)
    results = mm.relational.search("CVM regula")
    assert len(results) >= 1


def test_session_memory_tracks_recent_history():
    """SessionMemory keeps bounded history per session."""
    session_memory = SessionMemory(max_history=2)
    session_memory.add("abc", "user", "primeira pergunta")
    session_memory.add("abc", "assistant", "primeira resposta")
    session_memory.add("abc", "user", "segunda pergunta")

    history = session_memory.get_history("abc", limit=5)
    assert len(history) == 2
    assert history[0]["content"] == "primeira resposta"
    assert history[1]["content"] == "segunda pergunta"
