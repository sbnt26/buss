#!/bin/bash
# Database backup script
# Usage: ./scripts/backup-db.sh

set -e

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/invoicer_backup_$TIMESTAMP.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting database backup..."
echo "   Database: ${DATABASE_NAME:-invoicer_prod}"
echo "   Target: $BACKUP_FILE"

# Perform backup
docker compose exec -T db pg_dump \
    -U "${DATABASE_USER:-invoicer}" \
    "${DATABASE_NAME:-invoicer_prod}" \
    | gzip > "$BACKUP_FILE"

# Check if backup was successful
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup completed successfully!"
    echo "   Size: $BACKUP_SIZE"
    echo "   File: $BACKUP_FILE"
    
    # Clean up old backups (keep last 30 days)
    find "$BACKUP_DIR" -name "invoicer_backup_*.sql.gz" -mtime +30 -delete
    echo "🧹 Cleaned up backups older than 30 days"
else
    echo "❌ Backup failed!"
    exit 1
fi



