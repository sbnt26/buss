#!/bin/bash
# Deployment script for production
# Usage: ./scripts/deploy.sh

set -e

echo "🚀 Starting deployment..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production not found!"
    echo "   Please create .env.production with required environment variables"
    exit 1
fi

# Validate environment variables
echo "📋 Validating environment variables..."
node scripts/validate-env.js production

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p backups
mkdir -p logs
mkdir -p uploads/invoices

# Pull latest images
echo "📥 Pulling Docker images..."
docker compose --profile prod pull

# Build application
echo "🔨 Building application..."
docker compose --profile prod build app

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose --profile prod down

# Start database first
echo "🗄️  Starting database..."
docker compose up -d db

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 10

# Run migrations
echo "🔄 Running database migrations..."
docker compose exec -T db psql \
    -U "${DATABASE_USER:-invoicer}" \
    -d "${DATABASE_NAME:-invoicer_prod}" \
    -f /docker-entrypoint-initdb.d/001_initial_schema.sql \
    || echo "Migrations already applied or failed"

# Start all services
echo "🚀 Starting all services..."
docker compose --profile prod up -d

# Wait for application to be ready
echo "⏳ Waiting for application..."
sleep 15

# Health check
echo "🏥 Performing health check..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed!"
    echo "   Check logs with: docker compose logs app"
    exit 1
fi

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Service Status:"
docker compose --profile prod ps
echo ""
echo "📝 View logs: docker compose --profile prod logs -f app"
echo "🛑 Stop services: docker compose --profile prod down"



