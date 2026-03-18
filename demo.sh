#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  🎻 PAGANINI AIOS — Demo Install Script
#  Um único comando: curl -sSL <url> | bash
#  Instala, configura e demonstra o sistema completo.
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
GOLD='\033[0;33m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

info()  { echo -e "${CYAN}  ▸${NC} $1"; }
ok()    { echo -e "${GREEN}  ✓${NC} $1"; }
warn()  { echo -e "${GOLD}  ⚠${NC} $1"; }
fail()  { echo -e "${RED}  ✗${NC} $1"; exit 1; }
step()  { echo -e "\n${BOLD}${GOLD}  [$1/8]${NC} ${BOLD}$2${NC}"; }

clear
echo ""
echo -e "${GOLD}  ╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GOLD}  ║                                                            ║${NC}"
echo -e "${GOLD}  ║   🎻  ${BOLD}PAGANINI AIOS${NC}${GOLD}                                       ║${NC}"
echo -e "${GOLD}  ║   ${DIM}AI Operating System for Financial Markets${NC}${GOLD}               ║${NC}"
echo -e "${GOLD}  ║                                                            ║${NC}"
echo -e "${GOLD}  ╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
sleep 1

# ── Step 1: System Dependencies ──
step "1" "Verificando dependências do sistema"

# Python
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
[ -z "$PYTHON" ] && fail "Python 3.11+ necessário. Instale: sudo apt install python3.12"
ok "Python: $($PYTHON --version)"

# venv
if ! $PYTHON -c "import venv" 2>/dev/null; then
    info "Instalando python3-venv..."
    PY_VER=$($PYTHON --version 2>&1 | grep -oP '\d+\.\d+')
    sudo apt-get update -qq 2>/dev/null
    sudo apt-get install -y -qq "python${PY_VER}-venv" 2>/dev/null \
        || sudo apt-get install -y -qq python3-venv 2>/dev/null \
        || fail "Falha ao instalar python3-venv"
    ok "python3-venv instalado"
else
    ok "python3-venv disponível"
fi

# git
command -v git &>/dev/null || { sudo apt-get install -y -qq git 2>/dev/null; }
ok "git: $(git --version | cut -d' ' -f3)"

# ── Step 2: Clone ──
step "2" "Obtendo código-fonte"

INSTALL_DIR="${1:-paganini-aios}"
if [ -d "$INSTALL_DIR/.git" ]; then
    cd "$INSTALL_DIR"
    git pull --ff-only -q 2>/dev/null || true
    ok "Repositório atualizado: $(git rev-parse --short HEAD)"
else
    git clone --depth 1 -q https://github.com/juboyy/paganini-aios.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    ok "Clonado: $(git rev-parse --short HEAD)"
fi

# ── Step 3: Virtual Environment ──
step "3" "Criando ambiente isolado"

if [ ! -f ".venv/bin/activate" ]; then
    $PYTHON -m venv .venv || fail "Falha ao criar venv"
fi
source .venv/bin/activate
pip install --upgrade pip -q 2>/dev/null
ok "Python venv: $(python3 --version)"

# ── Step 4: Install ──
step "4" "Instalando Paganini AIOS + 87 dependências"

pip install -e ".[dev]" -q 2>&1 | tail -1
ok "Paganini $(paganini --version 2>&1 | grep -oP '\d+\.\d+\.\d+')"

# ── Step 5: Configure ──
step "5" "Configurando provider LLM"

# Auto-detect API key from environment
API_KEY="${GOOGLE_API_KEY:-}"
PROVIDER="google"
MODEL="gemini/gemini-2.5-flash"

if [ -z "$API_KEY" ] && [ -n "${OPENAI_API_KEY:-}" ]; then
    API_KEY="$OPENAI_API_KEY"
    PROVIDER="openai"
    MODEL="gpt-4o"
elif [ -z "$API_KEY" ] && [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    API_KEY="$ANTHROPIC_API_KEY"
    PROVIDER="anthropic"
    MODEL="claude-sonnet-4-20250514"
fi

if [ -z "$API_KEY" ]; then
    warn "Nenhuma API key detectada."
    echo -e "  ${DIM}Configure uma variável de ambiente antes de rodar:${NC}"
    echo -e "  ${CYAN}export GOOGLE_API_KEY=AIza...${NC}"
    API_KEY="CONFIGURE_SUA_CHAVE"
fi

# Write config.yaml
cat > config.yaml << YAML
provider:
  type: $PROVIDER
  model: $MODEL
  api_key: "$API_KEY"

metaclaw:
  enabled: true
  mode: skills_only
  skill_store: runtime/skills
YAML

ok "Provider: $PROVIDER ($MODEL)"

# ── Step 6: Runtime directories + skills ──
step "6" "Preparando runtime"

mkdir -p runtime/{data,logs,state,traces,funds,skills}
mkdir -p runtime/logs/{daemons,guardrails}
mkdir -p runtime/data/{market,reflections,cedente_monitor,chroma}

# Copy default skills if available
if [ -d "packages/agents/skills" ]; then
    cp -r packages/agents/skills/* runtime/skills/ 2>/dev/null || true
fi

ok "Diretórios criados"

# ── Step 7: Doctor ──
step "7" "Diagnóstico do sistema"

paganini doctor 2>&1

# ── Step 8: Demo ──
step "8" "Sistema pronto"

COMMIT=$(git rev-parse --short HEAD)
FILES=$(find . -name "*.py" -not -path "./.venv/*" -not -path "./__pycache__/*" | wc -l)
TESTS=$(find . -name "test_*.py" -not -path "./.venv/*" | wc -l)
LOC=$(find . -name "*.py" -not -path "./.venv/*" -not -path "./__pycache__/*" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')

echo ""
echo -e "${GREEN}  ╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}  ║                                                            ║${NC}"
echo -e "${GREEN}  ║   🎻  ${BOLD}PAGANINI AIOS — Instalação Completa${NC}${GREEN}                 ║${NC}"
echo -e "${GREEN}  ║                                                            ║${NC}"
echo -e "${GREEN}  ╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${DIM}Commit:${NC}     $COMMIT"
echo -e "  ${DIM}Arquivos:${NC}   $FILES módulos Python"
echo -e "  ${DIM}Testes:${NC}     $TESTS suites"
echo -e "  ${DIM}LOC:${NC}        $LOC linhas"
echo -e "  ${DIM}Provider:${NC}   $PROVIDER"
echo ""
echo -e "  ${BOLD}Próximos passos:${NC}"
echo ""
echo -e "  ${CYAN}source .venv/bin/activate${NC}"
echo -e "  ${CYAN}paganini status${NC}              ${DIM}# Verificar sistema${NC}"
echo -e "  ${CYAN}paganini agents${NC}              ${DIM}# 9 agentes especializados${NC}"
echo -e "  ${CYAN}paganini pack list${NC}           ${DIM}# Packs disponíveis${NC}"
echo -e "  ${CYAN}paganini query \"sua pergunta\"${NC} ${DIM}# Consultar base de conhecimento${NC}"
echo -e "  ${CYAN}paganini up${NC}                  ${DIM}# Iniciar serviços${NC}"
echo ""
