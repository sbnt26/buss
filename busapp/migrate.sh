#!/bin/bash
# One-command migration for Railway
# Usage: ./migrate.sh

echo "🚂 Spouštím migrace na Railway databázi..."

railway run sh -c 'cat migrations/001_initial_schema.sql | psql $DATABASE_URL'

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ MIGRACE ÚSPĚŠNÉ!"
    echo ""
    echo "🚀 Teď spusť:"
    echo "   railway run npm run dev"
    echo ""
else
    echo ""
    echo "❌ Migrace selhaly. Zkus Railway Dashboard metodu."
fi



