#!/bin/bash

# Script to seed test scores into the scores service database
# This creates metadata entries for the test PDFs

echo "🎼 Seeding test scores into scores database..."

# First, ensure we're in the scores directory
cd "$(dirname "$0")/.." || exit 1

# Check if test PDFs exist
if [ ! -f "test-data/score_01.pdf" ] || [ ! -f "test-data/score_02.pdf" ]; then
    echo "❌ Test PDFs not found in test-data/ directory"
    echo "Please ensure score_01.pdf and score_02.pdf are in the test-data/ directory"
    exit 1
fi

# Create SQL file for seeding
cat > scripts/seed-test-scores.sql << 'EOF'
-- Seed test scores into the database
-- These correspond to the PDF files in test-data/

-- Clear existing test data (optional)
DELETE FROM scores WHERE id LIKE 'test_%';

-- Insert test scores
INSERT INTO scores (
    id, title, composer, opus, instrument, difficulty, 
    difficulty_level, style_period, genre, tags, 
    pdf_url, created_at, updated_at
) VALUES 
(
    'test_aire_sureno',
    'Aire Sureño',
    'Agustín Barrios Mangoré',
    NULL,
    'GUITAR',
    'ADVANCED',
    8,
    'ROMANTIC',
    'Classical',
    '["latin-american", "classical-guitar", "barrios", "test"]',
    'score_01.pdf',
    datetime('now'),
    datetime('now')
),
(
    'test_romance_anonimo',
    'Romance (Spanish Romance)',
    'Anonymous',
    NULL,
    'GUITAR',
    'INTERMEDIATE',
    5,
    'ROMANTIC',
    'Classical',
    '["spanish", "classical-guitar", "popular", "test", "multi-page"]',
    'score_02.pdf',
    datetime('now'),
    datetime('now')
);

-- Add to a test collection
INSERT OR IGNORE INTO collections (
    id, name, slug, description, instrument, 
    difficulty, is_featured, created_at, updated_at
) VALUES (
    'col_test_guitar',
    'Test Guitar Pieces',
    'test-guitar-pieces',
    'Sample classical guitar pieces for testing the scorebook feature',
    'GUITAR',
    'INTERMEDIATE',
    1,
    datetime('now'),
    datetime('now')
);

-- Link scores to collection
INSERT OR IGNORE INTO collection_scores (collection_id, score_id, sort_order)
VALUES 
    ('col_test_guitar', 'test_aire_sureno', 1),
    ('col_test_guitar', 'test_romance_anonimo', 2);

EOF

echo "📝 Created seed SQL file"

# Run the migration based on environment
if [ "$1" = "production" ]; then
    echo "🚀 Seeding production database..."
    npx wrangler d1 execute scores-prod --file=scripts/seed-test-scores.sql
elif [ "$1" = "staging" ]; then
    echo "🔧 Seeding staging database..."
    npx wrangler d1 execute scores-staging --file=scripts/seed-test-scores.sql --env staging
else
    echo "💻 Seeding local database..."
    npx wrangler d1 execute scores-local --local --file=scripts/seed-test-scores.sql
fi

echo "✅ Test scores seeded successfully!"
echo ""
echo "📋 Test scores available:"
echo "  - Aire Sureño (Barrios) - 1 page, advanced guitar"
echo "  - Romance (Anonymous) - 3 pages, intermediate guitar"
echo ""
echo "🔗 Access locally at: http://localhost:8787/api/scores"

# Clean up
rm -f scripts/seed-test-scores.sql