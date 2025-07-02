-- Migration to update existing slugs to include opus information
-- This prevents conflicts when multiple pieces have the same title but different opus numbers

-- First, drop the unique constraint temporarily
DROP INDEX IF EXISTS idx_scores_slug;

-- Update slugs for records that have opus information
-- This uses SQLite's string manipulation to create slugs like "title-op11-no6"
UPDATE scores 
SET slug = LOWER(
  SUBSTR(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            title || 
            CASE 
              WHEN opus IS NOT NULL AND opus != '' 
              THEN '-' || opus 
              ELSE '' 
            END,
            ' ', '-'
          ),
          '.', '-'
        ),
        ',', ''
      ),
      '--', '-'
    ),
    1, 100
  )
)
WHERE opus IS NOT NULL AND opus != '';

-- Handle any remaining duplicates by appending the ID
UPDATE scores 
SET slug = slug || '-' || SUBSTR(id, -8)
WHERE slug IN (
  SELECT slug 
  FROM scores 
  GROUP BY slug 
  HAVING COUNT(*) > 1
);

-- Recreate the unique index
CREATE UNIQUE INDEX idx_scores_slug ON scores(slug);