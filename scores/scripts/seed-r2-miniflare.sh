#!/bin/bash

# Seeds test PDFs into Miniflare's local R2 storage
# This works with wrangler dev's built-in R2 simulation

echo "📚 Seeding test PDFs to Miniflare R2 storage..."

# Check if wrangler dev is running
if ! curl -s http://localhost:8787/health > /dev/null; then
  echo "❌ Error: wrangler dev doesn't seem to be running!"
  echo "   Please run 'npm run dev' in another terminal first."
  exit 1
fi

echo "📤 Creating placeholder PDFs in local R2..."

# Call the seed endpoint
response=$(curl -s -X POST http://localhost:8787/api/dev/seed)

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Seeding complete!"
  echo ""
  echo "Response: $response"
  echo ""
  echo "📍 Test PDFs should now be available at:"
  echo "   - http://localhost:8787/api/test-data/score_01.pdf"
  echo "   - http://localhost:8787/api/test-data/score_02.pdf"
else
  echo "❌ Failed to seed test data"
  exit 1
fi