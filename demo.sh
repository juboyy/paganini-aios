#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  🎻 PAGANINI AIOS — Demo Install (One Command)
#
#  Usage:
#    export GOOGLE_API_KEY=AIza...
#    curl -sSL https://raw.githubusercontent.com/juboyy/paganini-aios/main/demo.sh | bash
#
#  Installs everything: Moltis runtime, Python venv, Paganini CLI,
#  configures LLM, and leaves you inside the activated environment.
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'
GOLD='\033[0;33m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

info()  { echo -e "${CYAN}  ▸${NC} $1"; }
ok()    { echo -e "${GREEN}  ✓${NC} $1"; }
warn()  { echo -e "${GOLD}  ⚠${NC} $1"; }
fail()  { echo -e "${RED}  ✗${NC} $1"; exit 1; }
step()  { echo -e "\n${BOLD}${GOLD}  [$1/9]${NC} ${BOLD}$2${NC}"; }

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
step "1" "Dependências do sistema"

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
[ -z "$PYTHON" ] && fail "Python 3.11+ necessário."
ok "Python: $($PYTHON --version)"

if ! $PYTHON -c "import venv" 2>/dev/null; then
    info "Instalando python3-venv..."
    PY_VER=$($PYTHON --version 2>&1 | grep -oP '\d+\.\d+')
    sudo apt-get update -qq 2>/dev/null
    sudo apt-get install -y -qq "python${PY_VER}-venv" 2>/dev/null \
        || sudo apt-get install -y -qq python3-venv 2>/dev/null \
        || fail "Falha ao instalar python3-venv"
fi
ok "python3-venv OK"

command -v git &>/dev/null || { sudo apt-get install -y -qq git 2>/dev/null; }
ok "git OK"

# ── Step 2: Install Moltis Runtime ──
step "2" "Instalando Moltis (AI Runtime Engine)"

if command -v moltis &>/dev/null; then
    ok "Moltis já instalado: $(moltis --version 2>/dev/null | head -1)"
else
    MOLTIS_VERSION="0.10.18"
    ARCH="$(uname -m)"
    OS="$(uname -s | tr '[:upper:]' '[:lower:]')"

    if [ "$ARCH" = "x86_64" ]; then ARCH="amd64"; fi
    if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi

    PKG="moltis_${MOLTIS_VERSION}_${OS}_${ARCH}.tar.gz"
    URL="https://github.com/moltis-org/moltis/releases/download/v${MOLTIS_VERSION}/${PKG}"

    TMP=$(mktemp -d)
    info "Baixando Moltis v${MOLTIS_VERSION}..."
    if curl -fsSL "$URL" -o "${TMP}/${PKG}" 2>/dev/null; then
        tar xzf "${TMP}/${PKG}" -C "$TMP" 2>/dev/null
        MOLTIS_BIN=$(find "$TMP" -name "moltis" -type f 2>/dev/null | head -1)
        if [ -n "$MOLTIS_BIN" ]; then
            sudo install -m 755 "$MOLTIS_BIN" /usr/local/bin/moltis
            ok "Moltis v${MOLTIS_VERSION} instalado em /usr/local/bin/moltis"
        else
            warn "Moltis binário não encontrado no archive. Continuando sem Moltis."
        fi
    else
        warn "Não foi possível baixar Moltis. Continuando sem runtime nativo."
    fi
    rm -rf "$TMP"
fi

# ── Step 3: Clone ──
step "3" "Obtendo código-fonte"

INSTALL_DIR="paganini-aios"
if [ -d "$INSTALL_DIR/.git" ]; then
    cd "$INSTALL_DIR"
    git pull --ff-only -q 2>/dev/null || true
    ok "Atualizado: $(git rev-parse --short HEAD)"
else
    git clone --depth 1 -q https://github.com/juboyy/paganini-aios.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    ok "Clonado: $(git rev-parse --short HEAD)"
fi

# ── Step 4: Virtual Environment ──
step "4" "Ambiente virtual Python"

if [ ! -f ".venv/bin/activate" ]; then
    $PYTHON -m venv .venv || fail "Falha ao criar venv"
fi
source .venv/bin/activate
pip install --upgrade pip -q 2>/dev/null
ok "venv ativo: $(python3 --version)"

# ── Step 5: Install Paganini ──
step "5" "Instalando Paganini AIOS"

pip install -e ".[dev]" -q 2>&1 | tail -1
ok "paganini $(paganini --version 2>&1 | grep -oP '\d+\.\d+\.\d+')"

# ── Step 6: Configure LLM ──
step "6" "Configurando LLM"

API_KEY="${GOOGLE_API_KEY:-}"
PROVIDER="google"
MODEL="gemini/gemini-2.5-flash"

if [ -z "$API_KEY" ] && [ -n "${OPENAI_API_KEY:-}" ]; then
    API_KEY="$OPENAI_API_KEY"; PROVIDER="openai"; MODEL="gpt-4o"
elif [ -z "$API_KEY" ] && [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    API_KEY="$ANTHROPIC_API_KEY"; PROVIDER="anthropic"; MODEL="claude-sonnet-4-20250514"
fi

[ -z "$API_KEY" ] && warn "Nenhuma API key. Defina GOOGLE_API_KEY antes de usar queries."

cat > config.yaml << YAML
provider:
  type: $PROVIDER
  model: $MODEL
  api_key: "${API_KEY:-CONFIGURE_SUA_CHAVE}"

metaclaw:
  enabled: true
  mode: skills_only
  skill_store: runtime/skills
YAML

ok "Provider: $PROVIDER ($MODEL)"

# ── Step 7: Runtime ──
step "7" "Preparando runtime"

mkdir -p runtime/{data,logs,state,traces,funds,skills}
mkdir -p runtime/logs/{daemons,guardrails}
mkdir -p runtime/data/{market,reflections,cedente_monitor,chroma}
ok "Diretórios criados"

# ── Step 8: Auto-activate venv in bashrc ──
step "8" "Configurando ativação automática"

PAGANINI_DIR="$(pwd)"
ACTIVATE_LINE="source ${PAGANINI_DIR}/.venv/bin/activate"
CDLINE="cd ${PAGANINI_DIR}"
APILINE="export GOOGLE_API_KEY=\"${API_KEY:-}\""
WARNLINE="export PYTHONWARNINGS='ignore::FutureWarning'"

# Add to .bashrc if not already there
if ! grep -q "paganini-aios/.venv" ~/.bashrc 2>/dev/null; then
    cat >> ~/.bashrc << BASH

# ── PAGANINI AIOS ──
${CDLINE}
${ACTIVATE_LINE}
${APILINE}
${WARNLINE}
BASH
    ok "Adicionado ao .bashrc — venv ativa automaticamente ao logar"
else
    ok "Já configurado no .bashrc"
fi

# ── Step 9: Doctor ──
step "9" "Diagnóstico final"

paganini doctor 2>&1

# ── Done ──
COMMIT=$(git rev-parse --short HEAD)
FILES=$(find . -name "*.py" -not -path "./.venv/*" -not -path "./__pycache__/*" | wc -l)
LOC=$(find . -name "*.py" -not -path "./.venv/*" -not -path "./__pycache__/*" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')

echo ""
echo -e "${GREEN}  ╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}  ║                                                            ║${NC}"
echo -e "${GREEN}  ║   🎻  ${BOLD}PAGANINI AIOS — Pronto!${NC}${GREEN}                            ║${NC}"
echo -e "${GREEN}  ║                                                            ║${NC}"
echo -e "${GREEN}  ╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${DIM}Commit:${NC}     $COMMIT"
echo -e "  ${DIM}Arquivos:${NC}   $FILES módulos Python"
echo -e "  ${DIM}LOC:${NC}        $LOC linhas"
echo -e "  ${DIM}Provider:${NC}   $PROVIDER"
echo ""
echo -e "  ${BOLD}Para usar agora:${NC}"
echo ""
echo -e "  ${CYAN}source ~/.bashrc${NC}              ${DIM}# ou reconecte via SSH${NC}"
echo -e "  ${CYAN}paganini status${NC}              ${DIM}# Verificar sistema${NC}"
echo -e "  ${CYAN}paganini agents${NC}              ${DIM}# 9 agentes FIDC${NC}"
echo -e "  ${CYAN}paganini query \"pergunta\"${NC}    ${DIM}# Consultar${NC}"
echo ""
echo -e "  ${DIM}O venv será ativado automaticamente em novas sessões SSH.${NC}"
echo ""
