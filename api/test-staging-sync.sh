#!/bin/bash

# Test sync/push endpoint on staging
echo "Testing sync/push endpoint on staging..."
echo ""

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

# Use a test token or provide via environment variable
if [ -z "$AUTH_TOKEN" ]; then
    echo "Warning: No AUTH_TOKEN provided. Request will fail with 401."
    echo "To test properly, set AUTH_TOKEN='Bearer your-token-here'"
    AUTH_TOKEN="Bearer test-token"
fi

echo "Sending payload to staging..."
curl -X POST https://apiv2-staging.mirubato.com/api/sync/push \
  -H "Content-Type: application/json" \
  -H "Authorization: $AUTH_TOKEN" \
  -d "$PAYLOAD" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v 2>&1 | grep -E "(< HTTP|< |{|})"|sed 's/< //'