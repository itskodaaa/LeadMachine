#!/usr/bin/env bash
# ==============================================================================
# LEAD MACHINE - ENTERPRISE EDITION
# Universal One-Line Automated Installer & Updater for macOS & Linux
# ==============================================================================
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/itskodaaa/LeadMachine/master/install.sh | bash
# ==============================================================================

set -e

APP_NAME="Lead Machine"
APP_VERSION="2.1.2"
INSTALL_DIR="${HOME}/.leadmachine"

echo "======================================================================"
echo "         LEAD MACHINE ENTERPRISE EDITION - ONE-CLICK INSTALLER         "
echo "                           Version ${APP_VERSION}                     "
echo "======================================================================"
echo ""
echo "[*] Target Installation Directory: ${INSTALL_DIR}"

mkdir -p "${INSTALL_DIR}/data"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || echo "")"

if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/package.json" ]; then
  echo "[1/4] Copying files from local distribution..."
  rsync -av --exclude='.git' --exclude='node_modules' --exclude='data' "$SCRIPT_DIR/" "${INSTALL_DIR}/"
  if [ -f "$SCRIPT_DIR/data/leads.db" ] && [ ! -f "${INSTALL_DIR}/data/leads.db" ]; then
    cp "$SCRIPT_DIR/data/leads.db" "${INSTALL_DIR}/data/leads.db"
  fi
else
  echo "[1/4] Fetching latest archive..."
  TMP_ZIP="/tmp/leadmachine_$$.zip"
  TMP_DIR="/tmp/leadmachine_extract_$$"
  curl -fsSL "https://github.com/itskodaaa/LeadMachine/archive/refs/heads/master.zip" -o "$TMP_ZIP" || true
  if [ -f "$TMP_ZIP" ]; then
    unzip -q -o "$TMP_ZIP" -d "$TMP_DIR"
    cp -R "$TMP_DIR"/*/* "${INSTALL_DIR}/"
    rm -rf "$TMP_ZIP" "$TMP_DIR"
  fi
fi

echo "[2/4] Verifying Node.js runtime..."
if ! command -v node >/dev/null 2>&1; then
  echo "[!] Node.js not detected. Please install Node.js (v18+) from https://nodejs.org"
  exit 1
fi
echo "[OK] Node.js $(node -v) detected."

echo "[3/4] Checking dependencies..."
cd "${INSTALL_DIR}"
if [ ! -d "node_modules" ]; then
  npm install --omit=dev --no-audit --no-fund
fi

echo "[4/4] Starting Lead Machine..."
chmod +x "${INSTALL_DIR}/start_lead_machine.sh"
echo "======================================================================"
echo "  INSTALLATION COMPLETE! Access dashboard at: http://localhost:3333   "
echo "======================================================================"
"${INSTALL_DIR}/start_lead_machine.sh"
