#!/bin/bash

# Cloudflare AI Import Test Script
# Usage: ./test-ai-import.sh <staging|production> <pdf-url> [ai-provider]

ENV=${1:-staging}
PDF_URL=${2:-"https://www.example.com/sample.pdf"}
AI_PROVIDER=${3:-"hybrid"}

if [ "$ENV" = "staging" ]; then
    API_URL="https://scores-staging.mirubato.com"
else
    API_URL="https://scores.mirubato.com"
fi

echo "🧪 Testing AI Import on $ENV environment"
echo "📄 PDF URL: $PDF_URL"
echo "🤖 AI Provider: $AI_PROVIDER"
echo "🔗 API URL: $API_URL"
echo ""

# Test import
echo "📤 Sending import request..."
RESPONSE=$(curl -s -X POST "$API_URL/api/import" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$PDF_URL\",
    \"aiProvider\": \"$AI_PROVIDER\"
  }")

# Check if request was successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Import successful!"
    echo ""
    echo "📊 Response:"
    echo "$RESPONSE" | jq .
    
    # Extract score ID for follow-up checks
    SCORE_ID=$(echo "$RESPONSE" | jq -r '.data.id')
    echo ""
    echo "📋 Score ID: $SCORE_ID"
    echo ""
    
    # Get import status
    echo "🔍 Checking import status..."
    STATUS_RESPONSE=$(curl -s "$API_URL/api/import/$SCORE_ID")
    echo "$STATUS_RESPONSE" | jq .
else
    echo "❌ Import failed!"
    echo "$RESPONSE" | jq .
    
    # Check rate limit
    if echo "$RESPONSE" | grep -q "429"; then
        echo ""
        echo "⏱️  Rate limit exceeded. Wait 10 minutes before retrying."
    fi
fi

# Health check
echo ""
echo "🏥 API Health Check:"
curl -s "$API_URL/api/import/health" | jq .