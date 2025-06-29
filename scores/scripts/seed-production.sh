#!/bin/bash

# Production seeder for Mirubato Scorebook
# This script runs migrations and seeds production with test scores

set -e  # Exit on error

echo "🎵 Mirubato Production Seeder"
echo "============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Safety check
echo -e "${RED}⚠️  WARNING: This will modify the PRODUCTION database!${NC}"
echo -e "${YELLOW}Are you sure you want to continue? (yes/no)${NC}"
read -r confirmation

if [[ "$confirmation" != "yes" ]]; then
  echo "Aborting production seed."
  exit 1
fi

# Step 1: Check current schema
echo -e "${GREEN}📊 Step 1: Checking production database schema...${NC}"
wrangler d1 execute mirubato-scores-production --command "SELECT sql FROM sqlite_master WHERE type='table' AND name='scores'" --remote

# Step 2: Run migrations if needed
echo -e "${GREEN}📊 Step 2: Running migrations...${NC}"

# Check if we need the slug/pdf_url migration
if ! wrangler d1 execute mirubato-scores-production --command "SELECT slug FROM scores LIMIT 1" --remote 2>/dev/null; then
  echo "Running migration to add slug and pdf_url columns..."
  wrangler d1 execute mirubato-scores-production --file=migrations/0003_add_slug_pdf_url.sql --remote
else
  echo "Database already has required columns."
fi

# Step 3: Check existing scores
echo ""
echo -e "${YELLOW}📊 Step 3: Checking existing scores...${NC}"
wrangler d1 execute mirubato-scores-production --command "SELECT id, title, slug FROM scores" --remote

# Step 4: Add test scores
echo ""
echo -e "${GREEN}📚 Step 4: Adding test scores...${NC}"

# Add Aire Sureño
echo "Adding Aire Sureño..."
wrangler d1 execute mirubato-scores-production \
  --command "INSERT OR REPLACE INTO scores (id, title, composer, instrument, difficulty, slug, pdf_url, created_at, created_by) VALUES ('test_aire_sureno', 'Aire Sureño', 'Agustín Barrios Mangoré', 'GUITAR', 'ADVANCED', 'test_aire_sureno', 'test-data/score_01.pdf', datetime('now'), 'system')" \
  --remote

# Add Spanish Romance
echo "Adding Spanish Romance..."
wrangler d1 execute mirubato-scores-production \
  --command "INSERT OR REPLACE INTO scores (id, title, composer, instrument, difficulty, slug, pdf_url, created_at, created_by) VALUES ('test_romance_anonimo', 'Romance (Spanish Romance)', 'Anonymous (arr. Eythor Thorlaksson)', 'GUITAR', 'INTERMEDIATE', 'test_romance_anonimo', 'test-data/score_02.pdf', datetime('now'), 'system')" \
  --remote

# Step 5: Upload PDFs to R2
echo ""
echo -e "${GREEN}📤 Step 5: Uploading PDFs to production R2...${NC}"

echo "Uploading score_01.pdf..."
wrangler r2 object put mirubato-scores-production/test-data/score_01.pdf --file=test-data/score_01.pdf --remote

echo "Uploading score_02.pdf..."
wrangler r2 object put mirubato-scores-production/test-data/score_02.pdf --file=test-data/score_02.pdf --remote

# Step 6: Verify
echo ""
echo -e "${GREEN}✅ Step 6: Verifying data...${NC}"
wrangler d1 execute mirubato-scores-production --command "SELECT id, title, composer, slug, pdf_url FROM scores WHERE id LIKE 'test_%'" --remote

# Test PDF accessibility
echo ""
echo "Testing PDF accessibility..."
echo -n "score_01.pdf: "
curl -s -I https://scores.mirubato.com/files/test-data/score_01.pdf | head -n 1

echo -n "score_02.pdf: "
curl -s -I https://scores.mirubato.com/files/test-data/score_02.pdf | head -n 1

echo ""
echo -e "${GREEN}🎉 Production seeding complete!${NC}"
echo ""
echo "📍 View the scores at:"
echo "   - https://mirubato.com/scorebook/test_aire_sureno"
echo "   - https://mirubato.com/scorebook/test_romance_anonimo"
echo ""
echo "🔍 Check API health:"
echo "   - https://scores.mirubato.com/health"