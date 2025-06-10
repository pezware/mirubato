-- Create goals table for practice objectives tracking
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_date DATETIME NOT NULL,
  progress REAL NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  milestones TEXT NOT NULL DEFAULT '[]', -- JSON array of GoalMilestone objects
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX idx_goals_user ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_target_date ON goals(target_date);
CREATE INDEX idx_goals_created_at ON goals(created_at);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_goals_updated_at 
  AFTER UPDATE ON goals
  FOR EACH ROW
  BEGIN
    UPDATE goals 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
  END;

-- Create junction table for many-to-many relationship between goals and logbook entries
CREATE TABLE IF NOT EXISTS goal_logbook_entries (
  goal_id TEXT NOT NULL,
  logbook_entry_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (goal_id, logbook_entry_id),
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  FOREIGN KEY (logbook_entry_id) REFERENCES logbook_entries(id) ON DELETE CASCADE
);

-- Create indexes for junction table
CREATE INDEX idx_goal_entries_goal ON goal_logbook_entries(goal_id);
CREATE INDEX idx_goal_entries_entry ON goal_logbook_entries(logbook_entry_id);