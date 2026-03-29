# Paganini AIOS — Production Execution Plan
# All 12 P0 Blockers + Hermes-Inspired Features
# Created: 2026-03-29 04:00 UTC

## Workstreams (Parallel Execution)

### WS1: Metering & Billing Foundation
- [ ] Token counter middleware in Moltis proxy
- [ ] Cost calculator (per-model pricing table)
- [ ] Persistence to Supabase (usage_events table)
- [ ] Cost attribution by tenant_id, agent_id, query_id
- [ ] Rate limiting per tenant (token bucket algorithm)
- [ ] Budget alerts (configurable thresholds)
- Files: `core/metering/`, `core/metering/counter.py`, `core/metering/cost.py`, `core/metering/limiter.py`

### WS2: Auth, RBAC & Data Isolation
- [ ] JWT auth middleware (replace single API key)
- [ ] Tenant model (tenant_id, name, api_keys, tier, budget)
- [ ] Roles: admin, operator, viewer
- [ ] Per-tenant API keys with scoped permissions
- [ ] RLS policies on pgvector (tenant_id column + policies)
- [ ] Secret management via env encryption (SOPS-compatible)
- Files: `core/auth/`, `core/auth/jwt.py`, `core/auth/rbac.py`, `core/auth/tenant.py`

### WS3: Safety Gates
- [ ] PII Redaction pre-LLM (CPF, CNPJ, names, bank accounts, phone)
- [ ] Hallucination detection post-LLM (NLI-based grounding check)
- [ ] Output validation gate (schema check for reports)
- [ ] Regulatory citation enforcement
- Files: `core/guardrails/pii_redaction.py`, `core/guardrails/hallucination.py`, `core/guardrails/output_validation.py`

### WS4: Quality & CI/CD
- [ ] Eval dataset FIDC (50+ Q&A golden pairs)
- [ ] pytest setup + conftest + CI integration
- [ ] Docker image build in CI → push to GHCR
- [ ] Deploy pipeline (staging → smoke → manual gate → prod)
- [ ] First AutoResearch cycle with eval dataset
- Files: `packs/finance/eval_questions.jsonl`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`

### WS5: Telegram-First Client Channel + HITL + Hermes Features
- [ ] Telegram client channel (groups/topics per fund)
- [ ] HITL workflow (inline buttons: ✅ Aprovar / ❌ Rejeitar)
- [ ] Cron delivery via Telegram (scheduled reports)
- [ ] Corpus self-service ingestion (upload → chunk → embed → index)
- [ ] Session search (FTS5 cross-session recall)
- [ ] Closed learning loop (feedback → skill scoring → adaptation)
- [ ] User modeling (dialectic profile evolution)
- Files: `core/channels/telegram_client.py`, `core/hitl/`, `core/learning/`, `core/search/`
