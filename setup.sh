#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  PAGANINI AIOS — One-Shot Setup
#  From zero to fully operational in under 60 seconds.
#  Usage: bash setup.sh [GOOGLE_API_KEY]
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'
GOLD='\033[0;33m'; NC='\033[0m'; BOLD='\033[1m'
info()  { echo -e "${CYAN}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; exit 1; }
warn()  { echo -e "${GOLD}⚠${NC} $1"; }

echo ""
echo -e "${GOLD}  ╔══════════════════════════════════════════╗${NC}"
echo -e "${GOLD}  ║  🎻 PAGANINI AIOS — Setup                ║${NC}"
echo -e "${GOLD}  ║  One-shot: install → configure → run     ║${NC}"
echo -e "${GOLD}  ╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Detect project root ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/pyproject.toml" ]; then
    cd "$SCRIPT_DIR"
elif [ -f "pyproject.toml" ]; then
    cd "$(pwd)"
else
    fail "Run this from the paganini-aios directory"
fi
PROJECT_ROOT="$(pwd)"

# ── Step 1: System dependencies ──
info "Checking system dependencies..."
PYTHON=""
for p in python3.12 python3.11 python3; do
    if command -v "$p" &>/dev/null; then
        ver=$("$p" --version 2>&1 | grep -oP '\d+\.\d+')
        major=$(echo "$ver" | cut -d. -f1)
        minor=$(echo "$ver" | cut -d. -f2)
        if [ "$major" -ge 3 ] && [ "$minor" -ge 11 ]; then
            PYTHON="$p"; break
        fi
    fi
done
[ -z "$PYTHON" ] && fail "Python 3.11+ required. Install: sudo apt install python3.12 python3.12-venv"
ok "Python: $($PYTHON --version)"

# Check venv
if ! $PYTHON -c "import venv" 2>/dev/null; then
    PY_VER=$($PYTHON --version 2>&1 | grep -oP '\d+\.\d+')
    warn "python venv not available. Attempting install..."
    sudo apt install -y "python${PY_VER}-venv" 2>/dev/null || \
    sudo apt install -y python3-venv 2>/dev/null || \
    { warn "Could not install venv automatically.";
      echo "  Run: sudo apt install python${PY_VER}-venv"; exit 1; }
fi

# ── Step 2: Virtual environment ──
if [ ! -d ".venv" ] || [ ! -f ".venv/bin/activate" ]; then
    info "Creating virtual environment..."
    rm -rf .venv
    $PYTHON -m venv .venv
fi
source .venv/bin/activate
ok "Virtual env: $(python3 --version)"

# ── Step 3: Install dependencies ──
info "Installing dependencies..."
pip install --upgrade pip -q
pip install -e ".[dev]" -q 2>&1 | tail -1
ok "Dependencies installed"

# ── Step 4: Runtime directories ──
mkdir -p runtime/{data,logs,state,traces,funds}
mkdir -p runtime/logs/{daemons,guardrails}
mkdir -p runtime/data/{market,reflections,cedente_monitor}
ok "Runtime directories"

# ── Step 5: LLM Configuration ──
API_KEY="${1:-${GOOGLE_API_KEY:-}}"

if [ -z "$API_KEY" ]; then
    echo ""
    echo -e "${GOLD}  🔑 LLM Setup${NC}"
    echo -e "  Paganini needs an LLM key. Gemini Flash is free:"
    echo -e "  ${CYAN}https://aistudio.google.com/apikey${NC}"
    echo ""
    read -rp "  Paste your Google API Key (AIza...): " API_KEY
fi

if [ -z "$API_KEY" ]; then
    warn "No API key — queries won't work. Set later: export GOOGLE_API_KEY=..."
else
    # Save to config
    cat > config.yaml << CONFEOF
provider:
  type: google
  model: gemini/gemini-2.5-flash
  api_key: "${API_KEY}"
CONFEOF
    export GOOGLE_API_KEY="$API_KEY"
    ok "LLM configured: Gemini 2.5 Flash"
fi

# ── Step 6: Corpus Indexing ──
info "Indexing knowledge base..."
CORPUS_DIR=""
if [ -d "data/corpus" ] && [ "$(ls data/corpus/ 2>/dev/null | wc -l)" -gt 0 ]; then
    CORPUS_DIR="data/corpus"
elif [ -d "data/sample-corpus" ]; then
    CORPUS_DIR="data/sample-corpus"
fi

if [ -n "$CORPUS_DIR" ]; then
    DOC_COUNT=$(find "$CORPUS_DIR" -name "*.md" -o -name "*.txt" -o -name "*.pdf" 2>/dev/null | wc -l)
    python3 -c "
from packages.rag.pipeline import RAGPipeline
rag = RAGPipeline('${PROJECT_ROOT}')
count = rag.ingest_directory('${CORPUS_DIR}')
print(f'Indexed {count} chunks from ${DOC_COUNT} documents')
" 2>/dev/null && ok "Corpus indexed ($DOC_COUNT documents)" || warn "Corpus indexing had issues (non-critical)"
else
    warn "No corpus found — add docs to data/corpus/ and run: paganini ingest data/corpus/"
fi

# ── Step 7: Market Data ──
info "Syncing market data from BCB..."
python3 -c "
from packages.kernel.handlers import market_data_sync
r = market_data_sync({'fund_slug': 'default'})
print(f'Synced {r[\"synced\"]}/7 indicators')
" 2>/dev/null && ok "Market data synced" || warn "Market sync failed (will retry on next daemon run)"

# ── Step 8: Generate API Key ──
if [ ! -f "runtime/state/api_key.txt" ]; then
    python3 -c "import secrets; print(secrets.token_urlsafe(32))" > runtime/state/api_key.txt
fi
DASH_KEY=$(cat runtime/state/api_key.txt)
ok "Dashboard API key ready"

# ── Step 9: Run Tests ──
info "Running tests..."
TEST_RESULT=$(python3 -m pytest tests/ -x -q --tb=no 2>&1 | tail -1)
ok "Tests: $TEST_RESULT"

# ── Done ──
echo ""
echo -e "${GREEN}${BOLD}  ╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}  ║  ✅ PAGANINI AIOS — Ready!                ║${NC}"
echo -e "${GREEN}${BOLD}  ╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Start the dashboard:${NC}"
echo -e "    ${CYAN}source .venv/bin/activate${NC}"
echo -e "    ${CYAN}paganini dashboard${NC}"
echo ""
echo -e "  ${BOLD}Or use the interactive shell:${NC}"
echo -e "    ${CYAN}paganini shell${NC}"
echo ""
echo -e "  ${BOLD}Dashboard URL:${NC}  http://localhost:8000"
echo -e "  ${BOLD}API Key:${NC}        ${GOLD}${DASH_KEY}${NC}"
echo ""
echo -e "  ${BOLD}Quick test:${NC}"
echo -e "    ${CYAN}paganini query \"Quais as obrigações do custodiante?\"${NC}"
echo -e "    ${CYAN}paganini market sync${NC}"
echo -e "    ${CYAN}paganini onboard auto --cnpj XX.XXX.XXX/0001-XX${NC}"
echo ""
