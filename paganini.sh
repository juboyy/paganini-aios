#!/usr/bin/env bash
# PAGANINI AIOS — Universal Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/juboyy/paganini-aios/main/paganini.sh | sh
set -euo pipefail

REPO="juboyy/paganini-aios"
MOLTIS_VERSION="0.10.18"
INSTALL_DIR="${PAGANINI_HOME:-$HOME/.paganini}"
BIN_DIR="${INSTALL_DIR}/bin"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}ℹ${NC}  $1"; }
ok()    { echo -e "${GREEN}✓${NC}  $1"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $1"; }
fail()  { echo -e "${RED}✗${NC}  $1"; exit 1; }

echo ""
echo -e "${CYAN}🎻 PAGANINI AIOS Installer${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Detect OS + arch
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
    x86_64|amd64) ARCH="amd64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *) fail "Unsupported architecture: $ARCH" ;;
esac

info "Detected: ${OS}/${ARCH}"

# Check Python
if ! command -v python3 &>/dev/null; then
    fail "Python 3.11+ required. Install: https://python.org"
fi
PY_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
if [ "$PY_MAJOR" -lt 3 ] || ([ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 11 ]); then
    fail "Python 3.11+ required (found ${PY_VERSION})"
fi
ok "Python ${PY_VERSION}"

# Install Moltis
info "Installing Moltis runtime v${MOLTIS_VERSION}..."
case "$OS" in
    linux)
        MOLTIS_URL="https://github.com/moltis-org/moltis/releases/download/v${MOLTIS_VERSION}/moltis_${MOLTIS_VERSION}-1_${ARCH}.deb"
        if command -v dpkg &>/dev/null; then
            TMP_DEB=$(mktemp /tmp/moltis-XXXXXX.deb)
            curl -fsSL "$MOLTIS_URL" -o "$TMP_DEB" 2>/dev/null || warn "Moltis download failed (optional)"
            if [ -f "$TMP_DEB" ] && [ -s "$TMP_DEB" ]; then
                sudo dpkg -i "$TMP_DEB" 2>/dev/null || warn "Moltis install requires sudo (optional)"
                rm -f "$TMP_DEB"
                ok "Moltis v${MOLTIS_VERSION} installed"
            fi
        else
            # Binary install for non-Debian
            mkdir -p "$BIN_DIR"
            MOLTIS_TAR="https://github.com/moltis-org/moltis/releases/download/v${MOLTIS_VERSION}/moltis-${MOLTIS_VERSION}-linux-${ARCH}.tar.gz"
            curl -fsSL "$MOLTIS_TAR" 2>/dev/null | tar xz -C "$BIN_DIR" 2>/dev/null || warn "Moltis binary download failed (optional)"
            ok "Moltis binary at ${BIN_DIR}/moltis"
        fi
        ;;
    darwin)
        if command -v brew &>/dev/null; then
            brew install moltis-org/tap/moltis 2>/dev/null || warn "Moltis brew install failed (optional)"
            ok "Moltis installed via Homebrew"
        else
            mkdir -p "$BIN_DIR"
            MOLTIS_TAR="https://github.com/moltis-org/moltis/releases/download/v${MOLTIS_VERSION}/moltis-${MOLTIS_VERSION}-darwin-${ARCH}.tar.gz"
            curl -fsSL "$MOLTIS_TAR" 2>/dev/null | tar xz -C "$BIN_DIR" 2>/dev/null || warn "Moltis binary download failed (optional)"
        fi
        ;;
    *) warn "Unsupported OS for Moltis: ${OS}. PAGANINI will use Python-only mode." ;;
esac

# Clone repo
info "Cloning PAGANINI AIOS..."
if [ -d "${INSTALL_DIR}/repo" ]; then
    cd "${INSTALL_DIR}/repo" && git pull -q
    ok "Updated existing installation"
else
    mkdir -p "$INSTALL_DIR"
    git clone -q "https://github.com/${REPO}.git" "${INSTALL_DIR}/repo"
    ok "Cloned to ${INSTALL_DIR}/repo"
fi

# Install Python package
info "Installing Python dependencies..."
cd "${INSTALL_DIR}/repo"
python3 -m pip install -e . -q 2>/dev/null || python3 -m pip install -e . --break-system-packages -q 2>/dev/null
ok "PAGANINI CLI installed"

# Verify
if command -v paganini &>/dev/null; then
    ok "paganini CLI available"
else
    # Add to PATH hint
    warn "paganini not in PATH. Run: export PATH=\"\$PATH:$(python3 -m site --user-base)/bin\""
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎻 PAGANINI AIOS installed!${NC}"
echo ""
echo "  Next steps:"
echo "    cd ${INSTALL_DIR}/repo"
echo "    cp config.example.yaml config.yaml"
echo "    # Set your API key in config.yaml"
echo "    paganini doctor"
echo "    paganini ingest data/corpus/fidc/"
echo "    paganini query \"Qual o limite de concentração?\""
echo ""
echo -e "  Docs: ${CYAN}https://github.com/${REPO}${NC}"
echo ""
