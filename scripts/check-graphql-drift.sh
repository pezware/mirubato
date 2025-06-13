#!/bin/bash
set -e

echo "🔍 Checking for GraphQL schema drift..."

# Navigate to frontend directory
cd frontend

# Run codegen
echo "📝 Generating GraphQL types..."
npm run codegen

# Check if there are any uncommitted changes to generated files
if git diff --exit-code src/generated/; then
  echo "✅ GraphQL schema is in sync!"
  exit 0
else
  echo "❌ GraphQL schema drift detected!"
  echo "Generated files have changed. This means:"
  echo "1. The backend schema has changed, or"
  echo "2. Frontend queries don't match the schema"
  echo ""
  echo "Please run 'npm run codegen' in the frontend directory and commit the changes."
  exit 1
fi