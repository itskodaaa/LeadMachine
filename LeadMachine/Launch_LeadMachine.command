#!/bin/bash
# ==============================================================================
# 🚀 LEAD MACHINE — 1-Click Autonomous Outreach Launcher
# Designed for effortless execution on macOS (Double-click in Finder)
# ==============================================================================

# Change to the script's directory
cd "$(dirname "$0")" || exit 1

# Set Terminal Window Title
echo -ne "\033]0;⚡ Lead Machine Dashboard\007"

clear
echo "======================================================================"
echo "          ⚡ WELCOME TO LEAD MACHINE — AUTONOMOUS OUTREACH          "
echo "======================================================================"
echo ""

# 1. Check Node.js
echo "🔍 Checking Node.js environment..."
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed on your computer."
  echo ""
  echo "Attempting to install via Homebrew..."
  if command -v brew >/dev/null 2>&1; then
    brew install node
  else
    echo "Please download and install Node.js (LTS version) from: https://nodejs.org"
    echo "Press any key to exit..."
    read -n 1
    exit 1
  fi
fi

NODE_VER=$(node -v)
echo "✅ Node.js detected: $NODE_VER"

# 2. Check & Install Dependencies
if [ ! -d "node_modules" ]; then
  echo ""
  echo "📦 Installing required dependencies (first-time setup)..."
  npm install
  if [ $? -ne 0 ]; then
    echo "❌ Error installing npm packages. Please check your internet connection."
    echo "Press any key to exit..."
    read -n 1
    exit 1
  fi
  echo "✅ Dependencies installed successfully."
fi

# 3. Check Puppeteer Chrome Binary
echo ""
echo "🌐 Checking Chromium browser engine..."
CHROME_PATH="/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
if [ ! -f "$CHROME_PATH" ]; then
  echo "Installing Chrome for Testing via Puppeteer..."
  npx puppeteer browsers install chrome
fi
echo "✅ Chromium engine ready."

# 4. Check SQLite Database
echo ""
echo "🗄️ Checking database..."
if [ ! -f "data/leads.db" ]; then
  mkdir -p data
  echo "Creating database schema..."
  node -e "
    const Database = require('better-sqlite3');
    const db = new Database('data/leads.db');
    db.pragma('journal_mode = WAL');
    db.exec('CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, company_name TEXT NOT NULL, website TEXT NOT NULL UNIQUE, city TEXT, state TEXT, phone TEXT, email TEXT, contact_person TEXT, status TEXT DEFAULT \'not_contacted\', notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);');
    db.close();
  "
fi
echo "✅ Database verified."

# 5. macOS Mail.app Suppression
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo ""
  echo "🛡️ Configuring macOS popup protection..."
  swift -e 'import Foundation; import CoreServices; LSSetDefaultHandlerForURLScheme("mailto" as NSString as CFString, "com.google.Chrome" as NSString as CFString); LSSetDefaultHandlerForURLScheme("tel" as NSString as CFString, "com.google.Chrome" as NSString as CFString);' >/dev/null 2>&1
  pgrep -x "Mail" >/dev/null 2>&1 && pkill -9 -x "Mail" >/dev/null 2>&1
  echo "✅ Mail.app suppression active."
fi

# 6. Launch Server & Open Browser
echo ""
echo "======================================================================"
echo "🚀 Starting Lead Machine Web Dashboard on http://localhost:3333..."
echo "======================================================================"
echo ""

# Launch web browser after brief 1s pause
(sleep 1.5 && open "http://localhost:3333" 2>/dev/null || xdg-open "http://localhost:3333" 2>/dev/null) &

# Run Node server
node lead-machine/server.mjs
