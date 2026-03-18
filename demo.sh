#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  🎻 PAGANINI AIOS — One-Command Install
#
#  curl -sSL https://raw.githubusercontent.com/juboyy/paganini-aios/main/demo.sh | bash
#
#  Works on bare Ubuntu/Debian. Installs EVERYTHING.
#  After install: `paganini` works from anywhere, no activation needed.
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'
GOLD='\033[0;33m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

info()  { echo -e "${CYAN}  ▸${NC} $1"; }
ok()    { echo -e "${GREEN}  ✓${NC} $1"; }
warn()  { echo -e "${GOLD}  ⚠${NC} $1"; }
fail()  { echo -e "${RED}  ✗${NC} $1"; exit 1; }
step()  { echo -e "\n${BOLD}${GOLD}  [$1/9]${NC} ${BOLD}$2${NC}"; }

INSTALL_DIR="${HOME}/paganini-aios"
MOLTIS_VERSION="0.10.18"

echo ""
echo -e "${GOLD}  ╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GOLD}  ║                                                            ║${NC}"
echo -e "${GOLD}  ║   🎻  ${BOLD}PAGANINI AIOS${NC}${GOLD}                                       ║${NC}"
echo -e "${GOLD}  ║   ${DIM}AI Operating System for Financial Markets${NC}${GOLD}               ║${NC}"
echo -e "${GOLD}  ║                                                            ║${NC}"
echo -e "${GOLD}  ╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ══════════════════════════════════════════════════════════
# Step 1: System packages (apt)
# ══════════════════════════════════════════════════════════
step "1" "Dependências do sistema"

NEED_APT=false
PKGS=""

# Python
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

if [ -z "$PYTHON" ]; then
    PKGS="python3 python3-venv python3-pip"
    NEED_APT=true
else
    # Check venv
    if ! $PYTHON -c "import venv" 2>/dev/null; then
        PY_VER=$($PYTHON --version 2>&1 | grep -oP '\d+\.\d+')
        PKGS="python${PY_VER}-venv"
        NEED_APT=true
    fi
fi

# Git
command -v git &>/dev/null || { PKGS="$PKGS git"; NEED_APT=true; }

# Curl (should exist if running this, but just in case)
command -v curl &>/dev/null || { PKGS="$PKGS curl"; NEED_APT=true; }

if [ "$NEED_APT" = true ]; then
    info "Instalando pacotes: $PKGS"
    sudo apt-get update -qq 2>/dev/null
    sudo apt-get install -y -qq $PKGS 2>/dev/null
    ok "Pacotes do sistema instalados"
fi

# Re-detect Python after install
if [ -z "$PYTHON" ]; then
    for p in python3.12 python3.11 python3; do
        if command -v "$p" &>/dev/null; then PYTHON="$p"; break; fi
    done
fi
[ -z "$PYTHON" ] && fail "Python 3.11+ necessário e não foi possível instalar."

ok "Python: $($PYTHON --version)"
ok "git: $(git --version | cut -d' ' -f3)"

# ══════════════════════════════════════════════════════════
# Step 2: Moltis Runtime
# ══════════════════════════════════════════════════════════
step "2" "Moltis Runtime Engine"

if command -v moltis &>/dev/null; then
    ok "Moltis: $(moltis --version 2>/dev/null | head -1 || echo 'instalado')"
else
    ARCH="$(uname -m)"; OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
    [ "$ARCH" = "x86_64" ] && ARCH="amd64"
    [ "$ARCH" = "aarch64" ] && ARCH="arm64"
    PKG="moltis_${MOLTIS_VERSION}_${OS}_${ARCH}.tar.gz"
    URL="https://github.com/moltis-org/moltis/releases/download/v${MOLTIS_VERSION}/${PKG}"

    TMP=$(mktemp -d)
    info "Baixando Moltis v${MOLTIS_VERSION}..."
    if curl -fsSL "$URL" -o "${TMP}/${PKG}" 2>/dev/null; then
        tar xzf "${TMP}/${PKG}" -C "$TMP" 2>/dev/null
        MOLTIS_BIN=$(find "$TMP" -name "moltis" -type f 2>/dev/null | head -1)
        if [ -n "$MOLTIS_BIN" ]; then
            sudo install -m 755 "$MOLTIS_BIN" /usr/local/bin/moltis
            ok "Moltis v${MOLTIS_VERSION} instalado"
        else
            warn "Moltis: binário não encontrado no archive"
        fi
    else
        warn "Moltis: download falhou. Continuando sem runtime nativo."
    fi
    rm -rf "$TMP"
fi

# ══════════════════════════════════════════════════════════
# Step 3: Clone
# ══════════════════════════════════════════════════════════
step "3" "Código-fonte"

if [ -d "$INSTALL_DIR/.git" ]; then
    cd "$INSTALL_DIR"
    git pull --ff-only -q 2>/dev/null || true
    ok "Atualizado: $(git rev-parse --short HEAD)"
else
    git clone --depth 1 -q https://github.com/juboyy/paganini-aios.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    ok "Clonado: $(git rev-parse --short HEAD)"
fi

# ══════════════════════════════════════════════════════════
# Step 4: Virtual Environment + Install
# ══════════════════════════════════════════════════════════
step "4" "Ambiente Python + instalação"

if [ ! -f ".venv/bin/activate" ]; then
    $PYTHON -m venv .venv || fail "Falha ao criar venv"
fi
source .venv/bin/activate
pip install --upgrade pip -q 2>/dev/null
pip install -e ".[dev]" -q 2>&1 | tail -1
ok "paganini $(paganini --version 2>&1 | grep -oP '\d+\.\d+\.\d+')"

# ══════════════════════════════════════════════════════════
# Step 5: Global wrapper (paganini works from ANYWHERE)
# ══════════════════════════════════════════════════════════
step "5" "Instalando CLI global"

sudo tee /usr/local/bin/paganini > /dev/null << 'WRAPPER'
#!/usr/bin/env bash
# PAGANINI AIOS — Global CLI wrapper
PAGANINI_HOME="${PAGANINI_HOME:-$HOME/paganini-aios}"
source "${PAGANINI_HOME}/.venv/bin/activate" 2>/dev/null
exec python3 -m paganini "$@"
WRAPPER
sudo chmod +x /usr/local/bin/paganini
ok "paganini disponível globalmente (/usr/local/bin/paganini)"

# ══════════════════════════════════════════════════════════
# Step 6: Configure LLM
# ══════════════════════════════════════════════════════════
step "6" "Configurando LLM"

API_KEY="${GOOGLE_API_KEY:-}"
PROVIDER="google"; MODEL="gemini/gemini-2.5-flash"

if [ -z "$API_KEY" ] && [ -n "${OPENAI_API_KEY:-}" ]; then
    API_KEY="$OPENAI_API_KEY"; PROVIDER="openai"; MODEL="gpt-4o"
elif [ -z "$API_KEY" ] && [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    API_KEY="$ANTHROPIC_API_KEY"; PROVIDER="anthropic"; MODEL="claude-sonnet-4-20250514"
fi

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

if [ -n "$API_KEY" ]; then
    ok "Provider: $PROVIDER ($MODEL)"
else
    warn "Nenhuma API key. Defina GOOGLE_API_KEY e rode novamente."
fi

# ══════════════════════════════════════════════════════════
# Step 7: Runtime dirs
# ══════════════════════════════════════════════════════════
step "7" "Runtime"

mkdir -p runtime/{data,logs,state,traces,funds,skills}
mkdir -p runtime/logs/{daemons,guardrails}
mkdir -p runtime/data/{market,reflections,cedente_monitor,chroma}
ok "Diretórios criados"

# ══════════════════════════════════════════════════════════
# Step 8: Persist GOOGLE_API_KEY
# ══════════════════════════════════════════════════════════
step "8" "Persistência"

if [ -n "$API_KEY" ] && ! grep -q "GOOGLE_API_KEY" ~/.bashrc 2>/dev/null; then
    echo "" >> ~/.bashrc
    echo "# ── PAGANINI AIOS ──" >> ~/.bashrc
    echo "export GOOGLE_API_KEY=\"${API_KEY}\"" >> ~/.bashrc
    echo "export PYTHONWARNINGS='ignore::FutureWarning'" >> ~/.bashrc
    ok "API key persistida no .bashrc"
else
    ok "Configuração já presente"
fi

# ══════════════════════════════════════════════════════════
# Step 9: Doctor
# ══════════════════════════════════════════════════════════
step "9" "Diagnóstico final"

export PYTHONWARNINGS='ignore::FutureWarning'
paganini doctor 2>&1

# ══════════════════════════════════════════════════════════
# Done
# ══════════════════════════════════════════════════════════
COMMIT=$(git rev-parse --short HEAD)
FILES=$(find . -name "*.py" -not -path "./.venv/*" -not -path "./__pycache__/*" | wc -l)
LOC=$(find . -name "*.py" -not -path "./.venv/*" -not -path "./__pycache__/*" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')

echo ""
echo -e "${GREEN}  ╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}  ║                                                            ║${NC}"
echo -e "${GREEN}  ║   🎻  ${BOLD}PAGANINI AIOS — Instalação Completa!${NC}${GREEN}                ║${NC}"
echo -e "${GREEN}  ║                                                            ║${NC}"
echo -e "${GREEN}  ╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${DIM}Commit:${NC}     $COMMIT"
echo -e "  ${DIM}Arquivos:${NC}   $FILES módulos"
echo -e "  ${DIM}LOC:${NC}        $LOC linhas"
echo -e "  ${DIM}Provider:${NC}   $PROVIDER"
echo ""
echo -e "  ${BOLD}Pronto! Use de qualquer lugar:${NC}"
echo ""
echo -e "  ${CYAN}paganini status${NC}              ${DIM}# Verificar sistema${NC}"
echo -e "  ${CYAN}paganini agents${NC}              ${DIM}# 9 agentes especializados${NC}"
echo -e "  ${CYAN}paganini pack list${NC}           ${DIM}# Packs disponíveis${NC}"
echo -e "  ${CYAN}paganini query \"pergunta\"${NC}    ${DIM}# IA responde com RAG${NC}"
echo -e "  ${CYAN}paganini up${NC}                  ${DIM}# Iniciar serviços${NC}"
echo ""
