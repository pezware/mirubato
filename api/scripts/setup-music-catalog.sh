#!/bin/bash

# Setup script for seeding music catalog data to Cloudflare KV
# Usage: ./setup-music-catalog.sh [local|staging|production]

set -e

ENV=${1:-local}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
API_DIR="$SCRIPT_DIR/.."

echo "🎵 Setting up music catalog for environment: $ENV"

# Check if we're in the right directory
if [ ! -f "$API_DIR/package.json" ]; then
    echo "❌ Error: This script must be run from the api/scripts directory"
    exit 1
fi

cd "$API_DIR"

# Generate seed data
echo "📝 Generating seed data..."
npx tsx scripts/seed-music-catalog.ts --env="$ENV"

if [ "$ENV" = "local" ]; then
    echo "🏠 Setting up local KV..."
    
    # Check if dev server is running
    if ! curl -s http://localhost:8787/health > /dev/null 2>&1; then
        echo "⚠️  Warning: API dev server doesn't seem to be running on port 8787"
        echo "💡 Start it in another terminal with: cd api && npm run dev"
        echo ""
        read -p "Press enter when the dev server is running, or Ctrl+C to cancel..."
    fi
    
    # Seed local KV
    echo "🌱 Seeding local KV..."
    wrangler kv bulk put "scripts/music-catalog-bulk-local.json" --namespace-id=music-catalog-local --local
    
    echo "✅ Local music catalog setup complete!"
    echo "🎹 You can now test autocomplete in your local development environment"
    
else
    # For staging/production
    echo ""
    echo "📋 Next steps for $ENV:"
    echo ""
    echo "1. Create KV namespace in Cloudflare Dashboard:"
    echo "   https://dash.cloudflare.com/ > Workers & Pages > KV"
    echo "   Create namespace: mirubato-music-catalog-$ENV"
    echo ""
    echo "2. Update api/wrangler.toml with the namespace ID"
    echo ""
    echo "3. Upload the data:"
    echo "   wrangler kv:bulk put --namespace-id=YOUR_NAMESPACE_ID < scripts/music-catalog-bulk-$ENV.json"
    echo ""
    echo "📁 Seed files generated:"
    echo "   - scripts/music-catalog-seed-$ENV.json (human-readable)"
    echo "   - scripts/music-catalog-bulk-$ENV.json (for upload)"
fi