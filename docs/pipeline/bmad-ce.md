# BMAD-CE — Pipeline de Execução PAGANINI AIOS

## Overview

Every task in PAGANINI AIOS follows the BMAD-CE (Business-Methodology for
Agentic Development — Continuous Evolution) pipeline. No raw execution.
No cowboy coding. No shortcuts.

## Pipeline Tiers

| Tier | Criteria | Stages |
|------|----------|--------|
| **Micro** | < 5 min, config change, simple query | 1 → Fix → Log |
| **Quick** | Bug fix, simple feature (5-30 min) | 1 → 10 → 11 → 13 → 17 |
| **Feature** | New agent, integration, module (30+ min) | 1 → 2 → 4 → 8 → 10 → 11 → 12 → 13 → 14 → 17 |
| **Epic** | Multi-day, cross-system | All 18 stages |

## Stage Ownership

| Stage | Owner | Produces |
|-------|-------|----------|
| 1. Context Scout | **Kernel** | Memory search + GitNexus + corpus scan |
| 2. Product Definition | **PM / Business** | Requirements from client/regulatory need |
| 3. Research | **Regulatory Watch** | Technical research, regulatory analysis |
| 4. Architecture | **Kernel (Architect mode)** | System design, component design, data models |
| 5. UX/Interface | **Dashboard / IR** | Interface specs, Slack interaction design |
| 6. Business Analysis | **Administrador** | Business → technical translation |
| 7. Planning | **Kernel** | Task decomposition, dependency mapping |
| 8. Story Creation | **Kernel** | Story with tasks, acceptance criteria |
| 9. Review Checklist | **Compliance** | Pre-implementation quality gate |
| 10. Specification | **Kernel** | Implementation-ready spec |
| 11. Implementation | **Code Agent (Codex)** | Working code |
| 12. Code Review | **Kernel + Compliance** | Standards, security, regulatory compliance |
| 13. QA | **QA / Eval Suite** | Test execution, eval score verification |
| 14. Deploy | **Infra** | Build, deploy, smoke test |
| 15. Stakeholder Review | **Reporting** | QMD report for client approval |
| 16. Retrospective | **Kernel** | Lessons extracted |
| 17. Knowledge Persist | **Memory Reflection** | Update knowledge graph, corpus, skills |
| 18. Metrics | **Telemetry** | Log metrics, cost, ROI to dashboard |

## Current Epic: PAGANINI AIOS v0.1.0

### Epic Backlog

| ID | Story | Tier | Status | Owner |
|----|-------|------|--------|-------|
| PAG-001 | RAG Pipeline (ingest + embed + retrieve) | Feature | 🔜 Next | Kernel + RAG |
| PAG-002 | Memory API (4 layers unified) | Feature | 🔜 Next | Kernel |
| PAG-003 | Knowledge Graph Builder (entity extraction + relations) | Feature | Backlog | Ontology |
| PAG-004 | Guardrail Pipeline (6 gates) | Feature | Backlog | Shared |
| PAG-005 | Cognitive Router (query classification + dispatch) | Feature | Backlog | Kernel |
| PAG-006 | Agent Framework (SOUL loading + tool binding) | Feature | Backlog | Agents |
| PAG-007 | Eval Suite (ground-truth Q&A + metrics) | Feature | Backlog | RAG |
| PAG-008 | AutoResearch Loop | Feature | Backlog | RAG |
| PAG-009 | MetaClaw Integration | Feature | Backlog | Vendor |
| PAG-010 | Moltis Configuration + Deploy | Feature | Backlog | Infra |
| PAG-011 | Slack IR Bot | Feature | Backlog | Agents |
| PAG-012 | QMD Reporting Templates | Feature | Backlog | Reporting |
| PAG-013 | PinchTab Integration | Quick | Backlog | Infra |
| PAG-014 | Daemon Framework | Feature | Backlog | Infra |
| PAG-015 | Dashboard MVP | Epic | Backlog | Dashboard |
| PAG-016 | Onboarding CLI Wizard | Feature | Backlog | Kernel |

### Execution Order (Critical Path)

```
Phase 1 — Foundation (Week 1-2)
├── PAG-001: RAG Pipeline ← FIRST (need retrieval to test anything)
├── PAG-002: Memory API ← enables all agents
├── PAG-003: Knowledge Graph ← enriches retrieval
└── PAG-007: Eval Suite ← measures everything after this

Phase 2 — Intelligence (Week 3-4)
├── PAG-005: Cognitive Router ← routes queries to agents
├── PAG-006: Agent Framework ← loads SOULs, binds tools
├── PAG-004: Guardrail Pipeline ← enforces rules
└── PAG-008: AutoResearch ← starts optimizing retrieval

Phase 3 — Integration (Week 5-6)
├── PAG-010: Moltis Configuration ← production runtime
├── PAG-009: MetaClaw Integration ← learning layer
├── PAG-013: PinchTab ← browser automation
└── PAG-014: Daemon Framework ← background processes

Phase 4 — Product (Week 7-8)
├── PAG-011: Slack IR Bot ← investor relations
├── PAG-012: QMD Reporting ← regulatory reports
├── PAG-016: Onboarding Wizard ← client setup
└── PAG-015: Dashboard MVP ← operations UI
```

### Gate Rules

1. **Every story starts with Stage 1** (Context Scout). No exceptions.
2. **Every stage produces an artifact.** No mental notes.
3. **Gate token required** before implementation.
4. **Eval suite runs after every change.** No regressions allowed.
5. **Knowledge persisted (Stage 17)** after every completion.
6. **GitNexus indexed** after every structural change.
