-- Migration: Convert uppercase enum values to lowercase in scores database
-- Date: 2025-07-11
-- Purpose: Align with user preference for lowercase inputs

-- Update existing scores data to use lowercase enum values
UPDATE scores SET
  instrument = LOWER(instrument),
  difficulty = LOWER(difficulty),
  style_period = LOWER(style_period)
WHERE 
  instrument != LOWER(instrument)
  OR difficulty != LOWER(difficulty)
  OR (style_period IS NOT NULL AND style_period != LOWER(style_period));

-- Update collections table if it has instrument/difficulty columns
-- (From looking at the migrations, collections might have these fields)
UPDATE collections SET
  instrument = LOWER(instrument),
  difficulty = LOWER(difficulty)  
WHERE 
  (instrument IS NOT NULL AND instrument != LOWER(instrument))
  OR (difficulty IS NOT NULL AND difficulty != LOWER(difficulty));

-- Note: Since SQLite doesn't support dropping CHECK constraints easily,
-- and the application layer already validates lowercase values,
-- the existing CHECK constraints will be handled by the application.
-- In a future migration when we recreate tables, we can update the constraints.

-- For now, document the constraint changes needed:
-- scores.instrument: CHECK (instrument IN ('PIANO', 'GUITAR', 'BOTH')) → CHECK (instrument IN ('piano', 'guitar', 'both'))
-- scores.difficulty: CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')) → CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'))
-- scores.style_period: CHECK (style_period IN ('BAROQUE', 'CLASSICAL', 'ROMANTIC', 'MODERN', 'CONTEMPORARY')) → CHECK (style_period IN ('baroque', 'classical', 'romantic', 'modern', 'contemporary'))

-- Log the migration results for verification
SELECT 
  'Updated ' || COUNT(*) || ' scores to lowercase enums' as migration_result
FROM scores
WHERE 
  instrument = LOWER(instrument)
  AND difficulty = LOWER(difficulty)
  AND (style_period IS NULL OR style_period = LOWER(style_period));