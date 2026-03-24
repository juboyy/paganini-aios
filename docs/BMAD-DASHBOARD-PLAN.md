# BMAD-CE Implementation Plan — Dashboard v2 Full Integration

> Task: 0373a03b-e511-469b-88ba-276d35fd804b
> Status: IN_PROGRESS
> Created: 2026-03-24T02:55 UTC (via dashboard)
> Agent: OraCLI
> Priority: CRITICAL

---

## Stage 1: Context Scout ✅
- 34 tabelas Supabase mapeadas
- 20 páginas auditadas: 7 LIVE, 2 MOCK, 11 STATIC
- Data volumes: 675 tasks, 16.5K traces, 18.6K interactions, 4.2K events, 29d costs, 34 capabilities

## Stage 2: PRD
### Objetivo
Conectar TODAS as 20 páginas do dashboard a dados reais do Supabase.
Zero mock data. Zero dados estáticos hardcoded. 100% observabilidade real.

### Entregáveis
- 13 páginas migradas de static/mock → live
- 8+ novas API routes
- Sprint board funcional
- Pipeline viewer com stages reais
- Memory explorer
- Agent communication graph (Symphony)

## Stage 4: Architecture

### Data Flow
```
Supabase (34 tables) → API Routes (Next.js serverless) → Pages (React client)
```

### API Routes (novas):
| Route | Source Tables | Purpose |
|-------|-------------|---------|
| /api/capabilities | capabilities | Capabilities explorer |
| /api/memory | memory_entries | Memory explorer |
| /api/pipeline | pipeline_runs, tasks | Pipeline viewer |
| /api/sprint | tasks | Sprint board |
| /api/metrics | daily_costs, tasks, traces | Metrics dashboard |
| /api/code-quality | traces, quality_gate_runs | Code quality |
| /api/integrations | capabilities (kind=integration) | Integrations |
| /api/symphony | interactions, agents | Communication graph |
| /api/reports | deliverables, timeline_events | Reports |

### Pages → Tables Mapping:
| Page | Tables | Status |
|------|--------|--------|
| /agents | agents | ✅ LIVE |
| /chat | chat_messages, agents | ✅ LIVE |
| /extrato | tasks, interactions, timeline_events, traces | ✅ LIVE |
| /guardrails | quality_gate_runs | ✅ LIVE |
| /overview | agents, tasks, daily_costs, timeline_events | ✅ LIVE |
| /planning | tasks | ✅ LIVE |
| /telemetry | daily_token_usage, traces | ✅ LIVE |
| /capabilities | capabilities | 🔄 batch1 |
| /memory | memory_entries | 🔄 batch1 |
| /pipeline | pipeline_runs, tasks | 🔄 batch1 |
| /sprint | tasks | 🔄 batch1 |
| /metrics | daily_costs, tasks, traces | 🔄 batch1 |
| /code-quality | traces, quality_gate_runs | 🔄 batch2 |
| /integrations | capabilities | 🔄 batch2 |
| /fund | daily_costs, tasks | 🔄 batch2 |
| /symphony | interactions, agents | 🔄 batch2 |
| /reports | deliverables, timeline_events | 🔄 batch2 |
| /settings | config (static OK) | 📄 acceptable |
| /onboard | static (onboarding flow) | 📄 acceptable |
| /learning | memory_entries, decisions | 🔄 future |

## Stage 8: Stories

### Sprint 1 (current — batch execution)
- [x] S1-01: Audit all 20 pages
- [ ] S1-02: Connect /capabilities
- [ ] S1-03: Connect /memory
- [ ] S1-04: Connect /pipeline
- [ ] S1-05: Connect /sprint
- [ ] S1-06: Connect /metrics (remove mock)
- [ ] S1-07: Connect /code-quality (remove mock)
- [ ] S1-08: Connect /integrations
- [ ] S1-09: Connect /fund (enhance existing)
- [ ] S1-10: Connect /symphony
- [ ] S1-11: Connect /reports

### Sprint 2 (next)
- [ ] S2-01: Connect /learning
- [ ] S2-02: Real-time WebSocket updates
- [ ] S2-03: Dashboard ↔ OraCLI bidirectional task execution
- [ ] S2-04: Advanced filtering and search across all pages
- [ ] S2-05: Export/download reports

## Stage 10: Spec
Two parallel subagents executing:
- `dash-connect-batch1`: capabilities, memory, pipeline, sprint, metrics
- `dash-connect-batch2`: code-quality, integrations, fund, symphony, reports

## Stage 11: Implementation
In progress via subagents.

## Stage 13: QA
Post-implementation:
- Build validation (npx next build)
- All 20 pages load without JS errors
- API routes return 200 with real data
- Smoke test via Playwright

## Stage 17: Knowledge
To be completed after implementation.

---

## Roadmap

### Q1 2026 (March) — Foundation ✅
- Dashboard v2 created
- Design system established
- 7 pages connected to Supabase

### Q1 2026 (March, week 4) — Full Integration 🔄
- All 20 pages on real data
- Task monitor active
- Sprint tracking
- BMAD pipeline visibility

### Q2 2026 (April) — Intelligence
- Anomaly detection (cost spikes, error patterns)
- Predictive sprint planning
- Agent performance benchmarks
- Real-time collaboration (WebSocket)

### Q2 2026 (May) — Autonomy
- Self-healing task loops
- Auto-scaling agent allocation
- Dashboard-driven deployments
- Investor-ready analytics
