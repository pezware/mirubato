-- Create practice logs table for detailed tracking
CREATE TABLE IF NOT EXISTS practice_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('SIGHT_READING', 'SCALES', 'REPERTOIRE', 'ETUDES', 'TECHNIQUE', 'OTHER')),
  duration_seconds INTEGER NOT NULL,
  tempo_practiced INTEGER,
  target_tempo INTEGER,
  focus_areas TEXT, -- JSON array
  self_rating INTEGER CHECK (self_rating >= 1 AND self_rating <= 10),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE
);

-- Create index for session lookup
CREATE INDEX idx_logs_session ON practice_logs(session_id);
CREATE INDEX idx_logs_created_at ON practice_logs(created_at);