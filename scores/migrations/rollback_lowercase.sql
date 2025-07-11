-- Rollback Migration: Revert lowercase enum values back to uppercase in scores database
-- Date: 2025-07-11
-- Purpose: Emergency rollback script if lowercase migration causes issues

-- WARNING: This is a rollback script. Only use in case of emergency.

-- Update scores data back to uppercase enum values
UPDATE scores SET
  instrument = UPPER(instrument),
  difficulty = UPPER(difficulty),
  style_period = UPPER(style_period)
WHERE 
  instrument = LOWER(instrument)
  OR difficulty = LOWER(difficulty)
  OR (style_period IS NOT NULL AND style_period = LOWER(style_period));

-- Update collections table back to uppercase
UPDATE collections SET
  instrument = UPPER(instrument),
  difficulty = UPPER(difficulty)  
WHERE 
  (instrument IS NOT NULL AND instrument = LOWER(instrument))
  OR (difficulty IS NOT NULL AND difficulty = LOWER(difficulty));

-- Log the rollback results for verification
SELECT 
  'Rolled back ' || COUNT(*) || ' scores to uppercase enums' as rollback_result
FROM scores
WHERE 
  instrument = UPPER(instrument)
  AND difficulty = UPPER(difficulty)
  AND (style_period IS NULL OR style_period = UPPER(style_period));