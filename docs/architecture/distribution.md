# PAGANINI AIOS — Distribution & Install Architecture

> One command. Any terminal. Any OS. Everything configured.

---

## Vision

```bash
curl -fsSL https://paganini.sh | sh    # Install
paganini init --pack fidc              # Configure
paganini up                            # Run
```

30 seconds from zero to a running financial AIOS.
No Docker knowledge. No YAML editing. No dependency hunting.

---

## Install Flow

```
curl -fsSL https://paganini.sh | sh
        │
        ▼
┌─ Installer Script ──────────────────────────┐
│  1. Detect OS (Linux/macOS/Windows/WSL)     │
│  2. Detect arch (x86_64/arm64)              │
│  3. Detect runtime (Docker? Podman? None?)  │
│  4. Download single binary (~15MB)          │
│  5. Add to PATH                             │
│  6. Verify checksum (SHA-256)               │
│  7. Print: "Run: paganini init"             │
└─────────────────────────────────────────────┘

paganini init --pack fidc
        │
        ▼
┌─ Init Wizard ───────────────────────────────┐
│  1. License key? (skip for open source)     │
│  2. LLM provider? (openai/anthropic/google/ │
│     ollama/custom)                          │
│  3. API key? (stored in encrypted vault)    │
│  4. Fund name? (or skip for demo)           │
│  5. Pull container images (if Docker)       │
│     OR download embedded runtime            │
│  6. Pull domain pack (fidc corpus + skills) │
│  7. Generate config.yaml                    │
│  8. Initialize database (embedded SQLite    │
│     or connect to Postgres)                 │
│  9. Index corpus (embeddings)               │
│  10. Start services                         │
│  11. Health check                           │
│  12. Print: "PAGANINI is running.           │
│       Dashboard: http://localhost:8888       │
│       CLI: paganini query 'test'"           │
└─────────────────────────────────────────────┘
```

---

## Distribution Modes

### Mode 1: Single Binary (Default)

```bash
curl -fsSL https://paganini.sh | sh
```

Everything in one binary. Like Moltis. No Docker required.

| Component | How |
|-----------|-----|
| Runtime | Embedded (Moltis compiled in) |
| Database | Embedded SQLite + pgvector extension |
| MetaClaw | Embedded as library, not separate process |
| PinchTab | Optional — downloads Chrome headless on first use |
| Skills | Bundled in binary + downloadable packs |

**Works on:**
- Linux x86_64 / arm64
- macOS x86_64 / arm64 (Apple Silicon)
- Windows x86_64 (native) / WSL2
- Raspberry Pi (arm64)

```
paganini          # 15MB single binary
├── kernel        # RLM engine, router, gate
├── agents        # 9 SOULs loaded at runtime
├── rag           # Retrieval pipeline
├── memory        # 4-layer memory API
├── guardrails    # Rule engine
├── metaclaw      # Learning proxy (embedded)
├── sqlite        # Embedded DB with vector ext
└── server        # HTTP API + dashboard
```

### Mode 2: Docker Compose (Production)

```bash
paganini init --mode docker
paganini up
```

Full container isolation. For production deployments with security requirements.

```
docker compose up -d
├── paganini-kernel       # Orchestrator
├── paganini-agent-*      # One per agent (9 containers)
├── paganini-metaclaw     # Learning proxy
├── paganini-pinchtab     # Browser automation
├── paganini-postgres     # pgvector database
├── paganini-egress       # Allowlist proxy
└── paganini-dashboard    # Web UI
```

### Mode 3: Kubernetes (Enterprise)

```bash
paganini init --mode k8s
paganini deploy --cluster <kubeconfig>
```

Helm chart for enterprise K8s deployments.

```
helm install paganini paganini/paganini-aios \
  --set license.key=$LICENSE_KEY \
  --set provider.type=openai \
  --set provider.apiKey=$OPENAI_API_KEY \
  --set pack=fidc
```

---

## Cross-Platform Strategy

### Binary Build Matrix

| OS | Arch | Format | Notes |
|----|------|--------|-------|
| Linux | x86_64 | ELF binary | Primary target |
| Linux | arm64 | ELF binary | Raspberry Pi, ARM servers |
| macOS | x86_64 | Mach-O binary | Intel Macs |
| macOS | arm64 | Mach-O binary | Apple Silicon |
| Windows | x86_64 | .exe + .msi installer | Native Windows |
| WSL2 | x86_64 | Linux binary | Windows developers |

### Build Pipeline

```
Source (Rust + Python)
    │
    ├── Rust core (Moltis runtime) → cross-compiled per target
    ├── Python agents → bundled via PyInstaller/Nuitka
    ├── SQLite + pgvector → statically linked
    ├── Skills → embedded as data files
    └── Dashboard → pre-built SPA, served by embedded HTTP
    
    │
    ▼
Single binary per platform
    │
    ├── Linux x86_64:  paganini-linux-amd64
    ├── Linux arm64:   paganini-linux-arm64
    ├── macOS x86_64:  paganini-darwin-amd64
    ├── macOS arm64:   paganini-darwin-arm64
    └── Windows:       paganini-windows-amd64.exe
```

---

## Package Managers

```bash
# Homebrew (macOS/Linux)
brew install paganini-aios/tap/paganini

# apt (Debian/Ubuntu)
curl -fsSL https://paganini.sh/gpg | sudo gpg --dearmor -o /usr/share/keyrings/paganini.gpg
echo "deb [signed-by=/usr/share/keyrings/paganini.gpg] https://apt.paganini.sh stable main" | sudo tee /etc/apt/sources.list.d/paganini.list
sudo apt update && sudo apt install paganini

# yum/dnf (RHEL/Fedora)
sudo dnf install https://rpm.paganini.sh/paganini-latest.rpm

# pip (Python package — core only, no Rust runtime)
pip install paganini-aios

# npm (for dashboard/JS integrations)
npm install @paganini/sdk

# Docker
docker pull ghcr.io/paganini-aios/paganini:latest

# Windows
winget install paganini-aios
# or
choco install paganini
```

---

## Domain Pack System

```bash
# Login to registry
paganini login                          # aios.finance credentials

# List available packs
paganini pack list
# ┌──────────────────┬─────────┬──────────┐
# │ Pack             │ Version │ Tier     │
# ├──────────────────┼─────────┼──────────┤
# │ fidc-starter     │ 1.2.0   │ Starter  │
# │ fidc-professional│ 1.2.0   │ Pro      │
# │ fidc-enterprise  │ 1.2.0   │ Enterprise│
# │ cri              │ 0.9.0   │ Beta     │
# │ fii              │ 0.8.0   │ Beta     │
# └──────────────────┴─────────┴──────────┘

# Install pack
paganini pack install fidc-starter
# Downloading corpus... ████████████████ 5.6MB
# Downloading skills... ████████████████ 2.1MB
# Downloading guardrails... ████████████ 340KB
# Indexing corpus... ████████████████████ 164 documents
# Generating embeddings... █████████████ 12,847 chunks
# Installing skills: cvm-query, pdd-calc, covenant-check
# Configuring agents: administrador, custodiante, gestor
# Done. 3 agents active.

# Upgrade
paganini pack upgrade fidc-professional
# Upgrading from Starter to Professional...
# New skills: +6 (compliance, reporting, due-diligence, regulatory-watch, investor-relations, pricing)
# New agents: +6
# New guardrails: +12 rules
# New templates: +5 QMD reports
# Done. 9 agents active.
```

---

## Auto-Update

```bash
# Self-update
paganini update
# Current: v0.3.2
# Latest:  v0.4.0
# Changelog:
#   - New skill: market-data-sync
#   - Improved PDD calculation accuracy
#   - Security patch: CVE-2026-XXXX
# Update? [Y/n] Y
# Downloading... ████████████████████ 15MB
# Replacing binary... done
# Restarting services... done
# Updated to v0.4.0

# Auto-update (background)
paganini config set auto_update true
paganini config set auto_update_channel stable  # stable | beta | nightly
```

---

## `paganini` CLI Reference

```
paganini                           # Status overview
paganini init [--pack NAME]        # First-time setup wizard
paganini up                        # Start all services
paganini down                      # Stop all services
paganini status                    # Health check all components
paganini restart                   # Restart services

paganini query "pergunta"          # Query the system
paganini agents list               # List active agents
paganini agents start <name>       # Start specific agent
paganini agents stop <name>        # Stop specific agent
paganini agents logs <name>        # View agent logs

paganini pack list                 # Available packs
paganini pack install <name>       # Install domain pack
paganini pack upgrade <name>       # Upgrade pack tier
paganini pack remove <name>        # Remove pack

paganini skill list                # Installed skills
paganini skill install <name>      # Install skill
paganini skill create <name>       # Create custom skill
paganini skill test <name>         # Run skill tests

paganini fund add <name>           # Add new fund
paganini fund list                 # List funds
paganini fund switch <name>        # Switch active fund
paganini fund report <type>        # Generate report

paganini eval                      # Run eval suite
paganini eval baseline             # Establish baseline score
paganini eval compare              # Compare with baseline

paganini secrets init              # Initialize encrypted vault
paganini secrets set <key>         # Set secret
paganini secrets list              # List secret keys

paganini config show               # Show current config
paganini config set <key> <value>  # Set config value
paganini config reset              # Reset to defaults

paganini update                    # Self-update
paganini doctor                    # Diagnose issues
paganini logs [--tail N]           # View system logs
paganini export <path>             # Export fund data
paganini backup                    # Full system backup
```

---

## What Happens on `paganini up`

```
$ paganini up

  ┌─ PAGANINI AIOS v0.4.0 ─────────────────┐
  │                                          │
  │  ✓ Config loaded (config.yaml)          │
  │  ✓ Secrets decrypted (vault)            │
  │  ✓ Database connected (SQLite)          │
  │  ✓ Corpus loaded (164 docs, 12K chunks) │
  │  ✓ Skills loaded (12 active)            │
  │  ✓ Guardrails loaded (6 gates)          │
  │  ✓ MetaClaw started (learning proxy)    │
  │  ✓ Agents started:                      │
  │    • administrador    ✓ ready            │
  │    • custodiante      ✓ ready            │
  │    • gestor           ✓ ready            │
  │    • compliance       ✓ ready            │
  │    • reporting        ✓ ready            │
  │    • due_diligence    ✓ ready            │
  │    • regulatory_watch ✓ ready            │
  │    • investor_rel     ✓ ready            │
  │    • pricing          ✓ ready            │
  │  ✓ Daemons started (8 background)       │
  │  ✓ Dashboard: http://localhost:8888      │
  │  ✓ API: http://localhost:8080            │
  │                                          │
  │  PAGANINI is ready.                      │
  │  Try: paganini query "test"              │
  └──────────────────────────────────────────┘
```
