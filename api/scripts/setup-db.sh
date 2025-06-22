#!/bin/bash

# Setup script for API database

echo "Setting up Mirubato API Database..."

# Check if we're in the api directory
if [ ! -f "wrangler.toml" ]; then
  echo "Error: Must run this script from the api directory"
  exit 1
fi

# Function to create database
create_db() {
  local env=$1
  local db_name=$2
  
  echo "Creating D1 database: $db_name"
  wrangler d1 create $db_name
  echo ""
  echo "IMPORTANT: Update the database_id in wrangler.toml for $env environment"
  echo "Look for the database_id in the output above"
  echo ""
}

# Parse command line arguments
case "$1" in
  "local")
    echo "Setting up local development database..."
    npm run db:migrate
    ;;
  "staging")
    echo "Setting up staging database..."
    # Uncomment to create new database:
    # create_db "staging" "mirubato-staging"
    npm run db:migrate:staging
    ;;
  "production")
    echo "Setting up production database..."
    # Uncomment to create new database:
    # create_db "production" "mirubato-production"
    npm run db:migrate:production
    ;;
  "create")
    # Create databases for all environments
    create_db "staging" "mirubato-api-staging"
    create_db "production" "mirubato-api-production"
    ;;
  *)
    echo "Usage: $0 {local|staging|production|create}"
    echo ""
    echo "  local      - Run migrations on local database"
    echo "  staging    - Run migrations on staging database"
    echo "  production - Run migrations on production database"
    echo "  create     - Create new D1 databases (first time setup)"
    exit 1
    ;;
esac

echo "Done!"