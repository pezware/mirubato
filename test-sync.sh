#!/bin/bash

# Test sync/push endpoint with sample data

# First, get a valid auth token (you'll need to replace this with a real token)
# For testing, you can get one from the browser's localStorage after logging in

AUTH_TOKEN="${1:-your-auth-token-here}"

# Sample entry data that mimics what the frontend sends
curl -X POST http://localhost:8787/api/sync/push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "changes": {
      "entries": [
        {
          "id": "entry_test123",
          "userId": "user_test",
          "instrument": "Piano",
          "timestamp": "2025-06-27T23:00:00.000Z",
          "duration": 30,
          "pieces": [
            {
              "id": "piece_1",
              "title": "Test Piece",
              "composer": "Test Composer"
            }
          ],
          "techniques": ["scales"],
          "notes": "Test entry for sync",
          "createdAt": "2025-06-27T23:00:00.000Z",
          "updatedAt": "2025-06-27T23:00:00.000Z"
        }
      ],
      "goals": []
    }
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v