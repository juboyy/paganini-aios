# PAGANINI AIOS — Full Orchestration Architecture
# Runtime: Moltis (Rust-native AI gateway)
# Pattern: Mirror of OraCLI/OpenClaw architecture, productized for finance

## 1. Runtime: Moltis (replaces OpenClaw)

### Why Moltis
- Single Rust binary (44MB) — no Node.js, no npm
- Sandboxed execution (Docker + Apple Container per session)
- Built-in: voice, memory, scheduling, channels, browser, MCP
- SQLite + FTS + vector for local memory
- Zero unsafe code, auditable (5K LoC core agent loop)
- OTel tracing + Prometheus metrics built-in
- Encryption-at-rest vault (XChaCha20-Poly1305)
- OpenClaw import tool included (moltis-openclaw-import)

### Moltis Setup (EC2/dedicated instance)
```bash
# Install
curl -fsSL https://www.moltis.org/install.sh | sh

# Or Docker
docker run -d \
  --name paganini \
  -p 13131:13131 \
  -v paganini-config:/home/moltis/.config/moltis \
  -v paganini-data:/home/moltis/.moltis \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e MOLTIS_PASSWORD="$MOLTIS_PASSWORD" \
  -e MOLTIS_PROVIDER="openai" \
  -e MOLTIS_API_KEY="$CLIENT_API_KEY" \
  ghcr.io/moltis-org/moltis:latest
```

---

## 2. Layer Map: OraCLI → PAGANINI

### 2.1 Orchestration (Brain)

| OraCLI | PAGANINI (Moltis) | Notes |
|--------|-------------------|-------|
| OraCLI main session | Kernel agent (program.md) | RLM engine, cognitive router |
| SOUL.md | packages/kernel/program.md | System prompt + RLM scaffolding |
| AGENTS.md | config.yaml → agents section | Agent registry + routing rules |
| IDENTITY.md | Per-fund identity config | Fund-specific personality |
| USER.md | Client profile | Client preferences, timezone, etc. |
| Cognitive Router | moltis-routing + custom router | Query classification → agent dispatch |
| Subagent spawn | Moltis sub-agent delegation | Built-in parallel tool execution |

### 2.2 Tools & Integrations

| OraCLI Tool | PAGANINI Equivalent | Moltis Feature |
|-------------|---------------------|----------------|
| exec (shell) | Sandbox execution | moltis-tools (Docker sandboxed) |
| browser/PinchTab | Browser automation | moltis-browser (built-in) |
| web_search | Market/regulatory search | Via MCP or direct integration |
| web_fetch | Document fetcher | Built-in HTTP tools |
| Composio (14 integrations) | MCP servers | moltis-mcp (stdio + HTTP/SSE) |
| Slack bot | Slack channel | moltis-channels or direct Slack API |
| Telegram | Telegram channel | moltis-telegram (built-in) |
| Discord | Discord channel | moltis-discord (built-in) |
| GitNexus | Code intelligence | MCP server for codebase analysis |
| Codex CLI | Code execution | Moltis sandbox + LLM |
| tts/voice | Voice I/O | moltis-voice (15+ providers built-in) |

### 2.3 Complexity & Cost Management

| OraCLI Pattern | PAGANINI Implementation |
|----------------|------------------------|
| Model routing (opus for thinking, sonnet for execution) | Moltis multi-provider: reasoning model for RLM main, fast model for sub-LLMs |
| BYOK via openclaw.json env vars | Moltis provider config (MOLTIS_API_KEY per provider) |
| Cost tracking (roi-calculator.py) | moltis-metrics (Prometheus) + custom cost tracker |
| Token counting per session | Moltis built-in token tracking per session |
| Sense quality gate (sense.py) | Guardrail pipeline (pre-response quality check) |
| Gate.py pre-execution | Guardrail pipeline (pre-operation eligibility) |
| Provider fallback chain | Moltis provider registry (automatic failover) |
| Rate limit handling | Moltis built-in rate limiting per provider |

**Cost Routing Strategy:**
```yaml
routing:
  # Cheap model for simple queries (glossary, status, lookups)
  simple:
    provider: google
    model: gemini-2.5-flash
    max_tokens: 2000

  # Mid-range for synthesis and analysis
  standard:
    provider: openai
    model: gpt-4o
    max_tokens: 4000

  # Expensive model for complex reasoning (structuring, risk analysis, RLM main)
  reasoning:
    provider: anthropic
    model: claude-opus-4-20250514
    max_tokens: 8000

  # Classification model (cheap, fast, determines route)
  classifier:
    provider: google
    model: gemini-2.5-flash
    max_tokens: 100
```

### 2.4 Task Management

| OraCLI Pattern | PAGANINI Implementation |
|----------------|------------------------|
| BMAD-CE 18-stage pipeline | Simplified financial pipeline (Ingest → Validate → Execute → Report → Learn) |
| Linear (production gate) | Approval workflow per fund (admin signs off) |
| Jira (requirements) | Client request queue (Slack or API) |
| Gate tokens | Operation tokens (each op gets a trace ID) |
| Subagent delegation | Agent dispatch (router → specialist agent) |
| Task chunking (3-5 max) | Operation batching (max 5 assets per DD batch) |
| Stage ownership | Agent ownership (each agent owns its stage) |

**Financial Pipeline:**
```
REQUEST → CLASSIFY → ROUTE → VALIDATE → EXECUTE → TRACE → LEARN

1. REQUEST: Client query or operation via Slack/API/CLI
2. CLASSIFY: Cognitive router determines type + complexity + cost tier
3. ROUTE: Dispatch to appropriate agent(s)
4. VALIDATE: Guardrail pipeline (eligibility → concentration → covenant → compliance)
5. EXECUTE: Agent processes using RLM loop (REPL → sub-LLMs → synthesis)
6. TRACE: Full audit trail logged (inputs, reasoning, decision, cost)
7. LEARN: Memory reflection extracts patterns for future operations
```

### 2.5 Memory Architecture

| OraCLI Layer | PAGANINI Layer | Storage |
|-------------|----------------|---------|
| MEMORY.md (long-term) | Fund knowledge base | Moltis SQLite + vector |
| memory/YYYY-MM-DD.md (daily) | Operation history | Filesystem JSONL + SQLite |
| pgvector (semantic) | Corpus embeddings | Moltis vector memory + pgvector |
| Mem0 (Qdrant) | Optional enhanced memory | Qdrant or Moltis built-in |
| GitNexus (relational) | Knowledge graph | pgvector kg_nodes + kg_edges |
| SOUL.md (procedural) | Fund regulamento + SOULs | Filesystem (auditable) |

**Moltis Memory Config:**
```yaml
# moltis.yaml
memory:
  backend: sqlite          # Built-in, local-first
  vector:
    enabled: true
    model: text-embedding-3-large
    dims: 3072
  fts:
    enabled: true
    language: portuguese
  retention:
    sessions: 365d
    embeddings: forever
```

### 2.6 ROI & Observability

| OraCLI Tool | PAGANINI Equivalent |
|-------------|---------------------|
| roi-calculator.py | Cost dashboard (per-fund, per-agent, per-operation) |
| data-integrity-sync.py | Data validation daemon |
| provider-monitor.py | Moltis metrics (Prometheus built-in) |
| realtime_sync.py | Moltis OTel traces → dashboard |
| standup-reporter.py | Daily fund summary → Slack |
| OTel (diagnostics-otel) | Moltis built-in OTel tracing |

**Observability Stack:**
```
Moltis (OTel traces) → Prometheus/Grafana → Dashboard
                     → JSONL traces → Audit trail
                     → Custom metrics → ROI calculator
```

**Key Metrics:**
- Cost per query (by model, by agent, by fund)
- Latency per operation
- Guardrail hit rate (blocked vs approved)
- Knowledge graph growth rate
- Retrieval quality (precision, recall from eval)
- Human hours saved (operations automated vs manual baseline)
- Covenant proximity (distance to breach, trending)

### 2.7 Onboarding Pipeline

**Client onboarding flow:**
```
1. SETUP (Day 1)
   ├── Install Moltis on client infra or provision managed instance
   ├── Configure BYOK provider keys
   ├── Connect Slack workspace
   └── Set admin credentials

2. FUND CONFIGURATION (Day 2-3)
   ├── Upload fund regulamento (markdown/PDF)
   ├── Define covenants + thresholds
   ├── Configure eligibility criteria
   ├── Set concentration limits
   ├── Map cotista list
   └── System generates: fund state, SOULs, guardrails

3. CORPUS INGESTION (Day 3-5)
   ├── paganini ingest data/corpus/fidc/     # Base FIDC knowledge
   ├── paganini ingest client/regulamentos/   # Client-specific docs
   ├── Pipeline: parse → chunk → extract → embed → graph
   └── AutoResearch runs first optimization pass

4. AGENT ACTIVATION (Day 5-7)
   ├── Enable agents per fund
   ├── Test queries (sanity check)
   ├── Run eval suite
   ├── Configure Slack channels
   └── Go live

5. ONGOING
   ├── Daemons start (covenant monitor, regulatory watch, etc.)
   ├── Memory reflection runs daily
   ├── AutoResearch continues optimizing
   └── Quarterly review with client
```

**CLI Onboarding:**
```bash
paganini setup                              # Initial configuration wizard
paganini fund create --name "FIDC Alpha"    # Create fund
paganini fund configure --id alpha          # Interactive configuration
paganini ingest data/corpus/fidc/           # Ingest base corpus
paganini ingest client/docs/                # Ingest client docs
paganini agents start --fund alpha          # Start agents
paganini eval --fund alpha                  # Run eval
paganini daemons start                      # Start background processes
```

---

## 3. tmux: Persistent Process Management

### Why tmux
- Processes survive SSH disconnects
- Visual monitoring via war room
- Multiple daemons in named windows
- Session recovery after restarts
- Human-inspectable at any time

### tmux Session Layout
```
tmux session: paganini
├── 0:kernel     ← Main Moltis process
├── 1:daemons    ← Daemon manager (covenant, pdd, recon, market, risk)
├── 2:watch      ← Regulatory watch agent
├── 3:slack      ← Slack IR bot
├── 4:metrics    ← Prometheus + OTel collector
├── 5:logs       ← tail -f on all trace files
└── 6:work       ← Manual work / debugging
```

### tmux Startup Script
```bash
#!/bin/bash
# paganini-tmux.sh — Start all PAGANINI AIOS processes

SESSION="paganini"
PAGANINI_DIR="/opt/paganini-aios"

tmux new-session -d -s $SESSION -n kernel
tmux send-keys -t $SESSION:kernel "cd $PAGANINI_DIR && moltis" Enter

tmux new-window -t $SESSION -n daemons
tmux send-keys -t $SESSION:daemons "cd $PAGANINI_DIR && paganini daemons start --all" Enter

tmux new-window -t $SESSION -n watch
tmux send-keys -t $SESSION:watch "cd $PAGANINI_DIR && paganini agents start regulatory-watch" Enter

tmux new-window -t $SESSION -n slack
tmux send-keys -t $SESSION:slack "cd $PAGANINI_DIR && paganini agents start investor-relations" Enter

tmux new-window -t $SESSION -n metrics
tmux send-keys -t $SESSION:metrics "cd $PAGANINI_DIR && paganini metrics serve" Enter

tmux new-window -t $SESSION -n logs
tmux send-keys -t $SESSION:logs "cd $PAGANINI_DIR && tail -f runtime/traces/*.jsonl" Enter

tmux new-window -t $SESSION -n work
tmux send-keys -t $SESSION:work "cd $PAGANINI_DIR" Enter

echo "✅ PAGANINI AIOS tmux session started. Attach: tmux attach -t paganini"
```

### systemd Timer (auto-restart)
```ini
# /etc/systemd/system/paganini-tmux.service
[Unit]
Description=PAGANINI AIOS tmux session
After=docker.service

[Service]
Type=oneshot
User=paganini
ExecStart=/opt/paganini-aios/infra/paganini-tmux.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target

# /etc/systemd/system/paganini-tmux.timer
[Unit]
Description=Ensure PAGANINI tmux session is running

[Timer]
OnBootSec=60
OnUnitActiveSec=5min
Persistent=true

[Install]
WantedBy=timers.target
```

---

## 4. Deployment Architecture

### Single Instance (MVP)
```
EC2 / VPS / Bare Metal
├── Moltis (single binary, port 13131)
├── pgvector (Docker, port 5432)
├── tmux session "paganini" (7 windows)
├── Corpus at /opt/paganini-aios/data/corpus/
├── State at /opt/paganini-aios/runtime/state/
└── Traces at /opt/paganini-aios/runtime/traces/
```

### Managed Multi-Tenant (Scale)
```
Load Balancer
├── Moltis Instance 1 (Fund Group A)
├── Moltis Instance 2 (Fund Group B)
├── Shared pgvector cluster
├── Shared Prometheus/Grafana
└── Central management dashboard
```

### On-Prem (Enterprise)
```
Client Data Center
├── Moltis (Docker or bare metal)
├── pgvector (Docker)
├── Client's Slack workspace
├── Client's API keys (never leave premises)
└── We provide: updates via git pull, remote support via Tailscale
```
