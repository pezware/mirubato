#!/bin/bash

# Import script for Mutopia Project PDFs
# Respectful of server resources with longer delays

set -e

# Configuration
ENVIRONMENT=${1:-local}
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

echo "🎼 Importing from Mutopia Project to $ENVIRONMENT environment"
echo "API URL: $API_URL"
echo ""
echo "⚠️  Being respectful of Mutopia Project's servers:"
echo "   - Only importing a few pieces"
echo "   - 30 second delay between imports"
echo ""

# Function to import a score
import_score() {
  local url=$1
  local title=$2
  
  echo "📥 Importing: $title"
  echo "   URL: $url"
  
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
  
  echo ""
}

# Import just a few pieces with longer delays
echo "Starting courteous import process..."
echo ""

# Piano piece - Adam's Giselle
import_score "https://www.mutopiaproject.org/ftp/AdamA/giselle/giselle-a4.pdf" "Giselle - Pas de deux by A. Adam"

echo "⏳ Waiting 30 seconds before next import..."
sleep 30

# Guitar piece example (if we find one)
# For now, let's use a test PDF
import_score "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" "Test PDF for Guitar"

echo ""
echo "🎉 Import process complete!"
echo ""
echo "To check imported scores:"
echo "curl $API_URL/api/scores | jq"
echo ""
echo "Note: For production imports, consider:"
echo "1. Getting permission if importing many pieces"
echo "2. Adding attribution to Mutopia Project"
echo "3. Spreading imports over time"