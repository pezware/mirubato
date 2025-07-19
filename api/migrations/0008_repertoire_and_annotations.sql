-- Migration: Add repertoire and annotation tables
-- Description: Support for repertoire management, goals integration, and score annotations
-- Note: milestones column was skipped as it already exists in the goals table (added in a previous migration)

-- Create user_repertoire table for tracking piece status and notes
CREATE TABLE IF NOT EXISTS user_repertoire (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  score_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'learning', 'working', 'polished', 'performance_ready')),
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  personal_notes TEXT,
  reference_links TEXT, -- JSON array of links
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, score_id)
);

-- Create score_annotations table for PDF annotations
CREATE TABLE IF NOT EXISTS score_annotations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  score_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  annotation_data TEXT NOT NULL, -- JSON with drawing/highlight data
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('highlight', 'text', 'drawing', 'measure_bracket')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add score-specific fields to goals table
-- Note: milestones column already exists in the goals table, so we skip it
ALTER TABLE goals ADD COLUMN score_id TEXT;
ALTER TABLE goals ADD COLUMN measures TEXT; -- JSON array of measure numbers/ranges
ALTER TABLE goals ADD COLUMN practice_plan TEXT; -- JSON structure for practice requirements
-- ALTER TABLE goals ADD COLUMN milestones TEXT; -- Skipped: column already exists

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_repertoire_user ON user_repertoire(user_id);
CREATE INDEX IF NOT EXISTS idx_repertoire_score ON user_repertoire(score_id);
CREATE INDEX IF NOT EXISTS idx_repertoire_status ON user_repertoire(status);
CREATE INDEX IF NOT EXISTS idx_annotations_user_score ON score_annotations(user_id, score_id);
CREATE INDEX IF NOT EXISTS idx_annotations_page ON score_annotations(score_id, page_number);
CREATE INDEX IF NOT EXISTS idx_goals_score ON goals(score_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_repertoire_timestamp 
AFTER UPDATE ON user_repertoire
BEGIN
  UPDATE user_repertoire SET updated_at = unixepoch() WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_annotations_timestamp 
AFTER UPDATE ON score_annotations
BEGIN
  UPDATE score_annotations SET updated_at = unixepoch() WHERE id = NEW.id;
END;