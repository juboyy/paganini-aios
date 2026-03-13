#!/usr/bin/env bash
# PAGANINI AIOS Installer — The Right Path
# Downloads Moltis (runtime) + installs PAGANINI (domain layer)
#
# Usage: curl -fsSL https://paganini.sh | sh
#    or: ./install.sh [--provider openai|anthropic|google|ollama]

set -euo pipefail

MOLTIS_VERSION="0.10.18"
PAGANINI_VERSION="0.1.0"
MOLTIS_REPO="moltis-org/moltis"

# ── Colors ──────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GOLD='\033[0;33m'
NC='\033[0m'

info()  { echo -e "${CYAN}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; exit 1; }

# ── Detect platform ─────────────────────────────────
detect_platform() {
    local os arch
    os="$(uname -s | tr '[:upper:]' '[:lower:]')"
    arch="$(uname -m)"

    case "$os" in
        linux)  OS="linux" ;;
        darwin) OS="darwin" ;;
        *)      fail "Unsupported OS: $os" ;;
    esac

    case "$arch" in
        x86_64|amd64) ARCH="x86_64" ;;
        aarch64|arm64) ARCH="aarch64" ;;
        *)             fail "Unsupported architecture: $arch" ;;
    esac

    # Package format
    if [ "$OS" = "linux" ]; then
        if command -v dpkg &>/dev/null; then
            PKG_FMT="deb"
            case "$ARCH" in
                x86_64)  PKG_FILE="moltis_${MOLTIS_VERSION}-1_amd64.deb" ;;
                aarch64) PKG_FILE="moltis_${MOLTIS_VERSION}-1_arm64.deb" ;;
            esac
        elif command -v rpm &>/dev/null; then
            PKG_FMT="rpm"
            PKG_FILE="moltis-${MOLTIS_VERSION}-1.${ARCH}.rpm"
        else
            PKG_FMT="tar"
            PKG_FILE="moltis-${MOLTIS_VERSION}-${ARCH}-unknown-linux-gnu.tar.gz"
        fi
    elif [ "$OS" = "darwin" ]; then
        PKG_FMT="tar"
        PKG_FILE="moltis-${MOLTIS_VERSION}-${ARCH}-apple-darwin.tar.gz"
    fi
}

# ── Banner ───────────────────────────────────────────
banner() {
    echo ""
    echo -e "${GOLD}  ╔══════════════════════════════════════════╗${NC}"
    echo -e "${GOLD}  ║  🎻 PAGANINI AIOS v${PAGANINI_VERSION}                  ║${NC}"
    echo -e "${GOLD}  ║  AI Operating System for Financial Markets║${NC}"
    echo -e "${GOLD}  ╚══════════════════════════════════════════╝${NC}"
    echo ""
}

# ── Step 1: Install Moltis (runtime) ────────────────
install_moltis() {
    if command -v moltis &>/dev/null; then
        local ver
        ver="$(moltis --version 2>/dev/null | head -1 || echo 'unknown')"
        ok "Moltis already installed: $ver"
        return
    fi

    info "Installing Moltis v${MOLTIS_VERSION} (AI runtime engine)..."
    local url="https://github.com/${MOLTIS_REPO}/releases/download/v${MOLTIS_VERSION}/${PKG_FILE}"
    local tmp_dir
    tmp_dir="$(mktemp -d)"

    info "Downloading ${PKG_FILE}..."
    if command -v curl &>/dev/null; then
        curl -fsSL "$url" -o "${tmp_dir}/${PKG_FILE}"
    elif command -v wget &>/dev/null; then
        wget -q "$url" -O "${tmp_dir}/${PKG_FILE}"
    else
        fail "Neither curl nor wget found. Install one and retry."
    fi

    case "$PKG_FMT" in
        deb)
            info "Installing .deb package..."
            sudo dpkg -i "${tmp_dir}/${PKG_FILE}" || sudo apt-get install -f -y
            ;;
        rpm)
            info "Installing .rpm package..."
            sudo rpm -i "${tmp_dir}/${PKG_FILE}"
            ;;
        tar)
            info "Extracting to /usr/local/bin..."
            tar -xzf "${tmp_dir}/${PKG_FILE}" -C "${tmp_dir}"
            # Find the moltis binary in extracted files
            local bin
            bin="$(find "${tmp_dir}" -name 'moltis' -type f | head -1)"
            if [ -n "$bin" ]; then
                sudo install -m 755 "$bin" /usr/local/bin/moltis
            else
                fail "moltis binary not found in archive"
            fi
            ;;
    esac

    rm -rf "$tmp_dir"

    if command -v moltis &>/dev/null; then
        ok "Moltis installed: $(moltis --version 2>/dev/null | head -1)"
    else
        fail "Moltis installation failed"
    fi
}

# ── Step 2: Install PAGANINI (domain layer) ──────────
install_paganini() {
    info "Installing PAGANINI AIOS domain layer..."

    # Check Python
    local python_cmd=""
    for cmd in python3 python; do
        if command -v "$cmd" &>/dev/null; then
            local ver
            ver="$($cmd -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
            local major minor
            major="${ver%%.*}"
            minor="${ver#*.}"
            if [ "$major" -ge 3 ] && [ "$minor" -ge 11 ]; then
                python_cmd="$cmd"
                break
            fi
        fi
    done

    if [ -z "$python_cmd" ]; then
        fail "Python 3.11+ required. Install it and retry."
    fi

    ok "Python found: $($python_cmd --version)"

    # Install from PyPI or git
    info "Installing paganini-aios package..."
    $python_cmd -m pip install --user paganini-aios 2>/dev/null \
        || $python_cmd -m pip install --user "git+https://github.com/juboyy/paganini-aios.git" \
        || fail "Failed to install paganini-aios"

    ok "PAGANINI AIOS installed"
}

# ── Step 3: Configure ───────────────────────────────
configure() {
    local config_dir="${PAGANINI_HOME:-$HOME/.paganini}"
    mkdir -p "$config_dir"

    if [ -f "$config_dir/config.yaml" ]; then
        ok "Config already exists: $config_dir/config.yaml"
        return
    fi

    # Generate moltis.yaml (runtime config)
    cat > "$config_dir/moltis.yaml" <<'MOLTIS_YAML'
# Moltis runtime configuration for PAGANINI AIOS
# Docs: https://docs.moltis.org

gateway:
  port: 30000
  host: 127.0.0.1

providers:
  # BYOK: uncomment your provider and set your API key
  # openai:
  #   api_key: ${OPENAI_API_KEY}
  #   models: [gpt-4o-mini, gpt-4o]
  # anthropic:
  #   api_key: ${ANTHROPIC_API_KEY}
  #   models: [claude-sonnet-4-20250514]
  # google:
  #   api_key: ${GEMINI_API_KEY}
  #   models: [gemini-2.5-flash]

telemetry:
  enabled: true
  otlp_endpoint: ""  # optional: http://localhost:4318

sandbox:
  enabled: true
  network: none  # agents can't access network by default
MOLTIS_YAML

    # Generate paganini config
    cat > "$config_dir/config.yaml" <<'PAGANINI_YAML'
# PAGANINI AIOS Configuration
version: "0.1.0"

# Runtime engine
runtime:
  engine: moltis
  moltis_config: moltis.yaml
  gateway_url: http://127.0.0.1:30000

# RAG Pipeline (tunable by AutoResearch)
rag:
  chunk_size: 384
  chunk_overlap: 64
  respect_headers: true
  top_k: 5
  embedding_model: all-MiniLM-L6-v2  # local, no API needed
  vector_store: chroma  # chroma (embedded) | pgvector (external)

# MetaClaw (skill evolution proxy)
metaclaw:
  enabled: false
  skills_dir: skills/
  auto_evolve: true
  max_skills: 500

# Guardrails (hard-stop, not warnings)
guardrails:
  eligibility: true
  concentration: true
  covenant: true
  pld_aml: true
  compliance: true
  risk_assessment: true

# Domain pack
pack: fidc

# Data
data_dir: data/
corpus_dir: data/corpus/fidc/
PAGANINI_YAML

    ok "Config created: $config_dir/"
}

# ── Step 4: Verify ──────────────────────────────────
verify() {
    echo ""
    info "Verifying installation..."
    echo ""

    local all_ok=true

    # Moltis
    if command -v moltis &>/dev/null; then
        ok "Moltis: $(moltis --version 2>/dev/null | head -1)"
    else
        warn "Moltis: not found (install manually or use --runtime python)"
        all_ok=false
    fi

    # PAGANINI CLI
    if command -v paganini &>/dev/null; then
        ok "PAGANINI CLI: $(paganini --version 2>/dev/null)"
    else
        warn "PAGANINI CLI: not in PATH (try: export PATH=\$HOME/.local/bin:\$PATH)"
        all_ok=false
    fi

    # Python
    if command -v python3 &>/dev/null; then
        ok "Python: $(python3 --version)"
    fi

    echo ""
    if [ "$all_ok" = true ]; then
        echo -e "${GREEN}═══════════════════════════════════════════${NC}"
        echo -e "${GREEN}  ✓ PAGANINI AIOS installed successfully  ${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    else
        echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
        echo -e "${YELLOW}  ⚠ Partial install — see warnings above  ${NC}"
        echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
    fi

    echo ""
    echo "  Next steps:"
    echo ""
    echo "    1. Configure your LLM provider:"
    echo "       export OPENAI_API_KEY=sk-..."
    echo ""
    echo "    2. Download a domain pack:"
    echo "       paganini pack install fidc"
    echo ""
    echo "    3. Ingest your corpus:"
    echo "       paganini ingest data/corpus/fidc/"
    echo ""
    echo "    4. Start querying:"
    echo "       paganini query \"Qual o limite de concentração por cedente?\""
    echo ""
    echo "  Full docs: https://docs.paganini.aios.finance"
    echo ""
}

# ── Main ─────────────────────────────────────────────
main() {
    banner
    detect_platform
    info "Platform: ${OS}/${ARCH} (${PKG_FMT})"
    echo ""

    install_moltis
    install_paganini
    configure
    verify
}

main "$@"
