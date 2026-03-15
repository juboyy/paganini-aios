"""PAGANINI AIOS — Dashboard API Key Authentication.

Provides X-API-Key header authentication for the PAGANINI dashboard.
The key is auto-generated on first run and saved to runtime/state/api_key.txt.
It can also be set via the PAGANINI_API_KEY environment variable.

Endpoints /health and /api/health are exempt from authentication.
"""
from __future__ import annotations

import os
import secrets
from pathlib import Path

_SKIP_PATHS = {"/health", "/api/health"}


def _state_dir() -> Path:
    base = Path(os.environ.get("PAGANINI_BASE", ".")).resolve()
    state = base / "runtime" / "state"
    state.mkdir(parents=True, exist_ok=True)
    return state


def get_api_key() -> str:
    """Return the active API key.

    Priority:
    1. ``PAGANINI_API_KEY`` environment variable
    2. ``runtime/state/api_key.txt`` (auto-created if missing)
    """
    env_key = os.environ.get("PAGANINI_API_KEY", "").strip()
    if env_key:
        return env_key

    key_file = _state_dir() / "api_key.txt"
    if key_file.exists():
        stored = key_file.read_text().strip()
        if stored:
            return stored

    # Auto-generate a secure key and persist it
    new_key = secrets.token_urlsafe(32)
    key_file.write_text(new_key)
    return new_key


try:
    from fastapi import Depends, HTTPException, Request, status
    from fastapi.security import APIKeyHeader

    _api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

    async def verify_api_key(
        request: Request,
        api_key: str | None = Depends(_api_key_header),
    ) -> None:
        """FastAPI dependency that enforces X-API-Key authentication.

        Skips auth for health-check endpoints so load balancers always work.
        """
        if request.url.path in _SKIP_PATHS:
            return
        expected = get_api_key()
        if not api_key or not secrets.compare_digest(api_key, expected):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing X-API-Key header.",
                headers={"WWW-Authenticate": "ApiKey"},
            )

except ImportError:  # pragma: no cover
    async def verify_api_key(request=None, api_key=None) -> None:  # type: ignore[misc]
        pass
