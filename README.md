<div align="center">
<br>
<h1>🎻 Paganini</h1>
<p><strong>AI operating system for Brazilian investment funds.</strong><br>
9 specialized agents · 6 compliance gates · 7,000+ regulatory chunks</p>

<br>

<a href="https://paganini-demo.vercel.app"><img src="docs/screenshot-dashboard.png" alt="Paganini Dashboard" width="720"></a>

<br><br>

<a href="https://paganini-demo.vercel.app">Try the live demo →</a>

<br><br>

[![CI](https://github.com/juboyy/paganini-aios/actions/workflows/ci.yml/badge.svg)](https://github.com/juboyy/paganini-aios/actions/workflows/ci.yml)
[![Security](https://github.com/juboyy/paganini-aios/actions/workflows/security.yml/badge.svg)](https://github.com/juboyy/paganini-aios/actions/workflows/security.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-3776ab.svg)](https://python.org)
[![MIT](https://img.shields.io/badge/license-MIT-22c55e.svg)](LICENSE)

</div>

<br>

---

<br>

### The problem

The Brazilian fund industry manages **R$ 8.9 trillion**. The operational backbone — compliance, regulatory monitoring, due diligence, reporting — is manual, slow, and costs R$ 15–50K per fund per month.

### What Paganini does

Replaces manual fund operations with an autonomous AI system built specifically for Brazilian regulations (CVM 175, IFRS9, COFIs, FIDC rules).

<br>

| | Before | With Paganini |
|:--|:--|:--|
| Fund onboarding | 2–5 days (manual data collection) | **30 seconds** (CVM auto-ingest) |
| Regulatory question | Hours with a lawyer | **< 3 seconds** with source citation |
| Compliance monitoring | Monthly audit | **Continuous** — 6 automated gates |
| Cost per fund | R$ 15–50K/month | **R$ 2–8K/month** |

<br>

---

<br>

### How it works

A query enters the system → the **Cognitive Router** identifies which domain it belongs to → dispatches to one of **9 specialist agents** → the agent retrieves context from **7,000+ regulatory chunks** via Hybrid RAG → the response passes through **6 compliance gates** (including PLD/AML adversarial blocking) → the user gets a cited, guardrailed answer.

```
"Quais as obrigações do custodiante na verificação de lastro?"

  → Router: custodiante (confidence: 96%)
  → RAG: 4 sources from CVM 175, ICVM 356
  → Gates: 6/6 passed
  → Response: 1.2s, 3 citations
```

The PLD/AML gate blocks adversarial queries — even rephrased or multilingual bypass attempts:

```
"Como fracionar transações para evitar o COAF?"

  → 🚫 BLOCKED by pld_aml_guard
```

<br>

---

<br>

### Get running

```bash
git clone https://github.com/juboyy/paganini-aios.git && cd paganini-aios
export GOOGLE_API_KEY=your-key   # Gemini free tier works
bash quickstart.sh               # handles everything
```

The script installs dependencies, creates a venv, indexes the regulatory corpus, generates an API key, and prints the dashboard URL.

```bash
source .venv/bin/activate
python3 packages/dashboard/app.py
# → http://localhost:8000
```

Onboard a fund with just a CNPJ — Paganini pulls everything from CVM public data:

```bash
curl -X POST localhost:8000/api/onboard \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cnpj": "47.388.724/0001-18"}'
```

<br>

---

<br>

### The agents

| | Agent | Does what |
|:--|:--|:--|
| 📋 | **administrador** | Fund governance, market indicators, operational oversight |
| ⚖️ | **compliance** | Concentration limits, CVM rules, regulatory adherence |
| 🔐 | **custodiante** | Collateral verification, asset segregation, custody obligations |
| 🔍 | **due_diligence** | Receivable eligibility, cedente evaluation, risk assessment |
| 📊 | **gestor** | Stress testing, portfolio allocation, covenant monitoring |
| 👥 | **investor_relations** | Investor reports, quota tracking, communications |
| 💲 | **pricing** | Mark-to-market, subordination analysis, quota pricing |
| 📡 | **regulatory_watch** | CVM resolutions, regulation changes, impact analysis |
| 📄 | **reporting** | Daily/monthly reports, fund position, alert compilation |

Each agent has a **SOUL** — a domain prompt that defines expertise, constraints, and reasoning profile. Not a generic LLM wrapper.

<br>

---

<br>

### Stack

Python 3.11+ · FastAPI · ChromaDB + Gemini Embedding · litellm (model-agnostic) · BCB SGS live data · Docker · Helm · GitHub Actions

59 source files · 12K LOC · 81 tests · 9 daemons · 10 pre-commit hooks

<br>

---

<div align="center">
<br>
<a href="https://paganini-demo.vercel.app">Live Demo</a> · <a href="SECURITY.md">Security</a> · <a href="CONTRIBUTING.md">Contributing</a> · <a href="LICENSE">MIT License</a>
<br><br>
</div>
