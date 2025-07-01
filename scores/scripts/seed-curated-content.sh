#!/bin/bash

# Script to seed curated public domain scores into the scores service database
# This creates metadata entries for our 10 selected pieces from IMSLP

echo "🎼 Seeding curated public domain scores into scores database..."

# First, ensure we're in the scores directory
cd "$(dirname "$0")/.." || exit 1

# Create the directory structure for PDFs
echo "📁 Creating directory structure for PDFs..."
mkdir -p music-library/piano
mkdir -p music-library/guitar

# Run migrations first to ensure columns exist
echo "📝 Running migrations to ensure schema is up to date..."
if [ "$1" = "production" ]; then
    echo "🚀 Running migrations on production database..."
    npx wrangler d1 migrations apply DB --env production
elif [ "$1" = "staging" ]; then
    echo "🔧 Running migrations on staging database..."
    npx wrangler d1 migrations apply DB --env staging
else
    echo "💻 Running migrations on local database..."
    npx wrangler d1 migrations apply DB --local --env local
fi

# Run the seeding SQL
echo "🌱 Seeding curated scores..."
if [ "$1" = "production" ]; then
    echo "🚀 Seeding production database..."
    npx wrangler d1 execute DB --file=scripts/seed-curated-scores.sql --env production
elif [ "$1" = "staging" ]; then
    echo "🔧 Seeding staging database..."
    npx wrangler d1 execute DB --file=scripts/seed-curated-scores.sql --env staging
else
    echo "💻 Seeding local database..."
    npx wrangler d1 execute DB --local --file=scripts/seed-curated-scores.sql --env local
fi

echo "✅ Curated scores seeded successfully!"
echo ""
echo "📋 10 public domain scores added:"
echo ""
echo "🎹 Piano pieces:"
echo "  1. Bach - Prelude in C Major (BWV 846) - Beginner"
echo "  2. Beethoven - Für Elise - Early Intermediate"
echo "  3. Chopin - Waltz in A minor - Intermediate"
echo "  4. Mozart - Sonata No. 11 K.331 (1st mov) - Intermediate"
echo "  5. Chopin - Nocturne Op. 9 No. 2 - Advanced"
echo ""
echo "🎸 Guitar pieces:"
echo "  6. Tárrega - Lágrima - Beginner"
echo "  7. Anonymous - Romance (Spanish Romance) - Early Intermediate"
echo "  8. Sor - Study Op. 35 No. 22 - Intermediate"
echo "  9. Villa-Lobos - Prelude No. 1 - Intermediate-Advanced"
echo "  10. Tárrega - Recuerdos de la Alhambra - Advanced"
echo ""
echo "📥 Next steps:"
echo "  1. Download the PDFs from IMSLP following music-library/download-instructions.md"
echo "  2. Place them in the correct music-library/piano/ or music-library/guitar/ folders"
echo "  3. Upload them to R2 storage using the upload script"
echo ""
echo "🔗 Access locally at: http://scores-mirubato.localhost:9788/api/scores"