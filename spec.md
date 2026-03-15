# Spec: Audit Log for Paganini AIOS

Gate Token: GATE-2026-03-15T230142:80b9007fe0fc

## What to build

Create an audit logging system that records every API interaction for compliance.

## File: packages/dashboard/audit.py (NEW)

Create an audit logger that:
1. Records every API request to a JSONL file at `runtime/logs/audit.jsonl`
2. Each entry has: timestamp, client_ip, method, path, query_params, response_status, response_time_ms, agent_used (if /api/query), confidence (if /api/query)
3. Provides a FastAPI middleware that wraps each request
4. Has a query function to search audit logs by date range, path, or client

Structure:

```python
"""Audit logging middleware for investment fund compliance."""

import json
import time
import os
from datetime import datetime, timezone
from pathlib import Path
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

AUDIT_LOG_PATH = "runtime/logs/audit.jsonl"

class AuditMiddleware(BaseHTTPMiddleware):
    """Logs every API request for compliance audit trail."""

    async def dispatch(self, request: Request, call_next):
        start = time.time()

        response = await call_next(request)

        elapsed_ms = (time.time() - start) * 1000

        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "client_ip": request.client.host if request.client else "unknown",
            "method": request.method,
            "path": str(request.url.path),
            "query": str(request.url.query) if request.url.query else None,
            "status": response.status_code,
            "elapsed_ms": round(elapsed_ms, 1),
        }

        # Write to JSONL
        os.makedirs(os.path.dirname(AUDIT_LOG_PATH), exist_ok=True)
        with open(AUDIT_LOG_PATH, "a") as f:
            f.write(json.dumps(entry, default=str) + "\n")

        return response


def query_audit_log(
    since: str = None,
    until: str = None,
    path_filter: str = None,
    limit: int = 100,
) -> list[dict]:
    """Query the audit log with filters."""
    if not os.path.exists(AUDIT_LOG_PATH):
        return []

    results = []
    with open(AUDIT_LOG_PATH) as f:
        for line in f:
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            if since and entry.get("timestamp", "") < since:
                continue
            if until and entry.get("timestamp", "") > until:
                continue
            if path_filter and path_filter not in entry.get("path", ""):
                continue

            results.append(entry)

    return results[-limit:]
```

## File: packages/dashboard/app.py (MODIFY)

Add the audit middleware to the FastAPI app:

1. Import AuditMiddleware from packages.dashboard.audit
2. Add `app.add_middleware(AuditMiddleware)` after app creation
3. Add a new endpoint `GET /api/audit` that returns recent audit entries:
   - Query params: `limit` (default 50), `path` (filter), `since` (ISO date)
   - Response: `{"total": N, "entries": [...]}`

## Constraints
- Do NOT use the word "FIDC" anywhere in the code
- stdlib only (no new dependencies)
- Must not break existing 89 tests
- JSONL format for easy grep/tail
- Log rotation is NOT needed for POC (file will be small)
