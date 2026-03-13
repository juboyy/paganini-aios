# OraCLI → PAGANINI AIOS — Reuse Map

> What we built, battle-tested, and can transfer directly.

## Overview

60% of PAGANINI's operational infrastructure comes from OraCLI — a production AIOS
that has been running 24/7 since February 2026. These aren't theoretical components.
They run in production, have been debugged, audited, and improved across hundreds
of sessions.

The remaining 40% is financial domain logic — the differentiator we build from scratch.

---

## Scripts (Direct Transfer)

| Script | OraCLI Function | PAGANINI Adaptation | Effort |
|--------|----------------|---------------------|--------|
| `gate.py` | Pre-execution validation + context scout + gate token | Gate for financial operations (cession, PDD, covenant check). Token proves regulatory due diligence. | Low — change classification tiers to financial operation types |
| `sense.py` | Quality evaluation of all outputs against TASTE.md | Quality gate for client-facing reports and regulatory submissions. No subpar output leaves the system. | Low — update criteria from dev quality to financial report quality |
| `memory-reflection.py` | Episodic → semantic memory promotion. Daily curation. | Same — daily reflection on fund operations, decisions, market events. Knowledge compounds. | None — works as-is |
| `data-integrity-sync.py` | Sync 8 tables + health probes + anomaly detection | Reconciliation integrity — verify fund data consistency across systems. | Medium — add financial reconciliation rules |
| `provider-monitor.py` | LLM provider health (latency, uptime, rate limits) | Same — monitor BYOK provider health for each client. Alert on degradation. | None — works as-is |
| `roi-calculator.py` | Calculate AIOS ROI (hours saved, cost per task) | Client-facing ROI — "PAGANINI saved you X hours and R$Y this month vs manual operation." | Low — change metrics from dev hours to financial ops hours |
| `context_engine.py` | Search memory + GitNexus + semantic search before any task | Context scout for financial operations — check fund history, past decisions, regulatory precedent before acting. | Medium — add corpus search + knowledge graph traversal |
| `realtime_sync.py` | Bridge traces → interactions for telemetry | Same — operational telemetry for financial agent activity. | None — works as-is |
| `standup-reporter.py` | Daily standup to Slack | Daily fund operations summary to Slack channel. | Low — change template from dev standup to fund operations digest |

## Infrastructure (Reuse)

| Component | OraCLI Today | PAGANINI Transfer | Effort |
|-----------|-------------|-------------------|--------|
| **pgvector (EC2)** | Memory + capabilities + 3072d embeddings (gemini-embedding-001) | Corpus embeddings + knowledge graph + fund memory. Same engine, different data. | Low — new tables, same infrastructure |
| **Supabase (27 tables)** | Dashboard + agents + tasks + traces + decisions + capabilities | Adapt schema: `tasks` → `operations`, `traces` → `audit_trail`, add `funds`, `cotas`, `cedentes`. | Medium — schema migration + new RLS policies per fund_id |
| **tmux + systemd** | 6-window session, auto-restart on crash/reboot | Same architecture. Windows: kernel, daemons, watch, slack, metrics, logs, pinchtab, work. | None — same setup |
| **GitNexus** | Code intelligence for Revenue-OS (17K nodes). Now also indexes PAGANINI (238 nodes). | Codebase intelligence for PAGANINI itself. Enables impact analysis on our own code. | None — already indexed |
| **OTel pipeline** | Traces + metrics + logs via OTLP HTTP | Regulatory-grade audit trail. Every agent action traced. CVM auditor can reconstruct any decision. | None — already emitting |
| **Docker setup** | `openclaw-gateway` + `openclaw-pgvector` containers | Add PAGANINI containers: `paganini-kernel`, `paganini-metaclaw`, `paganini-pinchtab`. | Medium — new Dockerfiles, compose extension |

## Composio Integrations (Plug & Play)

| Integration | OraCLI Use | PAGANINI Use | Effort |
|-------------|-----------|--------------|--------|
| **Slack** (`ca_cogNsG41-KKX`) | Team notifications, channel messaging | IR bot: per-fund channels, cotista DMs, operations alerts | Low — new channels, same SDK |
| **GitHub** (`ca_gB4u4YuUWkrV`) | Repo management, PRs, CI/CD | PAGANINI repo management, CI/CD pipeline | None — same integration |
| **Supabase** (`ca_owvlmLAeZSWw`) | Dashboard DB operations | Fund data operations, knowledge graph queries | None — same connection |
| **Linear** (GraphQL API) | Approval gate for production deploys | Approval gate for high-risk financial operations (>threshold) | Low — new issue templates |

## Patterns (Battle-Tested)

| Pattern | Hours in Production | Transfer Notes |
|---------|-------------------|----------------|
| **SOUL pattern** | ~500h across 9 subagents | Direct. 9 financial agent SOULs already written. Same structure: identity, constraints, tools, tone. |
| **BMAD-CE pipeline** | ~300h across 100+ tasks | Direct. 18 stages mapped to financial operation lifecycle. Tier classification adapted for operations. |
| **Gate system** | ~200h, 12 violations caught | Direct. Gate token proves context was checked before any financial operation. Audit-native. |
| **Heartbeat + proactivity** | ~400h continuous monitoring | Direct. Daemons check covenants, PDD, risk, regulations proactively. Same pattern, different checks. |
| **Self-audit / violations** | ~100h, caught 12 violations across 4 sessions | Direct. Compliance self-check against CVM 175 and fund regulations. |
| **Memory promotion** | ~200h, reflection runs daily | Direct. Daily fund operations become permanent knowledge. Same episodic → semantic flow. |
| **Capabilities graph** | 34 capabilities indexed with semantic search | Adapt. Financial capabilities indexed instead of dev capabilities. Same pgvector search. |
| **Sense quality gate** | ~50h since creation | Adapt. TASTE.md criteria updated for financial report quality (accuracy > density, regulatory compliance > brevity). |

## Supabase Schema Migration

| OraCLI Table | PAGANINI Table | Changes |
|-------------|---------------|---------|
| `agents` | `agents` | Update: 9 dev agents → 9 financial agents. Add `fund_id` FK. |
| `tasks` | `operations` | Rename + add: `operation_type` (cession, pdd, report), `fund_id`, `materiality_tier`. |
| `interactions` | `interactions` | Add: `fund_id`, `agent_type`, `confidence_score`. |
| `traces` | `audit_trail` | Add: `immutable: true` constraint, `regulatory_reference`, `fund_id`. Append-only. |
| `decisions` | `decisions` | Add: `fund_id`, `four_eyes_approval`, `override_justification`. |
| `capabilities` | `capabilities` | Re-index with financial capabilities (34 dev → ~40 financial). |
| `ui_manifest` | `ui_manifest` | New widgets: fund-overview, covenant-status, pdd-chart, risk-heatmap. |
| `memories` | `fund_memories` | Partition by `fund_id`. Chinese wall enforcement at DB level. |
| `daily_costs` | `fund_costs` | Add: `fund_id`, per-fund cost breakdown. |
| `timeline_events` | `fund_timeline` | Immutable timeline of all fund events. Regulatory evidence. |
| — (new) | `funds` | Fund master data: CNPJ, type, regulation, covenants, participants. |
| — (new) | `cotas` | Quota classes: senior, mezanino, subordinada. NAV, PU, quantity. |
| — (new) | `cedentes` | Originators: KYC data, credit score, risk tier, DD status. |
| — (new) | `ativos` | Individual receivables: value, maturity, PDD provision, status. |
| — (new) | `covenants` | Covenant definitions + current values + breach history. |
| — (new) | `regulatory_filings` | Filed reports: CADOC, ICVM489, informe mensal. Immutable. |

## What Does NOT Transfer (Build From Scratch)

| Component | Why It's New | Estimated Effort |
|-----------|-------------|-----------------|
| **RAG pipeline** | Corpus is domain-specific (164 FIDC docs). Needs custom chunking, embedding, retrieval. | 2 weeks |
| **Knowledge graph** | FIDC ontology (10 entity types, typed relations). Domain-specific entity extraction. | 1 week |
| **Guardrail logic** | CVM 175 rules, concentration limits, PLD/AML checks. Pure financial domain. | 2 weeks |
| **QMD templates** | Regulatory report formats (CADOC, ICVM489, informe mensal). Layout + calculations. | 1 week |
| **Pricing engine** | Mark-to-market, deságio, stress testing. Financial math. | 2 weeks |
| **Reconciliation engine** | Payment matching, duplicate detection, overcollateralization. | 1 week |
| **AutoResearch loop** | New concept. Autonomous RAG optimization. | 1 week |
| **MetaClaw integration** | New concept. Learning proxy configuration + skill validation. | 1 week |
| **Onboarding wizard** | CLI-based fund setup flow. New UX. | 3 days |

**Total new build: ~11 weeks. Total reuse adaptation: ~2 weeks.**
The reuse cuts development time by roughly 60%.

---

## Transfer Checklist

- [ ] Fork scripts to `paganini/packages/kernel/scripts/`
- [ ] Adapt gate.py tiers: micro/quick/feature/epic → consulta/operação/relatório/regulatório
- [ ] Adapt sense.py criteria: dev quality → financial report quality
- [ ] Create Supabase migration: 9 existing tables adapted + 6 new tables
- [ ] Index financial capabilities in pgvector (replace 34 dev capabilities)
- [ ] Configure Slack channels: one per fund + IR bot user
- [ ] Set up tmux session template for PAGANINI daemons
- [ ] Adapt standup-reporter.py template for daily fund operations digest
- [ ] Configure OTel exporters for regulatory audit trail format
- [ ] Create Linear issue templates for financial operation approval gates
