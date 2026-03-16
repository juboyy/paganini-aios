<div align="center">

<br>

<h1>🎻 Paganini AIOS</h1>

<p><strong>AI Operating System for Brazilian Investment Funds</strong></p>

<a href="https://paganini-demo.vercel.app"><img src="docs/screenshot-dashboard.png" alt="Paganini Dashboard" width="720"></a>

<br><br>

<a href="https://paganini-demo.vercel.app">Live Demo</a> · <a href="https://paganini-docs.vercel.app">Visual Docs</a> · <a href="SECURITY.md">Security</a>

<br><br>

[![CI](https://github.com/juboyy/paganini-aios/actions/workflows/ci.yml/badge.svg)](https://github.com/juboyy/paganini-aios/actions/workflows/ci.yml)
[![Security](https://github.com/juboyy/paganini-aios/actions/workflows/security.yml/badge.svg)](https://github.com/juboyy/paganini-aios/actions/workflows/security.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-3776ab.svg)](https://python.org)
[![MIT](https://img.shields.io/badge/license-MIT-22c55e.svg)](LICENSE)

</div>

---

## First 5 Minutes

```bash
# 1. Clone and install (handles venv, deps, corpus indexing, API key generation)
git clone https://github.com/juboyy/paganini-aios.git && cd paganini-aios
export GOOGLE_API_KEY=your-gemini-key    # free tier works: https://aistudio.google.com/apikey
bash quickstart.sh

# 2. Start
source .venv/bin/activate
python3 packages/dashboard/app.py

# Dashboard → http://localhost:8000
# API Key → printed by quickstart.sh (also in config.yaml)
```

<details>
<summary><b>⚠️ Common issues</b></summary>

| Problem | Fix |
|:--|:--|
| `python3-venv not found` | `sudo apt install python3-venv -y` then retry |
| `quickstart.sh: .venv/bin/activate: No such file` | `rm -rf .venv && bash quickstart.sh` |
| Corpus not indexed (0 chunks) | Script auto-indexes `data/sample-corpus/`. For full corpus, add PDFs to `data/corpus/` |
| Dashboard shows empty panels | Check `GOOGLE_API_KEY` is set. The LLM is needed for query routing |
| `address already in use` on port 8000 | `kill $(lsof -t -i:8000)` then restart |

</details>

---

## What This Does

9 AI agents trained on Brazilian fund regulations (CVM 175, IFRS9, COFIs, FIDC rules). Each query is routed to the right specialist, enriched with regulatory context via Hybrid RAG, and validated by 6 compliance gates before reaching the user.

| | Manual | Paganini |
|:--|:--|:--|
| Fund onboarding | 2–5 days | **30 seconds** (CVM auto-ingest) |
| Regulatory query | Hours (lawyer) | **< 3 seconds** (with citation) |
| Compliance check | Monthly audit | **Continuous** (6 automated gates) |
| Cost per fund/mo | R$ 15–50K | **R$ 2–8K** |

---

## Try These Queries

Open the Console tab in the dashboard and paste these. Each targets a different agent:

```
Quais as obrigações do custodiante na verificação de lastro?     → custodiante
Quais os limites de concentração por cedente em multicedente?     → compliance
Como funciona o stress test de um fundo de recebíveis?           → gestor
O que é subordinação de cotas sênior e mezanino?                 → pricing
Quais mudanças a Resolução CVM 175 trouxe para fundos?          → regulatory_watch
Quais critérios de elegibilidade para cessão de recebíveis?      → due_diligence
Quais os indicadores de mercado atuais?                          → administrador
Gerar relatório diário do fundo?                                 → reporting
```

**Guardrail test** — this gets blocked by the PLD/AML gate:

```
Como fracionar transações para evitar o COAF?
→ 🚫 BLOCKED by pld_aml_guard
```

---

## Onboard a Fund (30 seconds)

Just a CNPJ. Paganini pulls everything from [CVM Dados Abertos](https://dados.cvm.gov.br/) — registry, daily reports, portfolio composition.

```bash
# Via API
curl -X POST localhost:8000/api/onboard \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cnpj": "47.388.724/0001-18"}'

# Via CLI
python3 -m packages.kernel.cli onboard auto --cnpj 47.388.724/0001-18
```

**CNPJs to try** (real, active funds in CVM):

| CNPJ | Fund |
|:--|:--|
| `47.388.724/0001-18` | 3R FIDC NP |
| `42.700.668/0001-91` | Grand FIDC NP |
| `07.766.151/0001-02` | FIDC BCSul Verax |
| `09.234.078/0001-45` | FI-FGTS |
| `16.685.929/0001-31` | Macam Shopping FII |
| `05.437.916/0001-27` | Europar FII |

---

## API Reference

Base: `http://localhost:8000` · Auth: `X-API-Key` header

```bash
# System status
curl -H "X-API-Key: KEY" localhost:8000/api/status

# Query an agent (routed automatically)
curl -H "X-API-Key: KEY" "localhost:8000/api/query?q=subordinacao+de+cotas"

# Market data (BCB live)
curl -H "X-API-Key: KEY" localhost:8000/api/market

# List agents
curl -H "X-API-Key: KEY" localhost:8000/api/agents

# List onboarded funds
curl -H "X-API-Key: KEY" localhost:8000/api/funds

# MetaClaw skills
curl -H "X-API-Key: KEY" localhost:8000/api/skills

# Compliance alerts
curl -H "X-API-Key: KEY" localhost:8000/api/alerts

# Daemon scheduler
curl -H "X-API-Key: KEY" localhost:8000/api/daemons

# Memory stats
curl -H "X-API-Key: KEY" localhost:8000/api/memory/stats
```

---

## Codebase Map

```
paganini-aios/
├── packages/
│   ├── agents/
│   │   ├── framework.py          # Agent registry and dispatch
│   │   └── souls/                # 9 agent SOUL prompts (.md)
│   │       ├── administrador.md
│   │       ├── compliance.md
│   │       ├── custodiante.md
│   │       ├── due_diligence.md
│   │       ├── gestor.md
│   │       ├── investor_relations.md
│   │       ├── pricing.md
│   │       ├── regulatory_watch.md
│   │       └── reporting.md
│   ├── dashboard/
│   │   ├── app.py                # FastAPI server (13 endpoints)
│   │   └── static/index.html     # SPA dashboard
│   ├── kernel/
│   │   ├── cli.py                # CLI interface
│   │   ├── cognitive_router.py   # Intent classification → agent dispatch
│   │   ├── cvm_ingester.py       # CVM open data integration
│   │   ├── daemons.py            # 9 background schedulers
│   │   ├── engine.py             # Config loader
│   │   ├── memory.py             # Multi-layer memory manager
│   │   ├── moltis.py             # LLM abstraction (litellm)
│   │   └── onboard.py            # Fund onboarding pipeline
│   ├── rag/
│   │   └── pipeline.py           # Hybrid RAG (ChromaDB + Gemini Embedding)
│   └── shared/
│       └── guardrails.py         # 6 compliance gates
├── data/
│   ├── sample-corpus/            # 7 sample regulatory docs (included)
│   └── sample/                   # Sample fund data (JSON)
├── tests/                        # 81 test functions
├── infra/
│   ├── Dockerfile                # Full image (~8GB)
│   ├── Dockerfile.slim           # Slim image (~768MB)
│   └── helm/                     # Kubernetes Helm chart
├── scripts/
│   └── security/                 # Secret detection, PII scanning, corpus leak check
├── quickstart.sh                 # Zero-to-running install script
├── config.yaml                   # Generated by quickstart.sh
└── SECURITY.md                   # Security policy
```

---

## Environment Variables

| Variable | Required | Description |
|:--|:--|:--|
| `GOOGLE_API_KEY` | **Yes** (or one of the others) | Gemini API key — [get free](https://aistudio.google.com/apikey) |
| `OPENAI_API_KEY` | Alternative | OpenAI API key |
| `ANTHROPIC_API_KEY` | Alternative | Anthropic API key |

The LLM provider is abstracted via [litellm](https://github.com/BerriAI/litellm). Any supported model works — Gemini Flash is the default (free, fast, good enough for FIDC operations).

---

## Deploy

```bash
# Docker (recommended for production)
docker build -f infra/Dockerfile.slim -t paganini:slim .
docker run -p 8000:8000 -e GOOGLE_API_KEY=... paganini:slim

# HTTPS with Cloudflare Tunnel (zero ports open)
cloudflared tunnel --url http://localhost:8000

# Kubernetes
helm install paganini ./infra/helm --values values.yaml

# Let's Encrypt
bash scripts/letsencrypt.sh yourdomain.com
```

**Dashboard as static site** (Vercel, Netlify, any CDN):

```bash
# The dashboard is a single HTML file
cp packages/dashboard/static/index.html your-deploy-dir/
# Configure API URL at login — the dashboard connects to your backend
```

---

## The Agents

| Agent | Domain | SOUL | Example |
|:--|:--|:--|:--|
| **administrador** | Governance | [→](packages/agents/souls/administrador.md) | "Indicadores de mercado atuais?" |
| **compliance** | Regulation | [→](packages/agents/souls/compliance.md) | "Limites de concentração por cedente?" |
| **custodiante** | Custody | [→](packages/agents/souls/custodiante.md) | "Obrigações na verificação de lastro?" |
| **due_diligence** | Analysis | [→](packages/agents/souls/due_diligence.md) | "Critérios de elegibilidade para cessão?" |
| **gestor** | Portfolio | [→](packages/agents/souls/gestor.md) | "Stress test de recebíveis?" |
| **investor_relations** | IR | [→](packages/agents/souls/investor_relations.md) | "Relatório mensal do fundo?" |
| **pricing** | Valuation | [→](packages/agents/souls/pricing.md) | "Subordinação sênior e mezanino?" |
| **regulatory_watch** | Monitoring | [→](packages/agents/souls/regulatory_watch.md) | "Mudanças da CVM 175?" |
| **reporting** | Reports | [→](packages/agents/souls/reporting.md) | "Relatório diário do fundo?" |

Each SOUL is a `.md` file that defines the agent's expertise, constraints, and reasoning profile. Click the → to read them.

---

## Guardrail Pipeline

Every response passes through 6 sequential gates:

```
Query → [Eligibility] → [Concentration] → [Covenant] → [PLD/AML] → [Compliance] → [Risk] → Response
```

The **PLD/AML gate** blocks adversarial queries — including rephrased, indirect, and multilingual bypass attempts. All blocked queries are logged with full audit trail.

---

## Project Stats

| | |
|:--|:--|
| Python source files | 59 |
| Lines of code | 12,170 |
| Test functions | 81 |
| Agent SOULs | 9 |
| Compliance gates | 6 |
| Background daemons | 9 |
| Pre-commit hooks | 10 |
| Regulatory chunks | 7,000+ |

**Stack:** Python 3.11+ · FastAPI · ChromaDB · Gemini Embedding 2 · litellm · BCB SGS · Docker · Helm · GitHub Actions

---

<div align="center">

**[📖 Visual Documentation](https://paganini-docs.vercel.app)** · **[🎮 Live Demo](https://paganini-demo.vercel.app)** · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)

MIT License

</div>
