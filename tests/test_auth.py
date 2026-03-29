"""Tests for PAGANINI WS2 — Auth, RBAC & Data Isolation.

Covers:
* JWT creation and verification (access + refresh)
* Expired token rejection
* Invalid signature rejection
* Role permission matrix
* Tenant CRUD via TenantStore
* Data isolation filter
"""

from __future__ import annotations

import os
import time
import tempfile
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# JWT Tests
# ---------------------------------------------------------------------------


class TestJwtAuth:
    """Tests for core.auth.jwt_auth."""

    def setup_method(self):
        # Force a deterministic secret so tests are isolated from env
        os.environ["PAGANINI_JWT_SECRET"] = "test-secret-paganini-ws2-2026"

    def teardown_method(self):
        os.environ.pop("PAGANINI_JWT_SECRET", None)

    def _import(self):
        # Re-import to pick up env changes
        from core.auth.jwt_auth import (  # noqa: PLC0415
            create_token,
            create_refresh_token,
            verify_token,
            TokenError,
        )
        return create_token, create_refresh_token, verify_token, TokenError

    def test_create_and_verify_access_token(self):
        create_token, _, verify_token, _ = self._import()
        token = create_token("tenant-abc", "admin")
        assert isinstance(token, str)
        assert token.count(".") == 2

        payload = verify_token(token)
        assert payload["tenant_id"] == "tenant-abc"
        assert payload["role"] == "admin"
        assert payload["token_type"] == "access"
        assert payload["iss"] == "paganini"
        assert payload["sub"] == "tenant-abc"
        assert "exp" in payload
        assert "iat" in payload

    def test_create_and_verify_refresh_token(self):
        create_token, create_refresh_token, verify_token, _ = self._import()
        token = create_refresh_token("tenant-xyz", "operator")
        payload = verify_token(token)
        assert payload["tenant_id"] == "tenant-xyz"
        assert payload["role"] == "operator"
        assert payload["token_type"] == "refresh"
        # Refresh token should live longer than access token
        assert payload["exp"] - payload["iat"] == 60 * 60 * 24 * 7

    def test_expired_token_rejected(self):
        create_token, _, verify_token, TokenError = self._import()
        # TTL of 0 seconds → instantly expired
        token = create_token("tenant-xyz", "viewer", ttl=0)
        # Advance 1 second to guarantee expiry
        time.sleep(1.1)
        with pytest.raises(TokenError, match="expired"):
            verify_token(token)

    def test_invalid_signature_rejected(self):
        create_token, _, verify_token, TokenError = self._import()
        token = create_token("tenant-xyz", "viewer")
        # Corrupt the signature segment
        parts = token.split(".")
        parts[2] = "invalidsignatureXXXXXXXXXXXXX"
        bad_token = ".".join(parts)
        with pytest.raises(TokenError, match="signature"):
            verify_token(bad_token)

    def test_malformed_token_rejected(self):
        _, _, verify_token, TokenError = self._import()
        with pytest.raises(TokenError, match="structure"):
            verify_token("not.a.valid.jwt.token.here")

    def test_wrong_secret_rejected(self):
        create_token, _, _, TokenError = self._import()
        token = create_token("tenant-xyz", "admin")

        # Switch to a different secret
        os.environ["PAGANINI_JWT_SECRET"] = "completely-different-secret"
        from core.auth.jwt_auth import verify_token  # noqa: PLC0415
        with pytest.raises(TokenError, match="signature"):
            verify_token(token)

    def test_extra_claims_preserved(self):
        create_token, _, verify_token, _ = self._import()
        token = create_token("t1", "admin", extra_claims={"fund_id": "FIDC-001"})
        payload = verify_token(token)
        assert payload["fund_id"] == "FIDC-001"

    def test_custom_ttl(self):
        create_token, _, verify_token, _ = self._import()
        ttl = 3600  # 1 hour
        token = create_token("t1", "viewer", ttl=ttl)
        payload = verify_token(token)
        assert payload["exp"] - payload["iat"] == ttl


# ---------------------------------------------------------------------------
# RBAC Tests
# ---------------------------------------------------------------------------


class TestRbac:
    """Tests for core.auth.rbac."""

    @pytest.fixture(autouse=True)
    def _import_rbac(self):
        from core.auth.rbac import check_permission, has_minimum_role  # noqa: PLC0415
        self.check_permission = check_permission
        self.has_minimum_role = has_minimum_role

    # -- Admin --
    def test_admin_can_do_everything(self):
        for perm in ["query", "report", "config", "manage_users",
                     "manage_funds", "approve_operations", "view_audit"]:
            assert self.check_permission("t1", "admin", perm), f"admin should have '{perm}'"

    # -- Operator --
    def test_operator_allowed_permissions(self):
        for perm in ["query", "report", "manage_funds", "approve_operations", "view_audit"]:
            assert self.check_permission("t1", "operator", perm), f"operator should have '{perm}'"

    def test_operator_denied_permissions(self):
        for perm in ["config", "manage_users"]:
            assert not self.check_permission("t1", "operator", perm), f"operator should NOT have '{perm}'"

    # -- Viewer --
    def test_viewer_allowed_permissions(self):
        for perm in ["query", "view_audit"]:
            assert self.check_permission("t1", "viewer", perm), f"viewer should have '{perm}'"

    def test_viewer_denied_permissions(self):
        for perm in ["report", "config", "manage_users", "manage_funds", "approve_operations"]:
            assert not self.check_permission("t1", "viewer", perm), f"viewer should NOT have '{perm}'"

    # -- Unknown role --
    def test_unknown_role_has_no_permissions(self):
        assert not self.check_permission("t1", "superuser", "query")
        assert not self.check_permission("t1", "", "query")

    # -- Role hierarchy --
    def test_role_hierarchy(self):
        assert self.has_minimum_role("admin", "viewer")
        assert self.has_minimum_role("admin", "operator")
        assert self.has_minimum_role("admin", "admin")
        assert self.has_minimum_role("operator", "viewer")
        assert self.has_minimum_role("operator", "operator")
        assert not self.has_minimum_role("operator", "admin")
        assert self.has_minimum_role("viewer", "viewer")
        assert not self.has_minimum_role("viewer", "operator")
        assert not self.has_minimum_role("viewer", "admin")


# ---------------------------------------------------------------------------
# Tenant CRUD Tests
# ---------------------------------------------------------------------------


class TestTenantStore:
    """Tests for core.auth.tenant.TenantStore."""

    @pytest.fixture
    def store(self, tmp_path):
        from core.auth.tenant import TenantStore  # noqa: PLC0415
        store_path = tmp_path / "tenants.json"
        return TenantStore(store_path=store_path)

    def test_create_tenant(self, store):
        t = store.create("Gestora Alpha", tier="professional")
        assert t.tenant_id
        assert t.name == "Gestora Alpha"
        assert t.tier == "professional"
        assert t.active is True

    def test_create_applies_tier_defaults(self, store):
        starter = store.create("Starter Co", tier="starter")
        assert starter.rate_limits.tokens_per_day == 100_000
        assert starter.rate_limits.requests_per_minute == 20

        pro = store.create("Pro Co", tier="professional")
        assert pro.rate_limits.tokens_per_day == 1_000_000
        assert pro.rate_limits.requests_per_minute == 60

        ent = store.create("Enterprise Co", tier="enterprise")
        assert ent.rate_limits.tokens_per_day == -1  # unlimited

    def test_get_existing_tenant(self, store):
        t = store.create("Alpha")
        fetched = store.get(t.tenant_id)
        assert fetched is not None
        assert fetched.tenant_id == t.tenant_id

    def test_get_nonexistent_tenant(self, store):
        assert store.get("does-not-exist") is None

    def test_update_tenant(self, store):
        t = store.create("Beta")
        t.name = "Beta Updated"
        store.update(t)
        fetched = store.get(t.tenant_id)
        assert fetched.name == "Beta Updated"

    def test_update_nonexistent_raises(self, store):
        from core.auth.tenant import Tenant, RateLimits  # noqa: PLC0415
        from datetime import datetime, timezone
        ghost = Tenant(
            tenant_id="ghost-id",
            name="Ghost",
            tier="starter",
            rate_limits=RateLimits.for_tier("starter"),
        )
        with pytest.raises(KeyError):
            store.update(ghost)

    def test_delete_tenant(self, store):
        t = store.create("Gamma")
        deleted = store.delete(t.tenant_id)
        assert deleted is True
        assert store.get(t.tenant_id) is None

    def test_delete_nonexistent(self, store):
        assert store.delete("no-such-id") is False

    def test_list_tenants(self, store):
        store.create("T1")
        store.create("T2")
        store.create("T3")
        tenants = store.list()
        assert len(tenants) == 3

    def test_list_active_only(self, store):
        t1 = store.create("Active")
        t2 = store.create("Inactive")
        t2.active = False
        store.update(t2)
        active = store.list(active_only=True)
        assert len(active) == 1
        assert active[0].tenant_id == t1.tenant_id

    def test_api_key_crud_and_lookup(self, store):
        import secrets as _secrets  # noqa: PLC0415
        t = store.create("KeyTest")
        raw_key = _secrets.token_urlsafe(32)
        t.add_api_key(raw_key)
        store.update(t)

        found = store.get_by_api_key(raw_key)
        assert found is not None
        assert found.tenant_id == t.tenant_id

    def test_wrong_api_key_not_found(self, store):
        t = store.create("KeyTest2")
        import secrets as _secrets  # noqa: PLC0415
        t.add_api_key(_secrets.token_urlsafe(32))
        store.update(t)

        assert store.get_by_api_key("wrong-key") is None

    def test_inactive_tenant_api_key_not_found(self, store):
        import secrets as _secrets  # noqa: PLC0415
        raw_key = _secrets.token_urlsafe(32)
        t = store.create("InactiveKey")
        t.add_api_key(raw_key)
        t.active = False
        store.update(t)

        assert store.get_by_api_key(raw_key) is None

    def test_persistence_across_instances(self, tmp_path):
        from core.auth.tenant import TenantStore  # noqa: PLC0415
        store_path = tmp_path / "persist.json"

        store1 = TenantStore(store_path=store_path)
        t = store1.create("Persist Test", tier="enterprise")
        tid = t.tenant_id

        store2 = TenantStore(store_path=store_path)
        loaded = store2.get(tid)
        assert loaded is not None
        assert loaded.name == "Persist Test"
        assert loaded.tier == "enterprise"

    def test_invalid_tier_raises(self, store):
        with pytest.raises(ValueError, match="Invalid tier"):
            store.create("BadTier", tier="platinum")


# ---------------------------------------------------------------------------
# Data Isolation Tests
# ---------------------------------------------------------------------------


class TestDataIsolation:
    """Tests for core.auth.data_isolation.tenant_filter."""

    @pytest.fixture(autouse=True)
    def _import(self):
        from core.auth.data_isolation import tenant_filter  # noqa: PLC0415
        self.tenant_filter = tenant_filter

    def test_basic_select_no_where(self):
        q = self.tenant_filter("SELECT * FROM fund_positions", "tenant-1")
        assert "WHERE tenant_id = 'tenant-1'" in q

    def test_injects_before_existing_where(self):
        q = self.tenant_filter(
            "SELECT * FROM fund_positions WHERE active = true", "t2"
        )
        assert "WHERE tenant_id = 't2' AND active = true" in q

    def test_injects_before_order_by(self):
        q = self.tenant_filter(
            "SELECT * FROM reports ORDER BY created_at DESC", "t3"
        )
        assert "WHERE tenant_id = 't3'" in q
        assert q.index("WHERE") < q.index("ORDER BY")

    def test_injects_before_limit(self):
        q = self.tenant_filter(
            "SELECT id FROM transactions LIMIT 10", "t4"
        )
        assert "WHERE tenant_id = 't4'" in q
        assert q.index("WHERE") < q.index("LIMIT")

    def test_preserves_semicolon(self):
        q = self.tenant_filter("SELECT * FROM audit_log;", "t5")
        assert q.endswith(";")
        assert "WHERE tenant_id = 't5'" in q

    def test_case_insensitive_where_detection(self):
        q = self.tenant_filter("select * from reports where id = 1", "t6")
        assert "tenant_id = 't6'" in q.lower()
        assert "AND id = 1" in q or "and id = 1" in q.lower()

    def test_invalid_tenant_id_raises(self):
        with pytest.raises(ValueError, match="Invalid tenant_id"):
            self.tenant_filter("SELECT * FROM reports", "'; DROP TABLE users; --")

    def test_uuid_tenant_id_accepted(self):
        uid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        q = self.tenant_filter("SELECT * FROM documents", uid)
        assert uid in q

    def test_filter_is_first_condition(self):
        """The tenant filter must be first to prevent OR injection bypass."""
        q = self.tenant_filter(
            "SELECT * FROM transactions WHERE amount > 1000 OR amount < 0", "t7"
        )
        # tenant_id predicate should appear right after WHERE
        where_pos = q.index("WHERE")
        tenant_pos = q.index("tenant_id")
        assert tenant_pos == where_pos + len("WHERE ")
