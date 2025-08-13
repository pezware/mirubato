-- Migration: Canonicalize composer names to match our naming standards
-- Date: 2025-08-13
-- Purpose: Fix inconsistent composer names in scores database
-- Compatible with both production and staging environments
-- This migration is idempotent and safe to run multiple times

-- Fix Agustín Barrios variations
-- Canonical: "Agustín Barrios"
UPDATE scores 
SET composer = 'Agustín Barrios' 
WHERE composer IN (
    'Agustín Barrios Mangoré', 
    'Barrios Mangoré', 
    'Agustin Barrios Mangore',
    'Barrios'
);

-- Fix Anonymous variations  
-- Canonical: "Anonymous"
UPDATE scores 
SET composer = 'Anonymous'
WHERE composer LIKE 'Anonymous%arr%' 
   OR composer LIKE 'Anonymous%(%'
   OR composer LIKE 'Anon%arr%';

-- Fix Hanon variations
-- Canonical: "Charles-Louis Hanon"
UPDATE scores 
SET composer = 'Charles-Louis Hanon'
WHERE composer IN (
    'C. L. Hanon', 
    'C.L. Hanon', 
    'CL Hanon',
    'Hanon',
    'Charles Louis Hanon',
    'Hanon, Charles-Louis'
);

-- Fix Czerny variations
-- Canonical: "Carl Czerny"
UPDATE scores 
SET composer = 'Carl Czerny'
WHERE composer IN (
    'Czerny, C.', 
    'C. Czerny', 
    'Czerny',
    'Karl Czerny',
    'Czerny, Carl'
);

-- Fix Aguado variations
-- Canonical: "Dionisio Aguado"
UPDATE scores 
SET composer = 'Dionisio Aguado'
WHERE composer IN (
    'D. Aguado', 
    'Aguado',
    'Aguado, Dionisio'
);

-- Fix Sor variations
-- Canonical: "Fernando Sor"
UPDATE scores 
SET composer = 'Fernando Sor'
WHERE composer IN (
    'Sor',
    'F. Sor',
    'Sor, Fernando'
);

-- Fix Franz Abt variations
-- Canonical: "Franz Abt"
UPDATE scores 
SET composer = 'Franz Abt'
WHERE composer IN (
    'F. Abt', 
    'Abt',
    'Abt, Franz'
);

-- Fix Thomas Tallis variations
-- Canonical: "Thomas Tallis"
UPDATE scores 
SET composer = 'Thomas Tallis'
WHERE composer IN (
    'T. Tallis', 
    'Tallis',
    'Tallis, Thomas'
);

-- Fix Stephen C. Doonan variations
-- Canonical: "Stephen C. Doonan"
UPDATE scores 
SET composer = 'Stephen C. Doonan'
WHERE composer IN (
    'Doonan',
    'S. Doonan',
    'Stephen Doonan',
    'Doonan, Stephen C.'
);

-- Fix any remaining common variations that might exist
-- Bach variations (should already be correct)
UPDATE scores 
SET composer = 'Johann Sebastian Bach'
WHERE composer IN (
    'J.S. Bach',
    'JS Bach',
    'Bach, J.S.',
    'Bach'
) AND composer != 'Johann Sebastian Bach';

-- Mozart variations (should already be correct)
UPDATE scores 
SET composer = 'Wolfgang Amadeus Mozart'
WHERE composer IN (
    'W.A. Mozart',
    'WA Mozart',
    'Mozart, W.A.',
    'Mozart'
) AND composer != 'Wolfgang Amadeus Mozart';

-- Chopin variations (should already be correct)
UPDATE scores 
SET composer = 'Frédéric Chopin'
WHERE composer IN (
    'F. Chopin',
    'Frederic Chopin',
    'Chopin, Frédéric',
    'Chopin'
) AND composer != 'Frédéric Chopin';

-- Villa-Lobos variations
UPDATE scores 
SET composer = 'Heitor Villa-Lobos'
WHERE composer IN (
    'H. Villa-Lobos',
    'Villa-Lobos',
    'Villa Lobos',
    'Heitor Villa Lobos',
    'Villa-Lobos, Heitor'
);

-- Tárrega variations
UPDATE scores 
SET composer = 'Francisco Tárrega'
WHERE composer IN (
    'F. Tárrega',
    'Tarrega',
    'Francisco Tarrega',
    'Tárrega, Francisco'
);

-- Log the changes made
-- Note: SQLite doesn't have a built-in logging mechanism, but we can create a summary
-- This would be run after the migration to verify changes

-- Create a simple verification query to show canonical composer counts
-- SELECT 
--   composer, 
--   COUNT(*) as score_count,
--   'Fixed in canonicalization migration 0017' as note
-- FROM scores 
-- GROUP BY composer 
-- ORDER BY composer;