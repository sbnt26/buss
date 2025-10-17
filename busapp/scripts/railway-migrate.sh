#!/bin/bash
# Railway database migration script
# Usage: ./scripts/railway-migrate.sh

set -e

echo "🚂 Spouštím migrace na Railway databázi..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI není nainstalované!"
    echo "   Instaluj: npm install -g @railway/cli"
    exit 1
fi

# Check if connected to Railway project
if ! railway status &> /dev/null; then
    echo "❌ Nejsi připojený k Railway projektu!"
    echo "   Spusť: railway link"
    exit 1
fi

echo "📊 Railway projekt: $(railway status | grep Project | cut -d: -f2)"

# Run migration using Railway's DATABASE_URL
echo "🔄 Spouštím migration soubor..."

railway run bash -c 'psql $DATABASE_URL < migrations/001_initial_schema.sql'

if [ $? -eq 0 ]; then
    echo "✅ Migrace úspěšně dokončeny!"
else
    echo "❌ Migrace selhaly!"
    exit 1
fi



