<div align="center">

# Paganini AIOS

### Autonomous Intelligence for Investment Fund Operations

[![CI](https://github.com/juboyy/paganini-aios/actions/workflows/ci.yml/badge.svg)](https://github.com/juboyy/paganini-aios/actions/workflows/ci.yml)
[![Security](https://github.com/juboyy/paganini-aios/actions/workflows/security.yml/badge.svg)](https://github.com/juboyy/paganini-aios/actions/workflows/security.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-3776ab.svg)](https://python.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Demo](https://img.shields.io/badge/demo-live-blue.svg)](https://paganini-demo.vercel.app)

</div>

---

## The Problem

Brazil's R$ 8.9 trillion fund industry runs on manual processes. Administrators, custodians, and managers spend thousands of hours per year on compliance checks, regulatory monitoring, and operational reporting — work that is repetitive, error-prone, and expensive.

**Paganini eliminates 80% of this manual work.**

| | Manual | Paganini |
|---|---|---|
| **Fund onboarding** | 2–5 days | 30 seconds |
| **Regulatory query** | Hours (lawyer) | < 3 seconds |
| **Compliance check** | Monthly audit | Continuous |
| **Cost per fund** | R$ 15K–50K/mo | R$ 2K–8K/mo |

---

## How It Works

```
Query → Cognitive Router → Specialized Agent → Guardrails → Response
```

**9 AI agents**, each with domain expertise (administration, compliance, custody, due diligence, management, investor relations, pricing, regulatory watch, reporting). The Cognitive Router dispatches queries to the right agent with 85%+ accuracy.

**6 compliance gates** validate every response: eligibility, concentration, covenant, PLD/AML, compliance, and risk. Non-compliant queries are blocked automatically — including adversarial attempts.

**Hybrid RAG** over 7,000+ regulatory chunks (CVM 175, IFRS9, COFIs, FIDC regulations) using Google Gemini embeddings. Answers cite their sources.

---

## Quick Start

```bash
git clone https://github.com/juboyy/paganini-aios.git && cd paganini-aios
bash quickstart.sh
export GOOGLE_API_KEY=your-key
paganini dashboard
```

Zero-touch fund onboarding from CVM public data:

```bash
paganini onboard auto --cnpj 47.388.724/0001-18
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      REST API (FastAPI)                     │
│                   13 endpoints · API key auth               │
├─────────────┬──────────────┬──────────────┬─────────────────┤
│  Cognitive  │   9 Agent    │  6 Guardrail │    MetaClaw     │
│   Router    │    SOULs     │    Gates     │  Skill Engine   │
├─────────────┴──────────────┴──────────────┴─────────────────┤
│              Hybrid RAG (ChromaDB + Gemini Embedding 2)     │
│                    7,000+ regulatory chunks                 │
├─────────────────────────────────────────────────────────────┤
│  BCB Market Data  │  9 Background Daemons  │  Audit Trail   │
├─────────────────────────────────────────────────────────────┤
│            Docker · Helm · systemd · Nginx + HTTPS          │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | What it does |
|---|---|
| **Cognitive Router** | Intent classification → agent dispatch (85%+ accuracy) |
| **Agent SOULs** | Domain-specific system prompts with reasoning profiles |
| **Guardrail Pipeline** | 6 sequential compliance gates (blocks non-compliant responses) |
| **MetaClaw** | Autonomous skill learning — captures reusable patterns from operations |
| **RAG Pipeline** | ChromaDB + Gemini embeddings + reranking + source citation |
| **Market Data** | Live BCB SGS integration (CDI, SELIC, IPCA, IGP-M, USD/BRL) |
| **CVM Ingester** | Auto-onboarding from CVM public data (cadastro + informe diário) |

---

## Agents

| Agent | Domain | Example Query |
|---|---|---|
| `administrador` | Fund governance | "Quais os indicadores de mercado atuais?" |
| `compliance` | Regulatory compliance | "Limites de concentração por cedente?" |
| `custodiante` | Custody & collateral | "Obrigações na verificação de lastro?" |
| `due_diligence` | Asset analysis | "Critérios de elegibilidade para cessão?" |
| `gestor` | Portfolio management | "Como funciona o stress test de recebíveis?" |
| `investor_relations` | Investor reporting | "Relatório mensal do fundo?" |
| `pricing` | Mark-to-market | "Subordinação de cotas sênior e mezanino?" |
| `regulatory_watch` | Regulation monitoring | "Mudanças da Resolução CVM 175?" |
| `reporting` | Report generation | "Gerar relatório diário do fundo?" |

---

## Security

- **Fund-level data isolation** — Fund A data never leaks to Fund B
- **Cotista-level partitioning** — Individual investor data isolated at query level
- **PLD/AML gate** — Blocks adversarial attempts to evade anti-money-laundering controls
- **Audit trail** — Every query logged with timestamp, agent, sources, confidence, gate results
- **CI security pipeline** — TruffleHog, Bandit SAST, PII detection, corpus leak detection

See [SECURITY.md](SECURITY.md) for the full security policy.

---

## API

Base URL: `http://localhost:8000` · Auth: `X-API-Key` header

| Endpoint | Method | Description |
|---|---|---|
| `/api/query?q=...` | GET | Query the agent system |
| `/api/onboard` | POST | Onboard a fund by CNPJ |
| `/api/status` | GET | System status (chunks, agents, daemons, funds) |
| `/api/agents` | GET | List agents with tools and domains |
| `/api/funds` | GET | Onboarded fund portfolio |
| `/api/skills` | GET | MetaClaw learned skills |
| `/api/alerts` | GET | Active compliance alerts |
| `/api/market` | GET | Live BCB market data |
| `/api/daemons` | GET | Background daemon status |
| `/api/memory/stats` | GET | RAG memory layer statistics |

---

## Infrastructure

```bash
# Docker
docker build -f infra/Dockerfile.slim -t paganini:slim .    # ~768MB
docker build -f infra/Dockerfile -t paganini:full .          # ~8GB

# Kubernetes
helm install paganini ./infra/helm --values values.yaml

# HTTPS
bash scripts/letsencrypt.sh yourdomain.com
```

---

## Project Stats

| Metric | Value |
|---|---|
| Python source files | 41 |
| Lines of code | 10,160 |
| Tests passing | 93 |
| Regulatory chunks | 7,000+ |
| Background daemons | 9 |
| Pre-commit hooks | 10 |

---

## Tech Stack

**Language:** Python 3.11+ · **API:** FastAPI · **Vector Store:** ChromaDB + Gemini Embedding 2 · **LLM:** litellm (model-agnostic) · **Market Data:** BCB SGS · **Infra:** Docker, Helm, systemd, Nginx · **CI:** GitHub Actions · **Skill Learning:** MetaClaw

---

## License

MIT © Paganini AIOS Contributors — [LICENSE](LICENSE)
