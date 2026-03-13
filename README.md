# PAGANINI AIOS

**AI Operating System for Financial Markets.**

Framework open source. Domínio financeiro como produto.
O sistema que fica mais inteligente a cada interação — sem fine-tuning, sem GPU, sem retreinamento.

---

## Built on Production-Proven Patterns

PAGANINI isn't built from scratch. Its core is a **genome of 15 battle-tested patterns**
extracted from a production AIOS running 24/7 since February 2026 — 500+ hours,
100+ tasks, 12 self-audit violations caught autonomously.

No data, no context, no configs are copied. Only the **patterns, skills, and
integration blueprints** — generalized and packaged as configurable modules.

| Pattern Type | What Transfers | Examples |
|-------------|---------------|----------|
| **Skills** (5) | Executable behavioral modules | Pre-Execution Gate, Quality Gate, Memory Reflection, Self-Audit, Proactive Heartbeat |
| **Patterns** (5) | Architectural building blocks | SOUL (agent identity), BMAD-CE Pipeline, Cognitive Router, Capabilities Graph, Violations Tracking |
| **Integrations** (5) | Proven connection blueprints | Composio SDK, PinchTab, GitNexus, OTel Pipeline, QMD Reporting |

Full catalog: [`docs/architecture/genome.md`](docs/architecture/genome.md)

---

## Architecture

```
┌─ Interface ─────────────────────────────────────┐
│  Slack (IR) │ CLI │ REST API │ Dashboard        │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              MOLTIS (Runtime)                    │
│  Rust-native │ Sandboxed │ Single binary         │
│  Tools, channels, memory, cron, OTel, voice     │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │         KERNEL (RLM Engine)                │  │
│  │  Cognitive Router → Agent Dispatch         │  │
│  │  Python REPL → Sub-LLM Orchestration      │  │
│  │  4-Layer Memory API → Context Assembly     │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │         AGENT SWARM                        │  │
│  │  Administrador │ Custodiante │ Gestor      │  │
│  │  Compliance │ Reporting │ Due Diligence    │  │
│  │  Regulatory Watch │ Investor Relations     │  │
│  │  Pricing Engine                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │         GUARDRAILS (Hard-Stop)             │  │
│  │  Eligibility → Concentration → Covenant    │  │
│  │  → PLD/AML → Compliance → Risk             │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │ LLM calls
┌──────────────────────▼──────────────────────────┐
│           METACLAW (Learning Proxy)              │
│  Intercepts → Injects learned skills → Forwards │
│  Per-instance isolation │ Skill validation gate  │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│           LLM PROVIDER (BYOK)                    │
│  OpenAI │ Anthropic │ Google │ Local (Ollama)    │
│  Client brings own keys. We never touch them.    │
└─────────────────────────────────────────────────┘
```

---

## Core Concepts

### Recursive Language Model (RLM)

The agent never receives raw corpus in its context. It uses a persistent Python REPL
to programmatically search, filter, and synthesize knowledge. Sub-LLMs handle heavy
lifting. Context stays lean. Answers are built iteratively.

Based on [Prime Intellect's RLM research](https://www.primeintellect.ai/blog/rlm).

### Three Improvement Loops

| Loop | Optimizes | Frequency | Metric |
|------|-----------|-----------|--------|
| **AutoResearch** | Retrieval (chunking, embedding, ranking) | Continuous | eval_score |
| **MetaClaw** | Behavior (skill generation, context injection) | Every interaction | response quality |
| **Memory Reflection** | Knowledge (graph evolution, ontology) | Daily | coverage + contradictions |

Inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch) —
autonomous experimentation loop applied to RAG optimization.

### Four Memory Layers

| Layer | Purpose | Storage |
|-------|---------|---------|
| **Episodic** | Operations, decisions, timeline | Filesystem JSONL |
| **Semantic** | Embedded corpus (dense + sparse) | pgvector + tsvector |
| **Procedural** | Fund regulations, policies, covenants | Filesystem (auditable) |
| **Relational** | Knowledge graph (entities + typed relations) | pgvector kg_nodes + kg_edges |

### BYOK (Bring Your Own Key)

Zero vendor lock-in. The system works with any frontier LLM. Client controls costs,
data residency, and provider choice. We sell the system, not the compute.

---

## Architectural Principles

### From Our Production AIOS

| # | Principle | Description |
|---|-----------|-------------|
| 1 | **BMAD-CE Pipeline** | Every operation follows stages, produces artifacts, has ownership. No raw execution. |
| 2 | **Sense / Quality Gate** | Every response evaluated for quality before delivery. Not just compliance — excellence. |
| 3 | **Pre-Execution Gate** | No operation starts without context verification. Gate token proves due diligence. |
| 4 | **Cognitive Router** | Meta-cognition: classify complexity, estimate cost, choose model, dispatch to agent(s). |
| 5 | **SOUL Pattern** | Agent identity as first-class concept — personality, constraints, tone, authorized tools. |
| 6 | **Self-Audit** | System detects violations of its own rules. Logs. Corrects. Self-policing. |
| 7 | **Memory Promotion** | Daily interactions curated into permanent knowledge via reflection. Not append-only — curated. |
| 8 | **Proactive Heartbeat** | System doesn't wait to be asked. Checks covenants, regulations, risks on schedule. |

### Software Engineering

| # | Principle | Description |
|---|-----------|-------------|
| 9 | **Event Sourcing** | All state derived from events. Fully reconstructible. Perfect for audit. |
| 10 | **CQRS** | Separate paths for reads (queries) and writes (operations). Different cost profiles. |
| 11 | **Domain-Driven Design** | Bounded contexts (Custody ≠ Management ≠ Compliance). Agents map 1:1. |
| 12 | **Hexagonal Architecture** | Core logic independent of infra. Swap runtime, database, channels — core untouched. |
| 13 | **Circuit Breakers** | External service down? Degrade gracefully, retry when available. Never block. |
| 14 | **Saga Pattern** | Multi-step financial operations with compensation on failure. Not transactions — sagas. |

### Financial Domain

| # | Principle | Description |
|---|-----------|-------------|
| 15 | **Segregation of Duties** | No agent can approve AND execute. Gestor recommends, Administrador approves. |
| 16 | **Four-Eyes Principle** | Operations above threshold need dual approval. Agent + human, or two humans. |
| 17 | **Chinese Walls** | Fund A data NEVER flows to Fund B. Memory, skills, traces — isolated by fund_id. |
| 18 | **Double-Entry** | Every financial operation has two sides. Both must exist or operation fails. |
| 19 | **Record Immutability** | Traces, decisions, submitted reports — NEVER edited. Corrections are new records. |
| 20 | **Materiality** | Not everything needs the same rigor. R$10M cession → full pipeline. Glossary query → fast path. |

### AI Production

| # | Principle | Description |
|---|-----------|-------------|
| 21 | **Eval-Driven Development** | Eval set first, implementation second. Like TDD but for AI. |
| 22 | **Constitutional Self-Check** | Agent verifies its own response against principles before delivery. |
| 23 | **Red Teaming** | Periodic adversarial testing. Try to break guardrails. Fix immediately. |
| 24 | **Debate Pattern** | High-risk decisions: two agents argue opposite positions. Decision-maker sees both. |
| 25 | **Confidence Scoring** | Every response carries a confidence score. Client knows when to trust vs verify. |

---

## Agent Swarm

9 specialized agents, each with its own SOUL, tools, and memory scope.

| Agent | Role | Key Capability |
|-------|------|----------------|
| **Administrador** | Compliance, governance | CVM 175 enforcement, regulatory reports |
| **Custodiante** | Asset custody, registration | Reconciliation, duplicate detection, overcollateralization |
| **Gestor** | Risk, acquisition | Credit analysis, PDD modeling, portfolio optimization |
| **Compliance** | PLD/AML, sanctions | COAF reporting, sanctions screening, LGPD |
| **Reporting** | Regulatory reporting | CADOC 3040, ICVM 489, COFIs, informe mensal |
| **Due Diligence** | Cedente onboarding | KYC, credit scoring, judicial search, media monitoring |
| **Regulatory Watch** | Regulatory monitoring | CVM/ANBIMA/BACEN daily scan, impact assessment |
| **Investor Relations** | Cotista communication | 24/7 Slack bot, performance reports, fund Q&A |
| **Pricing** | Asset valuation | Mark-to-market, deságio calculation, stress testing |

---

## Guardrail Pipeline

Hard-stop gates execute in sequence. First BLOCK stops the operation.

```
Operation → Eligibility → Concentration → Covenant → PLD/AML → Compliance → Risk
                 │              │             │          │           │         │
              BLOCK?         BLOCK?        BLOCK?     BLOCK?      BLOCK?    WARN?
```

Overrides require human administrator + full justification + audit trail.

---

## Background Daemons

| Daemon | Interval | Function |
|--------|----------|----------|
| covenant-monitor | 15min | **Predictive** covenant monitoring (not reactive) |
| pdd-calculator | 24h | Daily PDD recalculation per IFRS9 |
| reconciliation | 1h | Payment matching (target: 99.99%) |
| market-data-sync | 30min | CDI, Selic, IPCA, yield curves |
| risk-scanner | 6h | Cedente/sacado risk events (RJ, sanctions, media) |
| regulatory-watch | 24h | CVM/ANBIMA/BACEN publication scan |
| memory-reflection | 24h | Knowledge consolidation + graph evolution |
| self-audit | 12h | System integrity + trace completeness |

All daemons run in tmux session `paganini` with systemd timer for auto-restart.

---

## Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Runtime** | Moltis (Rust) | Single binary, sandboxed, built-in everything |
| **Learning** | MetaClaw (fork) | Skill auto-generation from interactions |
| **Reasoning** | RLM pattern | Recursive context management, sub-LLM delegation |
| **Optimization** | AutoResearch loop | Autonomous RAG parameter tuning |
| **Memory** | pgvector + SQLite + filesystem | Hybrid: dense + sparse + graph + filesystem |
| **Persistence** | tmux + systemd | Processes survive disconnects, auto-restart |
| **Observability** | OTel + Prometheus | Built into Moltis, regulatory-grade audit trail |
| **Channels** | Slack, Telegram, API, CLI | Multi-channel, Slack primary for IR |
| **LLM** | BYOK (any provider) | LiteLLM abstraction, client owns keys |

---

## Monorepo Structure

```
paganini/
├── packages/
│   ├── kernel/          # RLM engine, cognitive router, CLI
│   ├── rag/             # Hybrid RAG pipeline + AutoResearch
│   ├── agents/          # 9 agent SOULs + framework
│   ├── ontology/        # FIDC domain knowledge graph
│   ├── dashboard/       # Operations + analytics UI
│   ├── modules/         # Pre-configured verticals
│   └── shared/          # Types, utils, guardrails
├── data/
│   └── corpus/
│       └── fidc/        # 164 markdown files, 5.6MB (gitignored)
├── vendor/
│   └── metaclaw/        # Controlled fork
├── infra/               # Docker, daemons, systemd, tmux
├── docs/
│   ├── architecture/    # ADRs, system design, schemas, orchestration
│   └── business/        # Pricing, go-to-market
└── config.yaml          # Single source of configuration
```

## Corpus

The `data/corpus/fidc/` vault contains 164 expert-curated documents:

| Domain | Files | Content |
|--------|-------|---------|
| CVM 175 | 57 | Every article decomposed individually |
| Market Pain Points | 4 | 300 mapped problems (Admin, Custody, Management) |
| Accounting | 6 | IFRS9, PDD, COFIs, PCE calculations |
| Cotas | 6 | Subordination structures, risk-return analysis |
| FIDC Types | 20+ | Infra, ESG, Crypto, Supply Chain, Precatórios... |
| Platform V1 | 6 | API specs (management, security, integration) |
| System | 2 | 80 competitive differentials + full module specs |

---

## Business Model (Open-Core)

**Free (Open Source):** Engine, CLI, agent framework, RAG pipeline, guardrail framework.

**Paid (Domain Packs via aios.finance):**

| Tier | Price | Includes |
|------|-------|----------|
| FIDC Starter | R$2.000/mês | Corpus + 3 agents + basic guardrails |
| FIDC Professional | R$8.000/mês | 9 agents + regulatory watch + DD + reporting |
| FIDC Enterprise | R$25.000/mês | Everything + customization + SLA + dedicated support |
| Cloud Managed | R$5-25K/mês per fund | We host. Client brings BYOK keys. |

---

## Quick Start

```bash
# Install
pip install paganini-aios

# Status
paganini status

# Ingest corpus
paganini ingest data/corpus/fidc/

# Query
paganini query "O que é subordinação de cotas?"

# Start agents
paganini agents start --fund alpha

# Run eval
paganini eval
```

## Deploy

```bash
# SSH deploy
./deploy.sh user@host main

# Docker
cd infra && docker compose up -d

# Moltis runtime
curl -fsSL https://www.moltis.org/install.sh | sh
```

---

## BMAD-CE Pipeline

Every task follows the pipeline. No raw execution.

```
Micro  (config, query)    → Context Scout → Fix → Log
Quick  (bug, simple)      → 1 → 10 → 11 → 13 → 17
Feature (agent, module)   → 1 → 2 → 4 → 8 → 10 → 11 → 12 → 13 → 14 → 17
Epic   (cross-system)     → All 18 stages
```

Current roadmap: [`docs/pipeline/bmad-ce.md`](docs/pipeline/bmad-ce.md)

```
Phase 1 (Wk 1-2): RAG Pipeline → Memory API → Knowledge Graph → Eval Suite
Phase 2 (Wk 3-4): Cognitive Router → Agent Framework → Guardrails → AutoResearch
Phase 3 (Wk 5-6): Moltis Config → MetaClaw → PinchTab → Daemons
Phase 4 (Wk 7-8): Slack IR → QMD Reports → Onboarding → Dashboard
```

---

## Founders

| | Name | Role |
|---|------|------|
| 🎯 | **Rod Marques** | CEO |
| ⚙️ | **João Raf** | CTO — Infrastructure & Tech Vision |
| 📊 | **Louiz Ferrer** | CIO |
| 💰 | **Mark Binder** | CFO |

## Contact

- Web: [paganini-aios-v2.lovable.app](https://paganini-aios-v2.lovable.app/)
- Email: rod.marques@aios.finance

---

*"We don't sell a model. We sell a financial reasoning system that works with any model."*
