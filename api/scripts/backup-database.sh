#!/bin/bash

# D1 Database Backup Script
# This script creates backups of D1 databases before running migrations

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
ENVIRONMENT="staging"
DATABASE_NAME=""
BACKUP_DIR="../mirubato-db-backup"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --db)
            DATABASE_NAME="$2"
            shift 2
            ;;
        --dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--env staging|production] [--db database-name] [--dir backup-directory]"
            exit 1
            ;;
    esac
done

# Determine database name based on environment if not specified
if [ -z "$DATABASE_NAME" ]; then
    case $ENVIRONMENT in
        staging)
            DATABASE_NAME="mirubato-dev"
            ;;
        production)
            DATABASE_NAME="mirubato-prod"
            ;;
        *)
            print_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

print_info "Starting backup for $DATABASE_NAME ($ENVIRONMENT environment)"

# Function to create backup
create_backup() {
    local backup_type=$1
    local options=$2
    local filename="${BACKUP_DIR}/${DATABASE_NAME}_${ENVIRONMENT}_${backup_type}_${TIMESTAMP}.sql"

    print_info "Creating $backup_type backup..."

    if wrangler d1 export "$DATABASE_NAME" --remote --env "$ENVIRONMENT" --output="$filename" $options; then
        print_info "✓ $backup_type backup created: $filename"

        # Get file size
        if [ -f "$filename" ]; then
            local size=$(ls -lh "$filename" | awk '{print $5}')
            print_info "  File size: $size"
        fi
    else
        print_error "Failed to create $backup_type backup"
        return 1
    fi
}

# Create full backup (schema + data)
create_backup "full" ""

# Create schema-only backup
create_backup "schema" "--no-data"

# Get table counts before backup
print_info "Database statistics:"
for table in users sync_data logbook_entries practice_sessions; do
    count=$(wrangler d1 execute "$DATABASE_NAME" --command "SELECT COUNT(*) as count FROM $table;" --remote --env "$ENVIRONMENT" 2>/dev/null | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")
    print_info "  $table: $count records"
done

# Create backup metadata file
METADATA_FILE="${BACKUP_DIR}/${DATABASE_NAME}_${ENVIRONMENT}_metadata_${TIMESTAMP}.json"
cat > "$METADATA_FILE" << EOF
{
  "database": "$DATABASE_NAME",
  "environment": "$ENVIRONMENT",
  "timestamp": "$TIMESTAMP",
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "wrangler_version": "$(wrangler --version | grep -o '[0-9.]*')",
  "backup_files": {
    "full": "${DATABASE_NAME}_${ENVIRONMENT}_full_${TIMESTAMP}.sql",
    "schema": "${DATABASE_NAME}_${ENVIRONMENT}_schema_${TIMESTAMP}.sql"
  }
}
EOF

print_info "✓ Backup metadata saved: $METADATA_FILE"

# Clean up old backups (keep last 10)
print_info "Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t ${DATABASE_NAME}_${ENVIRONMENT}_*.sql 2>/dev/null | tail -n +21 | xargs -r rm -f
cd - > /dev/null

print_info "✅ Backup completed successfully!"
print_info "Backup location: $BACKUP_DIR"

# Show restoration command
echo ""
print_info "To restore from this backup, use:"
echo "  wrangler d1 execute $DATABASE_NAME --file=${BACKUP_DIR}/${DATABASE_NAME}_${ENVIRONMENT}_full_${TIMESTAMP}.sql --remote --env $ENVIRONMENT"
