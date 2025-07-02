-- Add user ownership and privacy fields to scores table
-- This enables user-specific content and privacy controls
-- Note: These ALTER TABLE statements may fail if columns exist, which is expected

-- Add user_id to track score ownership (may already exist)
ALTER TABLE scores ADD COLUMN user_id TEXT;

-- Add visibility field with default private for user uploads (may already exist)
ALTER TABLE scores ADD COLUMN visibility TEXT DEFAULT 'private' 
  CHECK (visibility IN ('private', 'public', 'unlisted'));

-- Add source_type to distinguish between PDFs and images (may already exist)
ALTER TABLE scores ADD COLUMN source_type TEXT DEFAULT 'pdf'
  CHECK (source_type IN ('pdf', 'image', 'multi-image'));

-- Add page_count for better tracking (may already exist)
ALTER TABLE scores ADD COLUMN page_count INTEGER DEFAULT 1;

-- Create indexes for efficient querying
CREATE INDEX idx_scores_user_id ON scores(user_id);
CREATE INDEX idx_scores_visibility ON scores(visibility);
CREATE INDEX idx_scores_source_type ON scores(source_type);

-- Update existing scores to be public (platform-curated content)
-- Set all scores without a user_id to public (these are platform scores)
UPDATE scores SET visibility = 'public' WHERE user_id IS NULL OR user_id = '';
UPDATE scores SET source_type = 'pdf' WHERE source_type IS NULL;