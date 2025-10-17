#!/bin/bash
# Quick migration runner for Railway
set -e

echo "🔄 Spouštím migrace na Railway databázi..."
echo ""

# Get Railway DATABASE_URL and run migrations
railway run bash << 'EOF'
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL není nastavená!"
    exit 1
fi

echo "📊 DATABASE_URL nalezena"
echo "🔄 Aplikuji migrace..."
echo ""

psql "$DATABASE_URL" << 'SQL'
-- Migrace...
$(cat migrations/001_initial_schema.sql)
SQL

echo ""
echo "✅ Migrace dokončeny!"
EOF

echo ""
echo "🎉 HOTOVO! Teď spusť:"
echo "   railway run npm run dev"
