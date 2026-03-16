<div align="center">

<br>

<h1>🎻 Paganini</h1>

<p><strong>AI operating system for Brazilian investment funds.</strong><br>
9 specialized agents · 6 compliance gates · 7,000+ regulatory chunks</p>

<br>

<a href="https://paganini-demo.vercel.app"><img src="docs/screenshot-dashboard.png" alt="Paganini Dashboard" width="720"></a>

<br><br>

<a href="https://paganini-docs.vercel.app"><strong>📖 Full Documentation →</strong></a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="https://paganini-demo.vercel.app">Live Demo →</a>

<br><br>

[![CI](https://github.com/juboyy/paganini-aios/actions/workflows/ci.yml/badge.svg)](https://github.com/juboyy/paganini-aios/actions/workflows/ci.yml)
[![Security](https://github.com/juboyy/paganini-aios/actions/workflows/security.yml/badge.svg)](https://github.com/juboyy/paganini-aios/actions/workflows/security.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-3776ab.svg)](https://python.org)
[![MIT](https://img.shields.io/badge/license-MIT-22c55e.svg)](LICENSE)

</div>

<br>

---

### What

Paganini replaces manual fund operations (compliance, regulatory monitoring, due diligence, reporting) with 9 AI agents purpose-built for Brazilian regulations. Not a chatbot — a domain-specific operating system with guardrails, audit trails, and real-time market data.

### Why

Brazil's R$ 8.9T fund industry still runs on manual processes. Onboarding a fund takes days, regulatory queries take hours, compliance is monthly. Paganini does it in seconds, continuously, at a fraction of the cost.

| | Manual | Paganini |
|:--|:--|:--|
| Fund onboarding | 2–5 days | **30 seconds** |
| Regulatory query | Hours (lawyer) | **< 3 seconds** |
| Compliance | Monthly audit | **Continuous** |
| Cost per fund | R$ 15–50K/mo | **R$ 2–8K/mo** |

### Quick Start

```bash
git clone https://github.com/juboyy/paganini-aios.git && cd paganini-aios
export GOOGLE_API_KEY=your-key
bash quickstart.sh
source .venv/bin/activate
python3 packages/dashboard/app.py   # → http://localhost:8000
```

### Documentation

**[paganini-docs.vercel.app](https://paganini-docs.vercel.app)** — visual documentation with screenshots of every panel, architecture details, agent descriptions, guardrail pipeline, API reference, and installation guide.

---

<div align="center">

**[Documentation](https://paganini-docs.vercel.app)** · **[Live Demo](https://paganini-demo.vercel.app)** · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md) · [MIT License](LICENSE)

<br>

<sub>59 source files · 12,170 LOC · 81 tests · 9 agent SOULs · 6 compliance gates · 9 daemons</sub>

</div>
