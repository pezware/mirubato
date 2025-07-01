#!/bin/bash

# Test script for PDF import API

echo "🧪 Testing PDF Import API..."
echo ""

# Base URL (change for different environments)
BASE_URL="${1:-http://localhost:9788}"

# Test URLs
BEETHOVEN_URL="https://www.mutopiaproject.org/ftp/BeethovenLv/O27/moonlight/moonlight-a4.pdf"
BACH_URL="https://www.mutopiaproject.org/ftp/BachJS/BWV988/bwv-988-aria/bwv-988-aria-a4.pdf"

echo "📋 Testing health endpoint..."
curl -s "$BASE_URL/api/import/health" | jq '.'
echo ""

echo "🎼 Testing import with Beethoven Moonlight Sonata..."
echo "URL: $BEETHOVEN_URL"
echo ""

RESPONSE=$(curl -s -X POST "$BASE_URL/api/import" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$BEETHOVEN_URL\"}")

echo "Response:"
echo "$RESPONSE" | jq '.'

# Extract score ID if successful
SCORE_ID=$(echo "$RESPONSE" | jq -r '.data.id // empty')

if [ ! -z "$SCORE_ID" ]; then
  echo ""
  echo "✅ Import successful! Score ID: $SCORE_ID"
  echo ""
  echo "📖 Getting score details..."
  curl -s "$BASE_URL/api/import/$SCORE_ID" | jq '.'
else
  echo ""
  echo "❌ Import failed"
  echo ""
  echo "Checking if rate limited..."
  if echo "$RESPONSE" | jq -e '.message | contains("Rate limit")' > /dev/null; then
    echo "⏱️  Rate limited. Try with JWT token:"
    echo "curl -X POST $BASE_URL/api/import -H \"Authorization: Bearer YOUR_JWT\" -H \"Content-Type: application/json\" -d '{\"url\": \"$BEETHOVEN_URL\"}'"
  fi
fi