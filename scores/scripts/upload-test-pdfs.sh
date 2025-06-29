#!/bin/bash

# Upload test PDFs to R2 bucket for local development

echo "Uploading test PDFs to R2..."

# Check if test-data directory exists
if [ ! -d "test-data" ]; then
  echo "Error: test-data directory not found!"
  echo "Make sure you're running this script from the scores directory."
  exit 1
fi

# Upload score_01.pdf
echo "Uploading score_01.pdf..."
npx wrangler r2 object put mirubato-scores-local/test-data/score_01.pdf \
  --file=test-data/score_01.pdf \
  --local

# Upload score_02.pdf  
echo "Uploading score_02.pdf..."
npx wrangler r2 object put mirubato-scores-local/test-data/score_02.pdf \
  --file=test-data/score_02.pdf \
  --local

echo "Test PDFs uploaded successfully!"

# List uploaded files
echo "Verifying uploaded files..."
npx wrangler r2 object list mirubato-scores-local --local