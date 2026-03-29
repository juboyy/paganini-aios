"""PAGANINI AIOS — Pure-Python JWT Authentication.

Implements HS256 JWT creation and verification **without any third-party
library** (no PyJWT, no python-jose).  Uses only the Python standard library:

* :mod:`base64` — base64url encode/decode
* :mod:`hashlib` / :mod:`hmac` — HMAC-SHA256 signing
* :mod:`json` — payload serialisation
* :mod:`time` — Unix timestamps

Token structure
---------------
A JWT consists of three base64url-encoded segments separated by dots::

    <header>.<payload>.<signature>

Header::

    {"alg": "HS256", "typ": "JWT"}

Payload (standard + PAGANINI claims)::

    {
        "iss": "paganini",
        "sub": "<tenant_id>",
        "tenant_id": "<tenant_id>",
        "role": "<admin|operator|viewer>",
        "token_type": "access|refresh",
        "iat": <unix_timestamp>,
        "exp": <unix_timestamp>
    }

Configuration
-------------
The signing secret is read from the ``PAGANINI_JWT_SECRET`` environment
variable.  If absent, a per-process random secret is generated and a warning
is emitted — suitable for development only.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_ALGORITHM = "HS256"
_ISSUER = "paganini"
_ACCESS_TOKEN_TTL = int(os.environ.get("PAGANINI_JWT_TTL", str(60 * 60 * 24)))       # 24 hours
_REFRESH_TOKEN_TTL = int(os.environ.get("PAGANINI_JWT_REFRESH_TTL", str(60 * 60 * 24 * 7)))  # 7 days

# ---------------------------------------------------------------------------
# Secret management
# ---------------------------------------------------------------------------

_RUNTIME_SECRET: Optional[str] = None


def _get_secret() -> str:
    """Return the active signing secret.

    Priority:
    1. ``PAGANINI_JWT_SECRET`` environment variable (recommended for prod)
    2. A per-process random secret (development fallback — tokens won't
       survive restarts).
    """
    global _RUNTIME_SECRET

    env_secret = os.environ.get("PAGANINI_JWT_SECRET", "").strip()
    if env_secret:
        return env_secret

    if _RUNTIME_SECRET is None:
        _RUNTIME_SECRET = secrets.token_hex(32)
        logger.warning(
            "PAGANINI_JWT_SECRET not set — using an ephemeral runtime secret. "
            "Tokens will be invalidated on process restart. "
            "Set PAGANINI_JWT_SECRET for production deployments."
        )
    return _RUNTIME_SECRET


# ---------------------------------------------------------------------------
# Base64url helpers
# ---------------------------------------------------------------------------


def _b64url_encode(data: bytes) -> str:
    """Encode *data* as base64url (no padding)."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    """Decode a base64url string (with or without padding)."""
    # Restore padding to a multiple of 4
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


# ---------------------------------------------------------------------------
# JWT building blocks
# ---------------------------------------------------------------------------


def _make_header() -> str:
    """Return the base64url-encoded JWT header."""
    header = {"alg": _ALGORITHM, "typ": "JWT"}
    return _b64url_encode(json.dumps(header, separators=(",", ":")).encode())


def _make_signature(signing_input: str, secret: str) -> str:
    """Return the HMAC-SHA256 signature of *signing_input*."""
    sig = hmac.new(
        secret.encode(),
        signing_input.encode(),
        hashlib.sha256,
    ).digest()
    return _b64url_encode(sig)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def create_token(
    tenant_id: str,
    role: str,
    extra_claims: Optional[dict[str, Any]] = None,
    ttl: Optional[int] = None,
    token_type: str = "access",
) -> str:
    """Generate a signed JWT access token.

    Parameters
    ----------
    tenant_id:
        The tenant UUID this token belongs to.
    role:
        The RBAC role (``admin``, ``operator``, or ``viewer``).
    extra_claims:
        Optional additional claims to merge into the payload.
    ttl:
        Token lifetime in seconds.  Defaults to
        :data:`_ACCESS_TOKEN_TTL` (24 h).
    token_type:
        ``"access"`` or ``"refresh"``.

    Returns
    -------
    str
        A compact ``header.payload.signature`` JWT string.
    """
    now = int(time.time())
    lifetime = ttl if ttl is not None else _ACCESS_TOKEN_TTL

    payload: dict[str, Any] = {
        "iss": _ISSUER,
        "sub": tenant_id,
        "tenant_id": tenant_id,
        "role": role,
        "token_type": token_type,
        "iat": now,
        "exp": now + lifetime,
    }
    if extra_claims:
        payload.update(extra_claims)

    header_b64 = _make_header()
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{header_b64}.{payload_b64}"
    signature = _make_signature(signing_input, _get_secret())

    return f"{signing_input}.{signature}"


def create_refresh_token(
    tenant_id: str,
    role: str,
    ttl: Optional[int] = None,
) -> str:
    """Generate a signed JWT refresh token (7-day default lifetime).

    Refresh tokens carry ``token_type="refresh"`` in their payload so that
    middleware can distinguish them from access tokens.

    Parameters
    ----------
    tenant_id:
        The tenant UUID.
    role:
        The RBAC role.
    ttl:
        Custom lifetime in seconds; defaults to :data:`_REFRESH_TOKEN_TTL`.

    Returns
    -------
    str
        A compact JWT string.
    """
    lifetime = ttl if ttl is not None else _REFRESH_TOKEN_TTL
    return create_token(tenant_id, role, ttl=lifetime, token_type="refresh")


class TokenError(Exception):
    """Raised when a JWT is malformed, expired, or has an invalid signature."""


def verify_token(token: str) -> dict[str, Any]:
    """Verify *token* and return its decoded payload.

    Performs the following checks:

    1. Structure — must be ``header.payload.signature``
    2. Algorithm — must be ``HS256``
    3. Signature — HMAC-SHA256 must match
    4. Expiry — ``exp`` must be in the future
    5. Issuer — ``iss`` must equal ``"paganini"``

    Parameters
    ----------
    token:
        The compact JWT string.

    Returns
    -------
    dict
        The decoded payload claims.

    Raises
    ------
    TokenError
        If any check fails.
    """
    parts = token.strip().split(".")
    if len(parts) != 3:
        raise TokenError("Invalid JWT structure: expected 3 dot-separated parts.")

    header_b64, payload_b64, signature = parts

    # -- Verify header --
    try:
        header = json.loads(_b64url_decode(header_b64))
    except Exception as exc:
        raise TokenError(f"Failed to decode JWT header: {exc}") from exc

    if header.get("alg") != _ALGORITHM:
        raise TokenError(f"Unsupported algorithm: {header.get('alg')!r}. Only HS256 is accepted.")

    # -- Verify signature --
    signing_input = f"{header_b64}.{payload_b64}"
    expected_sig = _make_signature(signing_input, _get_secret())

    if not hmac.compare_digest(expected_sig, signature):
        raise TokenError("JWT signature verification failed.")

    # -- Decode payload --
    try:
        payload: dict[str, Any] = json.loads(_b64url_decode(payload_b64))
    except Exception as exc:
        raise TokenError(f"Failed to decode JWT payload: {exc}") from exc

    # -- Check expiry --
    exp = payload.get("exp")
    if exp is None:
        raise TokenError("JWT missing 'exp' claim.")
    if int(time.time()) >= exp:
        raise TokenError("JWT has expired.")

    # -- Check issuer --
    if payload.get("iss") != _ISSUER:
        raise TokenError(f"Invalid JWT issuer: {payload.get('iss')!r}.")

    return payload
