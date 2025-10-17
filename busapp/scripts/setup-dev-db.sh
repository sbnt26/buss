#!/bin/bash
# Setup development database using Docker
# Usage: ./scripts/setup-dev-db.sh

set -e

echo "🚀 Nastavuji vývojovou databázi..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker není spuštěný!"
    echo "   Prosím spusť Docker Desktop a zkus to znovu."
    exit 1
fi

# Stop existing container if running
docker stop invoicer-dev-db 2>/dev/null || true
docker rm invoicer-dev-db 2>/dev/null || true

# Start PostgreSQL container
echo "📦 Spouštím PostgreSQL kontejner..."
docker run -d \
  --name invoicer-dev-db \
  -e POSTGRES_USER=invoicer \
  -e POSTGRES_PASSWORD=invoicer_dev_password \
  -e POSTGRES_DB=invoicer_dev \
  -p 5432:5432 \
  postgres:16-alpine

# Wait for PostgreSQL to be ready
echo "⏳ Čekám na spuštění databáze..."
sleep 5

# Check if database is ready
until docker exec invoicer-dev-db pg_isready -U invoicer > /dev/null 2>&1; do
  echo "   Databáze se ještě spouští..."
  sleep 2
done

echo "✅ PostgreSQL databáze běží!"

# Run migrations
echo "🔄 Spouštím migrace..."
docker exec -i invoicer-dev-db psql -U invoicer -d invoicer_dev < migrations/001_initial_schema.sql

echo ""
echo "✅ Databáze je připravená!"
echo ""
echo "📊 Detaily připojení:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: invoicer_dev"
echo "   User: invoicer"
echo "   Password: invoicer_dev_password"
echo ""
echo "📝 DATABASE_URL pro .env.local:"
echo "   DATABASE_URL=postgresql://invoicer:invoicer_dev_password@localhost:5432/invoicer_dev"
echo ""
echo "🛑 Pro zastavení: docker stop invoicer-dev-db"
echo "🗑️  Pro smazání: docker rm invoicer-dev-db"



