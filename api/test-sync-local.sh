#!/bin/bash

# Test sync/push endpoint locally
# First, you need to get a valid auth token from the browser

echo "Testing sync/push endpoint locally..."
echo "Make sure the API is running locally with: npm run dev"
echo ""

# Check if AUTH_TOKEN is provided
if [ -z "$AUTH_TOKEN" ]; then
    echo "Error: Please provide AUTH_TOKEN environment variable"
    echo "You can get this from the browser dev tools:"
    echo "1. Open the browser console"
    echo "2. Look for Authorization header in network requests"
    echo "3. Copy the Bearer token"
    echo "4. Run: AUTH_TOKEN='Bearer your-token-here' ./test-sync-local.sh"
    exit 1
fi

# Test payload from the frontend
PAYLOAD='{
  "changes": {
    "entries": [
      {
        "timestamp": "2025-06-23T22:32:52.797Z",
        "duration": 30,
        "type": "PRACTICE",
        "instrument": "PIANO",
        "pieces": [],
        "techniques": [],
        "goalIds": [],
        "notes": "",
        "tags": [],
        "metadata": { "source": "manual" },
        "id": "entry_1750717972797_0suwq20o8",
        "createdAt": "2025-06-23T22:32:52.797Z",
        "updatedAt": "2025-06-23T22:32:52.797Z"
      }
    ]
  }
}'

echo "Sending payload:"
echo "$PAYLOAD" | jq .

echo ""
echo "Response:"
curl -X POST http://localhost:8787/api/sync/push \
  -H "Content-Type: application/json" \
  -H "Authorization: $AUTH_TOKEN" \
  -d "$PAYLOAD" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  | jq .