-- Create logbook entries table for manual and automatic practice logging
CREATE TABLE IF NOT EXISTS logbook_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  duration INTEGER NOT NULL, -- in seconds
  type TEXT NOT NULL CHECK (type IN ('PRACTICE', 'PERFORMANCE', 'LESSON', 'REHEARSAL')),
  pieces TEXT NOT NULL, -- JSON array of PieceReference objects
  techniques TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  goal_ids TEXT NOT NULL DEFAULT '[]', -- JSON array of goal IDs
  notes TEXT,
  mood TEXT CHECK (mood IN ('FRUSTRATED', 'NEUTRAL', 'SATISFIED', 'EXCITED')),
  tags TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  session_id TEXT, -- links to practice_sessions if auto-generated
  metadata TEXT, -- JSON object for additional data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE SET NULL
);

-- Create indexes for efficient querying
CREATE INDEX idx_logbook_user ON logbook_entries(user_id);
CREATE INDEX idx_logbook_timestamp ON logbook_entries(timestamp);
CREATE INDEX idx_logbook_type ON logbook_entries(type);
CREATE INDEX idx_logbook_mood ON logbook_entries(mood);
CREATE INDEX idx_logbook_session ON logbook_entries(session_id);
CREATE INDEX idx_logbook_created_at ON logbook_entries(created_at);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_logbook_entries_updated_at 
  AFTER UPDATE ON logbook_entries
  FOR EACH ROW
  BEGIN
    UPDATE logbook_entries 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
  END;