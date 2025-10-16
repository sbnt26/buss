#!/bin/bash
# Setup cron job for automatic database backups
# Usage: ./scripts/setup-cron.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$PROJECT_DIR/scripts/backup-db.sh"

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"

# Create cron job (runs daily at 2 AM)
CRON_JOB="0 2 * * * cd $PROJECT_DIR && $BACKUP_SCRIPT >> $PROJECT_DIR/logs/backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo "⚠️  Cron job already exists"
    exit 0
fi

# Add cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron job added successfully!"
echo "   Schedule: Daily at 2:00 AM"
echo "   Script: $BACKUP_SCRIPT"
echo ""
echo "To view cron jobs: crontab -l"
echo "To remove cron job: crontab -e"



