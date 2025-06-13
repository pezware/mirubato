#!/bin/bash

# Setup local D1 database for UAT testing

echo "🔧 Setting up local D1 database for UAT testing..."

# Create the database if it doesn't exist
echo "📦 Creating local D1 database..."
npx wrangler d1 create DB --local 2>/dev/null || echo "Database already exists"

# Apply migrations
echo "🚀 Applying migrations..."
npx wrangler d1 migrations apply DB --local --env local

echo "✅ Local D1 database setup complete!"
echo ""
echo "To run UAT tests:"
echo "  npm run test:uat"
echo ""
echo "To run UAT tests in watch mode:"
echo "  npm run test:uat:watch"