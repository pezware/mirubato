-- Add 'dropped' status to user_repertoire table
-- This migration updates the CHECK constraint to include the new 'dropped' status

-- First, we need to drop the existing constraint and add the new one
-- SQLite doesn't support ALTER CONSTRAINT, so we need to recreate the table

-- Create a temporary table with the new constraint
CREATE TABLE IF NOT EXISTS user_repertoire_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  score_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'learning', 'polished', 'dropped')),
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  personal_notes TEXT,
  reference_links TEXT, -- JSON array of links
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, score_id)
);

-- Copy data from the old table to the new table
INSERT INTO user_repertoire_new SELECT * FROM user_repertoire;

-- Drop the old table
DROP TABLE user_repertoire;

-- Rename the new table to the original name
ALTER TABLE user_repertoire_new RENAME TO user_repertoire;

-- Recreate the indexes
CREATE INDEX IF NOT EXISTS idx_repertoire_user ON user_repertoire(user_id);
CREATE INDEX IF NOT EXISTS idx_repertoire_score ON user_repertoire(score_id);
CREATE INDEX IF NOT EXISTS idx_repertoire_status ON user_repertoire(status);