from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

import yaml

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Interval / trigger parsing
# ---------------------------------------------------------------------------

_INTERVAL_MAP = {
    "m": 60,
    "h": 3600,
    "d": 86400,
}


def parse_interval(raw: str) -> int:
    """Parse an interval string such as '15m', '1h', '6h', '24h' into seconds."""
    raw = raw.strip()
    for suffix, multiplier in _INTERVAL_MAP.items():
        if raw.endswith(suffix):
            return int(raw[: -len(suffix)]) * multiplier
    # Fallback: try plain integer (seconds)
    return int(raw)


def parse_trigger_hour_utc(raw: str | None) -> int | None:
    """Parse a trigger string like '06:00 UTC' and return the UTC hour (0-23)."""
    if not raw:
        return None
    # Accept formats: "06:00 UTC", "06:00", "6"
    part = raw.replace("UTC", "").strip()
    if ":" in part:
        return int(part.split(":")[0])
    return int(part)


# ---------------------------------------------------------------------------
# DaemonTask dataclass
# ---------------------------------------------------------------------------


@dataclass
class DaemonTask:
    name: str
    interval_seconds: int
    description: str = ""
    trigger_time: Optional[str] = None   # raw string e.g. "06:00 UTC"
    last_run: Optional[float] = None     # epoch seconds
    next_run: float = field(default_factory=lambda: time.time())
    status: str = "idle"                 # idle | running | error
    run_count: int = 0
    error_count: int = 0

    # Derived from trigger_time — not serialised to history
    _trigger_hour_utc: Optional[int] = field(default=None, init=False, repr=False, compare=False)

    def __post_init__(self) -> None:
        self._trigger_hour_utc = parse_trigger_hour_utc(self.trigger_time)

    def is_due(self) -> bool:
        """Return True when this daemon should run now."""
        now = time.time()
        if now < self.next_run:
            return False
        if self._trigger_hour_utc is not None:
            current_hour = datetime.now(timezone.utc).hour
            return current_hour == self._trigger_hour_utc
        return True

    def mark_running(self) -> None:
        self.status = "running"

    def mark_done(self, success: bool) -> None:
        self.last_run = time.time()
        self.next_run = self.last_run + self.interval_seconds
        self.run_count += 1
        if success:
            self.status = "idle"
        else:
            self.status = "error"
            self.error_count += 1

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "interval_seconds": self.interval_seconds,
            "description": self.description,
            "trigger_time": self.trigger_time,
            "last_run": self.last_run,
            "next_run": self.next_run,
            "status": self.status,
            "run_count": self.run_count,
            "error_count": self.error_count,
        }


# ---------------------------------------------------------------------------
# Built-in handler skeletons
# ---------------------------------------------------------------------------


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def covenant_monitor(config: dict) -> dict:
    msg = "Checking covenants for all active funds"
    logger.info("[%s] covenant_monitor: %s", _ts(), msg)
    print(f"[{_ts()}] covenant_monitor: {msg}")
    return {"status": "ok", "details": msg}


def pdd_calculator(config: dict) -> dict:
    msg = "Recalculating PDD per IFRS9"
    logger.info("[%s] pdd_calculator: %s", _ts(), msg)
    print(f"[{_ts()}] pdd_calculator: {msg}")
    return {"status": "ok", "details": msg}


def reconciliation(config: dict) -> dict:
    msg = "Running payment reconciliation"
    logger.info("[%s] reconciliation: %s", _ts(), msg)
    print(f"[{_ts()}] reconciliation: {msg}")
    return {"status": "ok", "details": msg}


def market_data_sync(config: dict) -> dict:
    msg = "Syncing market data from BACEN"
    logger.info("[%s] market_data_sync: %s", _ts(), msg)
    print(f"[{_ts()}] market_data_sync: {msg}")
    return {"status": "ok", "details": msg}


def risk_scanner(config: dict) -> dict:
    msg = "Scanning external risk events"
    logger.info("[%s] risk_scanner: %s", _ts(), msg)
    print(f"[{_ts()}] risk_scanner: {msg}")
    return {"status": "ok", "details": msg}


def regulatory_watch(config: dict) -> dict:
    msg = "Scanning CVM/ANBIMA/BACEN publications"
    logger.info("[%s] regulatory_watch: %s", _ts(), msg)
    print(f"[{_ts()}] regulatory_watch: {msg}")
    return {"status": "ok", "details": msg}


def memory_reflection(config: dict) -> dict:
    msg = "Running memory reflection/consolidation"
    logger.info("[%s] memory_reflection: %s", _ts(), msg)
    print(f"[{_ts()}] memory_reflection: {msg}")
    return {"status": "ok", "details": msg}


def self_audit(config: dict) -> dict:
    msg = "Running system self-audit"
    logger.info("[%s] self_audit: %s", _ts(), msg)
    print(f"[{_ts()}] self_audit: {msg}")
    return {"status": "ok", "details": msg}


# Map YAML daemon names → built-in handlers
_BUILTIN_HANDLERS: dict[str, Callable] = {
    "covenant-monitor": covenant_monitor,
    "pdd-calculator": pdd_calculator,
    "reconciliation": reconciliation,
    "market-data-sync": market_data_sync,
    "risk-scanner": risk_scanner,
    "regulatory-watch": regulatory_watch,
    "memory-reflection": memory_reflection,
    "self-audit": self_audit,
}


# ---------------------------------------------------------------------------
# DaemonRunner
# ---------------------------------------------------------------------------


class DaemonRunner:
    """
    Loads daemon definitions from YAML, registers handlers, and drives
    periodic execution. Designed for tmux/systemd long-running loops and
    one-shot CLI invocations alike.

    Usage::

        runner = DaemonRunner(config)
        runner.register_defaults()
        runner.run_due()            # one-shot check
        # or
        runner.run_loop(interval=60)  # blocking loop
    """

    def __init__(
        self,
        config: dict,
        daemons_path: str = "infra/daemons.yaml",
    ) -> None:
        self.config = config
        self._tasks: dict[str, DaemonTask] = {}
        self._handlers: dict[str, Callable] = {}
        self._history_path = self._resolve_history_path()
        self._load_daemons(daemons_path)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _resolve_history_path(self) -> Path:
        base = Path(self.config.get("base_path", "."))
        p = base / "runtime" / "state" / "daemon_history.jsonl"
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    def _load_daemons(self, daemons_path: str) -> None:
        """Parse daemons.yaml and populate self._tasks."""
        path = Path(daemons_path)
        if not path.is_absolute():
            # Resolve relative to base_path if provided
            base = Path(self.config.get("base_path", "."))
            path = base / daemons_path

        if not path.exists():
            logger.warning("daemons.yaml not found at %s — starting with empty daemon set", path)
            return

        with path.open() as fh:
            raw = yaml.safe_load(fh)

        daemons_def: dict = raw.get("daemons", {})
        for name, spec in daemons_def.items():
            interval_raw = spec.get("interval", "1h")
            interval_seconds = parse_interval(interval_raw)
            trigger = spec.get("trigger")
            task = DaemonTask(
                name=name,
                interval_seconds=interval_seconds,
                description=spec.get("description", ""),
                trigger_time=trigger,
            )
            self._tasks[name] = task
            logger.debug("Loaded daemon '%s' (every %ss)", name, interval_seconds)

    def _append_history(self, record: dict) -> None:
        with self._history_path.open("a") as fh:
            fh.write(json.dumps(record) + "\n")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def register(self, name: str, handler_fn: Callable) -> None:
        """Register a Python callable as the handler for a named daemon."""
        if name not in self._tasks:
            logger.warning(
                "Registering handler for unknown daemon '%s'. "
                "It won't run until a matching task is defined in YAML.",
                name,
            )
        self._handlers[name] = handler_fn
        logger.debug("Registered handler for daemon '%s'", name)

    def register_defaults(self) -> None:
        """Register all 8 built-in skeleton handlers."""
        for name, fn in _BUILTIN_HANDLERS.items():
            self.register(name, fn)

    def run_once(self, name: str) -> dict:
        """
        Execute a single daemon by name immediately, regardless of schedule.
        Catches exceptions, updates stats, appends to history.
        Returns a result dict with status/details.
        """
        task = self._tasks.get(name)
        if task is None:
            raise ValueError(f"Unknown daemon: '{name}'")

        handler = self._handlers.get(name)
        if handler is None:
            raise RuntimeError(f"No handler registered for daemon '{name}'")

        task.mark_running()
        started_at = time.time()
        result: dict = {}

        try:
            result = handler(self.config) or {}
            success = True
        except Exception as exc:
            logger.exception("Daemon '%s' raised an exception", name)
            result = {"status": "error", "details": str(exc)}
            success = False
        finally:
            ended_at = time.time()
            task.mark_done(success)

            record = {
                "daemon": name,
                "started_at": datetime.fromtimestamp(started_at, tz=timezone.utc).isoformat(),
                "ended_at": datetime.fromtimestamp(ended_at, tz=timezone.utc).isoformat(),
                "duration_seconds": round(ended_at - started_at, 3),
                "success": success,
                "result": result,
                "run_count": task.run_count,
                "error_count": task.error_count,
            }
            self._append_history(record)

        return result

    def run_due(self) -> list[str]:
        """
        Check all registered daemons and run any that are past their next_run
        time (and match their trigger hour, if applicable).
        Returns list of daemon names that were executed.
        """
        executed: list[str] = []
        for name, task in self._tasks.items():
            if name not in self._handlers:
                continue
            if task.is_due():
                logger.info("Running due daemon: %s", name)
                self.run_once(name)
                executed.append(name)
        return executed

    def run_loop(self, interval: int = 60) -> None:
        """
        Blocking infinite loop — calls run_due() every `interval` seconds.
        Designed for tmux/systemd long-running processes.
        Handles KeyboardInterrupt gracefully.
        """
        logger.info("DaemonRunner loop started (tick=%ss)", interval)
        print(f"[{_ts()}] DaemonRunner loop started (tick={interval}s)")
        try:
            while True:
                executed = self.run_due()
                if executed:
                    logger.info("Tick: ran %d daemon(s): %s", len(executed), executed)
                time.sleep(interval)
        except KeyboardInterrupt:
            logger.info("DaemonRunner loop stopped by user")
            print(f"[{_ts()}] DaemonRunner loop stopped.")

    def status(self) -> list[dict]:
        """Return current status of all registered daemons."""
        return [
            {
                **task.to_dict(),
                "has_handler": task.name in self._handlers,
            }
            for task in self._tasks.values()
        ]

    def history(self, name: str, limit: int = 10) -> list[dict]:
        """
        Return the last `limit` run records for a given daemon name,
        read from the append-only daemon_history.jsonl file.
        """
        if not self._history_path.exists():
            return []

        records: list[dict] = []
        with self._history_path.open() as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    if record.get("daemon") == name:
                        records.append(record)
                except json.JSONDecodeError:
                    continue

        return records[-limit:]
