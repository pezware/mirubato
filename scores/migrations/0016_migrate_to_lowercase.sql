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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  slug TEXT,
  pdf_url TEXT,
  created_by TEXT,
  processing_status TEXT DEFAULT 'pending',
  processing_error TEXT,
  subtitle TEXT,
  year INTEGER,
  description TEXT,
  file_name TEXT,
  source_url TEXT,
  imported_at DATETIME,
  ai_metadata TEXT,
  visual_analysis TEXT,
  visual_confidence REAL,
  user_id TEXT,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
  source_type TEXT DEFAULT 'pdf' CHECK (source_type IN ('pdf', 'image', 'multi-image')),
  page_count INTEGER DEFAULT 1,
  derived_visibility TEXT
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
  created_at,
  updated_at,
  slug,
  pdf_url,
  created_by,
  processing_status,
  processing_error,
  subtitle,
  year,
  description,
  file_name,
  source_url,
  imported_at,
  ai_metadata,
  visual_analysis,
  visual_confidence,
  user_id,
  visibility,
  source_type,
  page_count,
  derived_visibility
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
CREATE INDEX idx_scores_user_id ON scores(user_id);
CREATE INDEX idx_scores_visibility ON scores(visibility);
CREATE INDEX idx_scores_derived_visibility ON scores(derived_visibility);
CREATE INDEX idx_scores_source_type ON scores(source_type);

-- Step 5: Update collections table - convert enum values to lowercase
-- The collections table has instrument and difficulty columns that need updating
UPDATE collections SET
  instrument = LOWER(instrument),
  difficulty = LOWER(difficulty)
WHERE 
  (instrument IS NOT NULL AND instrument != LOWER(instrument))
  OR (difficulty IS NOT NULL AND difficulty != LOWER(difficulty));

-- Step 6: Verify migration
SELECT 
  'Migrated ' || COUNT(*) || ' scores to lowercase enums' as migration_result
FROM scores;