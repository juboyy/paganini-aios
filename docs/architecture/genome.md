# PAGANINI Genome — Skills, Patterns & Integration Blueprints

> The genetic code of PAGANINI AIOS. Every skill, pattern, and blueprint listed
> here has been battle-tested in a production AIOS running 24/7 since February 2026.
> No theory. No prototypes. Proven systems, extracted as reusable modules.

---

## What This Is (And What It Isn't)

This is NOT a copy of another system's data, configs, or context.
This IS a catalog of **patterns, skills, and integration blueprints** — extracted,
generalized, and packaged as configurable modules for any domain.

The client installs the pattern. Configures it for their domain. Runs it.

---

## Skills (Executable Patterns)

### 1. Pre-Execution Gate

**What it does:** Before any operation executes, the system validates that context
was consulted, classifies the operation tier, and generates a gate token that
proves due diligence in the audit trail.

**Production proof:** 200+ hours in production. 12 violations caught and corrected
by self-audit. Gate tokens traced in every commit and operation.

**In PAGANINI:** Every financial operation (cession, PDD calculation, covenant check,
regulatory filing) passes through the gate. Token in the audit trail proves to CVM
that context was checked before the decision.

```yaml
# Client configures tiers for their domain
gate:
  tiers:
    consulta:    { max_minutes: 5,  pipeline: [context, execute, log] }
    operação:    { max_minutes: 30, pipeline: [context, spec, execute, qa, knowledge] }
    relatório:   { max_minutes: 60, pipeline: [context, spec, execute, qa, review, knowledge] }
    regulatório: { max_minutes: 0,  pipeline: all_18_stages }
```

### 2. Quality Gate (Sense)

**What it does:** Every output is evaluated against a configurable quality profile
before delivery. Subpar output is rejected and regenerated.

**Production proof:** 50+ hours. Catches generic language, missing specificity,
format violations, and tone mismatches.

**In PAGANINI:** Reports, responses to cotistas, regulatory filings — all pass
through Sense before leaving the system. Quality profile configured per client:
accuracy thresholds, regulatory compliance checks, formatting standards.

```yaml
# Client defines their quality criteria
sense:
  criteria:
    accuracy: { weight: 0.4, min_score: 0.9 }
    regulatory_compliance: { weight: 0.3, min_score: 0.95 }
    completeness: { weight: 0.2, min_score: 0.8 }
    clarity: { weight: 0.1, min_score: 0.7 }
  reject_below: 0.8
  auto_retry: 2
```

### 3. Memory Reflection

**What it does:** Daily daemon that reviews episodic memory (what happened today),
extracts significant patterns, and promotes them to semantic memory (permanent
knowledge). Not append-only — curated.

**Production proof:** Runs daily. Knowledge compounds over time. Agent in session
100 is measurably better than session 1 because it has accumulated wisdom.

**In PAGANINI:** Fund operations, market events, regulatory changes, client
interactions — daily reflection extracts patterns. "Every time IPCA rises >0.5%,
fund Alpha's PDD increases 12%" becomes permanent knowledge.

### 4. Self-Audit

**What it does:** System periodically checks its own behavior against its rules.
Detects violations, logs them, triggers correction. Self-policing.

**Production proof:** Caught 12 violations across 4 sessions autonomously.
Zero human intervention required for detection.

**In PAGANINI:** Compliance self-check. Did the guardrail pipeline run for every
operation? Were four-eyes required for operations above threshold? Are Chinese
walls intact? Is the audit trail complete?

### 5. Proactive Heartbeat

**What it does:** System doesn't wait to be asked. Periodic checks run on
configurable schedule. Detects issues before humans notice.

**Production proof:** 400+ hours of continuous monitoring. Catches provider
degradation, data anomalies, pending tasks.

**In PAGANINI:** Covenant approaching breach threshold? Alert before it breaks.
New CVM regulation published? Impact assessment before anyone asks. Cedente
credit score dropped? Flag for review before next acquisition.

```yaml
# Client configures what to monitor
heartbeat:
  checks:
    covenants:    { interval: 15m, alert_threshold: 0.9 }
    regulations:  { interval: 24h }
    risk_events:  { interval: 6h }
    reconciliation: { interval: 1h, target_match: 0.9999 }
    market_data:  { interval: 30m }
```

---

## Patterns (Architectural Building Blocks)

### 6. SOUL (Agent Identity)

**What it is:** Agent identity as a first-class architectural concept. Not a
system prompt — a complete definition of who the agent is, what it can do,
what it refuses to do, and how it communicates.

**Structure:**
```
soul:
  identity: who am I
  beliefs: what I stand for
  directives: how I operate
  constraints: what I refuse to do
  tools: what I can access
  memory_scope: what I can see
  tone: how I communicate
```

**In PAGANINI:** 9 financial agents, each with distinct SOUL. Administrador
is formal and compliance-focused. Gestor is analytical and risk-aware.
IR is warm and accessible. Same framework, different personalities.

### 7. BMAD-CE Pipeline

**What it is:** 18-stage methodology for task execution. Every task is classified
by tier, flows through appropriate stages, produces artifacts at each stage,
and persists knowledge at the end.

**Key principle:** No raw execution. Every stage has an owner. Every stage produces
an artifact. Knowledge loops back.

**In PAGANINI:** Financial operations classified as consulta/operação/relatório/regulatório.
Each flows through the appropriate pipeline. Every operation produces an auditable
artifact trail.

### 8. Cognitive Router

**What it is:** Meta-cognition layer. Before executing, the system classifies the
query, estimates complexity, chooses the right model, decides which agent(s) to
dispatch, and estimates confidence.

**In PAGANINI:** "What's the current NAV?" → fast query, single agent, cheap model.
"Should we acquire this R$50M portfolio?" → complex analysis, multiple agents
(Gestor + Compliance + Pricing), frontier model, four-eyes approval.

### 9. Capabilities Graph

**What it is:** All agent capabilities indexed with semantic embeddings. Agents
discover tools by describing what they need, not by hardcoded lists.

**In PAGANINI:** Agent needs "calculate provision for doubtful debts" → graph
returns `pdd_calculator` tool + `ifrs9_model` + `historical_loss_data`.
No hardcoding. New capabilities auto-discoverable.

### 10. Violations Tracking

**What it is:** Every rule violation is logged, timestamped, and attributed.
Not punitive — corrective. The system learns from its mistakes.

**In PAGANINI:** Compliance violation log. Immutable. Exportable for auditors.
"On 2026-03-15 at 14:23, agent Gestor attempted operation without guardrail
pipeline. Blocked. Auto-corrected. Gate token generated retroactively."

---

## Integration Blueprints

### 11. Composio SDK Pattern

**What it is:** Standardized way to connect external services via OAuth2 with
pre-built action libraries. 14 integrations battle-tested.

**In PAGANINI:** Client connects their Slack, GitHub, email. Same SDK pattern.
No custom OAuth flows. Pre-built actions for common operations.

### 12. PinchTab (Browser Automation)

**What it is:** Headless Chrome automation via accessibility tree (~800 tokens/page).
Token-efficient alternative to screenshot-based approaches.

**In PAGANINI:** Regulatory watch scrapes CVM/ANBIMA/BACEN portals. Due diligence
extracts judicial records. Market data from sources without API. Screenshots as
regulatory evidence.

### 13. GitNexus (Code Intelligence)

**What it is:** Codebase indexing with structural + semantic search. Impact analysis,
blast radius estimation, context assembly.

**In PAGANINI:** PAGANINI's own codebase indexed. Impact analysis before any code
change. "If I modify the PDD calculator, what breaks?" → GitNexus answers.

### 14. OTel Pipeline (Observability)

**What it is:** OpenTelemetry traces, metrics, and logs. Every agent action traced.
Every decision timestamped. Every cost recorded.

**In PAGANINI:** Regulatory-grade audit trail. Every LLM call traced. Every agent
decision logged. CVM auditor can reconstruct the entire decision chain for any
operation from traces alone.

### 15. QMD (Quarto Reporting)

**What it is:** Parameterized document generation. Markdown templates + data =
professional PDF/HTML/DOCX reports. Reproducible, version-controlled.

**In PAGANINI:** Informe mensal, CADOC 3040, ICVM 489, COFIs, due diligence
reports. Same template, different fund data. Every report re-renderable from
source. Digital signatures via ICP-Brasil.

---

## The Genome in Numbers

| Metric | Value |
|--------|-------|
| Patterns battle-tested in production | 10 |
| Integration blueprints proven | 5 |
| Combined production hours | 500+ |
| Self-audit violations caught autonomously | 12 |
| Scripts with direct transfer potential | 9 |
| Time to adapt patterns for new domain | ~2 weeks |
| Time to build domain-specific components | ~11 weeks |
| Development acceleration vs greenfield | 60% |

---

## What The Client Gets

When a client deploys PAGANINI AIOS, they get 15 production-proven patterns
pre-configured for financial markets. They don't need to invent how to do
quality gates, memory promotion, self-audit, or proactive monitoring.
Those patterns exist. They work. They've been running for months.

The client configures:
- Which agents to activate
- Quality criteria for their fund
- Heartbeat check intervals
- Gate tier thresholds
- Guardrail rules for their fund type

The patterns handle the rest.

---

## Transferable Skills (OpenClaw Ecosystem)

These are concrete, executable skill modules from the OpenClaw ecosystem.
Not abstractions — actual SKILL.md-driven modules that agents load and use.

### Core Infrastructure Skills

| Skill | What It Does | PAGANINI Use |
|-------|-------------|--------------|
| **skill-creator** | Create and package new agent skills with SKILL.md, scripts, references | Clients and integrators create domain-specific skills for their fund type |
| **skill-detector** | Auto-detect patterns in agent behavior and draft new skills | PAGANINI auto-generates skills from recurring financial operations |
| **coding-agent** | Delegate coding tasks to background agents (Codex, Claude Code) | Build custom integrations, reports, connectors on demand |
| **tmux** | Remote-control persistent terminal sessions for interactive CLIs | Daemon management, persistent process control, background operations |
| **session-logs** | Search and analyze session history with jq | Audit trail analysis, compliance review, decision reconstruction |

### Communication & Channel Skills

| Skill | What It Does | PAGANINI Use |
|-------|-------------|--------------|
| **slack** | Full Slack control (messages, reactions, pins, channels) | IR bot: per-fund channels, cotista DMs, operations alerts, daily digests |
| **discord** | Discord ops via message tool | Alternative comms channel for tech-forward clients |
| **himalaya** | CLI email management via IMAP/SMTP | Regulatory filing notifications, cotista email reports, alert escalation |
| **voice-call** | Voice calls via OpenClaw plugin | Emergency escalation, verbal approvals for high-risk operations |

### Content & Document Skills

| Skill | What It Does | PAGANINI Use |
|-------|-------------|--------------|
| **nano-pdf** | Edit PDFs with natural language instructions | Regulatory filing amendments, report corrections, document assembly |
| **summarize** | Extract text/transcripts from URLs, podcasts, files | Summarize long regulatory documents, earnings calls, market reports |
| **humanizer** | Remove AI writing patterns from text | Client-facing reports sound human, not AI-generated |
| **frontend-design** | Production-grade frontend interfaces | Dashboard components, fund visualizations, cotista portal |
| **visual-explainer** | Self-contained HTML visual explanations | Architecture diagrams, fund structure visualizations, risk heatmaps |
| **ui-ux-design** | Modern UI/UX patterns, Tailwind, Shadcn, accessibility | Dashboard design, cotista portal UX, mobile-responsive layouts |

### Automation & Intelligence Skills

| Skill | What It Does | PAGANINI Use |
|-------|-------------|--------------|
| **pinchtab** | Headless Chrome automation (800 tokens/page) | Regulatory scraping (CVM/ANBIMA/BACEN), DD judicial search, market data |
| **github** | GitHub operations via gh CLI (issues, PRs, CI) | CI/CD pipeline, automated testing, version control of configs |
| **gemini** | Gemini CLI for one-shot Q&A, generation | Fast query engine for simple fund queries, classification tasks |
| **openai-whisper-api** | Audio transcription via Whisper | Transcribe cotista calls, committee meetings, verbal approvals |
| **openai-image-gen** | Image generation via OpenAI API | Report charts, fund marketing materials, visual summaries |

### Monitoring & Ops Skills

| Skill | What It Does | PAGANINI Use |
|-------|-------------|--------------|
| **healthcheck** | Security hardening, risk-tolerance config | System security audit, infrastructure health, deployment validation |
| **weather** | Current weather and forecasts | (indirect) Agricultural FIDC: weather impacts on crop-backed receivables |
| **blogwatcher** | Monitor RSS/Atom feeds for updates | Monitor regulatory blogs, financial news feeds, CVM publications |
| **demo-recorder** | Record browser sessions as video demos | Record compliance demos, audit walkthroughs, client onboarding |

### Data & Research Skills

| Skill | What It Does | PAGANINI Use |
|-------|-------------|--------------|
| **canvas** | Display HTML on connected devices/nodes | Real-time fund dashboards on office monitors, cotista kiosks |
| **video-frames** | Extract frames from videos via ffmpeg | Extract data from video-based market reports, conference recordings |
| **goplaces** | Google Places API queries | DD: verify cedente physical addresses, branch locations |
| **xurl** | Authenticated X (Twitter) API access | Monitor fintwit for market sentiment, fund manager commentary |

### Meta Skills (The Skill System Itself)

| Skill | What It Does | PAGANINI Use |
|-------|-------------|--------------|
| **cli-anything** | Auto-generates production CLIs from any software — makes it agent-native | Any financial system (registradora, CETIP, B3) becomes agent-controllable via CLI. No API wrappers needed. |
| **mcporter** | List, configure, auth, and call MCP servers/tools | Connect PAGANINI to any MCP-compatible tool (Linear, Supabase, custom) |
| **oracle** | Prompt bundling, engine management, sessions | Advanced prompt engineering for complex financial analyses |
| **clawhub** | Search, install, update, publish skills from marketplace | PAGANINI skill marketplace: domain packs installable via CLI |

---

### New Domain Skills (Built for PAGANINI)

These don't exist yet. They're built specifically for the FIDC domain:

| Skill | What It Does | Agent Owner |
|-------|-------------|-------------|
| **cvm-query** | Query CVM 175 articles, interpret regulations | Compliance, Administrador |
| **pdd-calc** | PDD calculation per IFRS9 models | Pricing, Gestor |
| **covenant-check** | Evaluate covenant compliance, predict breaches | Administrador |
| **cadoc-gen** | Generate CADOC 3040 regulatory filings | Reporting |
| **cedente-dd** | Full due diligence pipeline for originators | Due Diligence |
| **cota-pricing** | Mark-to-market valuation, deságio calculation | Pricing |
| **reconciliation** | Payment matching, duplicate detection | Custodiante |
| **pld-aml** | Anti-money laundering screening, COAF reporting | Compliance |
| **regulatory-scan** | CVM/ANBIMA/BACEN publication monitoring | Regulatory Watch |
| **fund-report** | QMD-based regulatory report generation | Reporting |
| **risk-score** | Cedente/sacado risk scoring composite | Gestor, Due Diligence |
| **market-data** | CDI, Selic, IPCA, yield curve ingestion | Pricing |

---

## Skill Architecture

Skills in PAGANINI follow the OpenClaw skill format:

```
skills/
├── cvm-query/
│   ├── SKILL.md          # Description, triggers, constraints
│   ├── query.py          # Implementation
│   ├── cvm175.json       # Reference data (57 articles)
│   └── tests/
│       └── test_query.py
├── pdd-calc/
│   ├── SKILL.md
│   ├── calculator.py
│   ├── ifrs9_models.py
│   └── tests/
└── ...
```

Each skill is:
- **Self-contained** — SKILL.md + implementation + reference data + tests
- **Discoverable** — registered in capabilities graph with semantic embedding
- **Installable** — `paganini install skill cvm-query` or `clawhub install paganini/cvm-query`
- **Testable** — each skill has its own test suite
- **Versionable** — semantic versioning, changelog

### Skill Marketplace

```bash
# Install from PAGANINI marketplace (aios.finance)
paganini install fidc-starter     # 3 core skills (cvm-query, pdd-calc, covenant-check)
paganini install fidc-professional # 9 skills (full regulatory + DD + reporting)
paganini install fidc-enterprise   # All 12 + custom skill development

# Install individual skills
paganini install skill cvm-query
paganini install skill cedente-dd

# Create custom skill
paganini skill create meu-skill-customizado

# Publish to marketplace (for integrators)
paganini skill publish meu-skill --marketplace aios.finance
```
