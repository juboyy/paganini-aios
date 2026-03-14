<div align="center">

# 🎻 PAGANINI AIOS

### The AI Operating System for Financial Markets

**One command. Any terminal. Any OS.**
**An autonomous financial reasoning system that gets smarter with every interaction.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Open Core](https://img.shields.io/badge/model-open--core-orange.svg)](#domain-packs)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://python.org)
[![CI](https://github.com/juboyy/paganini-aios/actions/workflows/ci.yml/badge.svg)](https://github.com/juboyy/paganini-aios/actions)

[Website](https://paganini-aios-v2.lovable.app/) · [Docs](docs/) · [Get Started](#quick-start) · [FAQ](docs/FAQ.md) · [Contributing](CONTRIBUTING.md) · [🇧🇷 Português](README.pt-BR.md)

</div>

---

```bash
curl -fsSL https://paganini.sh | sh && paganini init --pack fidc && paganini up
```

> *"We don't sell a model. We sell a financial reasoning system that works with any model."*

---

## See It Work

**Real output from a production EC2 instance** (Ubuntu 24.04, sa-east-1, Moltis v0.10.18):

```
$ paganini query -v "Quais são as obrigações do custodiante em relação
  à sobrecolateralização?"

🧠 Runtime: python | Model: gemini/gemini-2.5-flash
🤖 Agent: Custodiante (simple, conf=0.85)
🎯 Intent: factual | Domains: custodiante
🔍 RAG: 5 chunks | MetaClaw: on
   • Estruturação de FIDCs e Mecanismos de Mitigação de Risco.md        | 1.00
   • Artigo 29 - CVM175.md | Visão da Custodiante                      | 1.00
   • Convenants - Guia Avançado - Jurídico (Parte IV).md                | 0.75
   • Due Diligence e o Papel do Custodiante e do Servicer.md            | 0.75
   • Administradoras Custodiantes e Gestoras.md                         | 0.50
🛡️  Guardrails: 6/6 gates passed
⏱️  5560ms | 📊 Confiança: 0.96

╭──────────────────── 📋 Resposta (96% confiança) ────────────────────╮
│                                                                      │
│  O custodiante atua como guardião do lastro e agente ativo de        │
│  verificação e controle dos ativos do FIDC, garantindo que os        │
│  ativos existam, sejam devidamente controlados, monitorados e        │
│  liquidados. A Resolução CVM 175, em seu Anexo Normativo II         │
│  (Art. 38), detalha essas obrigações.                                │
│                                                                      │
╰──────────────────────────────────────────────────────────────────────╯

📎 Fontes:
  [1] Estruturação de FIDCs e Mitigação de Risco (score: 1.00)
  [2] CVM 175, Art. 29 — Visão da Custodiante (score: 1.00)
  [3] Due Diligence e o Papel do Custodiante (score: 0.75)
```

> 164 documents ingested. 6,993 chunks indexed. 190 entities in knowledge graph.
> 9 agents. 6 guardrail gates. 8 daemons. 55 tests passing. Zero hallucination.

---

## Why PAGANINI

| Without PAGANINI | With PAGANINI |
|-----------------|---------------|
| Compliance analyst spends 4h/day checking covenants manually | Daemon checks every 15 minutes. Alerts before breach. |
| Monthly regulatory reports take 3-5 days to compile | One command: `paganini report informe-mensal --fund alpha` |
| Due diligence on a new cedente: 2-3 weeks | 24 hours. KYC, judicial search, credit scoring — automated. |
| Cotista asks question → 2 business days for response | Slack bot responds in seconds with confidence score. |
| Regulatory change → weeks to assess impact | Regulatory Watch scans daily, delivers impact assessment next morning. |
| 500 cedentes × manual risk monitoring = impossible | Risk Scanner runs every 6h across all cedentes. |

**Estimated ROI per fund:** 120-200 hours/month saved. ~R$60-100K/month in operational cost reduction.

---

## The Problem

Brazilian FIDC (Credit Receivables Funds) operations run on spreadsheets,
manual compliance checks, and fragmented communication. A single fund
requires 4-7 participants (administrator, custodian, manager, auditor...)
coordinating across email, WhatsApp, and legacy systems.

**Result:** Slow decisions. Missed covenants. Regulatory risk. Human error at scale.

## The Solution

PAGANINI deploys an autonomous agent swarm that mirrors the entire fund
operation — each participant gets an AI counterpart that operates 24/7,
follows regulations by design, and improves with every interaction.

```mermaid
flowchart TD
    subgraph INPUT["📥 Input"]
        CLI["CLI"] & Slack["Slack"] & API["API"] & Dash["Dashboard"]
    end

    INPUT --> Router

    Router["🧠 Cognitive Router\nClassify · Route · Estimate confidence"]

    Router --> Agents

    subgraph Agents["🤖 Agent Swarm"]
        A1["📋 Admin\nCVM 175"] & A2["🔐 Custódia\nReconciliação"] & A3["📊 Gestor\nRisco · PDD"]
        A4["⚖️ Compliance\nPLD/AML"] & A5["📄 Reporting\nCADOC"] & A6["🔍 Due Diligence\nKYC"]
        A7["📡 Reg Watch\nCVM/ANBIMA"] & A8["💬 IR\nSlack Bot"] & A9["💰 Pricing\nMtM"]
    end

    Agents --> RAG

    RAG["🔍 Hybrid RAG\nDense + Sparse + Graph → RRF Fusion"]

    RAG --> MetaClaw

    MetaClaw["🧬 MetaClaw Proxy\nSearches skill library → Injects top 6 → Forwards enriched prompt"]

    MetaClaw --> LLM

    LLM["☁️ LLM Provider · BYOK\nOpenAI · Anthropic · Google · Ollama"]

    LLM --> Guards

    Guards["🛡️ Guardrail Pipeline\nEligibility → Concentration → Covenant → PLD/AML → Compliance → Risk"]

    Guards --> Sense

    Sense["✅ Quality Gate · Sense\nAccuracy ≥ 0.9 · Compliance ≥ 0.95"]

    Sense --> Response["📤 Response\nWith confidence score · Full audit trail"]

    Response -.->|"logs interaction"| MetaClaw
    Response -.->|"monitors eval drift"| RAG
    Response -.->|"extracts patterns"| Memory["🧠 Memory Reflection"]

    style Router fill:#1e3a5f,stroke:#d4a73a,color:#e8e6f0
    style MetaClaw fill:#1e3a5f,stroke:#d97706,color:#e8e6f0
    style Guards fill:#1e3a5f,stroke:#be123c,color:#e8e6f0
    style RAG fill:#1e3a5f,stroke:#0891b2,color:#e8e6f0
    style Sense fill:#1e3a5f,stroke:#059669,color:#e8e6f0
    style Response fill:#1e3a5f,stroke:#d4a73a,color:#e8e6f0
    style Memory fill:#1e3a5f,stroke:#059669,color:#e8e6f0
```

---

## How It Works

### 🔄 Three Self-Improvement Loops

The system doesn't just answer — it **evolves**. Three engines optimize
different layers simultaneously. No fine-tuning required for the default mode.

---

#### 🧬 MetaClaw — Behavioral Evolution

An OpenAI-compatible proxy between the runtime and the LLM provider.
Intercepts every interaction. Injects learned skills. Generates new ones automatically.

```
EVERY INTERACTION:
  Query arrives → MetaClaw searches skill library
  → Finds top 6 relevant skills (embedding similarity)
  → Injects into system prompt → Forwards to LLM
  → Response is measurably better because of injected context

AFTER EACH SESSION:
  MetaClaw feeds entire conversation to the LLM
  → LLM analyzes: what worked? what patterns emerged?
  → Generates NEW skill files (markdown)
  → Next session benefits immediately
```

**Concrete example:**

```
Session 1:  "How to calculate PDD for energy receivables?"
            → No energy-specific skills exist
            → Generic answer from model knowledge

            Post-session: MetaClaw auto-generates:
            energy-sector-pdd.md: "When calculating PDD for
            energy sector, consider seasonal payment patterns —
            Q4 higher defaults due to dry season impact on
            hydroelectric revenue"

Session 2:  Same category question
            → MetaClaw finds energy-sector-pdd.md (score: 0.87)
            → Injects into prompt
            → Response is domain-expert quality

Session 50: 8 energy-specific skills accumulated
            → Responses rival human specialist
            → Zero fine-tuning. Zero GPU. Accumulated intelligence.
```

**Three operating modes:**

| Mode | What Happens | Requirements |
|------|-------------|-------------|
| **skills_only** (default) | Skill injection + auto-generation from sessions | Network only. No GPU. |
| **rl** (optional) | + Live LoRA fine-tuning via Tinker Cloud. PRM judge scores responses. Weights hot-swapped without downtime. | Tinker API key |
| **opd** (advanced) | + Teacher-student distillation. Frontier model teaches smaller model. Same quality, 1/10th cost over time. | Teacher model endpoint |

**PAGANINI guardrails on MetaClaw:**

Every auto-generated skill passes through validation before activation:
```
New skill → Corpus contradiction? → Ontology consistent?
         → CVM 175 compliant? → Conflicts with existing skills?
         → Specific enough? (no generic platitudes)

ALL PASS → activated
ANY FAIL → quarantined for human review
```

Skills isolated per fund (Chinese walls). Max 500 active. Weekly pruning of low-impact skills.
Drift detection alerts if eval scores degrade after new skills.

[Deep dive →](docs/architecture/self-improvement-engines.md)

---

#### 🔍 AutoResearch — Retrieval Optimization

A self-modifying RAG pipeline. Instead of a human tuning parameters —
an LLM runs autonomous experiments. Evolutionary search, not RL.

Inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch):
*"You're not programming the program. You're programming the program.md."*

**Three files:**

```
program.md   → Instructions (LLM reads to know what to optimize)
pipeline.py  → Modifiable code (LLM changes this to improve retrieval)
eval.py      → Fixed evaluation (NEVER touched — measures ground truth)
```

**The loop:**

```
  ┌─ LLM reads program.md ─────────────────────┐
  │  "Optimize RAG for FIDC domain queries"     │
  └──────────────┬──────────────────────────────┘
                 ▼
  ┌─ Reads pipeline.py ────────────────────────┐
  │  Current: chunk_size=384, hybrid retrieval  │
  │  dense=0.4, sparse=0.3, graph=0.3         │
  └──────────────┬──────────────────────────────┘
                 ▼
  ┌─ Reads experiments.jsonl ──────────────────┐
  │  "Exp 46 tried semantic chunking → +0.03"  │
  │  "Exp 47 tried larger chunks → -0.02"      │
  └──────────────┬──────────────────────────────┘
                 ▼
  ┌─ Hypothesizes ─────────────────────────────┐
  │  "Cross-encoder reranking should improve    │
  │   precision for regulatory questions"       │
  └──────────────┬──────────────────────────────┘
                 ▼
  ┌─ Modifies pipeline.py ─────────────────────┐
  │  + reranker = "cross_encoder"               │
  │  + rerank_top_n = 20                        │
  └──────────────┬──────────────────────────────┘
                 ▼
  ┌─ Runs eval.py (50-100 gold Q&A pairs) ─────┐
  │  precision@5: 0.78 (+0.04)  ✓ improved     │
  └──────────────┬──────────────────────────────┘
                 ▼
         IMPROVED → commit change, log experiment
         DEGRADED → revert, log failure, try next hypothesis
                 │
                 └──── REPEAT ────┘
```

**16 parameters the LLM experiments with:**

| Category | Parameters |
|----------|-----------|
| Chunking | `chunk_size` (128-1024) · `overlap` (0-256) · `strategy` (fixed / sentence / semantic / hierarchical) · `respect_headers` |
| Embedding | `model` (gemini / openai / local) · `dimensions` (256-3072) |
| Retrieval | `dense_weight` · `sparse_weight` · `graph_weight` · `fusion` (RRF / linear) · `rrf_k` |
| Reranking | `method` (none / cross-encoder / LLM-rerank) · `top_n` |
| Context | `max_tokens` · `include_metadata` · `include_parent_chunk` · `query_expansion` |

[Deep dive →](docs/architecture/self-improvement-engines.md)

---

#### 🧠 Memory Reflection — Knowledge Deepening

Daily daemon. Reviews all fund operations. Extracts patterns.
Builds knowledge graph. Promotes episodic → semantic memory.

```
Day's operations → Reflection daemon:
  "Every time IPCA rises >0.5%, Fund Alpha's PDD increases 12%"
  → Extracted as permanent knowledge
  → Added to knowledge graph
  → Available to all agents tomorrow
```

---

#### How They Work Together

```mermaid
flowchart LR
    Q["Query"] --> RAG
    RAG["🔍 RAG\n(AutoResearch\noptimized)"] --> MC
    MC["🧬 MetaClaw\n(injects learned\nskills)"] --> LLM
    LLM["☁️ LLM"] --> QG
    QG["✅ Quality\nGate"] --> R["Response"]

    R -.->|"generates\nnew skills"| MC
    R -.->|"monitors\neval drift"| RAG
    R -.->|"extracts\npatterns"| MEM["🧠 Memory\nReflection"]
    MEM -.->|"deepens\nknowledge"| RAG

    style RAG fill:#0d3b66,stroke:#0891b2,color:#e8e6f0
    style MC fill:#0d3b66,stroke:#d97706,color:#e8e6f0
    style MEM fill:#0d3b66,stroke:#059669,color:#e8e6f0
    style QG fill:#0d3b66,stroke:#d4a73a,color:#e8e6f0
```

**No conflicts.** AutoResearch optimizes *how information is found*.
MetaClaw optimizes *how information is used*. Memory Reflection deepens
*what information exists*. Three dimensions. Compounding daily.

### 🏗️ Built on 15 Battle-Tested Patterns

Not invented for a slide deck. Extracted from a production AIOS running
24/7 since February 2026 — 500+ hours, 100+ tasks, 12 self-audit violations
caught autonomously.

<details>
<summary><strong>5 Executable Skills</strong></summary>

| Skill | What It Does |
|-------|-------------|
| **Pre-Execution Gate** | Every operation validates context first. Gate token proves due diligence in audit trail. |
| **Quality Gate (Sense)** | Every output evaluated against quality profile before delivery. Subpar = regenerate. |
| **Memory Reflection** | Daily curation: operations → patterns → permanent knowledge. Not append-only. |
| **Self-Audit** | System checks its own rule compliance. Logs violations. Self-corrects. |
| **Proactive Heartbeat** | Doesn't wait to be asked. Monitors covenants, regulations, risks on schedule. |

</details>

<details>
<summary><strong>5 Architectural Patterns</strong></summary>

| Pattern | What It Does |
|---------|-------------|
| **SOUL** | Agent identity as first-class concept — personality, constraints, tools, memory scope. |
| **BMAD-CE Pipeline** | 18-stage methodology. Every task classified, tracked, produces artifacts. |
| **Cognitive Router** | Meta-cognition: classify complexity, choose model, dispatch agent(s), estimate confidence. |
| **Capabilities Graph** | Agents discover tools by semantic search, not hardcoded lists. |
| **Violations Tracking** | Every rule violation logged, attributed, corrected. Immutable audit trail. |

</details>

<details>
<summary><strong>5 Integration Blueprints</strong></summary>

| Blueprint | What It Does |
|-----------|-------------|
| **PinchTab** | Browser automation via accessibility tree (~800 tokens/page). Regulatory scraping. |
| **CLI-Anything** | Auto-generate CLIs for any software. Make legacy systems agent-native. |
| **OTel Pipeline** | OpenTelemetry traces on every decision. CVM auditor reconstructs any operation. |
| **QMD Reporting** | Quarto templates → PDF/HTML reports. Informe mensal, CADOC, ICVM 489. |
| **Composio SDK** | Pre-built OAuth2 connections: Slack, GitHub, email, 14+ services. |

</details>

Plus **30+ transferable skills** from the OpenClaw ecosystem and **12 domain-specific
skills** built for FIDC. [Full catalog →](docs/architecture/genome.md)

---

## 9 Specialized Agents

Each agent has its own SOUL — identity, constraints, tools, and memory scope.

| | Agent | Superpower |
|---|-------|-----------|
| 📋 | **Administrador** | CVM 175 compliance, governance, regulatory filings |
| 🔐 | **Custodiante** | Reconciliation, overcollateralization, registration |
| 📊 | **Gestor** | Risk analysis, PDD modeling, portfolio optimization |
| ⚖️ | **Compliance** | PLD/AML, COAF reporting, sanctions screening, LGPD |
| 📄 | **Reporting** | CADOC 3040, ICVM 489, COFIs, informe mensal |
| 🔍 | **Due Diligence** | KYC, credit scoring, judicial search, media monitoring |
| 📡 | **Regulatory Watch** | CVM/ANBIMA/BACEN daily scan, impact assessment |
| 💬 | **Investor Relations** | 24/7 Slack bot, performance reports, cotista Q&A |
| 💰 | **Pricing** | Mark-to-market, deságio, stress testing, yield curves |

---

## Security

<table>
<tr>
<td width="50%">

### 🔒 Container Isolation
Every agent runs in its own container.
Zero network by default. Communication
only via Unix sockets. Seccomp profiles
block network syscalls. Distroless images
with no shell.

</td>
<td width="50%">

### 🧱 Chinese Walls
Fund A data **never** reaches Fund B.
Enforced at DB (RLS), memory, MetaClaw
skills, traces, and reports. Per-fund
partitioning at every layer.

</td>
</tr>
<tr>
<td>

### 🔑 Secrets Vault
No plaintext secrets. Ever. Encrypted
vault (AES-256-GCM), env vars, or Cloud
KMS. Pre-commit hooks scan for leaked
keys, PII, and corpus fingerprints.

</td>
<td>

### 🛡️ Guardrail Pipeline
6 hard-stop gates execute in sequence.
First BLOCK kills the operation. No
override without human + justification
+ full audit trail.

</td>
</tr>
</table>

[Container Security →](docs/security/container-security.md) ·
[Open Source Security →](docs/security/open-source-security.md)

---

## Quick Start

### Single Binary (Recommended)

```bash
# Install (downloads Moltis runtime + PAGANINI CLI)
curl -fsSL https://paganini.sh | sh

# Or manually:
git clone https://github.com/juboyy/paganini-aios
cd paganini-aios
pip install -e .

# Configure
cp config.example.yaml config.yaml
# Edit config.yaml → set your API key

# Ingest your corpus (builds knowledge graph automatically)
paganini ingest data/corpus/fidc/
# ✓ 164 files → 6,993 chunks → 190 KG entities → 2min40s

# Query (routes to best agent, applies guardrails)
paganini query "Qual o limite de concentração por cedente?"

# Explore
paganini agents         # List 9 specialized agents
paganini daemons status # Show 8 background daemons
paganini pack list      # Browse domain packs
paganini report list    # Available report templates
paganini eval           # Run evaluation against gold Q&A
paganini doctor         # Diagnose installation (10 checks)
paganini status         # System overview
```

### Docker

```bash
paganini init --mode docker
paganini up
# 13 containers. Full isolation. Production-ready.
```

### Kubernetes

```bash
helm install paganini paganini/paganini-aios \
  --set license.key=$LICENSE_KEY \
  --set provider.apiKey=$OPENAI_API_KEY
```

**Supported:** Linux x86/arm64 · macOS Intel/Apple Silicon · Windows/WSL2 ·
Raspberry Pi · brew · apt · dnf · pip · npm · winget

[Full install guide →](docs/architecture/distribution.md)

---

## BYOK — Bring Your Own Key

Zero vendor lock-in. You choose the model. You control the costs.

```yaml
# config.yaml
providers:
  default: openai              # or anthropic, google, ollama, custom
  openai:
    api_key: ${OPENAI_API_KEY}
  # Switch providers anytime. System adapts automatically.
```

Works with: OpenAI · Anthropic · Google · Ollama · any OpenAI-compatible API

---

## Domain Packs

The framework is free. Domain intelligence is the product.

```bash
paganini pack install fidc-starter        # R$2K/mo — 3 agents, core skills
paganini pack install fidc-professional   # R$8K/mo — 9 agents, full regulatory
paganini pack install fidc-enterprise     # R$25K/mo — everything + SLA + custom
```

| | Starter | Professional | Enterprise |
|---|:---:|:---:|:---:|
| Corpus (164 FIDC docs) | ✅ | ✅ | ✅ |
| Core agents (Admin, Custódia, Gestão) | 3 | 9 | 9 + custom |
| Skills | 3 | 12 | 12 + custom |
| Guardrail rules | Basic | Full | Full + custom |
| QMD report templates | — | 5 | 8 + custom |
| Regulatory watch | — | ✅ | ✅ |
| Investor Relations bot | — | ✅ | ✅ |
| SLA | — | — | 99.9% |
| Dedicated support | — | — | ✅ |

[Pricing details →](docs/business/pricing.md)

---

## Architecture

```
paganini/
├── packages/
│   ├── kernel/
│   │   ├── cli.py           # CLI entry point — 18 commands (click + rich)
│   │   ├── engine.py        # Config loader, env var resolution
│   │   ├── moltis.py        # Moltis gateway adapter (fallback: litellm)
│   │   ├── metaclaw.py      # MetaClaw skill proxy + auto-evolution
│   │   ├── memory.py        # 4-layer memory (episodic, semantic, procedural, relational)
│   │   ├── router.py        # Cognitive Router — classify, route, estimate confidence
│   │   ├── daemons.py       # 8 YAML-driven daemons (covenant, PDD, regulatory...)
│   │   ├── pack.py          # Domain pack management (3 tiers)
│   │   └── reports.py       # Report generation (5 templates: CADOC, PDD, risk...)
│   ├── rag/
│   │   ├── pipeline.py      # Hybrid RAG — dense + sparse + RRF fusion
│   │   ├── bm25.py          # Pure Python BM25Okapi with PT-BR tokenizer
│   │   └── eval.py          # Evaluation harness — precision@k, recall, latency
│   ├── agents/
│   │   ├── framework.py     # AgentRegistry + AgentDispatcher
│   │   └── souls/           # One .md per agent identity (9 agents)
│   ├── ontology/
│   │   ├── schema.py        # FIDC knowledge graph — 10 entity types, 9 relations
│   │   └── builder.py       # Entity extraction from markdown via regex
│   ├── shared/
│   │   └── guardrails.py    # 6-gate hard-stop pipeline
│   ├── dashboard/           # Operations UI (Phase 4)
│   └── modules/             # Pre-configured verticals (Phase 4)
├── tests/                   # 55 pytest tests — all passing
│   ├── conftest.py          # Shared fixtures (tmp_dir, sample_config, corpus)
│   ├── test_rag.py          # RAG pipeline + retrieval tests
│   ├── test_bm25.py         # BM25 index + PT-BR tokenizer tests
│   ├── test_agents.py       # Agent registry + dispatcher tests
│   ├── test_guardrails.py   # 6-gate guardrail tests
│   ├── test_memory.py       # 4-layer memory API tests
│   ├── test_router.py       # Cognitive router tests
│   └── test_ontology.py     # Knowledge graph + builder tests
├── vendor/metaclaw/         # MetaClaw standalone (for rl/opd modes)
├── infra/
│   ├── Dockerfile           # Multi-stage build, non-root, healthcheck
│   └── docker-compose.yaml  # Full stack: core + moltis + pgvector + agents
├── scripts/
│   ├── paganini_gate.py     # Pre-execution gate (grep/AST code intelligence)
│   └── paganini_codex.py    # Codex bridge (spec builder + invocation)
├── docs/                    # Architecture, security, business, pipeline
├── install.sh               # One-command installer (Moltis + PAGANINI)
├── config.example.yaml      # All options documented
├── moltis.example.yaml      # Moltis runtime config
├── eval_questions.jsonl      # 20 gold Q&A pairs for evaluation
└── pyproject.toml           # pip install -e . → `paganini` CLI
```

<details>
<summary><strong>Full documentation index</strong></summary>

| Document | Content |
|----------|---------|
| [System Design](docs/architecture/system-design.md) | Full architecture diagram + data flows |
| [ADRs](docs/architecture/ADRs.md) | 9 architecture decision records |
| [Genome](docs/architecture/genome.md) | 30+ skills + patterns + integration blueprints |
| [Evolution Layer](docs/architecture/evolution-layer.md) | MetaClaw + 3 improvement loops |
| [Memory Schema](docs/architecture/memory-schema.md) | 4-layer memory architecture |
| [Orchestration](docs/architecture/orchestration.md) | Moltis runtime mapping |
| [Distribution](docs/architecture/distribution.md) | Install experience + packaging |
| [BMAD-CE Pipeline](docs/pipeline/bmad-ce.md) | 18-stage execution methodology |
| [Container Security](docs/security/container-security.md) | Zero-trust container isolation |
| [Open Source Security](docs/security/open-source-security.md) | 5-layer data protection |
| [Pricing](docs/business/pricing.md) | Open-core business model |
| [PinchTab](docs/tools/pinchtab.md) | Browser automation |
| [QMD](docs/tools/qmd.md) | Report generation engine |

</details>

---

## Corpus Depth

The FIDC domain pack isn't a collection of PDFs. It's 164 expert-curated
markdown documents covering every aspect of fund operations:

| Domain | Docs | What's Inside |
|--------|------|--------------|
| **CVM 175** | 57 | Every article decomposed. Cross-references mapped. Interpretation notes. |
| **Market Pain Points** | 4 | 300 mapped problems across Admin, Custody, Management — from real operators. |
| **Accounting** | 6 | IFRS9 expected credit loss, PDD calculations, COFIs, PCE — with formulas. |
| **Cotas** | 6 | Subordination structures, risk-return analysis, waterfall mechanics. |
| **FIDC Types** | 20+ | Infra, ESG, Crypto, Supply Chain, Precatórios, Agro, Imobiliário... |
| **Platform API** | 6 | Management, security, integration specs from a real platform. |
| **System** | 2 | 80 competitive differentials + full module specifications. |

This corpus is what makes the agents domain experts, not generic chatbots.

---

## Roadmap

```mermaid
gantt
    title PAGANINI AIOS — Development Roadmap
    dateFormat YYYY-MM-DD
    axisFormat %b %Y

    section Phase 1 — Foundation ✅
    RAG Pipeline (dense + sparse + RRF)          :done, p1a, 2026-03-10, 4d
    Memory API (4 layers unified)                :done, p1b, 2026-03-12, 2d
    Knowledge Graph Builder                       :done, p1c, 2026-03-13, 1d
    Eval Suite (20 gold Q&A + metrics)           :done, p1d, 2026-03-13, 1d

    section Phase 2 — Intelligence ✅
    Cognitive Router                              :done, p2a, 2026-03-13, 1d
    Agent Framework (9 SOULs)                    :done, p2b, 2026-03-13, 1d
    Guardrail Pipeline (6 gates)                 :done, p2c, 2026-03-14, 1d
    Test Suite (55 tests)                        :done, p2d, 2026-03-14, 1d

    section Phase 3 — Integration ✅
    Moltis Runtime Config                        :done, p3a, 2026-03-14, 1d
    MetaClaw Integration                         :done, p3b, 2026-03-14, 1d
    Daemons + CLI Commands                       :done, p3c, 2026-03-14, 1d
    Domain Packs + Reports                       :done, p3d, 2026-03-14, 1d

    section Phase 4 — Product
    Slack IR Bot                                 :p4a, 2026-03-17, 10d
    QMD Reporting Templates                      :p4b, 2026-03-17, 10d
    Onboarding Wizard                            :p4c, 2026-03-24, 5d
    Dashboard MVP                                :p4d, 2026-03-24, 10d
    AutoResearch Loop                            :p4e, 2026-04-01, 7d
    Helm Chart                                   :p4f, 2026-04-01, 5d
```

---

## Start Here

**Just exploring?**
1. Read this README
2. Browse the [architecture docs](docs/architecture/)
3. Check the [FAQ](docs/FAQ.md)

**Want to try it?**
1. `git clone https://github.com/juboyy/paganini-aios && cd paganini-aios`
2. `pip install -e . && cp config.example.yaml config.yaml`
3. Set your API key in `config.yaml`
4. `paganini ingest data/corpus/fidc/ && paganini query "test"`

**Want to contribute?**
1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Pick an issue labeled `good first issue`
3. Fork, branch, gate, PR

**Want to deploy for a fund?**
1. [Contact us](mailto:rod.marques@aios.finance) for a license key
2. `paganini init --pack fidc-professional`
3. `paganini up`

---

## Stack + Security

Every layer has security built in. Not bolted on.

| Layer | Technology | Security Posture |
|-------|-----------|-----------------|
| **Runtime** | [Moltis](https://github.com/moltis-org/moltis) v0.10.18 — Rust, single binary (~30MB) | Agents in isolated containers. `cap-drop ALL`. Read-only FS. Distroless images. Signed + scanned. |
| **Agents** | 9 SOULs with identity + tools + scope | `network: none` by default. Unix socket only. Seccomp blocks network syscalls. PID limit 50. |
| **Learning** | MetaClaw — auto-skill generation | Per-instance isolation (Chinese walls). Skills validated vs corpus. Contradictions rejected. |
| **Reasoning** | RLM — recursive context, sub-LLMs | Scoped context. No state between queries. Gate token proves due diligence. |
| **Retrieval** | Hybrid RAG — [ChromaDB](https://www.trychroma.com/) + all-MiniLM-L6-v2 (local, no API) | Corpus encrypted at rest (AES-256). In-memory only. Embeddings partitioned by fund_id. |
| **Memory** | pgvector + SQLite + filesystem | RLS per fund_id. 4 layers isolated. Episodic encrypted. Procedural auditable. |
| **Guardrails** | 6-gate hard-stop pipeline | Block > Warn > Log. Override = human + justification + immutable audit entry. |
| **Observability** | OpenTelemetry — traces + metrics | Every action traced with fund_id + gate_token. Immutable. 7-year retention (CVM). |
| **Network** | Egress proxy — allowlist only | Only CVM/ANBIMA/BACEN/LLM/Slack pass. All else blocked. Every request logged. |
| **Secrets** | Encrypted vault — AES-256-GCM | No plaintext anywhere. Pre-commit hooks + CI scan (trufflehog, gitleaks, semgrep). |
| **Data** | PII scrubbing + immutable records | CPF/CNPJ masked in logs. Reports append-only. Corrections = new records. |
| **Channels** | Slack · API · CLI · Dashboard | Per-fund channels. mTLS optional. Role-based dashboard. Vault-authenticated CLI. |
| **LLM** | BYOK via [LiteLLM](https://github.com/BerriAI/litellm) — any provider | Keys passed through, never stored. No training on client data. Client controls residency. |

---

<div align="center">

## Team

| | | | |
|:---:|:---:|:---:|:---:|
| **Rod Marques** | **João Raf** | **Louiz Ferrer** | **Mark Binder** |
| CEO | CTO | CIO | CFO |

<br>

**[paganini-aios-v2.lovable.app](https://paganini-aios-v2.lovable.app/)** · rod.marques@aios.finance

<br>

---

<sub>Built with obsession. Shipped with discipline.</sub>

</div>
