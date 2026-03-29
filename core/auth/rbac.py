"""PAGANINI AIOS — Role-Based Access Control (RBAC).

Defines three roles and a permission matrix, plus FastAPI decorator helpers.

Roles
-----
* ``admin``    — full access to every action
* ``operator`` — queries, reports, fund management, operation approvals
* ``viewer``   — read-only (query + view_audit only)

Permission Matrix
-----------------
+----------------------+-------+----------+--------+
| Action               | admin | operator | viewer |
+======================+=======+==========+========+
| query                |   ✅  |    ✅    |   ✅   |
+----------------------+-------+----------+--------+
| report               |   ✅  |    ✅    |   ❌   |
+----------------------+-------+----------+--------+
| config               |   ✅  |    ❌    |   ❌   |
+----------------------+-------+----------+--------+
| manage_users         |   ✅  |    ❌    |   ❌   |
+----------------------+-------+----------+--------+
| manage_funds         |   ✅  |    ✅    |   ❌   |
+----------------------+-------+----------+--------+
| approve_operations   |   ✅  |    ✅    |   ❌   |
+----------------------+-------+----------+--------+
| view_audit           |   ✅  |    ✅    |   ✅   |
+----------------------+-------+----------+--------+

Decorators
----------
:func:`require_role` and :func:`require_permission` are designed for FastAPI
endpoint decoration.  They read the current role from ``request.state.role``
which is injected by the auth middleware.
"""

from __future__ import annotations

import functools
import logging
from typing import Any, Callable

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Permission matrix
# ---------------------------------------------------------------------------

# Maps role → set of allowed permissions
_PERMISSIONS: dict[str, frozenset[str]] = {
    "admin": frozenset(
        {
            "query",
            "report",
            "config",
            "manage_users",
            "manage_funds",
            "approve_operations",
            "view_audit",
        }
    ),
    "operator": frozenset(
        {
            "query",
            "report",
            "manage_funds",
            "approve_operations",
            "view_audit",
        }
    ),
    "viewer": frozenset(
        {
            "query",
            "view_audit",
        }
    ),
}

VALID_ROLES: frozenset[str] = frozenset(_PERMISSIONS.keys())

# Role hierarchy: higher index = more privileged
_ROLE_RANK: dict[str, int] = {"viewer": 0, "operator": 1, "admin": 2}


# ---------------------------------------------------------------------------
# Core check function
# ---------------------------------------------------------------------------


def check_permission(tenant_id: str, role: str, permission: str) -> bool:
    """Return ``True`` if *role* has *permission*.

    Parameters
    ----------
    tenant_id:
        The requesting tenant UUID (used for audit logging only — isolation
        is enforced by the data layer, not here).
    role:
        The RBAC role string (``admin``, ``operator``, ``viewer``).
    permission:
        The action to check (e.g. ``"report"``, ``"config"``).

    Returns
    -------
    bool
        ``True`` if *role* is allowed to perform *permission*.
    """
    allowed = _PERMISSIONS.get(role, frozenset())
    result = permission in allowed
    if not result:
        logger.debug(
            "Permission denied: tenant=%s role=%s permission=%s",
            tenant_id,
            role,
            permission,
        )
    return result


def has_minimum_role(role: str, minimum: str) -> bool:
    """Return ``True`` if *role* is at least as privileged as *minimum*.

    Example
    -------
    >>> has_minimum_role("admin", "operator")
    True
    >>> has_minimum_role("viewer", "operator")
    False
    """
    return _ROLE_RANK.get(role, -1) >= _ROLE_RANK.get(minimum, 999)


# ---------------------------------------------------------------------------
# FastAPI decorators
# ---------------------------------------------------------------------------

try:
    from fastapi import HTTPException, Request, status

    def require_role(minimum_role: str) -> Callable:
        """FastAPI endpoint decorator that enforces a minimum role.

        The decorated endpoint receives the ``request: Request`` argument from
        FastAPI.  The middleware must have already injected ``request.state.role``.

        Parameters
        ----------
        minimum_role:
            The minimum required role (``viewer``, ``operator``, or ``admin``).

        Raises
        ------
        HTTPException(403):
            If the caller's role is below *minimum_role*.

        Example
        -------
        ::

            @router.post("/config")
            @require_role("admin")
            async def update_config(request: Request, body: ConfigBody):
                ...
        """
        if minimum_role not in VALID_ROLES:
            raise ValueError(f"Unknown role '{minimum_role}'. Must be one of: {sorted(VALID_ROLES)}")

        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            async def wrapper(*args: Any, **kwargs: Any) -> Any:
                # FastAPI passes request either as positional arg or keyword arg
                request: Request | None = kwargs.get("request")
                if request is None:
                    for arg in args:
                        if isinstance(arg, Request):
                            request = arg
                            break

                if request is None:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="@require_role: no Request found in endpoint arguments.",
                    )

                role: str = getattr(request.state, "role", "")
                if not has_minimum_role(role, minimum_role):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Insufficient role. Required: '{minimum_role}', have: '{role or 'none'}'.",
                    )
                return await func(*args, **kwargs)

            return wrapper

        return decorator

    def require_permission(permission: str) -> Callable:
        """FastAPI endpoint decorator that enforces a specific permission.

        Parameters
        ----------
        permission:
            The required permission string (e.g. ``"manage_funds"``).

        Raises
        ------
        HTTPException(403):
            If the caller's role does not have *permission*.

        Example
        -------
        ::

            @router.post("/funds/approve")
            @require_permission("approve_operations")
            async def approve_operation(request: Request, op_id: str):
                ...
        """

        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            async def wrapper(*args: Any, **kwargs: Any) -> Any:
                request: Request | None = kwargs.get("request")
                if request is None:
                    for arg in args:
                        if isinstance(arg, Request):
                            request = arg
                            break

                if request is None:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="@require_permission: no Request found in endpoint arguments.",
                    )

                role: str = getattr(request.state, "role", "")
                tenant_id: str = getattr(request.state, "tenant_id", "unknown")

                if not check_permission(tenant_id, role, permission):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Permission denied: '{permission}' requires a higher role.",
                    )
                return await func(*args, **kwargs)

            return wrapper

        return decorator

except ImportError:  # pragma: no cover
    # FastAPI not installed — provide no-op stubs so imports don't fail
    def require_role(minimum_role: str) -> Callable:  # type: ignore[misc]
        def decorator(func: Callable) -> Callable:
            return func
        return decorator

    def require_permission(permission: str) -> Callable:  # type: ignore[misc]
        def decorator(func: Callable) -> Callable:
            return func
        return decorator
