#!/bin/bash
# Test sync endpoint on staging with migrated data

# First, let's simulate a login to get a real token
echo "Requesting magic link for test@example.com..."
curl -s -X POST https://apiv2-staging.mirubato.com/api/auth/request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}' | jq

echo -e "\nSince we can't receive emails, let's test the sync/pull endpoint directly..."
echo "Testing sync/pull endpoint (this will fail with auth error, but shows the endpoint is working)..."

curl -X POST https://apiv2-staging.mirubato.com/api/sync/pull \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{}' | jq

echo -e "\nChecking health endpoint..."
curl -s https://apiv2-staging.mirubato.com/health | jq