#!/bin/bash
# Reset local D1 database and run migrations properly

set -e

echo "🔄 Resetting local D1 database..."

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
API_DIR="$SCRIPT_DIR/.."

cd "$API_DIR"

# Kill any running wrangler processes
echo "⏹️  Stopping any running wrangler processes..."
pkill -f "wrangler dev" || true

# Remove existing D1 state
echo "🗑️  Removing existing D1 state..."
rm -rf .wrangler/state/

# Create the state directory
mkdir -p .wrangler/state

# Start wrangler in the background to create the database
echo "🚀 Starting wrangler to create database..."
timeout 10s npm run dev > /dev/null 2>&1 || true

# Wait for database to be created
sleep 3

# Run migrations
echo "📝 Running migrations..."
npm run db:migrate

echo "✅ Local database reset complete!"
echo ""
echo "You can now start the dev server with: npm run dev"