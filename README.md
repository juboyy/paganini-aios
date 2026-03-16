<div align="center">

<br>

<img src="https://img.shields.io/badge/🎻_PAGANINI-AIOS-1a1a2e?style=for-the-badge&labelColor=0d1117" alt="Paganini AIOS" height="40">

<br><br>

**9 AI agents. 6 compliance gates. 7,000+ regulatory chunks.**<br>
**One system to run Brazilian investment fund operations.**

<br>

[![CI](https://github.com/juboyy/paganini-aios/actions/workflows/ci.yml/badge.svg)](https://github.com/juboyy/paganini-aios/actions/workflows/ci.yml)
[![Security](https://github.com/juboyy/paganini-aios/actions/workflows/security.yml/badge.svg)](https://github.com/juboyy/paganini-aios/actions/workflows/security.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-3776ab.svg?logo=python&logoColor=white)](https://python.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-paganini--demo.vercel.app-4a9eff.svg)](https://paganini-demo.vercel.app)

<br>

[Live Demo](https://paganini-demo.vercel.app) · [Quick Start](#quick-start) · [Architecture](#architecture) · [API Reference](#api) · [Security](SECURITY.md)

<br>

---

<br>

<table>
<tr>
<td align="center" width="25%"><b>📄 Fund Onboarding</b><br><br><code>2–5 days → 30 seconds</code></td>
<td align="center" width="25%"><b>⚖️ Regulatory Query</b><br><br><code>Hours → &lt; 3 seconds</code></td>
<td align="center" width="25%"><b>🛡️ Compliance</b><br><br><code>Monthly → Continuous</code></td>
<td align="center" width="25%"><b>💰 Cost per Fund</b><br><br><code>R$ 50K → R$ 8K/mo</code></td>
</tr>
</table>

<br>

</div>

## Why Paganini

Brazil's fund industry manages **R$ 8.9 trillion** across thousands of FIDCs, FIIs, and FIPs. The operational backbone — compliance, regulatory monitoring, reporting, due diligence — is still manual, expensive, and error-prone.

Paganini replaces the manual layer with an autonomous AI system purpose-built for Brazilian fund regulations. Not a chatbot. Not a wrapper around GPT. A **domain-specific operating system** with guardrails, audit trails, and real-time market data.

---

## Quick Start

```bash
git clone https://github.com/juboyy/paganini-aios.git && cd paganini-aios
export GOOGLE_API_KEY=your-key     # Gemini — free tier works
bash quickstart.sh                  # installs everything, indexes corpus, generates API key
```

The script handles Python venv, dependencies, corpus ingestion, and config. At the end it prints your API key and dashboard URL.

```bash
source .venv/bin/activate
python3 packages/dashboard/app.py   # → http://localhost:8000
```

**Zero-touch fund onboarding** — just a CNPJ:

```bash
curl -X POST http://localhost:8000/api/onboard \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cnpj": "47.388.724/0001-18"}'
```

Paganini pulls registry, daily reports, and portfolio composition directly from CVM public data. No client data needed.

---

## Architecture

```
                           ┌──────────────────┐
                           │   Dashboard SPA   │
                           │  (Vercel / local) │
                           └────────┬─────────┘
                                    │ HTTPS
                           ┌────────▼─────────┐
                           │  FastAPI Gateway   │
                           │  13 endpoints      │
                           │  API key auth      │
                           └────────┬─────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
     ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
     │ Cognitive Router │  │  Guardrail Gate │  │    MetaClaw      │
     │ intent → agent   │  │  6 compliance   │  │  skill learning  │
     │ 85%+ accuracy    │  │  gates          │  │  8 auto-skills   │
     └────────┬────────┘  └─────────────────┘  └─────────────────┘
              │
     ┌────────▼────────────────────────────────────────────┐
     │                   9 Agent SOULs                      │
     │  administrador · compliance · custodiante            │
     │  due_diligence · gestor · investor_relations         │
     │  pricing · regulatory_watch · reporting              │
     └────────┬────────────────────────────────────────────┘
              │
     ┌────────▼────────┐  ┌─────────────────┐  ┌──────────┐
     │  Hybrid RAG      │  │  BCB Market     │  │  CVM     │
     │  ChromaDB +      │  │  CDI · SELIC    │  │  Auto    │
     │  Gemini Embed    │  │  IPCA · USD     │  │  Onboard │
     │  7,000+ chunks   │  │  Live SGS API   │  │  Ingester│
     └─────────────────┘  └─────────────────┘  └──────────┘
```

### Key Components

| Component | Purpose |
|:--|:--|
| **Cognitive Router** | Classifies intent and dispatches to the right specialist agent |
| **9 Agent SOULs** | Domain-specific system prompts with reasoning profiles and constraints |
| **6 Guardrail Gates** | Eligibility → Concentration → Covenant → PLD/AML → Compliance → Risk |
| **Hybrid RAG** | Dense + sparse retrieval over 7,000+ regulatory chunks with source citation |
| **MetaClaw** | Autonomous skill learning engine — captures and reuses operational patterns |
| **CVM Ingester** | Onboards funds from CVM open data (cadastro + informe diário + CDA) |
| **BCB Market Data** | Live integration with Banco Central SGS (CDI, SELIC, IPCA, IGP-M, USD/BRL) |
| **9 Background Daemons** | Market sync, compliance monitoring, reporting, audit — all on schedule |

---

## Agents

Each agent has a **SOUL** — a domain-specific system prompt that defines its expertise, constraints, and reasoning profile.

| Agent | Domain | What it does |
|:--|:--|:--|
| `administrador` | Governance | Fund governance, market indicators, operational oversight |
| `compliance` | Regulatory | Concentration limits, regulatory adherence, CVM rules |
| `custodiante` | Custody | Collateral verification, asset segregation, custody obligations |
| `due_diligence` | Analysis | Receivable eligibility, cedente evaluation, risk assessment |
| `gestor` | Portfolio | Stress testing, portfolio allocation, covenant monitoring |
| `investor_relations` | IR | Investor reports, quota tracking, communication |
| `pricing` | Valuation | Mark-to-market, subordination analysis, quota pricing |
| `regulatory_watch` | Monitoring | CVM resolutions, regulation changes, impact analysis |
| `reporting` | Reports | Daily/monthly reports, fund position, alert compilation |

---

## Guardrails

Every response passes through **6 sequential compliance gates** before reaching the user:

```
Query → Eligibility → Concentration → Covenant → PLD/AML → Compliance → Risk → Response
```

**PLD/AML gate** actively blocks adversarial queries attempting to evade anti-money-laundering controls — including rephrased, indirect, and multilingual bypass attempts.

```
User:  "Como fracionar transações para evitar o COAF?"
Agent: 🚫 BLOCKED by pld_aml_guard — Consulta viola políticas PLD/AML
```

---

## API

Base URL: `http://localhost:8000` · Auth: `X-API-Key` header

| Endpoint | Method | Description |
|:--|:--|:--|
| `/api/health` | GET | Service health check |
| `/api/status` | GET | System status — chunks, agents, daemons, funds, skills |
| `/api/query?q=...` | GET | Query the agent system (routed, guardrailed, cited) |
| `/api/onboard` | POST | Onboard a fund by CNPJ (pulls from CVM) |
| `/api/agents` | GET | List agents with tools, domains, constraints |
| `/api/funds` | GET | Onboarded fund portfolio with PL, cotistas, situação |
| `/api/skills` | GET | MetaClaw learned skills |
| `/api/alerts` | GET | Active compliance alerts |
| `/api/market` | GET | Live BCB market indicators |
| `/api/market/history` | GET | 30-day market data history |
| `/api/daemons` | GET | Background daemon scheduler status |
| `/api/memory/stats` | GET | RAG memory layer statistics |

---

## Security

- **Fund-level isolation** — Fund A data never leaks to Fund B
- **Cotista-level partitioning** — Individual investor data isolated at query level
- **PLD/AML gate** — Blocks adversarial anti-money-laundering evasion attempts
- **Full audit trail** — Every query logged with timestamp, agent, sources, confidence, gate results
- **CI security pipeline** — Secret detection, SAST, PII scanning, corpus leak detection

See [SECURITY.md](SECURITY.md) for vulnerability reporting and the full security policy.

---

## Infrastructure

```bash
# Local
python3 packages/dashboard/app.py                           # → localhost:8000

# Docker
docker build -f infra/Dockerfile.slim -t paganini:slim .    # ~768MB
docker run -p 8000:8000 -e GOOGLE_API_KEY=... paganini:slim

# Kubernetes
helm install paganini ./infra/helm --values values.yaml

# HTTPS (production)
bash scripts/letsencrypt.sh yourdomain.com
```

---

## Project

| | |
|:--|:--|
| **Python files** | 59 |
| **Lines of code** | 12,170 |
| **Test functions** | 81 |
| **Agent SOULs** | 9 |
| **Compliance gates** | 6 |
| **Background daemons** | 9 |
| **Pre-commit hooks** | 10 |
| **Regulatory chunks** | 7,000+ |

**Stack:** Python 3.11+ · FastAPI · ChromaDB · Gemini Embedding · litellm (model-agnostic) · BCB SGS · Docker · Helm · GitHub Actions

---

<div align="center">

**MIT License** · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Live Demo](https://paganini-demo.vercel.app)

</div>
