-- Create practice sessions table
CREATE TABLE IF NOT EXISTS practice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  instrument TEXT NOT NULL CHECK (instrument IN ('PIANO', 'GUITAR')),
  sheet_music_id TEXT,
  session_type TEXT NOT NULL CHECK (session_type IN ('FREE_PRACTICE', 'GUIDED_PRACTICE', 'ASSESSMENT')),
  started_at DATETIME NOT NULL,
  completed_at DATETIME,
  paused_duration INTEGER DEFAULT 0, -- Total paused time in seconds
  accuracy_percentage REAL,
  notes_attempted INTEGER DEFAULT 0,
  notes_correct INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sheet_music_id) REFERENCES sheet_music(id)
);

-- Create indexes for common queries
CREATE INDEX idx_sessions_user ON practice_sessions(user_id);
CREATE INDEX idx_sessions_user_instrument ON practice_sessions(user_id, instrument);
CREATE INDEX idx_sessions_started_at ON practice_sessions(started_at);
CREATE INDEX idx_sessions_user_started ON practice_sessions(user_id, started_at);