#!/bin/bash

# Import catalog PDFs using the AI-powered import API
# This script imports PDFs for scores that are in 'pending' status

set -e

# Configuration
ENVIRONMENT=${1:-staging}
AUTH_TOKEN=${2:-}

# Set the API URL based on environment
case $ENVIRONMENT in
  production)
    API_URL="https://scores.mirubato.com"
    ;;
  staging)
    API_URL="https://scores-staging.mirubato.com"
    ;;
  local)
    API_URL="http://scores-mirubato.localhost:9788"
    ;;
  *)
    echo "Usage: $0 [production|staging|local] [auth_token]"
    exit 1
    ;;
esac

echo "🎼 Importing catalog to $ENVIRONMENT environment"
echo "API URL: $API_URL"

# Function to import a score
import_score() {
  local url=$1
  local title=$2
  
  echo "📥 Importing: $title"
  
  if [ -z "$AUTH_TOKEN" ]; then
    response=$(curl -s -X POST "$API_URL/api/import" \
      -H "Content-Type: application/json" \
      -d "{\"url\": \"$url\"}")
  else
    response=$(curl -s -X POST "$API_URL/api/import" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d "{\"url\": \"$url\"}")
  fi
  
  success=$(echo "$response" | jq -r '.success')
  
  if [ "$success" = "true" ]; then
    echo "✅ Success: $title"
    echo "   ID: $(echo "$response" | jq -r '.data.id')"
  else
    echo "❌ Failed: $title"
    echo "   Error: $(echo "$response" | jq -r '.error // .message')"
  fi
  
  # Rate limit pause (adjust based on your limits)
  sleep 10
}

# Import the catalog
echo ""
echo "Starting import process..."
echo "Note: This respects rate limits (1 per 10 minutes for anonymous users)"
echo ""

# Piano pieces
import_score "https://imslp.org/wiki/Special:ImagefromIndex/02085/wxcv" "Bach - Prelude in C Major"
import_score "https://imslp.org/wiki/Special:ImagefromIndex/300406/wx4c" "Beethoven - Für Elise"
import_score "https://imslp.org/wiki/Special:ImagefromIndex/399256/xupd" "Chopin - Waltz in A minor"

# Guitar pieces
import_score "https://imslp.org/wiki/Special:ImagefromIndex/170099/dzzd" "Tárrega - Lágrima"
import_score "https://imslp.org/wiki/Special:ImagefromIndex/419968/gcml" "Sor - Study in B minor"
import_score "https://imslp.org/wiki/Special:ImagefromIndex/419833/gcml" "Villa-Lobos - Prelude No. 1"

echo ""
echo "🎉 Import process complete!"
echo ""
echo "To check the status:"
echo "curl $API_URL/api/scores | jq"