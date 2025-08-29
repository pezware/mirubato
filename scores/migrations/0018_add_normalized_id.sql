-- Migration: Add normalized_id column for cross-service consistency
-- Description: Adds a normalized_id column to support consistent score identification across services
-- while maintaining backward compatibility with the existing slug system

-- Add normalized_id column to scores table
ALTER TABLE scores ADD COLUMN normalized_id TEXT;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_scores_normalized_id ON scores(normalized_id);

-- Note: Existing scores will need their normalized_id populated via a data migration script
-- This will be handled by the application code when scores are accessed or updated