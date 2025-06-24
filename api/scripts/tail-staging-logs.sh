#!/bin/bash

echo "Tailing staging logs for mirubato-api-staging..."
echo "Press Ctrl+C to stop"
echo ""

# Tail the staging logs
wrangler tail mirubato-api-staging --env staging