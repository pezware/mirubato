#!/bin/bash

# Setup script to share D1 database between backend and API locally
# This ensures both services use the same database during development

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

# Remove existing API database if it exists
if [ -e "$API_DIR/.wrangler/state/v3/d1/miniflare-D1DatabaseObject" ]; then
    echo "Removing existing API database directory..."
    rm -rf "$API_DIR/.wrangler/state/v3/d1/miniflare-D1DatabaseObject"
fi

# Create symlink to backend database
echo "Creating symlink to backend database..."
cd "$API_DIR/.wrangler/state/v3/d1"
ln -s "../../../../../backend/.wrangler/state/v3/d1/miniflare-D1DatabaseObject" miniflare-D1DatabaseObject

echo "✅ Database sharing setup complete!"
echo ""
echo "The API will now use the same local D1 database as the backend."
echo "This ensures data consistency during local development."
echo ""
echo "Note: You may need to restart your dev servers for changes to take effect."