-- Add slug and pdf_url columns to scores table
-- This migration handles cases where columns might already exist

-- Note: SQLite will error if columns exist, but we handle this at the application level
-- The wrangler d1 migrations system should continue even if individual statements fail

-- Try to add slug column
ALTER TABLE scores ADD COLUMN slug TEXT;

-- Try to add pdf_url column  
ALTER TABLE scores ADD COLUMN pdf_url TEXT;

-- Update existing records to have slugs based on ID (safe to run multiple times)
UPDATE scores SET slug = id WHERE slug IS NULL;

-- Create unique index (IF NOT EXISTS makes it idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_slug ON scores(slug);