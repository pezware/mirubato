-- Fix missing mime_types in score_pages table
-- This migration adds mime_type values for existing records that are missing them

-- Update pages based on r2_key extension
UPDATE score_pages 
SET mime_type = CASE
    WHEN r2_key LIKE '%.png' THEN 'image/png'
    WHEN r2_key LIKE '%.jpg' THEN 'image/jpeg'
    WHEN r2_key LIKE '%.jpeg' THEN 'image/jpeg'
    ELSE mime_type  -- Keep existing value if not matching
END
WHERE mime_type IS NULL;