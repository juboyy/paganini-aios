"""Tests for daemon scheduler."""

from core.runtime.daemons import DaemonRunner, DaemonTask


def test_daemon_task():
    task = DaemonTask(
        name="test_daemon",
        interval_seconds=1800,
        description="Test daemon",
    )
    assert task.name == "test_daemon"
    assert task.interval_seconds == 1800
    assert task.status == "idle"
    assert task.run_count == 0


def test_daemon_task_is_due():
    import time
    task = DaemonTask(
        name="test",
        interval_seconds=60,
        next_run=time.time() - 10,  # past due
    )
    assert task.is_due() is True


def test_daemon_task_not_due():
    import time
    task = DaemonTask(
        name="test",
        interval_seconds=60,
        next_run=time.time() + 3600,  # far future
    )
    assert task.is_due() is False


def test_daemon_task_mark_done():
    task = DaemonTask(name="test", interval_seconds=60)
    task.mark_running()
    assert task.status == "running"
    task.mark_done(success=True)
    assert task.status == "idle"
    assert task.run_count == 1


def test_daemon_task_to_dict():
    task = DaemonTask(name="test", interval_seconds=60)
    d = task.to_dict()
    assert d["name"] == "test"
    assert "status" in d


def test_runner_init():
    runner = DaemonRunner({})
    assert isinstance(runner, DaemonRunner)
