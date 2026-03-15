"""Audit logging middleware for dashboard API requests."""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from fastapi import Request
    from starlette.middleware.base import BaseHTTPMiddleware
except ImportError:  # pragma: no cover
    Request = Any  # type: ignore[assignment]
    BaseHTTPMiddleware = object  # type: ignore[assignment,misc]


def _audit_log_path() -> Path:
    base = Path(os.environ.get("PAGANINI_BASE", ".")).resolve()
    return base / "runtime" / "logs" / "audit.jsonl"


def _parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _build_entry(
    request: Request,
    status_code: int,
    elapsed_ms: float,
) -> dict[str, Any]:
    query_params = dict(request.query_params)
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "client_ip": request.client.host if request.client else "unknown",
        "method": request.method,
        "path": request.url.path,
        "query_params": query_params,
        "response_status": status_code,
        "response_time_ms": round(elapsed_ms, 1),
        "agent_used": getattr(request.state, "audit_agent_used", None),
        "confidence": getattr(request.state, "audit_confidence", None),
    }


def _append_entry(entry: dict[str, Any]) -> None:
    log_path = _audit_log_path()
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, ensure_ascii=True, default=str) + "\n")


class AuditMiddleware(BaseHTTPMiddleware):
    """Log API requests to a JSONL audit file."""

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            elapsed_ms = (time.perf_counter() - start) * 1000
            _append_entry(_build_entry(request, 500, elapsed_ms))
            raise

        elapsed_ms = (time.perf_counter() - start) * 1000
        _append_entry(_build_entry(request, response.status_code, elapsed_ms))
        return response


def query_audit_log(
    since: str | None = None,
    until: str | None = None,
    path_filter: str | None = None,
    client_filter: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Return recent audit entries matching the provided filters."""
    log_path = _audit_log_path()
    if not log_path.exists():
        return []

    since_dt = _parse_timestamp(since)
    until_dt = _parse_timestamp(until)
    results: list[dict[str, Any]] = []

    with log_path.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            entry_ts = _parse_timestamp(entry.get("timestamp"))
            if since_dt and entry_ts and entry_ts < since_dt:
                continue
            if until_dt and entry_ts and entry_ts > until_dt:
                continue
            if path_filter and path_filter not in str(entry.get("path", "")):
                continue
            if client_filter and client_filter != entry.get("client_ip"):
                continue
            results.append(entry)

    if limit <= 0:
        return []
    return list(reversed(results[-limit:]))
