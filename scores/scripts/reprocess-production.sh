#!/bin/bash

# Script to reprocess imported PDFs in production/staging
# Usage: ./reprocess-production.sh [staging|production] [admin-token]

ENV=${1:-staging}
ADMIN_TOKEN=${2:-$MIRUBATO_ADMIN_TOKEN}

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Error: Admin token required"
  echo "Usage: $0 [staging|production] [admin-token]"
  echo "Or set MIRUBATO_ADMIN_TOKEN environment variable"
  exit 1
fi

if [ "$ENV" == "production" ]; then
  API_URL="https://scores.mirubato.com/api"
elif [ "$ENV" == "staging" ]; then
  API_URL="https://scores-staging.mirubato.com/api"
else
  echo "❌ Error: Invalid environment. Use 'staging' or 'production'"
  exit 1
fi

echo "🔍 Checking for PDFs that need reprocessing on $ENV..."
echo "API URL: $API_URL"

# First, do a dry run to see what needs reprocessing
echo -e "\n📋 Dry run (checking first 50 scores)..."
DRY_RUN_RESPONSE=$(curl -s -X POST "$API_URL/admin/reprocess-imports" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "limit": 50}')

if [ $? -ne 0 ]; then
  echo "❌ Failed to connect to API"
  exit 1
fi

# Check if response contains an error
if echo "$DRY_RUN_RESPONSE" | grep -q '"success":false'; then
  echo "❌ API Error:"
  echo "$DRY_RUN_RESPONSE" | jq .
  exit 1
fi

# Parse the response
NEED_REPROCESSING=$(echo "$DRY_RUN_RESPONSE" | jq -r '.scores | length')

if [ "$NEED_REPROCESSING" == "0" ]; then
  echo "✅ No scores need reprocessing!"
  exit 0
fi

echo "Found $NEED_REPROCESSING scores that need reprocessing:"
echo "$DRY_RUN_RESPONSE" | jq -r '.scores[] | "  - \(.title) (ID: \(.id))"'

# Ask for confirmation
echo -e "\n⚠️  This will reprocess these scores in $ENV environment."
echo "Are you sure? (y/N)"
read -r CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "❌ Cancelled"
  exit 0
fi

# Do the actual reprocessing
echo -e "\n🔄 Starting reprocessing..."
REPROCESS_RESPONSE=$(curl -s -X POST "$API_URL/admin/reprocess-imports" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false, "limit": 50}')

if [ $? -ne 0 ]; then
  echo "❌ Failed to reprocess"
  exit 1
fi

# Show results
echo -e "\n📊 Results:"
echo "$REPROCESS_RESPONSE" | jq .

# Check specific score status (optional)
if [ -n "$3" ]; then
  SCORE_ID=$3
  echo -e "\n🔍 Checking status of score $SCORE_ID..."
  curl -s -X GET "$API_URL/admin/score-status/$SCORE_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
fi

echo -e "\n✅ Done!"