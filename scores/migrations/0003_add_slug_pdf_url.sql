-- Add slug and pdf_url columns to scores table
ALTER TABLE scores ADD COLUMN slug TEXT;
ALTER TABLE scores ADD COLUMN pdf_url TEXT;
ALTER TABLE scores ADD COLUMN created_by TEXT;

-- Create index on slug for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_slug ON scores(slug);

-- Update existing records to have slugs based on ID
UPDATE scores SET slug = id WHERE slug IS NULL;