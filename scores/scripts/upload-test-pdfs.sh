#!/bin/bash

# Upload test PDFs to R2 bucket for local development

echo "Uploading test PDFs to R2..."

# Upload score_01.pdf
echo "Uploading score_01.pdf..."
npx wrangler r2 object put mirubato-scores-local/test-data/score_01.pdf \
  --file=test-data/score_01.pdf \
  --content-type="application/pdf" \
  --env local

# Upload score_02.pdf  
echo "Uploading score_02.pdf..."
npx wrangler r2 object put mirubato-scores-local/test-data/score_02.pdf \
  --file=test-data/score_02.pdf \
  --content-type="application/pdf" \
  --env local

echo "Test PDFs uploaded successfully!"

# List uploaded files
echo "Verifying uploaded files..."
npx wrangler r2 object list mirubato-scores-local --env local --prefix="test-data/"