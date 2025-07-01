-- Add slug and pdf_url columns to scores table
-- Note: In SQLite, we can't use IF NOT EXISTS for columns

-- Add slug column (without UNIQUE for now, will add index later)
ALTER TABLE scores ADD COLUMN slug TEXT;

-- Add pdf_url column  
ALTER TABLE scores ADD COLUMN pdf_url TEXT;

-- Update existing records to have slugs based on ID
UPDATE scores SET slug = id WHERE slug IS NULL;

-- Now create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_slug ON scores(slug);