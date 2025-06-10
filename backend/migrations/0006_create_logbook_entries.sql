-- Create logbook_entries table
CREATE TABLE IF NOT EXISTS logbook_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL, -- Unix timestamp in milliseconds
  duration INTEGER NOT NULL, -- Duration in seconds
  type TEXT NOT NULL CHECK (type IN ('PRACTICE', 'PERFORMANCE', 'LESSON', 'REHEARSAL')),
  instrument TEXT NOT NULL CHECK (instrument IN ('PIANO', 'GUITAR')),
  pieces TEXT NOT NULL DEFAULT '[]', -- JSON array of PieceReference objects
  techniques TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  goal_ids TEXT NOT NULL DEFAULT '[]', -- JSON array of goal IDs
  notes TEXT,
  mood TEXT CHECK (mood IN ('FRUSTRATED', 'NEUTRAL', 'SATISFIED', 'EXCITED')),
  tags TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  session_id TEXT,
  metadata TEXT, -- JSON object with source, accuracy, notesPlayed, mistakeCount
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX idx_logbook_entries_user_id ON logbook_entries(user_id);
CREATE INDEX idx_logbook_entries_timestamp ON logbook_entries(timestamp);
CREATE INDEX idx_logbook_entries_type ON logbook_entries(type);
CREATE INDEX idx_logbook_entries_instrument ON logbook_entries(instrument);
CREATE INDEX idx_logbook_entries_mood ON logbook_entries(mood);
CREATE INDEX idx_logbook_entries_session_id ON logbook_entries(session_id);
CREATE INDEX idx_logbook_entries_created_at ON logbook_entries(created_at);