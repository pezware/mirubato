-- Migration: Add goal progress tracking
-- Description: Support for tracking goal progress history over time
-- Date: 2025-07-20

-- Create goal_progress table to track progress history
CREATE TABLE IF NOT EXISTS goal_progress (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  goal_id TEXT NOT NULL,
  value REAL NOT NULL,
  notes TEXT,
  session_id TEXT, -- Link to practice session if applicable
  recorded_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

-- Add indexes for goal_progress
CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON goal_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_recorded_at ON goal_progress(recorded_at);