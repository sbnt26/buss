#!/bin/bash
# Setup Railway development environment
# Usage: ./scripts/setup-railway-dev.sh

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         🚂 Railway Development Setup                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI není nainstalované!"
    echo "   Instaluj: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI nalezeno"

# Check project
if ! railway status &> /dev/null; then
    echo "❌ Nejsi připojený k Railway projektu!"
    echo "   Spusť: railway link"
    exit 1
fi

echo "✅ Railway projekt připojen"
echo ""

# Step 1: Run migrations
echo "📊 KROK 1: Spouštění migrací..."
echo ""
echo "⚠️  DŮLEŽITÉ: Otevřu ti Railway dashboard."
echo "   1. Klikni na 'PostgreSQL'"
echo "   2. Záložka 'Data' → 'Query'"
echo "   3. Zkopíruj obsah z: migrations/001_initial_schema.sql"
echo "   4. Spusť query kliknutím na 'Execute'"
echo ""

railway open

echo ""
echo -n "✅ Spustil jsi migrace v Railway dashboard? (y/n): "
read -r answer

if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    echo "❌ Migrace nejsou spuštěné. Prosím dokonči je a spusť skript znovu."
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         ✅ HOTOVO! Aplikace je připravená                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 SPUSŤ APLIKACI:"
echo "   railway run npm run dev"
echo ""
echo "📱 OTEVŘI V PROHLÍŽEČI:"
echo "   http://localhost:3000/signup"
echo ""



