#!/bin/bash
# Railway database migration using Docker (no local psql needed)
# Usage: ./scripts/railway-migrate-docker.sh

set -e

echo "🐳 Spouštím migrace pomocí Dockeru..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker není spuštěný!"
    echo "   Prosím spusť Docker Desktop a zkus to znovu."
    exit 1
fi

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI není nainstalované!"
    echo "   Instaluj: npm install -g @railway/cli"
    exit 1
fi

echo "📊 Získávám DATABASE_URL z Railway..."

# Get DATABASE_URL from Railway
DATABASE_URL=$(railway variables get DATABASE_URL 2>/dev/null)

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Nepodařilo se získat DATABASE_URL!"
    echo "   Ujisti se, že máš PostgreSQL přidanou v Railway projektu."
    exit 1
fi

echo "✅ DATABASE_URL získána"
echo "🔄 Spouštím migrace..."

# Run psql in Docker container with Railway DATABASE_URL
docker run --rm \
  -v "$(pwd)/migrations:/migrations" \
  -e PGPASSWORD="${DATABASE_URL#*:*@}" \
  postgres:16-alpine \
  psql "$DATABASE_URL" -f /migrations/001_initial_schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Migrace úspěšně dokončeny!"
    echo ""
    echo "📊 Ověř v Railway dashboard nebo spusť:"
    echo "   railway connect postgres"
    echo "   \\dt   (seznam tabulek)"
else
    echo "❌ Migrace selhaly!"
    exit 1
fi



