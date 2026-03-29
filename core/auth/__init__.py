"""PAGANINI AIOS — Multi-tenant Auth, RBAC & Data Isolation package.

Exports the primary public surface for auth consumers:

    from core.auth import (
        Tenant, RateLimits, TenantStore,
        create_token, verify_token, create_refresh_token,
        check_permission, require_role, require_permission,
        verify_request, tenant_filter,
    )

Backward compatibility: the legacy ``verify_api_key`` FastAPI dependency is
re-exported so existing routers need no changes.
"""

from core.auth.tenant import RateLimits, Tenant, TenantStore
from core.auth.jwt_auth import (
    create_refresh_token,
    create_token,
    verify_token,
)
from core.auth.rbac import (
    check_permission,
    require_permission,
    require_role,
)
from core.auth.data_isolation import tenant_filter

# FastAPI middleware dependency (may be None if FastAPI not installed)
try:
    from core.auth.middleware import verify_request
except ImportError:  # pragma: no cover
    verify_request = None  # type: ignore[assignment]

__all__ = [
    # Tenant model
    "RateLimits",
    "Tenant",
    "TenantStore",
    # JWT
    "create_token",
    "verify_token",
    "create_refresh_token",
    # RBAC
    "check_permission",
    "require_role",
    "require_permission",
    # Data isolation
    "tenant_filter",
    # Middleware
    "verify_request",
]
