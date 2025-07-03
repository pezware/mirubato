#!/bin/bash

# Safe Migration Script with Automatic Backup
# This script creates a backup before running D1 migrations

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Default values
ENVIRONMENT="staging"
SKIP_BACKUP=false
BACKUP_DIR="./backups"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -h|--help)
            echo "Safe Migration Script - Run D1 migrations with automatic backup"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --env <environment>    Environment to migrate (staging|production) [default: staging]"
            echo "  --skip-backup         Skip backup creation (NOT RECOMMENDED)"
            echo "  --backup-dir <dir>    Backup directory [default: ./backups]"
            echo "  -h, --help           Show this help message"
            echo ""
            echo "Example:"
            echo "  $0 --env production"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Safety check for production
if [ "$ENVIRONMENT" = "production" ]; then
    print_warn "⚠️  You are about to run migrations on PRODUCTION!"
    print_warn "This will affect live user data."
    read -p "Are you absolutely sure? Type 'yes' to continue: " -r
    echo
    if [[ ! $REPLY =~ ^yes$ ]]; then
        print_error "Migration cancelled."
        exit 1
    fi
fi

print_info "🚀 Starting safe migration for $ENVIRONMENT environment"

# Step 1: Create backup (unless skipped)
if [ "$SKIP_BACKUP" = false ]; then
    print_step "Creating database backup..."
    
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    if [ -f "$SCRIPT_DIR/backup-database.sh" ]; then
        if "$SCRIPT_DIR/backup-database.sh" --env "$ENVIRONMENT" --dir "$BACKUP_DIR"; then
            print_info "✓ Backup completed successfully"
        else
            print_error "Backup failed! Migration aborted for safety."
            exit 1
        fi
    else
        print_error "Backup script not found at $SCRIPT_DIR/backup-database.sh"
        exit 1
    fi
else
    print_warn "⚠️  Skipping backup as requested (NOT RECOMMENDED)"
fi

# Step 2: Show pending migrations
print_step "Checking pending migrations..."
echo ""

# Step 3: Run migrations
print_step "Running migrations..."
if wrangler d1 migrations apply DB --env "$ENVIRONMENT" --remote; then
    print_info "✅ Migrations completed successfully!"
else
    print_error "❌ Migration failed!"
    
    if [ "$SKIP_BACKUP" = false ]; then
        print_info "You can restore from the backup created earlier:"
        LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*_"${ENVIRONMENT}"_full_*.sql 2>/dev/null | head -1)
        if [ -n "$LATEST_BACKUP" ]; then
            echo "  wrangler d1 execute <database-name> --file=$LATEST_BACKUP --remote --env $ENVIRONMENT"
        fi
    fi
    
    exit 1
fi

# Step 4: Verify database integrity (basic check)
print_step "Verifying database integrity..."

# Get database name based on environment
case $ENVIRONMENT in
    staging)
        DATABASE_NAME="mirubato-dev"
        ;;
    production)
        DATABASE_NAME="mirubato-prod"
        ;;
esac

# Basic integrity check - verify key tables exist and have expected structure
TABLES_TO_CHECK="users sync_data logbook_entries"
FAILED_CHECKS=0

for table in $TABLES_TO_CHECK; do
    if wrangler d1 execute "$DATABASE_NAME" --command "SELECT COUNT(*) FROM $table;" --remote --env "$ENVIRONMENT" >/dev/null 2>&1; then
        print_info "  ✓ Table $table is accessible"
    else
        print_error "  ✗ Table $table is NOT accessible"
        ((FAILED_CHECKS++))
    fi
done

if [ $FAILED_CHECKS -gt 0 ]; then
    print_error "⚠️  Database integrity check failed! Some tables are not accessible."
    print_warn "Consider restoring from backup if this is unexpected."
else
    print_info "✓ Database integrity check passed"
fi

print_info "🎉 Migration process completed!"