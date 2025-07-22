-- Fix the user_repertoire table structure to match expected schema
-- This migration removes the last_practiced field and fixes timestamp types

-- Create a new table with the correct structure
CREATE TABLE IF NOT EXISTS user_repertoire_fixed (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  score_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'learning', 'polished', 'dropped')),
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  personal_notes TEXT,
  reference_links TEXT DEFAULT '[]', -- JSON array of URLs
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, score_id)
);

-- Copy data from the current table, converting timestamps back to integers
INSERT INTO user_repertoire_fixed (id, user_id, score_id, status, difficulty_rating, personal_notes, reference_links, created_at, updated_at)
SELECT 
  id, 
  user_id, 
  score_id, 
  status, 
  difficulty_rating, 
  personal_notes, 
  reference_links,
  CAST(strftime('%s', created_at) AS INTEGER),
  CAST(strftime('%s', updated_at) AS INTEGER)
FROM user_repertoire;

-- Drop the incorrect table
DROP TABLE user_repertoire;

-- Rename the fixed table
ALTER TABLE user_repertoire_fixed RENAME TO user_repertoire;

-- Recreate the indexes
CREATE INDEX IF NOT EXISTS idx_repertoire_user ON user_repertoire(user_id);
CREATE INDEX IF NOT EXISTS idx_repertoire_score ON user_repertoire(score_id);
CREATE INDEX IF NOT EXISTS idx_repertoire_status ON user_repertoire(status);