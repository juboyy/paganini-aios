# BMAD Investor Mode — Micro-Cycle (2026-03-16 08:29 UTC)

## Stage 1 — Context Scout Scorecard

| Dimension | Score (0-10) | Notes |
|---|---:|---|
| UX | 6.5 | Dashboard status lacks explicit investor-facing business counters (funds/skills). |
| CI | 7.0 | No code-level blocker found in this cycle scope. |
| Reliability | 7.2 | Basic status works but misses consistency surface between backend and visible KPIs. |
| Security | 6.8 | Query endpoint accepts arbitrarily long prompts; abuse risk for demo infra. |
| Demo Impact | 8.4 | Showing operational KPIs (funds/chunks/skills) increases instant trust in CTO demo. |

**Picked item (highest impact / lowest risk):**
1) Add explicit `funds` + `skills` metrics to dashboard status panel (visible).
2) Add strict query length guardrail to `/api/query` (hardening).

---

## Stage 8/10 — Mini Story + Spec

### User Story
As an investor/CTO watching the Paganini demo, I want to immediately see core operational metrics (funds, chunks, skills) and trust that the query endpoint has basic abuse controls, so the platform looks production-aware, not only feature-rich.

### Investor Acceptance Criteria
- **Impress CTO:** dashboard shows `Funds`, `RAG Chunks`, `Skills` in status strip.
- **Reduce operational risk:** API rejects oversized prompt payloads (>1200 chars) with deterministic error.
- **Improve demo conversion:** key metrics visible in <3 seconds after page load and consistent with `/api/status` payload.

### Technical Spec (micro scope)
- File: `packages/dashboard/app.py`
- UI changes:
  - Status grid expands to include `st-funds` and `st-skills`.
  - `loadStatus()` binds values from `/api/status`.
- Backend changes:
  - Add `_count_funds()` from known runtime paths.
  - Add `_count_skills()` from configured `metaclaw.skills_dir`.
  - Include `funds` and `skills` in `/api/status` response.
- Hardening:
  - In `/api/query`, trim input and reject >1200 chars with HTTP 413.

---

## Stage 11 — Implementation Summary

Implemented exactly:
- **1 visible improvement:** status strip now surfaces `Funds` and `Skills` metrics.
- **1 hardening improvement:** `/api/query` now enforces max query length (1200 chars).

---

## Stage 12/13 — Review + QA Gates

Executed:
- `python3 -m py_compile packages/dashboard/app.py` ✅

Attempted but blocked by environment constraints:
- Full pytest/CI-equivalent run unavailable (`pytest` not installed; venv creation unavailable because `python3-venv` missing in host environment).
- Runtime API smoke via `TestClient` blocked by missing dependency `chromadb` in this runtime image.

Manual review outcomes:
- Mobile viewport unchanged; responsive grid updated to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` (no obvious mobile regression risk).
- Metrics consistency target addressed by surfacing `funds/chunks/skills` from one `/api/status` contract.
- Onboarding E2E not re-executed in this micro-cycle due dependency/runtime limits.

**Gate decision:** PASS with constraints (safe, reversible code-only delta; runtime validation partially blocked by environment tooling).

---

## Stage 15 — Stakeholder Note (Concise)

Before → Dashboard only showed chunks/agents/daemons/metaclaw; query endpoint accepted unbounded prompt size.

After → Dashboard now highlights investor-facing `Funds + Chunks + Skills`; query endpoint rejects oversized prompts with clear 413 error.

Readiness delta:
- Demo trust signal: **+1 step** (visible operational maturity)
- Operational safety: **+1 step** (basic abuse control)
- Overall micro-cycle status: **Ready for next loop**
