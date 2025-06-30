-- This is a fixed version of 0003 that handles existing columns gracefully
-- Since SQLite doesn't support IF NOT EXISTS for columns, we'll just create the index

-- Create index on slug for fast lookups (safe to run multiple times)
CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_slug ON scores(slug);

-- Update existing records to have slugs based on ID (safe to run multiple times)
UPDATE scores SET slug = id WHERE slug IS NULL;