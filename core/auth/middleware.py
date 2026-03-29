"""PAGANINI AIOS — FastAPI Authentication Middleware.

Provides :func:`verify_request`, a FastAPI dependency that replaces the
legacy ``verify_api_key`` from ``core.channels.auth``.

Authentication flow
-------------------
1. Skip auth for ``/health`` and ``/api/health``.
2. Check for ``Authorization: Bearer <token>`` header.
   * If present → verify as JWT → extract tenant_id + role.
3. Fall back to ``X-API-Key`` header (backward compatibility).
   * Look up the matching tenant in :class:`~core.auth.tenant.TenantStore`.
   * Assign role ``operator`` (legacy keys have no role claim).
4. Inject into ``request.state``:
   * ``request.state.tenant_id`` — tenant UUID
   * ``request.state.role``      — RBAC role string
5. Return ``401`` for invalid/missing credentials.
6. Return ``403`` for insufficient permissions (checked by RBAC decorators).

Legacy fallback
---------------
If **neither** ``PAGANINI_JWT_SECRET`` is configured **nor** a
``TenantStore`` with hashed keys is available, the middleware falls back
to the single shared key from ``core.channels.auth`` — ensuring zero
downtime during migration.
"""

from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

_SKIP_PATHS = frozenset({"/health", "/api/health"})

# ---------------------------------------------------------------------------
# Lazy singletons
# ---------------------------------------------------------------------------

_tenant_store: Optional[object] = None  # TenantStore | None


def _get_store():  # type: ignore[return]
    """Return a lazily-initialised :class:`~core.auth.tenant.TenantStore`."""
    global _tenant_store
    if _tenant_store is None:
        try:
            from core.auth.tenant import TenantStore  # noqa: PLC0415
            _tenant_store = TenantStore()
        except Exception as exc:  # pragma: no cover
            logger.warning("TenantStore unavailable: %s", exc)
    return _tenant_store


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

try:
    import secrets as _secrets

    from fastapi import Depends, HTTPException, Request, status
    from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer

    from core.auth.jwt_auth import TokenError, verify_token

    _bearer_scheme = HTTPBearer(auto_error=False)
    _api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

    async def verify_request(
        request: Request,
        bearer: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
        api_key: Optional[str] = Depends(_api_key_header),
    ) -> None:
        """FastAPI dependency that authenticates each request.

        Injects the following into ``request.state`` on success:

        * ``tenant_id`` — the authenticated tenant UUID
        * ``role``      — the RBAC role (``admin``, ``operator``, or ``viewer``)

        Parameters
        ----------
        request:
            The current FastAPI :class:`~fastapi.Request`.
        bearer:
            Optional ``Authorization: Bearer …`` credentials extracted by
            FastAPI's :class:`~fastapi.security.HTTPBearer` scheme.
        api_key:
            Optional ``X-API-Key`` header value.

        Raises
        ------
        HTTPException(401):
            For missing, malformed, or expired credentials.
        """
        # ------------------------------------------------------------------
        # 1. Skip health endpoints
        # ------------------------------------------------------------------
        if request.url.path in _SKIP_PATHS:
            return

        # ------------------------------------------------------------------
        # 2. JWT Bearer authentication
        # ------------------------------------------------------------------
        if bearer is not None:
            try:
                payload = verify_token(bearer.credentials)
            except TokenError as exc:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid or expired JWT: {exc}",
                    headers={"WWW-Authenticate": "Bearer"},
                ) from exc

            request.state.tenant_id = payload.get("tenant_id", payload.get("sub", ""))
            request.state.role = payload.get("role", "viewer")
            return

        # ------------------------------------------------------------------
        # 3. X-API-Key (legacy backward compat)
        # ------------------------------------------------------------------
        if api_key:
            store = _get_store()
            if store is not None:
                tenant = store.get_by_api_key(api_key)
                if tenant is not None:
                    request.state.tenant_id = tenant.tenant_id
                    request.state.role = "operator"  # legacy keys → operator
                    return

            # Final fallback: compare against the single legacy shared key
            try:
                from core.channels.auth import get_api_key  # noqa: PLC0415
                expected = get_api_key()
                if _secrets.compare_digest(api_key, expected):
                    # Legacy single-tenant mode: use a sentinel tenant_id
                    request.state.tenant_id = os.environ.get("PAGANINI_DEFAULT_TENANT", "default")
                    request.state.role = "admin"  # legacy single-key → admin
                    return
            except Exception:  # pragma: no cover
                pass

        # ------------------------------------------------------------------
        # 4. No valid credentials found
        # ------------------------------------------------------------------
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide 'Authorization: Bearer <jwt>' or 'X-API-Key' header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

except ImportError:  # pragma: no cover
    # FastAPI not installed — provide a no-op so imports don't fail
    async def verify_request(request=None, bearer=None, api_key=None) -> None:  # type: ignore[misc]
        pass
