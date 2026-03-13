<div align="center">

# 🎻 PAGANINI AIOS

### The AI Operating System for Financial Markets

**One command. Any terminal. Any OS.**
**An autonomous financial reasoning system that gets smarter with every interaction.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Open Core](https://img.shields.io/badge/model-open--core-orange.svg)](#business-model)

[Website](https://paganini-aios-v2.lovable.app/) · [Docs](docs/) · [Get Started](#quick-start) · [Architecture](#how-it-works)

</div>

---

```bash
curl -fsSL https://paganini.sh | sh && paganini init --pack fidc && paganini up
```

> *"We don't sell a model. We sell a financial reasoning system that works with any model."*

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

```
┌─────────────────────────────────────────────────┐
│                    YOU                           │
│            paganini query "..."                  │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │    🧠 COGNITIVE ROUTER  │
          │  classify → route →     │
          │  estimate confidence    │
          └────────────┬────────────┘
                       │
     ┌─────────┬───────┼───────┬──────────┐
     ▼         ▼       ▼       ▼          ▼
  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
  │Admin │ │Custód│ │Gestor│ │Compli│ │  +5  │
  │      │ │      │ │      │ │ance  │ │more  │
  │ CVM  │ │Recon │ │ Risk │ │PLD/  │ │      │
  │ 175  │ │cilia │ │ PDD  │ │ AML  │ │      │
  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘
     │        │        │        │         │
     └────────┴────────┴────────┴─────────┘
                       │
          ┌────────────▼────────────┐
          │   🛡️ GUARDRAIL PIPELINE │
          │  6 hard-stop gates      │
          │  Block > Warn > Log     │
          └────────────┬────────────┘
                       │
                    Answer
```

---

## How It Works

### 🔄 Three Self-Improvement Loops

The system doesn't just answer — it **evolves**.

| Loop | What It Optimizes | How |
|------|-------------------|-----|
| 🔍 **AutoResearch** | Retrieval quality | Autonomous experiments on chunking, embedding, ranking. LLM optimizes the pipeline, not itself. |
| 🧬 **MetaClaw** | Agent behavior | Learning proxy intercepts interactions, generates skills automatically. No fine-tuning needed. |
| 🧠 **Memory Reflection** | Knowledge depth | Daily daemon reviews operations, extracts patterns, builds knowledge graph. Day 100 > Day 1. |

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
# Install
curl -fsSL https://paganini.sh | sh

# Configure (interactive wizard)
paganini init --pack fidc

# Run
paganini up

# Query
paganini query "Qual o limite de concentração por cedente segundo a CVM 175?"
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
│   ├── kernel/          # RLM engine, cognitive router, CLI
│   ├── rag/             # Hybrid RAG + AutoResearch loop
│   ├── agents/          # 9 SOULs + agent framework
│   │   └── souls/       # One .md per agent identity
│   ├── ontology/        # FIDC knowledge graph
│   ├── dashboard/       # Operations UI
│   ├── modules/         # Pre-configured verticals
│   └── shared/          # Types, utils, guardrails
├── vendor/metaclaw/     # Learning proxy (controlled fork)
├── infra/               # Docker, Helm, daemons, systemd
├── docs/                # Architecture, security, tools, pipeline
│   ├── architecture/    # ADRs, system design, genome, distribution
│   ├── security/        # Container & open-source isolation
│   ├── pipeline/        # BMAD-CE execution methodology
│   └── tools/           # PinchTab, QMD integration guides
└── config.yaml          # Single source of configuration
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

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | **Moltis** — Rust, single binary, sandboxed |
| Learning | **MetaClaw** — skill auto-generation from interactions |
| Reasoning | **RLM** — recursive context management, sub-LLM delegation |
| Optimization | **AutoResearch** — autonomous RAG parameter tuning |
| Memory | **pgvector** + SQLite + filesystem — dense + sparse + graph |
| Observability | **OpenTelemetry** — regulatory-grade audit trail |
| Channels | Slack · Telegram · API · CLI · Dashboard |
| LLM | **BYOK** — any provider, client owns keys |

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
