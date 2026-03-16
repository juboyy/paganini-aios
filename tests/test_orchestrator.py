"""Tests for the tmux agent orchestrator."""

from core.runtime.orchestrator import Orchestrator, AgentStatus


def test_orchestrator_init():
    orch = Orchestrator(log_dir="/tmp/pag-test-logs")
    assert orch.session_name == "paganini"
    assert orch.auto_restart is True


def test_spawn_creates_agent_status():
    orch = Orchestrator(log_dir="/tmp/pag-test-logs")
    # Force subprocess fallback (no tmux in CI)
    orch._has_tmux = False
    status = orch.spawn("test_agent", command="echo hello")
    assert status.name == "test_agent"
    assert status.alive is True
    assert status.started_at > 0


def test_list_agents():
    orch = Orchestrator(log_dir="/tmp/pag-test-logs")
    orch._has_tmux = False
    orch.spawn("agent_a", command="echo a")
    orch.spawn("agent_b", command="echo b")
    agents = orch.list_agents()
    names = [a.name for a in agents]
    assert "agent_a" in names
    assert "agent_b" in names


def test_kill_marks_dead():
    orch = Orchestrator(log_dir="/tmp/pag-test-logs")
    orch._has_tmux = False
    orch.spawn("victim", command="sleep 1")
    orch.kill("victim")
    assert not orch._agents["victim"].alive


def test_summary():
    orch = Orchestrator(log_dir="/tmp/pag-test-logs")
    orch._has_tmux = False
    orch.spawn("s1", command="echo s1")
    s = orch.summary()
    assert s["total"] >= 1
    assert s["alive"] >= 1
    assert isinstance(s["agents"], list)


def test_health_check_restarts_dead():
    orch = Orchestrator(log_dir="/tmp/pag-test-logs", auto_restart=True)
    orch._has_tmux = False
    orch.spawn("unstable", command="echo x")
    orch._agents["unstable"].alive = False
    results = orch.health_check()
    assert results["unstable"] == "restarted"
    # Restart happened - agent is alive again
    assert orch._agents["unstable"].alive is True


def test_get_log_empty():
    orch = Orchestrator(log_dir="/tmp/pag-test-logs")
    log = orch.get_log("nonexistent")
    assert log == ""


def test_agent_status_defaults():
    status = AgentStatus(name="test")
    assert not status.alive
    assert status.queries == 0
    assert status.restarts == 0
    assert status.pid is None
