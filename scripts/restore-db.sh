#!/bin/bash
# Database restore script
# Usage: ./scripts/restore-db.sh <backup_file>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 ./backups/invoicer_backup_20250115_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

echo "⚠️  WARNING: This will restore the database from backup."
echo "   Database: ${DATABASE_NAME:-invoicer_prod}"
echo "   Backup: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

echo "🔄 Starting database restore..."

# Restore backup
gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql \
    -U "${DATABASE_USER:-invoicer}" \
    "${DATABASE_NAME:-invoicer_prod}"

echo "✅ Database restored successfully!"



