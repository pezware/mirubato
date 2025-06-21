-- Create scores metadata table
CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT NOT NULL,
  opus TEXT,
  movement TEXT,
  instrument TEXT NOT NULL CHECK (instrument IN ('PIANO', 'GUITAR', 'BOTH')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
  grade_level TEXT,
  duration_seconds INTEGER,
  time_signature TEXT,
  key_signature TEXT,
  tempo_marking TEXT,
  suggested_tempo INTEGER,
  style_period TEXT CHECK (style_period IN ('BAROQUE', 'CLASSICAL', 'ROMANTIC', 'MODERN', 'CONTEMPORARY')),
  source TEXT CHECK (source IN ('imslp', 'upload', 'generated', 'manual')),
  imslp_url TEXT,
  tags TEXT, -- JSON array
  metadata TEXT, -- JSON object with additional metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for common queries
CREATE INDEX idx_scores_instrument ON scores(instrument);
CREATE INDEX idx_scores_difficulty ON scores(difficulty);
CREATE INDEX idx_scores_composer ON scores(composer);
CREATE INDEX idx_scores_style_period ON scores(style_period);
CREATE INDEX idx_scores_created_at ON scores(created_at);

-- Create score versions table (different formats)
CREATE TABLE IF NOT EXISTS score_versions (
  id TEXT PRIMARY KEY,
  score_id TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf', 'musicxml', 'vexflow', 'image', 'abc')),
  r2_key TEXT NOT NULL, -- R2 storage key
  file_size_bytes INTEGER,
  page_count INTEGER,
  resolution TEXT, -- For images: e.g., '1200x1600'
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE
);

-- Create index for score versions
CREATE INDEX idx_score_versions_score_id ON score_versions(score_id);
CREATE INDEX idx_score_versions_format ON score_versions(format);

-- Create curated collections table
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly name
  description TEXT,
  instrument TEXT CHECK (instrument IN ('PIANO', 'GUITAR', 'BOTH', NULL)),
  difficulty TEXT CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', NULL)),
  score_ids TEXT NOT NULL, -- JSON array of score IDs
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for collections
CREATE INDEX idx_collections_slug ON collections(slug);
CREATE INDEX idx_collections_instrument ON collections(instrument);
CREATE INDEX idx_collections_difficulty ON collections(difficulty);
CREATE INDEX idx_collections_featured ON collections(is_featured);

-- Create score analytics table for tracking popular scores
CREATE TABLE IF NOT EXISTS score_analytics (
  score_id TEXT NOT NULL,
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  render_count INTEGER DEFAULT 0,
  last_viewed_at DATETIME,
  PRIMARY KEY (score_id),
  FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE
);

-- Add triggers for updated_at
CREATE TRIGGER update_scores_timestamp 
AFTER UPDATE ON scores
BEGIN
  UPDATE scores SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_collections_timestamp 
AFTER UPDATE ON collections
BEGIN
  UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;