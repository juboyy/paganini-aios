"""PAGANINI AIOS — API Middleware.

Middleware and auth utilities extracted from api.py to keep the factory function lean.
"""

from __future__ import annotations

from typing import Any


def apply_cors(app: Any) -> None:
    """Apply CORS middleware to app."""
    from fastapi.middleware.cors import CORSMiddleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def apply_audit_middleware(app: Any) -> None:
    """Apply audit middleware to app."""
    try:
        from core.channels.audit import AuditMiddleware
        app.add_middleware(AuditMiddleware)
    except ImportError:
        pass  # Audit middleware is optional


def apply_static(app: Any, static_dir: Any) -> None:
    """Mount static files if directory exists."""
    if static_dir.exists():
        from fastapi.staticfiles import StaticFiles
        app.mount("/static", StaticFiles(directory=static_dir), name="static")
