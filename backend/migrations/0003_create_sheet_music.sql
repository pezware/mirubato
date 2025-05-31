-- Create sheet music table
CREATE TABLE IF NOT EXISTS sheet_music (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT NOT NULL,
  opus TEXT,
  movement TEXT,
  instrument TEXT NOT NULL CHECK (instrument IN ('PIANO', 'GUITAR')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
  grade_level TEXT,
  duration_seconds INTEGER NOT NULL,
  time_signature TEXT NOT NULL,
  key_signature TEXT NOT NULL,
  tempo_marking TEXT,
  suggested_tempo INTEGER NOT NULL,
  style_period TEXT NOT NULL CHECK (style_period IN ('BAROQUE', 'CLASSICAL', 'ROMANTIC', 'MODERN', 'CONTEMPORARY')),
  tags TEXT NOT NULL, -- JSON array
  measures_data TEXT NOT NULL, -- JSON data
  metadata TEXT, -- JSON data
  thumbnail TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_sheet_music_instrument ON sheet_music(instrument);
CREATE INDEX idx_sheet_music_difficulty ON sheet_music(difficulty);
CREATE INDEX idx_sheet_music_instrument_difficulty ON sheet_music(instrument, difficulty);
CREATE INDEX idx_sheet_music_style_period ON sheet_music(style_period);