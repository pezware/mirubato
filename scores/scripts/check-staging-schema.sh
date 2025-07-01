#!/bin/bash

echo "Checking staging database schema..."
echo ""

# Check scores table columns
echo "=== SCORES TABLE COLUMNS ==="
wrangler d1 execute DB --env staging --command "PRAGMA table_info(scores);" --json | \
  jq -r '.[] | .results[] | "\(.name) - \(.type)"'

echo ""
echo "=== CHECKING FOR IMPORT COLUMNS ==="
columns=(
  "created_by"
  "subtitle"
  "year"
  "description" 
  "file_name"
  "source_url"
  "imported_at"
  "ai_metadata"
)

for col in "${columns[@]}"; do
  result=$(wrangler d1 execute DB --env staging --command "SELECT COUNT(*) as has_col FROM pragma_table_info('scores') WHERE name='$col';" --json | jq -r '.[0].results[0].has_col')
  if [ "$result" -eq "1" ]; then
    echo "✓ $col exists"
  else
    echo "✗ $col missing"
  fi
done

echo ""
echo "=== MIGRATION HISTORY ==="
wrangler d1 execute DB --env staging --command "SELECT * FROM d1_migrations ORDER BY id;" --json | \
  jq -r '.[] | .results[] | "[\(.id)] \(.name) - applied at \(.applied_at)"'