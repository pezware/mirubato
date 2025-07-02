-- Add user ownership and privacy fields to scores table
-- This enables user-specific content and privacy controls

-- Add user_id to track score ownership
ALTER TABLE scores ADD COLUMN user_id TEXT;

-- Add visibility field with default private for user uploads
ALTER TABLE scores ADD COLUMN visibility TEXT DEFAULT 'private' 
  CHECK (visibility IN ('private', 'public', 'unlisted'));

-- Add source_type to distinguish between PDFs and images
ALTER TABLE scores ADD COLUMN source_type TEXT DEFAULT 'pdf'
  CHECK (source_type IN ('pdf', 'image', 'multi-image'));

-- Add page_count for better tracking (especially for multi-image scores)
ALTER TABLE scores ADD COLUMN page_count INTEGER DEFAULT 1;

-- Create indexes for efficient querying
CREATE INDEX idx_scores_user_id ON scores(user_id);
CREATE INDEX idx_scores_visibility ON scores(visibility);
CREATE INDEX idx_scores_source_type ON scores(source_type);

-- Update existing scores to be public (platform-curated content)
UPDATE scores SET visibility = 'public' WHERE visibility IS NULL;
UPDATE scores SET source_type = 'pdf' WHERE source_type IS NULL;