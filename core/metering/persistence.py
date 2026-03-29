"""PAGANINI Metering — Usage event persistence (JSONL, batch flush).

Events are written to ``runtime/metering/usage.jsonl`` in append-only JSONL format.
A background thread flushes the in-memory buffer every ``flush_interval_seconds``
seconds *or* when the buffer reaches ``batch_size`` events — whichever comes first.

Schema (one JSON object per line):
    {
        "timestamp":     "2026-03-29T12:00:00.000Z",  # ISO-8601 UTC
        "tenant_id":     "acme",
        "agent_id":      "gestor",
        "model":         "gpt-4o-mini",
        "input_tokens":  512,
        "output_tokens": 128,
        "cost_usd":      0.00012,
        "query_type":    "analytical",
        "latency_ms":    340,
        "query_id":      "a1b2c3d4",           # optional
        "byok":          false                  # optional
    }
"""

from __future__ import annotations

import json
import os
import threading
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


# ---------------------------------------------------------------------------
# Event dataclass
# ---------------------------------------------------------------------------

@dataclass
class UsageEvent:
    """Single metered usage event."""

    tenant_id: str
    """Tenant (customer) identifier."""

    agent_id: str
    """Agent that handled the request (e.g. ``"gestor"``, ``"risk"``)."""

    model: str
    """LLM model identifier used."""

    input_tokens: int
    """Number of prompt tokens consumed."""

    output_tokens: int
    """Number of completion tokens generated."""

    cost_usd: float
    """Total USD cost for this event (0 if BYOK)."""

    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z")
    """ISO-8601 UTC timestamp (auto-set on creation)."""

    query_type: str = "unknown"
    """Query intent / type (e.g. ``"analytical"``, ``"factual"``)."""

    latency_ms: int = 0
    """End-to-end request latency in milliseconds."""

    query_id: str = ""
    """Optional correlation ID for the originating query."""

    byok: bool = False
    """True when the tenant used Bring Your Own Key."""

    def to_dict(self) -> dict:
        """Convert to a plain dict for JSON serialisation."""
        return asdict(self)

    def to_jsonl(self) -> str:
        """Serialise to a single JSONL line (no trailing newline)."""
        return json.dumps(self.to_dict(), ensure_ascii=False)


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

class UsagePersistence:
    """Append-only JSONL storage for usage events with background batch flush.

    Thread-safe: all public methods acquire the internal lock.

    Args:
        output_path:           Path to the JSONL file.
        batch_size:            Flush after this many buffered events.
        flush_interval_seconds: Flush every N seconds regardless of batch size.
    """

    DEFAULT_PATH = "runtime/metering/usage.jsonl"
    DEFAULT_BATCH_SIZE = 50
    DEFAULT_FLUSH_INTERVAL = 10  # seconds

    def __init__(
        self,
        output_path: Optional[str] = None,
        batch_size: int = DEFAULT_BATCH_SIZE,
        flush_interval_seconds: float = DEFAULT_FLUSH_INTERVAL,
    ) -> None:
        self._path = Path(output_path or self.DEFAULT_PATH)
        self._batch_size = batch_size
        self._flush_interval = flush_interval_seconds
        self._buffer: list[UsageEvent] = []
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._total_flushed: int = 0

        # Ensure directory exists
        self._path.parent.mkdir(parents=True, exist_ok=True)

        # Background flush thread
        self._flush_thread = threading.Thread(
            target=self._background_flush_loop,
            name="metering-flush",
            daemon=True,
        )
        self._flush_thread.start()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def record(self, event: UsageEvent) -> None:
        """Buffer a usage event for asynchronous persistence.

        Triggers an immediate flush when the buffer reaches ``batch_size``.

        Args:
            event: :class:`UsageEvent` to persist.
        """
        with self._lock:
            self._buffer.append(event)
            if len(self._buffer) >= self._batch_size:
                self._flush_locked()

    def record_dict(self, **kwargs) -> UsageEvent:
        """Convenience: construct a :class:`UsageEvent` from keyword args and record it.

        Args:
            **kwargs: Keyword arguments matching :class:`UsageEvent` fields.

        Returns:
            The created :class:`UsageEvent`.
        """
        event = UsageEvent(**kwargs)
        self.record(event)
        return event

    def flush(self) -> int:
        """Force-flush all buffered events to disk immediately.

        Returns:
            Number of events written in this flush.
        """
        with self._lock:
            return self._flush_locked()

    def stop(self) -> None:
        """Flush remaining events and stop the background flush thread."""
        self._stop_event.set()
        self.flush()

    def stats(self) -> dict:
        """Return current buffer and persistence statistics.

        Returns:
            Dict with ``buffered``, ``total_flushed``, and ``output_path``.
        """
        with self._lock:
            return {
                "buffered": len(self._buffer),
                "total_flushed": self._total_flushed,
                "output_path": str(self._path),
            }

    def read_events(self, limit: Optional[int] = None) -> list[dict]:
        """Read persisted events from the JSONL file.

        Args:
            limit: Maximum number of events to return (most recent first).

        Returns:
            List of event dicts.
        """
        if not self._path.exists():
            return []
        events: list[dict] = []
        try:
            with self._path.open("r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if line:
                        try:
                            events.append(json.loads(line))
                        except json.JSONDecodeError:
                            continue
        except OSError:
            return []
        if limit:
            return events[-limit:]
        return events

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _flush_locked(self) -> int:
        """Write buffer to disk. Must be called with self._lock held."""
        if not self._buffer:
            return 0
        lines = [e.to_jsonl() + "\n" for e in self._buffer]
        count = len(self._buffer)
        self._buffer = []
        self._total_flushed += count

        try:
            with self._path.open("a", encoding="utf-8") as fh:
                fh.writelines(lines)
        except OSError as exc:
            # Re-buffer on write failure to avoid data loss
            with self._lock:
                self._buffer = [
                    UsageEvent(**json.loads(l.strip())) for l in lines
                    if l.strip()
                ]
            raise RuntimeError(f"Metering flush failed: {exc}") from exc
        return count

    def _background_flush_loop(self) -> None:
        """Daemon thread: flush every ``_flush_interval`` seconds."""
        while not self._stop_event.is_set():
            self._stop_event.wait(timeout=self._flush_interval)
            try:
                with self._lock:
                    self._flush_locked()
            except Exception:
                pass  # Never crash the daemon — flush failures logged elsewhere


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_persistence: Optional[UsagePersistence] = None
_persistence_lock = threading.Lock()


def get_persistence(
    output_path: Optional[str] = None,
    batch_size: int = UsagePersistence.DEFAULT_BATCH_SIZE,
    flush_interval_seconds: float = UsagePersistence.DEFAULT_FLUSH_INTERVAL,
) -> UsagePersistence:
    """Return the module-level :class:`UsagePersistence` singleton.

    First call initialises with the provided parameters; subsequent calls
    return the same instance (parameters are ignored after first init).

    Args:
        output_path:            Override default JSONL path.
        batch_size:             Override default batch size.
        flush_interval_seconds: Override default flush interval.

    Returns:
        Shared :class:`UsagePersistence` instance.
    """
    global _persistence
    if _persistence is None:
        with _persistence_lock:
            if _persistence is None:
                _persistence = UsagePersistence(
                    output_path=output_path,
                    batch_size=batch_size,
                    flush_interval_seconds=flush_interval_seconds,
                )
    return _persistence
