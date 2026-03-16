#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
#  PAGANINI AIOS — Quick Start (Zero to Running)
#  One command: bash quickstart.sh
#  Works on: Ubuntu 22.04/24.04, Debian 12, macOS 14+
# ═══════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
GOLD='\033[0;33m'
NC='\033[0m'

info()  { echo -e "${CYAN}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${GOLD}⚠${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; exit 1; }

echo ""
echo -e "${GOLD}  ╔══════════════════════════════════════════╗${NC}"
echo -e "${GOLD}  ║  🎻 PAGANINI AIOS — Quick Start          ║${NC}"
echo -e "${GOLD}  ║  AI Operating System for FIDC Funds       ║${NC}"
echo -e "${GOLD}  ╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Find Python 3.11+ ──
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
[ -z "$PYTHON" ] && fail "Python 3.11+ required. Install: sudo apt install python3.12"
ok "Python: $($PYTHON --version)"

# ── Step 2: Ensure venv module is available ──
if ! $PYTHON -c "import venv" 2>/dev/null; then
    info "Installing python3-venv..."
    PY_VER=$($PYTHON --version 2>&1 | grep -oP '\d+\.\d+')
    if command -v apt &>/dev/null; then
        sudo apt update -qq
        sudo apt install -y "python${PY_VER}-venv" 2>/dev/null \
            || sudo apt install -y python3-venv 2>/dev/null \
            || fail "Cannot install python3-venv. Run: sudo apt install python3-venv"
        ok "python3-venv installed"
    else
        fail "python3-venv not available. Install it manually for your OS."
    fi
fi

# ── Step 3: Check git ──
command -v git &>/dev/null || fail "git required. Install: sudo apt install git"
ok "git: $(git --version | head -1)"

# ── Step 4: Get the code ──
if [ -f "core/channels/api.py" ] && [ -d ".git" ]; then
    # Already inside the repo
    info "Running from existing repo, pulling latest..."
    git pull --ff-only 2>/dev/null || true
    ok "Repository: $(pwd) ($(git rev-parse --short HEAD))"
else
    INSTALL_DIR="${1:-paganini-aios}"
    if [ -d "$INSTALL_DIR/.git" ]; then
        info "Repository exists, pulling latest..."
        cd "$INSTALL_DIR" && git pull --ff-only 2>/dev/null || true
    else
        info "Cloning repository..."
        git clone https://github.com/juboyy/paganini-aios.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    ok "Repository: $(pwd) ($(git rev-parse --short HEAD))"
fi

# ── Step 5: Virtual environment ──
if [ ! -f ".venv/bin/activate" ]; then
    rm -rf .venv 2>/dev/null || true
    info "Creating virtual environment..."
    $PYTHON -m venv .venv || fail "Failed to create venv. Check python3-venv is installed."
fi
source .venv/bin/activate
ok "Virtual env: $(python3 --version)"

# ── Step 6: Install dependencies ──
info "Installing dependencies (this takes ~60s first time)..."
pip install --upgrade pip -q 2>/dev/null
pip install -e ".[dev]" -q 2>&1 | tail -1
ok "Dependencies installed"

# ── Step 7: Create runtime directories ──
mkdir -p runtime/{data,logs,state,traces,funds}
mkdir -p runtime/logs/{daemons,guardrails}
mkdir -p runtime/data/{market,reflections,cedente_monitor,chroma}
ok "Runtime directories"

# ── Step 8: Generate API key (if not exists) ──
CONFIG_FILE="config.yaml"
API_KEY=""
if [ -f "$CONFIG_FILE" ]; then
    API_KEY=$(grep -oP 'api_key:\s*\K\S+' "$CONFIG_FILE" 2>/dev/null || true)
fi
if [ -z "$API_KEY" ]; then
    API_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    if [ ! -f "$CONFIG_FILE" ]; then
        cat > "$CONFIG_FILE" << YAML
# Paganini AIOS Configuration
api_key: "$API_KEY"
data_dir: "runtime/data"
souls_dir: "packs/finance/agents/souls"
host: "0.0.0.0"
port: 8000
YAML
    fi
    ok "API key generated: $API_KEY"
else
    ok "API key: ${API_KEY:0:8}..."
fi

# ── Step 9: Index corpus ──
info "Indexing knowledge base..."
CORPUS_DIR=""
if [ -d "data/corpus" ] && [ "$(ls data/corpus/ 2>/dev/null | wc -l)" -gt 0 ]; then
    CORPUS_DIR="data/corpus"
elif [ -d "data/sample-corpus" ]; then
    CORPUS_DIR="data/sample-corpus"
fi

if [ -n "$CORPUS_DIR" ]; then
    python3 << PYEOF
from core.rag.pipeline import RAGPipeline
from core.config.engine import load_config
config = load_config()
rag = RAGPipeline(config)
count = rag.collection.count()
if count > 0:
    print(f"  Already indexed: {count} chunks")
else:
    rag.ingest("$CORPUS_DIR")
    count = rag.collection.count()
    print(f"  Indexed: {count} chunks from $CORPUS_DIR")
PYEOF
    ok "Knowledge base ready"
else
    warn "No corpus found — add docs to data/corpus/ later"
fi

# ── Step 10: Run tests ──
info "Running tests..."
TEST_OUTPUT=$(python3 -m pytest tests/ -x -q --tb=no 2>&1 | tail -1) || true
if echo "$TEST_OUTPUT" | grep -q "passed"; then
    ok "Tests: $TEST_OUTPUT"
else
    warn "Tests: $TEST_OUTPUT"
fi

# ── Step 11: LLM check ──
echo ""
if [ -n "${GOOGLE_API_KEY:-}" ]; then
    ok "LLM: Google Gemini (GOOGLE_API_KEY set)"
elif [ -n "${OPENAI_API_KEY:-}" ]; then
    ok "LLM: OpenAI (OPENAI_API_KEY set)"
elif [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    ok "LLM: Anthropic (ANTHROPIC_API_KEY set)"
else
    warn "No LLM API key detected. Set one before starting:"
    echo "    export GOOGLE_API_KEY=AIza...    # Gemini (free tier)"
fi

# ── Done ──
COMMIT=$(git rev-parse --short HEAD)
FILES=$(find . -name "*.py" -not -path "./.venv/*" | wc -l)

echo ""
echo -e "${GREEN}  ╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}  ║  ✅ PAGANINI AIOS — Ready!                ║${NC}"
echo -e "${GREEN}  ╚══════════════════════════════════════════╝${NC}"
echo ""
echo "  Commit:   $COMMIT"
echo "  Files:    $FILES .py"
echo "  API Key:  $API_KEY"
echo ""
echo -e "${CYAN}  Start the dashboard:${NC}"
echo ""
echo "    source .venv/bin/activate"
echo "    export GOOGLE_API_KEY=AIza..."
echo "    python3 core/channels/api.py"
echo ""
echo "    → http://localhost:8000"
echo "    → API Key: $API_KEY"
echo ""
