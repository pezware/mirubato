#!/bin/bash

# Test import script for local development
# Uses test PDFs to verify the import functionality

set -e

API_URL="http://scores-mirubato.localhost:9788"

echo "🧪 Testing import functionality locally..."
echo ""

# Test with a simple PDF
echo "1. Testing with W3C dummy PDF..."
curl -s -X POST "$API_URL/api/import" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  }' | jq

echo ""
echo "2. Testing with Bach Prelude PDF from IMSLP..."
curl -s -X POST "$API_URL/api/import" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://ks4.imslp.info/files/imglnks/usimg/d/d2/IMSLP03819-Bach_-_The_Well_Tempered_Clavier_Book_1_-_01_Prelude_No._1_in_C_Major_BWV_846a.pdf"
  }' | jq

echo ""
echo "✅ Test complete! Check the results above."
echo ""
echo "To view all scores:"
echo "curl $API_URL/api/scores | jq"