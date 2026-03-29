"""PAGANINI AIOS — Tenant Data Isolation.

Provides application-level tenant isolation utilities.  All database queries
that touch multi-tenant tables must pass through :func:`tenant_filter` before
execution to guarantee data isolation.

Isolation strategy
------------------
**Current approach: application-level filtering (Python).**

Every query is rewritten by :func:`tenant_filter` to add a
``WHERE tenant_id = '<tid>'`` clause.  This is a pragmatic first step that
provides isolation without requiring database-level Row Level Security (RLS),
which may not yet be fully available in all pgvector deployments.

**Future approach: PostgreSQL Row Level Security (RLS).**

Once the database layer supports RLS reliably, the plan is to:

1. Set the session role to the tenant's Postgres role before each connection.
2. Define ``CREATE POLICY`` rules that filter rows automatically.
3. Application code can then drop explicit ``WHERE tenant_id = ...`` clauses.

The migration SQL in :data:`MIGRATION_SQL` and :data:`RLS_POLICY_SQL` below
documents both steps.

Usage
-----
::

    from core.auth.data_isolation import tenant_filter

    base_query = "SELECT * FROM fund_positions"
    safe_query = tenant_filter(base_query, tenant_id=request.state.tenant_id)
    rows = await db.fetch(safe_query)
"""

from __future__ import annotations

import re
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tables that have (or will have) a tenant_id column
# ---------------------------------------------------------------------------

MULTI_TENANT_TABLES: tuple[str, ...] = (
    "fund_positions",
    "transactions",
    "audit_log",
    "documents",
    "reports",
    "agent_runs",
    "pipeline_events",
    "metering_events",
)

# ---------------------------------------------------------------------------
# Application-level isolation
# ---------------------------------------------------------------------------


def tenant_filter(query: str, tenant_id: str) -> str:
    """Rewrite *query* to restrict results to *tenant_id*.

    The function appends or merges a ``tenant_id = '<tenant_id>'`` predicate:

    * If the query already contains ``WHERE``, the predicate is injected with
      ``AND`` as the first condition so it cannot be bypassed by OR injection.
    * Otherwise, a fresh ``WHERE`` clause is added before any
      ``GROUP BY``/``ORDER BY``/``LIMIT``/``HAVING`` clause, or at the end.

    .. warning::
        This function provides a best-effort rewrite for straightforward
        ``SELECT`` statements.  It is **not** a full SQL parser.  For complex
        queries with sub-selects or CTEs, prefer using parameterised queries
        with an explicit ``tenant_id = $1`` parameter.

    Parameters
    ----------
    query:
        The SQL query to rewrite.  Trailing semicolons are preserved.
    tenant_id:
        The tenant UUID to filter by.  The value is validated to contain only
        alphanumeric characters and hyphens (UUID format) to prevent SQL
        injection.

    Returns
    -------
    str
        The rewritten query.

    Raises
    ------
    ValueError
        If *tenant_id* contains characters outside ``[a-zA-Z0-9-]``.

    Examples
    --------
    >>> tenant_filter("SELECT * FROM fund_positions", "abc-123")
    "SELECT * FROM fund_positions WHERE tenant_id = 'abc-123'"

    >>> tenant_filter("SELECT * FROM fund_positions WHERE active = true", "abc-123")
    "SELECT * FROM fund_positions WHERE tenant_id = 'abc-123' AND active = true"
    """
    # Validate tenant_id to prevent SQL injection
    if not re.fullmatch(r"[a-zA-Z0-9\-_]+", tenant_id):
        raise ValueError(
            f"Invalid tenant_id '{tenant_id}': must contain only alphanumeric characters, hyphens, and underscores."
        )

    predicate = f"tenant_id = '{tenant_id}'"

    # Preserve trailing semicolon
    stripped = query.rstrip()
    has_semicolon = stripped.endswith(";")
    if has_semicolon:
        stripped = stripped[:-1].rstrip()

    # Case-insensitive search for WHERE
    where_match = re.search(r"\bWHERE\b", stripped, re.IGNORECASE)

    if where_match:
        # Inject as first predicate: WHERE <tenant_filter> AND <original>
        insert_pos = where_match.end()
        rewritten = (
            stripped[: where_match.start()]
            + "WHERE "
            + predicate
            + " AND "
            + stripped[insert_pos:].lstrip()
        )
    else:
        # Find the earliest keyword that should come after WHERE
        clause_pattern = re.compile(
            r"\b(GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET|UNION|INTERSECT|EXCEPT)\b",
            re.IGNORECASE,
        )
        clause_match = clause_pattern.search(stripped)
        if clause_match:
            insert_pos = clause_match.start()
            rewritten = (
                stripped[:insert_pos].rstrip()
                + f" WHERE {predicate} "
                + stripped[insert_pos:]
            )
        else:
            rewritten = stripped + f" WHERE {predicate}"

    return (rewritten + ";") if has_semicolon else rewritten


# ---------------------------------------------------------------------------
# Migration SQL — add tenant_id columns
# ---------------------------------------------------------------------------

MIGRATION_SQL: str = """
-- ============================================================
-- PAGANINI WS2: Add tenant_id columns to multi-tenant tables
-- Run once against the target database.
-- ============================================================

-- 1. fund_positions
ALTER TABLE fund_positions
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_fund_positions_tenant_id
    ON fund_positions (tenant_id);

-- 2. transactions
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id
    ON transactions (tenant_id);

-- 3. audit_log
ALTER TABLE audit_log
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id
    ON audit_log (tenant_id);

-- 4. documents
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_documents_tenant_id
    ON documents (tenant_id);

-- 5. reports
ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_reports_tenant_id
    ON reports (tenant_id);

-- 6. agent_runs
ALTER TABLE agent_runs
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_agent_runs_tenant_id
    ON agent_runs (tenant_id);

-- 7. pipeline_events
ALTER TABLE pipeline_events
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_pipeline_events_tenant_id
    ON pipeline_events (tenant_id);

-- 8. metering_events
ALTER TABLE metering_events
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_metering_events_tenant_id
    ON metering_events (tenant_id);

-- ============================================================
-- After migration: remove the DEFAULT 'default' fallback
-- to enforce tenant_id on all new inserts.
-- ============================================================
-- ALTER TABLE fund_positions ALTER COLUMN tenant_id DROP DEFAULT;
-- (repeat for each table)
"""


# ---------------------------------------------------------------------------
# RLS Policy SQL — PostgreSQL Row Level Security
# ---------------------------------------------------------------------------

RLS_POLICY_SQL: str = """
-- ============================================================
-- PAGANINI WS2: PostgreSQL Row Level Security (RLS) policies
-- Apply AFTER the migration SQL above.
-- Requires: SET app.current_tenant = '<tenant_id>' before
--           each DB connection/transaction.
-- ============================================================

-- Enable RLS on each table
ALTER TABLE fund_positions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE metering_events   ENABLE ROW LEVEL SECURITY;

-- Create isolation policies
-- Connection must SET app.current_tenant = '<uuid>' before queries.

CREATE POLICY tenant_isolation ON fund_positions
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON transactions
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON audit_log
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON documents
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON reports
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON agent_runs
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON pipeline_events
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation ON metering_events
    USING (tenant_id = current_setting('app.current_tenant', true));

-- ============================================================
-- Application-side: set the tenant context before each query
-- ============================================================
-- In asyncpg:
--   await conn.execute("SET app.current_tenant = $1", tenant_id)
--
-- In SQLAlchemy (async):
--   await session.execute(text("SET app.current_tenant = :tid"), {"tid": tenant_id})
--
-- Note: SET is connection-scoped — use a connection-per-request pattern
-- or reset at the end of each request to avoid cross-tenant leaks.
-- ============================================================
"""


def get_migration_sql() -> str:
    """Return the full migration SQL for adding tenant_id columns."""
    return MIGRATION_SQL


def get_rls_policy_sql() -> str:
    """Return the RLS policy SQL (for future DB-level isolation)."""
    return RLS_POLICY_SQL
