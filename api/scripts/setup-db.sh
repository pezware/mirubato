#!/bin/bash

# Setup script for API database

echo "==================================="
echo "Mirubato API Database Setup"
echo "==================================="

# Check if we're in the api directory
if [ ! -f "wrangler.toml" ]; then
  echo "Error: Must run this script from the api directory"
  exit 1
fi

# Function to create database
create_db() {
  local env=$1
  local db_name=$2
  
  echo ""
  echo "Creating D1 database: $db_name"
  echo "-----------------------------------"
  
  # Run the create command and capture output
  output=$(wrangler d1 create $db_name 2>&1)
  echo "$output"
  
  # Try to extract the database ID
  db_id=$(echo "$output" | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' | head -n1)
  
  if [ -n "$db_id" ]; then
    echo ""
    echo "✅ Database created successfully!"
    echo "Database ID: $db_id"
    echo ""
    echo "📝 ACTION REQUIRED:"
    echo "Update the database_id in wrangler.toml for $env environment:"
    echo "database_id = \"$db_id\""
  else
    echo ""
    echo "⚠️  Could not extract database ID from output."
    echo "Please copy the database_id from the output above."
  fi
  echo ""
}

# Parse command line arguments
case "$1" in
  "local")
    echo "Setting up local development database..."
    npm run db:migrate
    ;;
  "staging")
    echo ""
    echo "⚠️  IMPORTANT: The staging database must be created first!"
    echo ""
    echo "Current database_id in wrangler.toml is a placeholder."
    echo "To create the database, run: ./scripts/setup-db.sh create"
    echo ""
    echo "Attempting to run migrations..."
    npm run db:migrate:staging
    ;;
  "production")
    echo ""
    echo "⚠️  IMPORTANT: The production database must be created first!"
    echo ""
    echo "Current database_id in wrangler.toml is a placeholder."
    echo "To create the database, run: ./scripts/setup-db.sh create"
    echo ""
    echo "Attempting to run migrations..."
    npm run db:migrate:production
    ;;
  "create")
    echo ""
    echo "This will create D1 databases for staging and production."
    echo "You'll need to update wrangler.toml with the generated IDs."
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Cancelled."
      exit 1
    fi
    
    # Create databases for all environments
    create_db "staging" "mirubato-api-staging"
    create_db "production" "mirubato-api-production"
    
    echo "==================================="
    echo "✅ Database creation complete!"
    echo ""
    echo "📝 NEXT STEPS:"
    echo "1. Update the database_id values in wrangler.toml"
    echo "2. Run migrations:"
    echo "   ./scripts/setup-db.sh staging"
    echo "   ./scripts/setup-db.sh production"
    echo "==================================="
    ;;
  "check")
    echo ""
    echo "Checking database configuration..."
    echo "==================================="
    
    # Check staging
    staging_id=$(grep -A3 "env.staging.d1_databases" wrangler.toml | grep "database_id" | cut -d'"' -f2)
    if [[ "$staging_id" == "00000000-0000-0000-0000-000000000001" ]]; then
      echo "❌ Staging: Using placeholder ID (needs real database ID)"
    else
      echo "✅ Staging: Database ID configured ($staging_id)"
    fi
    
    # Check production
    prod_id=$(grep -A3 "\[\[d1_databases\]\]" wrangler.toml | grep "database_id" | cut -d'"' -f2)
    if [[ "$prod_id" == "00000000-0000-0000-0000-000000000002" ]]; then
      echo "❌ Production: Using placeholder ID (needs real database ID)"
    else
      echo "✅ Production: Database ID configured ($prod_id)"
    fi
    
    echo "==================================="
    ;;
  *)
    echo "Usage: $0 {local|staging|production|create|check}"
    echo ""
    echo "  local      - Run migrations on local database"
    echo "  staging    - Run migrations on staging database"
    echo "  production - Run migrations on production database"
    echo "  create     - Create new D1 databases (first time setup)"
    echo "  check      - Check if database IDs are configured"
    exit 1
    ;;
esac

echo "Done!"