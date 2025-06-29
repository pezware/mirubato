#!/bin/bash

# Direct staging seeder - skips migrations and just adds test scores

set -e  # Exit on error

echo "🎵 Mirubato Staging Direct Seeder"
echo "================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# First, let's check what's already in the database
echo -e "${YELLOW}📊 Checking existing scores in staging...${NC}"
wrangler d1 execute mirubato-scores-staging --command "SELECT id, title, slug FROM scores" --remote

echo ""
echo -e "${GREEN}📚 Adding/Updating test scores...${NC}"

# Add Aire Sureño
echo "Adding Aire Sureño..."
wrangler d1 execute mirubato-scores-staging \
  --command "INSERT OR REPLACE INTO scores (id, title, composer, instrument, difficulty, slug, pdf_url, created_at, created_by) VALUES ('test_aire_sureno', 'Aire Sureño', 'Agustín Barrios Mangoré', 'GUITAR', 'ADVANCED', 'test_aire_sureno', 'test-data/score_01.pdf', datetime('now'), 'system')" \
  --remote

# Add Spanish Romance
echo "Adding Spanish Romance..."
wrangler d1 execute mirubato-scores-staging \
  --command "INSERT OR REPLACE INTO scores (id, title, composer, instrument, difficulty, slug, pdf_url, created_at, created_by) VALUES ('test_romance_anonimo', 'Romance (Spanish Romance)', 'Anonymous (arr. Eythor Thorlaksson)', 'GUITAR', 'INTERMEDIATE', 'test_romance_anonimo', 'test-data/score_02.pdf', datetime('now'), 'system')" \
  --remote

echo ""
echo -e "${GREEN}✅ Verifying data...${NC}"
wrangler d1 execute mirubato-scores-staging --command "SELECT id, title, composer, slug, pdf_url FROM scores WHERE id LIKE 'test_%'" --remote

echo ""
echo -e "${YELLOW}📤 PDF Upload Instructions${NC}"
echo "The database now has the score entries, but PDFs need to be uploaded to R2."
echo ""
echo "Option A: Use the Cloudflare Dashboard"
echo "  1. Go to https://dash.cloudflare.com"
echo "  2. Navigate to R2 → mirubato-scores-staging"
echo "  3. Create a folder called 'test-data'"
echo "  4. Upload the PDFs from scores/test-data/ folder:"
echo "     - score_01.pdf"
echo "     - score_02.pdf"
echo ""
echo "Option B: Use wrangler R2 commands (if you have access)"
echo "  wrangler r2 object put mirubato-scores-staging/test-data/score_01.pdf --file=test-data/score_01.pdf --env staging"
echo "  wrangler r2 object put mirubato-scores-staging/test-data/score_02.pdf --file=test-data/score_02.pdf --env staging"
echo ""

echo -e "${GREEN}🎉 Database seeding complete!${NC}"
echo ""
echo "📍 After uploading PDFs, view the scores at:"
echo "   - https://mirubato.pezware.workers.dev/scorebook/test_aire_sureno"
echo "   - https://mirubato.pezware.workers.dev/scorebook/test_romance_anonimo"
echo ""
echo "🔍 Check API health:"
echo "   - https://scores.mirubato.pezware.workers.dev/health"