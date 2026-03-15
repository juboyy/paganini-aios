<div align="center">

# 🎻 Paganini AIOS

### Autonomous AI Operating System for Investment Fund Management

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-89%20passing-brightgreen.svg)](#)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](infra/)
[![Helm](https://img.shields.io/badge/helm-chart-blue.svg)](infra/helm/)

**9 specialized AI agents · 6 guardrail gates · 6,993 regulatory chunks indexed**

</div>

---

## Overview

Paganini AIOS is a production-grade AI operating system for investment fund operations. It combines a multi-agent reasoning layer with a regulatory knowledge base, automated compliance guardrails, and a REST API — all deployable in minutes.

```bash
paganini onboard auto --cnpj XX.XXX.XXX/0001-XX
paganini query "What are the custodian's obligations regarding overcollateralization?"
```

---

## What's Inside

| Layer | Components |
|---|---|
| **Agents** | 9 specialized SOULs with domain reasoning |
| **Guardrails** | 6 compliance gates (eligibility, concentration, covenant, AML/PLD, compliance, risk) |
| **RAG Pipeline** | ChromaDB · 6,993 regulatory chunks indexed |
| **Dashboard** | FastAPI · 13 REST endpoints · API key auth |
| **Infra** | Docker (slim 768MB + full 8GB) · Helm chart · Nginx + HTTPS |
| **Data** | BCB SGS market data (CDI, SELIC, IPCA, IGP-M, USD/BRL) |
| **Monitoring** | 9 background daemons · JSONL audit log · morning digest |

---

## Quick Start

```bash
git clone https://github.com/juboyy/paganini-aios.git
cd paganini-aios
bash quickstart.sh
. export GOOGLE_API_KEY=AIza...

# Auto-onboard a fund (zero data needed)
paganini onboard auto --cnpj XX.XXX.XXX/0001-XX

# Launch the dashboard
paganini dashboard
```

---

## 9 AI Agents

Each agent has a specialized SOUL — a domain-specific system prompt and reasoning profile:

| Agent | Domain |
|---|---|
| `administrador` | Fund administration and governance |
| `compliance` | Regulatory compliance and reporting |
| `custodiante` | Custody, settlement, and collateral |
| `due_diligence` | Asset and counterparty analysis |
| `gestor` | Portfolio management and allocation |
| `investor_relations` | Investor reporting and communication |
| `pricing` | Asset pricing and mark-to-market |
| `regulatory_watch` | Regulation monitoring and alerts |
| `reporting` | Report generation and data export |

The **Cognitive Router** dispatches each query to the most relevant agent (80–90% accuracy) based on intent, domain, and context.

---

## Guardrail Gates

All queries pass through 6 sequential compliance gates before a response is returned:

1. **Eligibility** — asset eligibility checks
2. **Concentration** — exposure limits and diversification
3. **Covenant** — covenant breach detection
4. **PLD/AML** — anti-money-laundering screening
5. **Compliance** — regulatory rule enforcement
6. **Risk** — portfolio risk thresholds

---

## CLI Reference

```bash
# Core
paganini init                        # Initialize workspace
paganini ingest                      # Ingest documents into RAG
paganini query "..."                 # Query the agent system
paganini status                      # System status
paganini doctor                      # Diagnostics

# Dashboard
paganini dashboard                   # Start FastAPI dashboard

# Onboarding
paganini onboard auto --cnpj XX...   # Zero-touch fund onboarding
paganini onboard init                # Manual onboarding wizard
paganini onboard status              # Check onboarding state
paganini onboard validate            # Validate onboarding data

# Daemons
paganini daemons status              # List daemon status
paganini daemons run <name>          # Run a single daemon
paganini daemons run-all             # Run all daemons

# Extensions
paganini modules list                # List available modules
paganini modules info <name>         # Module details
paganini pack install <name>         # Install a domain pack
paganini pack list                   # List installed packs
```

---

## REST API

Base URL: `http://localhost:8000`
Auth: `X-API-Key: <your-key>` header required on all endpoints.

| Endpoint | Description |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/status` | System status |
| `GET /api/agents` | List available agents |
| `POST /api/query` | Query the agent system |
| `GET /api/reports` | List generated reports |
| `GET /api/alerts` | Active alerts |
| `GET /api/market` | Latest market data |
| `GET /api/market/history` | Historical market data |
| `GET /api/audit` | Audit log entries |
| `GET /api/daemons` | Daemon status |
| `GET /api/daemons/history` | Daemon run history |
| `GET /api/memory/stats` | RAG memory statistics |

---

## Architecture

```
paganini-aios/
├── packages/
│   ├── agents/
│   │   └── souls/          # 9 agent SOUL definitions
│   ├── guardrails.py       # 6-gate compliance pipeline
│   ├── ontology/           # Domain ontology
│   └── knowledge_graph/    # Entity relationships
├── runtime/
│   ├── engine.py           # Orchestrator kernel
│   ├── rag.py              # RAG pipeline
│   └── moltis.py           # Agent runtime
├── infra/
│   ├── Dockerfile          # Slim + full images
│   ├── helm/               # Kubernetes Helm chart
│   ├── nginx/              # Reverse proxy config
│   └── systemd/            # Daemon unit files
├── scripts/
│   └── letsencrypt.sh      # HTTPS setup
├── tests/                  # 89 passing tests
├── quickstart.sh
└── pyproject.toml
```

### Key Components

- **`engine.py`** — Main orchestrator: routes queries, invokes agents, runs guardrails
- **`rag.py`** — RAG pipeline: ChromaDB vector store, chunk retrieval, reranking
- **`moltis.py`** — Agent runtime: SOUL loading, litellm integration, response formatting
- **`guardrails.py`** — 6-gate compliance pipeline with structured pass/fail output

---

## Background Daemons

9 daemon handlers run autonomously on schedule:

| Daemon | Role |
|---|---|
| `regulatory_watch` | Monitor for new regulatory publications |
| `market_data_sync` | Sync CDI, SELIC, IPCA, IGP-M, USD/BRL from BCB SGS |
| `reconciliation` | Daily position reconciliation |
| `cedente_monitor` | Originator monitoring |
| `self_audit` | Internal audit and log review |
| `morning_report` | Daily digest: market data + covenants + alerts |
| + 3 more | Configurable via `moltis.yaml` |

---

## Infrastructure

### Docker

```bash
# Slim image (~768MB)
docker build -f infra/Dockerfile.slim -t paganini:slim .

# Full image (~8GB, includes all models)
docker build -f infra/Dockerfile -t paganini:full .
```

### Kubernetes (Helm)

```bash
helm install paganini ./infra/helm --values values.yaml
```

### HTTPS (Nginx + Let's Encrypt)

```bash
bash scripts/letsencrypt.sh yourdomain.com
```

---

## Project Stats

- **37** Python source files
- **8,771** lines of code
- **89** tests passing
- **24+** commits on `main`
- **6,993** regulatory chunks indexed in ChromaDB

---

## Tech Stack

- **Language:** Python 3.11+
- **API Framework:** FastAPI
- **Vector Store:** ChromaDB
- **LLM Routing:** litellm (model-agnostic)
- **Market Data:** BCB SGS API
- **Infra:** Docker, Helm, systemd, Nginx
- **CI:** Pre-commit (10 hooks: secrets, PII, corpus content detection)

---

## Pre-commit Hooks

10 hooks protect the repository:

```bash
pre-commit install
pre-commit run --all-files
```

Hooks include: secret scanning, PII detection, corpus content validation, and formatting checks.

---

## License

MIT © Paganini AIOS Contributors

See [LICENSE](LICENSE) for details.
