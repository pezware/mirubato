-- Safe migration to add columns for the import feature
-- This migration handles both local and production environments

-- Add created_by column (production already has it, local doesn't)
ALTER TABLE scores ADD COLUMN created_by TEXT;

-- Add new columns for import feature
ALTER TABLE scores ADD COLUMN subtitle TEXT;
ALTER TABLE scores ADD COLUMN year INTEGER;
ALTER TABLE scores ADD COLUMN description TEXT;
ALTER TABLE scores ADD COLUMN file_name TEXT;
ALTER TABLE scores ADD COLUMN source_url TEXT;
ALTER TABLE scores ADD COLUMN imported_at DATETIME;
ALTER TABLE scores ADD COLUMN ai_metadata TEXT; -- JSON

-- Create indexes (safe to run multiple times)
CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_slug ON scores(slug);
CREATE INDEX IF NOT EXISTS idx_scores_processing_status ON scores(processing_status);
CREATE INDEX IF NOT EXISTS idx_scores_source_url ON scores(source_url);
CREATE INDEX IF NOT EXISTS idx_scores_imported_at ON scores(imported_at);

-- Update existing records to have slugs based on ID (safe for production)
UPDATE scores 
SET slug = id 
WHERE slug IS NULL;

-- Update processing status for existing records with PDFs
UPDATE scores 
SET processing_status = 'completed' 
WHERE processing_status IS NULL 
AND pdf_url IS NOT NULL;

-- Ensure score_analytics entries exist for all scores
INSERT OR IGNORE INTO score_analytics (score_id, view_count, download_count, render_count)
SELECT id, 0, 0, 0 FROM scores
WHERE id NOT IN (SELECT score_id FROM score_analytics);