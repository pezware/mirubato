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

# Note: These are example PDFs from IMSLP's public domain collection
# You'll need to find the actual direct PDF download links from IMSLP

# Piano pieces - Using direct PDF URLs
# Example: Bach - Prelude in C Major BWV 846
import_score "https://ks4.imslp.info/files/imglnks/usimg/d/d2/IMSLP03819-Bach_-_The_Well_Tempered_Clavier_Book_1_-_01_Prelude_No._1_in_C_Major_BWV_846a.pdf" "Bach - Prelude in C Major"

# For testing with a known working PDF:
import_score "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" "Test PDF Document"

# Note: The other pieces are commented out until we have direct PDF URLs
# import_score "DIRECT_PDF_URL" "Beethoven - Für Elise"
# import_score "DIRECT_PDF_URL" "Chopin - Waltz in A minor"
# import_score "DIRECT_PDF_URL" "Tárrega - Lágrima"
# import_score "DIRECT_PDF_URL" "Sor - Study in B minor"
# import_score "DIRECT_PDF_URL" "Villa-Lobos - Prelude No. 1"

echo ""
echo "🎉 Import process complete!"
echo ""
echo "To check the status:"
echo "curl $API_URL/api/scores | jq"