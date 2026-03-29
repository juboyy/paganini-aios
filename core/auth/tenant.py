"""PAGANINI AIOS — Tenant model and persistent store.

Tenants represent isolated organisational units (e.g. "Gestora Alpha") that
share one PAGANINI deployment.  Each tenant has its own:

* Hashed API keys (for legacy X-API-Key auth)
* Monthly USD budget limit
* Tier-based rate limits
* Active/inactive status

The ``TenantStore`` persists tenant data to ``runtime/tenants/tenants.json``
and is thread-safe via a ``threading.RLock``.
"""

from __future__ import annotations

import hashlib
import json
import os
import threading
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Tier defaults
# ---------------------------------------------------------------------------

_TIER_DEFAULTS: dict[str, dict[str, int]] = {
    "starter": {
        "tokens_per_minute": 10_000,
        "tokens_per_day": 100_000,
        "requests_per_minute": 20,
    },
    "professional": {
        "tokens_per_minute": 50_000,
        "tokens_per_day": 1_000_000,
        "requests_per_minute": 60,
    },
    "enterprise": {
        # -1 signals "unlimited" to rate-limit enforcement code
        "tokens_per_minute": -1,
        "tokens_per_day": -1,
        "requests_per_minute": -1,
    },
}

VALID_TIERS = frozenset(_TIER_DEFAULTS.keys())


@dataclass
class RateLimits:
    """Per-tenant rate limits.

    A value of ``-1`` means unlimited (enterprise tier).
    """

    tokens_per_minute: int
    tokens_per_day: int
    requests_per_minute: int

    @classmethod
    def for_tier(cls, tier: str) -> "RateLimits":
        """Return the default :class:`RateLimits` for *tier*."""
        defaults = _TIER_DEFAULTS.get(tier, _TIER_DEFAULTS["starter"])
        return cls(**defaults)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "RateLimits":
        return cls(
            tokens_per_minute=data["tokens_per_minute"],
            tokens_per_day=data["tokens_per_day"],
            requests_per_minute=data["requests_per_minute"],
        )


@dataclass
class Tenant:
    """Represents one isolated organisational tenant.

    Attributes
    ----------
    tenant_id:
        UUID string that uniquely identifies the tenant.
    name:
        Human-readable display name (e.g. ``"Gestora Alpha"``).
    tier:
        Subscription tier: ``starter``, ``professional``, or ``enterprise``.
    api_keys:
        List of **SHA-256 hashed** raw API keys.  Never store plaintext keys.
    budget_usd:
        Monthly budget cap in USD.  ``0.0`` means no cap.
    rate_limits:
        Token and request rate limits for this tenant.
    created_at:
        UTC creation timestamp.
    active:
        Whether the tenant is currently active.
    """

    tenant_id: str
    name: str
    tier: str
    api_keys: list[str] = field(default_factory=list)
    budget_usd: float = 0.0
    rate_limits: RateLimits = field(default_factory=lambda: RateLimits.for_tier("starter"))
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    active: bool = True

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def hash_api_key(raw_key: str) -> str:
        """Return the SHA-256 hex digest of *raw_key*."""
        return hashlib.sha256(raw_key.encode()).hexdigest()

    def verify_api_key(self, raw_key: str) -> bool:
        """Return ``True`` if *raw_key* matches one of the stored hashed keys."""
        hashed = self.hash_api_key(raw_key)
        return hashed in self.api_keys

    def add_api_key(self, raw_key: str) -> None:
        """Hash and append *raw_key* to :attr:`api_keys` (idempotent)."""
        hashed = self.hash_api_key(raw_key)
        if hashed not in self.api_keys:
            self.api_keys.append(hashed)

    def to_dict(self) -> dict:
        """Serialise to a JSON-safe dict."""
        return {
            "tenant_id": self.tenant_id,
            "name": self.name,
            "tier": self.tier,
            "api_keys": self.api_keys,
            "budget_usd": self.budget_usd,
            "rate_limits": self.rate_limits.to_dict(),
            "created_at": self.created_at.isoformat(),
            "active": self.active,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Tenant":
        """Deserialise from a plain dict (loaded from JSON)."""
        created_raw = data.get("created_at", datetime.now(timezone.utc).isoformat())
        created_at: datetime
        if isinstance(created_raw, datetime):
            created_at = created_raw
        else:
            created_at = datetime.fromisoformat(created_raw)
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)

        return cls(
            tenant_id=data["tenant_id"],
            name=data["name"],
            tier=data.get("tier", "starter"),
            api_keys=data.get("api_keys", []),
            budget_usd=float(data.get("budget_usd", 0.0)),
            rate_limits=RateLimits.from_dict(data["rate_limits"]) if "rate_limits" in data else RateLimits.for_tier(data.get("tier", "starter")),
            created_at=created_at,
            active=bool(data.get("active", True)),
        )


# ---------------------------------------------------------------------------
# TenantStore
# ---------------------------------------------------------------------------


class TenantStore:
    """Thread-safe persistent store for :class:`Tenant` objects.

    Persists to ``runtime/tenants/tenants.json`` relative to the PAGANINI
    base directory (``PAGANINI_BASE`` env var or current working directory).

    All public methods acquire :attr:`_lock` to ensure thread safety.

    Example
    -------
    >>> store = TenantStore()
    >>> tenant = store.create("Gestora Alpha", tier="professional")
    >>> store.get(tenant.tenant_id)
    """

    def __init__(self, store_path: Optional[Path] = None) -> None:
        self._lock = threading.RLock()
        self._store_path = store_path or self._default_path()
        self._store_path.parent.mkdir(parents=True, exist_ok=True)
        self._tenants: dict[str, Tenant] = {}
        self._load()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _default_path() -> Path:
        base = Path(os.environ.get("PAGANINI_BASE", ".")).resolve()
        return base / "runtime" / "tenants" / "tenants.json"

    def _load(self) -> None:
        """Load tenants from disk (called once in ``__init__``)."""
        if self._store_path.exists():
            try:
                raw = json.loads(self._store_path.read_text())
                self._tenants = {tid: Tenant.from_dict(td) for tid, td in raw.items()}
            except (json.JSONDecodeError, KeyError):
                self._tenants = {}
        else:
            self._tenants = {}

    def _save(self) -> None:
        """Persist current state to disk.  Caller must hold ``_lock``."""
        data = {tid: t.to_dict() for tid, t in self._tenants.items()}
        tmp = self._store_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2, default=str))
        tmp.replace(self._store_path)

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    def create(
        self,
        name: str,
        tier: str = "starter",
        budget_usd: float = 0.0,
        rate_limits: Optional[RateLimits] = None,
    ) -> Tenant:
        """Create and persist a new :class:`Tenant`.

        Parameters
        ----------
        name:
            Human-readable tenant name.
        tier:
            Subscription tier (``starter`` | ``professional`` | ``enterprise``).
        budget_usd:
            Monthly budget cap in USD (``0.0`` = unlimited).
        rate_limits:
            Custom rate limits; defaults to the tier defaults when ``None``.

        Returns
        -------
        Tenant
            The newly created tenant.
        """
        if tier not in VALID_TIERS:
            raise ValueError(f"Invalid tier '{tier}'. Must be one of: {sorted(VALID_TIERS)}")

        tenant = Tenant(
            tenant_id=str(uuid.uuid4()),
            name=name,
            tier=tier,
            budget_usd=budget_usd,
            rate_limits=rate_limits or RateLimits.for_tier(tier),
        )
        with self._lock:
            self._tenants[tenant.tenant_id] = tenant
            self._save()
        return tenant

    def get(self, tenant_id: str) -> Optional[Tenant]:
        """Return the :class:`Tenant` for *tenant_id*, or ``None``."""
        with self._lock:
            return self._tenants.get(tenant_id)

    def get_by_api_key(self, raw_key: str) -> Optional[Tenant]:
        """Look up an active tenant by raw (unhashed) API key.

        Returns ``None`` if no tenant matches or the matching tenant is
        inactive.
        """
        hashed = Tenant.hash_api_key(raw_key)
        with self._lock:
            for tenant in self._tenants.values():
                if tenant.active and hashed in tenant.api_keys:
                    return tenant
        return None

    def update(self, tenant: Tenant) -> None:
        """Persist an updated :class:`Tenant` back to the store.

        Raises ``KeyError`` if *tenant_id* is not found.
        """
        with self._lock:
            if tenant.tenant_id not in self._tenants:
                raise KeyError(f"Tenant '{tenant.tenant_id}' not found.")
            self._tenants[tenant.tenant_id] = tenant
            self._save()

    def delete(self, tenant_id: str) -> bool:
        """Remove a tenant.  Returns ``True`` if found and deleted."""
        with self._lock:
            if tenant_id not in self._tenants:
                return False
            del self._tenants[tenant_id]
            self._save()
        return True

    def list(self, active_only: bool = False) -> list[Tenant]:
        """Return all tenants, optionally filtered to active ones only."""
        with self._lock:
            tenants = list(self._tenants.values())
        if active_only:
            tenants = [t for t in tenants if t.active]
        return tenants

    def __len__(self) -> int:
        with self._lock:
            return len(self._tenants)
