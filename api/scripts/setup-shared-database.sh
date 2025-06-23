#!/bin/bash

# Setup script to share D1 database between backend and API locally
# This copies the backend database to API to ensure consistency

set -e

echo "Setting up shared D1 database between backend and API..."

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
API_DIR="$SCRIPT_DIR/../.."
BACKEND_DIR="$API_DIR/../backend"

# Check if we're in the right place
if [ ! -f "$API_DIR/wrangler.toml" ]; then
    echo "Error: Cannot find api/wrangler.toml. Please run this script from the api/scripts directory."
    exit 1
fi

if [ ! -f "$BACKEND_DIR/wrangler.toml" ]; then
    echo "Error: Cannot find backend/wrangler.toml. Is the backend directory in the right place?"
    exit 1
fi

# Create .wrangler directory structure if it doesn't exist
mkdir -p "$API_DIR/.wrangler/state/v3/d1"

# Check if backend database exists
if [ ! -d "$BACKEND_DIR/.wrangler/state/v3/d1/miniflare-D1DatabaseObject" ]; then
    echo "Error: Backend database not found. Please run the backend at least once to create the database."
    exit 1
fi

# Remove existing API database if it exists
if [ -e "$API_DIR/.wrangler/state/v3/d1/miniflare-D1DatabaseObject" ]; then
    echo "Backing up existing API database..."
    mv "$API_DIR/.wrangler/state/v3/d1/miniflare-D1DatabaseObject" "$API_DIR/.wrangler/state/v3/d1/miniflare-D1DatabaseObject.bak.$(date +%Y%m%d_%H%M%S)"
fi

# Copy backend database to API
echo "Copying backend database to API..."
cp -r "$BACKEND_DIR/.wrangler/state/v3/d1/miniflare-D1DatabaseObject" "$API_DIR/.wrangler/state/v3/d1/"

# Run API migrations
echo "Running API migrations..."
cd "$API_DIR"
npm run db:migrate

echo "✅ Database setup complete!"
echo ""
echo "The API now has a copy of the backend database with API-specific tables added."
echo "This ensures both services can work with the same data during local development."
echo ""
echo "Note: You may need to restart your dev servers for changes to take effect."