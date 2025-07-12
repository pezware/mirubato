#!/bin/bash

# Secure D1 Database Restore Script
# This script downloads and restores encrypted backups from GitHub artifacts
# DEPRECATED: The automated backup workflow has been removed from the public repository.
#            This script remains for manual backup/restore operations only.

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
ARTIFACT_NAME=""
ENVIRONMENT="staging"
DATABASE="api"  # api or scores
ENCRYPTION_KEY=""
RESTORE_DIR="./restore_temp"

# Usage function
usage() {
    echo "Usage: $0 --artifact <artifact-name> --key <encryption-key> [options]"
    echo ""
    echo "Required:"
    echo "  --artifact <name>     Name of the backup artifact (e.g., db-backup-20250711_110000)"
    echo "  --key <key>          Encryption key for decrypting the backup"
    echo ""
    echo "Options:"
    echo "  --env <environment>  Environment to restore to (staging|production) [default: staging]"
    echo "  --db <database>      Database to restore (api|scores|both) [default: api]"
    echo "  --dir <directory>    Temporary directory for restore files [default: ./restore_temp]"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 --artifact db-backup-20250711_110000 --key 'your-encryption-key' --env staging --db both"
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --artifact)
            ARTIFACT_NAME="$2"
            shift 2
            ;;
        --key)
            ENCRYPTION_KEY="$2"
            shift 2
            ;;
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --db)
            DATABASE="$2"
            shift 2
            ;;
        --dir)
            RESTORE_DIR="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate required arguments
if [ -z "$ARTIFACT_NAME" ] || [ -z "$ENCRYPTION_KEY" ]; then
    print_error "Missing required arguments"
    usage
fi

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Invalid environment: $ENVIRONMENT"
    exit 1
fi

# Validate database selection
if [ "$DATABASE" != "api" ] && [ "$DATABASE" != "scores" ] && [ "$DATABASE" != "both" ]; then
    print_error "Invalid database: $DATABASE"
    exit 1
fi

# Safety check for production
if [ "$ENVIRONMENT" = "production" ]; then
    print_warn "⚠️  You are about to restore to PRODUCTION!"
    print_warn "This will overwrite existing data!"
    read -p "Are you absolutely sure? Type 'yes-restore-production' to continue: " -r
    echo
    if [[ ! $REPLY =~ ^yes-restore-production$ ]]; then
        print_error "Restore cancelled."
        exit 1
    fi
fi

print_info "🚀 Starting database restore process"
print_info "Artifact: $ARTIFACT_NAME"
print_info "Environment: $ENVIRONMENT"
print_info "Database(s): $DATABASE"

# Create restore directory
print_step "Creating restore directory..."
mkdir -p "$RESTORE_DIR"
cd "$RESTORE_DIR"

# Step 1: Download artifact
print_step "Downloading backup artifact..."
print_warn "Please download the artifact manually from GitHub Actions"
print_info "1. Go to: https://github.com/arbeitandy/mirubato/actions/workflows/scheduled-backup.yml"
print_info "2. Find the workflow run with artifact: $ARTIFACT_NAME"
print_info "3. Download the artifact and extract it to: $RESTORE_DIR"
print_info ""
read -p "Press Enter when you have placed the files in $RESTORE_DIR..." -r

# Verify files exist
if ! ls *.enc >/dev/null 2>&1; then
    print_error "No encrypted backup files found in $RESTORE_DIR"
    exit 1
fi

# Step 2: Decrypt backups
print_step "Decrypting backup files..."

decrypt_file() {
    local encrypted_file="$1"
    local decrypted_file="${encrypted_file%.enc}"
    
    print_info "Decrypting $(basename "$encrypted_file")..."
    
    # Decrypt with suppressed output to avoid showing data
    if openssl enc -d -aes-256-cbc -pbkdf2 \
        -in "$encrypted_file" \
        -out "$decrypted_file" \
        -k "$ENCRYPTION_KEY" 2>/dev/null; then
        print_info "✓ Decrypted: $(basename "$decrypted_file")"
        # Securely remove encrypted file after successful decryption
        rm -f "$encrypted_file"
        return 0
    else
        print_error "✗ Failed to decrypt $(basename "$encrypted_file")"
        return 1
    fi
}

# Decrypt all .enc files
for enc_file in *.enc; do
    if [ -f "$enc_file" ]; then
        decrypt_file "$enc_file" || exit 1
    fi
done

# Step 3: Restore databases
print_step "Restoring database(s)..."

restore_database() {
    local db_type="$1"  # api or scores
    local sql_file=""
    local db_name=""
    
    # Find the SQL file
    sql_file=$(ls ${db_type}_*.sql 2>/dev/null | head -1)
    
    if [ -z "$sql_file" ] || [ ! -f "$sql_file" ]; then
        print_warn "No SQL file found for $db_type database"
        return 1
    fi
    
    # Determine database name
    if [ "$db_type" = "api" ]; then
        if [ "$ENVIRONMENT" = "production" ]; then
            db_name="mirubato-prod"
        else
            db_name="mirubato-dev"
        fi
    else
        if [ "$ENVIRONMENT" = "production" ]; then
            db_name="mirubato-scores-production"
        else
            db_name="mirubato-scores-staging"
        fi
    fi
    
    print_info "Restoring $db_type database: $db_name"
    print_info "From file: $sql_file"
    
    # Execute restore
    if wrangler d1 execute "$db_name" \
        --file="$sql_file" \
        --remote \
        --env "$ENVIRONMENT"; then
        print_info "✓ Successfully restored $db_type database"
        # Securely remove SQL file after restore
        shred -vz "$sql_file" 2>/dev/null || rm -f "$sql_file"
    else
        print_error "✗ Failed to restore $db_type database"
        return 1
    fi
}

# Restore based on selection
case "$DATABASE" in
    api)
        restore_database "api" || exit 1
        ;;
    scores)
        restore_database "scores" || exit 1
        ;;
    both)
        restore_database "api" || print_warn "API restore failed, continuing..."
        restore_database "scores" || print_warn "Scores restore failed"
        ;;
esac

# Step 4: Verify restoration
print_step "Verifying restoration..."

verify_database() {
    local db_type="$1"
    local db_name="$2"
    local table="$3"
    
    local count=$(wrangler d1 execute "$db_name" \
        --command "SELECT COUNT(*) as count FROM $table;" \
        --remote \
        --env "$ENVIRONMENT" 2>/dev/null | \
        grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")
    
    if [ "$count" -gt 0 ]; then
        print_info "✓ $db_type database verified: $count records in $table"
    else
        print_warn "⚠ $db_type database may be empty or verification failed"
    fi
}

# Verify based on selection
if [ "$DATABASE" = "api" ] || [ "$DATABASE" = "both" ]; then
    if [ "$ENVIRONMENT" = "production" ]; then
        verify_database "API" "mirubato-prod" "users"
    else
        verify_database "API" "mirubato-dev" "users"
    fi
fi

if [ "$DATABASE" = "scores" ] || [ "$DATABASE" = "both" ]; then
    if [ "$ENVIRONMENT" = "production" ]; then
        verify_database "Scores" "mirubato-scores-production" "scores"
    else
        verify_database "Scores" "mirubato-scores-staging" "scores"
    fi
fi

# Cleanup
print_step "Cleaning up..."
cd ..
rm -rf "$RESTORE_DIR"

print_info "🎉 Database restore completed successfully!"
print_info ""
print_info "IMPORTANT: Please verify your application is working correctly"
print_info "If there are issues, you can use Time Travel to restore to a previous point"