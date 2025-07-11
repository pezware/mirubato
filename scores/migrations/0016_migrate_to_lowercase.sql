-- Migration: Convert uppercase enum values to lowercase in scores database
-- Date: 2025-07-11
-- Purpose: Align with user preference for lowercase inputs

-- Step 1: Create new tables with lowercase CHECK constraints
CREATE TABLE scores_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT NOT NULL,
  opus TEXT,
  movement TEXT,
  instrument TEXT NOT NULL CHECK (instrument IN ('piano', 'guitar', 'both')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
  grade_level TEXT,
  duration_seconds INTEGER,
  time_signature TEXT,
  key_signature TEXT,
  tempo_marking TEXT,
  suggested_tempo INTEGER,
  style_period TEXT CHECK (style_period IN ('baroque', 'classical', 'romantic', 'modern', 'contemporary')),
  source TEXT CHECK (source IN ('imslp', 'upload', 'generated', 'manual')),
  imslp_url TEXT,
  tags TEXT, -- JSON array
  metadata TEXT, -- JSON object with additional metadata
  slug TEXT UNIQUE,
  pdf_url TEXT,
  pdf_r2_key TEXT,
  pdf_pages INTEGER,
  r2_import_id TEXT,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  upload_user_id TEXT,
  visual_density TEXT,
  visual_features TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy data with lowercase conversion
INSERT INTO scores_new
SELECT 
  id,
  title,
  composer,
  opus,
  movement,
  LOWER(instrument) as instrument,
  LOWER(difficulty) as difficulty,
  difficulty_level,
  grade_level,
  duration_seconds,
  time_signature,
  key_signature,
  tempo_marking,
  suggested_tempo,
  CASE 
    WHEN style_period IS NOT NULL THEN LOWER(style_period)
    ELSE NULL
  END as style_period,
  source,
  imslp_url,
  tags,
  metadata,
  slug,
  pdf_url,
  pdf_r2_key,
  pdf_pages,
  r2_import_id,
  visibility,
  upload_user_id,
  visual_density,
  visual_features,
  created_at,
  updated_at
FROM scores;

-- Step 3: Drop old table and rename new table
DROP TABLE scores;
ALTER TABLE scores_new RENAME TO scores;

-- Step 4: Recreate indexes
CREATE INDEX idx_scores_instrument ON scores(instrument);
CREATE INDEX idx_scores_difficulty ON scores(difficulty);
CREATE INDEX idx_scores_composer ON scores(composer);
CREATE INDEX idx_scores_style_period ON scores(style_period);
CREATE INDEX idx_scores_created_at ON scores(created_at);
CREATE INDEX idx_scores_updated_at ON scores(updated_at);
CREATE INDEX idx_scores_slug ON scores(slug);
CREATE INDEX idx_scores_upload_user_id ON scores(upload_user_id);

-- Step 5: Update collections table
CREATE TABLE collections_new (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'user' CHECK (type IN ('public', 'user')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  user_id TEXT,
  data_filter TEXT, -- JSON object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_default BOOLEAN DEFAULT FALSE
);

INSERT INTO collections_new
SELECT * FROM collections;

DROP TABLE collections;
ALTER TABLE collections_new RENAME TO collections;

-- Recreate indexes for collections
CREATE INDEX idx_collections_slug ON collections(slug);
CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collections_type ON collections(type);
CREATE INDEX idx_collections_visibility ON collections(visibility);
CREATE INDEX idx_collections_is_default ON collections(is_default);

-- Step 6: Verify migration
SELECT 
  'Migrated ' || COUNT(*) || ' scores to lowercase enums' as migration_result
FROM scores;