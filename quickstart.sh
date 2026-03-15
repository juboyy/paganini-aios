#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
#  PAGANINI AIOS — Quick Start (Zero to Running)
#  Tested on: Ubuntu 22.04/24.04, macOS 14+
#  Requires: Python 3.11+, git
# ═══════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
GOLD='\033[0;33m'
NC='\033[0m'

info()  { echo -e "${CYAN}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; exit 1; }

echo ""
echo -e "${GOLD}  ╔══════════════════════════════════════════╗${NC}"
echo -e "${GOLD}  ║  🎻 PAGANINI AIOS — Quick Start          ║${NC}"
echo -e "${GOLD}  ║  AI Operating System for FIDC Funds       ║${NC}"
echo -e "${GOLD}  ╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Check Python ──
PYTHON=""
for p in python3.12 python3.11 python3; do
    if command -v "$p" &>/dev/null; then
        ver=$("$p" --version 2>&1 | grep -oP '\d+\.\d+')
        major=$(echo "$ver" | cut -d. -f1)
        minor=$(echo "$ver" | cut -d. -f2)
        if [ "$major" -ge 3 ] && [ "$minor" -ge 11 ]; then
            PYTHON="$p"
            break
        fi
    fi
done

[ -z "$PYTHON" ] && fail "Python 3.11+ required. Install: sudo apt install python3.12 python3.12-venv"
ok "Python: $($PYTHON --version)"

# ── Check git ──
command -v git &>/dev/null || fail "git required. Install: sudo apt install git"
ok "git: $(git --version | head -1)"

# ── Clone ──
INSTALL_DIR="${1:-paganini-aios}"
if [ -d "$INSTALL_DIR/.git" ]; then
    info "Repository exists at $INSTALL_DIR, pulling latest..."
    cd "$INSTALL_DIR" && git pull && cd ..
else
    info "Cloning repository..."
    git clone https://github.com/juboyy/paganini-aios.git "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"
ok "Repository: $(pwd) ($(git rev-parse --short HEAD))"

# ── Virtual environment ──
if [ ! -d ".venv" ]; then
    info "Creating virtual environment..."
    $PYTHON -m venv .venv
fi
source .venv/bin/activate
ok "Virtual env: $(.venv/bin/python --version)"

# ── Install dependencies ──
info "Installing dependencies..."
pip install --upgrade pip -q
pip install -e ".[dev]" -q 2>&1 | tail -1
ok "Dependencies installed"

# ── Create runtime dirs ──
mkdir -p runtime/{data,logs,state,traces}
mkdir -p runtime/logs/{daemons,guardrails}
mkdir -p runtime/data/{market,reflections,cedente_monitor}
ok "Runtime directories created"

# ── Ingest corpus (if exists) ──
if [ -d "data/corpus" ] && [ "$(ls data/corpus/ 2>/dev/null | wc -l)" -gt 0 ]; then
    info "Indexing corpus..."
    python3 -c "
from packages.kernel.rag import RAGPipeline
from packages.kernel.engine import load_config
config = load_config()
rag = RAGPipeline(config)
count = rag.collection.count()
print(f'  ChromaDB: {count} chunks indexed')
if count == 0:
    rag.ingest('data/corpus/')
    print(f'  Indexed: {rag.collection.count()} chunks')
"
    ok "Corpus indexed"
else
    info "No corpus found at data/corpus/ — skip indexing"
    info "  Add regulatory PDFs later: paganini ingest data/corpus/"
fi

# ── Run tests ──
info "Running tests..."
TEST_OUTPUT=$(python3 -m pytest tests/ -x -q --tb=no 2>&1 | tail -1)
if echo "$TEST_OUTPUT" | grep -q "passed"; then
    ok "Tests: $TEST_OUTPUT"
else
    echo -e "${RED}  Tests: $TEST_OUTPUT${NC}"
fi

# ── Configure LLM ──
echo ""
info "LLM Configuration"
if [ -n "${GOOGLE_API_KEY:-}" ]; then
    ok "GOOGLE_API_KEY set (Gemini Flash — free tier)"
elif [ -n "${OPENAI_API_KEY:-}" ]; then
    ok "OPENAI_API_KEY set"
elif [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    ok "ANTHROPIC_API_KEY set"
else
    echo -e "${GOLD}  No API key detected. Set one of:${NC}"
    echo "    export GOOGLE_API_KEY=AIza...    # Gemini Flash (free)"
    echo "    export OPENAI_API_KEY=sk-...     # GPT-4"
    echo "    export ANTHROPIC_API_KEY=sk-...  # Claude"
fi

# ── Summary ──
COMMIT=$(git rev-parse --short HEAD)
COMMITS=$(git rev-list --count HEAD)
FILES=$(find . -name "*.py" -not -path "./.venv/*" | wc -l)

echo ""
echo -e "${GOLD}  ╔══════════════════════════════════════════╗${NC}"
echo -e "${GOLD}  ║  ✅ PAGANINI AIOS — Ready!                ║${NC}"
echo -e "${GOLD}  ╚══════════════════════════════════════════╝${NC}"
echo ""
echo "  Version: 0.1.0 ($COMMITS commits, $COMMIT)"
echo "  Python:  $($PYTHON --version)"
echo "  Files:   $FILES .py files"
echo "  Tests:   $TEST_OUTPUT"
echo ""
echo -e "${CYAN}  Quick Start:${NC}"
echo ""
echo "    # 1. Set your LLM key"
echo "    export GOOGLE_API_KEY=AIza..."
echo ""
echo "    # 2. Onboard a fund (zero data needed)"
echo "    paganini onboard auto --cnpj XX.XXX.XXX/0001-XX"
echo ""
echo "    # 3. Start the dashboard"
echo "    paganini dashboard"
echo "    # → http://localhost:8000"
echo ""
echo "    # 4. Query your fund"
echo "    paganini query \"Quais as obrigações do custodiante?\""
echo ""
echo "    # 5. Run all daemons"
echo "    paganini daemons run-all"
echo ""
echo "    # Or use the API directly:"
echo "    curl http://localhost:8000/api/status"
echo "    curl 'http://localhost:8000/api/query?q=subordinacao+cotas'"
echo "    curl http://localhost:8000/api/market"
echo ""
