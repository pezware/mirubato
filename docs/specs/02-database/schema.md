# Database Schema Specification

## Overview

Mirubato uses Cloudflare D1 (SQLite) as its edge database solution. The system employs multiple databases across different services for data isolation and independent scaling.

## Database Distribution

| Service    | Database Name   | Purpose                              | Tables |
| ---------- | --------------- | ------------------------------------ | ------ |
| API        | mirubato-prod   | Core user data and business logic    | 11     |
| Scores     | scores-prod     | Sheet music metadata and collections | 9      |
| Dictionary | dictionary-prod | Music terms and definitions          | 6      |
| Sync       | sync-prod       | Sync coordination and state          | 3      |

## API Service Database (mirubato-prod)

### Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- UUID v4
  email TEXT UNIQUE NOT NULL,             -- User email (lowercase)
  email_verified INTEGER DEFAULT 0,       -- Email verification status
  display_name TEXT,                      -- User's display name
  primary_instrument TEXT,                -- Main instrument
  instruments TEXT,                       -- JSON array of all instruments
  role TEXT DEFAULT 'user',               -- user, teacher, admin
  auth_provider TEXT,                     -- magic_link, google
  google_id TEXT,                         -- Google OAuth ID
  avatar_url TEXT,                        -- Profile picture URL
  preferences TEXT,                       -- JSON user preferences
  last_login_at INTEGER,                  -- Unix timestamp
  created_at INTEGER NOT NULL,            -- Unix timestamp
  updated_at INTEGER NOT NULL,            -- Unix timestamp
  deleted_at INTEGER                      -- Soft delete timestamp
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_role ON users(role);
```

### Sessions Table

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                    -- Session ID
  user_id TEXT NOT NULL,                  -- Foreign key to users
  token TEXT UNIQUE NOT NULL,             -- JWT token
  refresh_token TEXT,                     -- Refresh token
  device_info TEXT,                       -- JSON device information
  ip_address TEXT,                        -- Client IP
  expires_at INTEGER NOT NULL,            -- Expiration timestamp
  created_at INTEGER NOT NULL,            -- Creation timestamp
  last_used_at INTEGER,                   -- Last activity timestamp
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### Logbook Entries Table

```sql
CREATE TABLE logbook_entries (
  id TEXT PRIMARY KEY,                    -- UUID v4
  user_id TEXT NOT NULL,                  -- Foreign key to users
  timestamp INTEGER NOT NULL,             -- Practice session timestamp
  duration INTEGER NOT NULL,              -- Duration in seconds
  type TEXT CHECK(type IN ('practice', 'performance', 'lesson', 'rehearsal', 'technique')),
  instrument TEXT,                        -- Instrument played
  pieces TEXT,                            -- JSON array of pieces
  techniques TEXT,                       -- JSON array of techniques
  mood TEXT CHECK(mood IN ('frustrated', 'neutral', 'satisfied', 'excited')),
  notes TEXT,                             -- Practice notes
  goal_ids TEXT,                          -- JSON array of goal IDs
  score_pages TEXT,                      -- JSON array of viewed pages
  tags TEXT,                              -- JSON array of tags
  source TEXT,                            -- Entry source (manual, timer, auto)
  sync_version INTEGER DEFAULT 1,         -- For conflict resolution
  created_at INTEGER NOT NULL,            -- Creation timestamp
  updated_at INTEGER NOT NULL,            -- Last update timestamp
  deleted_at INTEGER,                     -- Soft delete
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_logbook_user_timestamp ON logbook_entries(user_id, timestamp DESC);
CREATE INDEX idx_logbook_user_created ON logbook_entries(user_id, created_at DESC);
CREATE INDEX idx_logbook_deleted ON logbook_entries(deleted_at);
```

### User Repertoire Table

```sql
CREATE TABLE user_repertoire (
  id TEXT PRIMARY KEY,                    -- UUID v4
  user_id TEXT NOT NULL,                  -- Foreign key to users
  score_id TEXT,                          -- Optional link to scores service
  score_title TEXT NOT NULL,              -- Piece title
  score_composer TEXT,                    -- Composer name
  normalized_composer TEXT,               -- Canonicalized composer
  status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'learning', 'working', 'polished', 'performance_ready')),
  status_history TEXT,                    -- JSON array of status changes
  difficulty INTEGER CHECK(difficulty BETWEEN 1 AND 10),
  notes TEXT,                             -- Personal notes
  goal_ids TEXT,                          -- JSON array of linked goals
  practice_count INTEGER DEFAULT 0,       -- Number of practice sessions
  total_practice_time INTEGER DEFAULT 0,  -- Total practice time in seconds
  last_practiced_at INTEGER,              -- Last practice timestamp
  target_tempo INTEGER,                   -- Target BPM
  current_tempo INTEGER,                  -- Current achieved BPM
  performance_date INTEGER,               -- Planned performance date
  added_at INTEGER NOT NULL,              -- When added to repertoire
  updated_at INTEGER NOT NULL,            -- Last update
  deleted_at INTEGER,                     -- Soft delete
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_repertoire_user_status ON user_repertoire(user_id, status);
CREATE INDEX idx_repertoire_user_composer ON user_repertoire(user_id, normalized_composer);
CREATE INDEX idx_repertoire_last_practiced ON user_repertoire(user_id, last_practiced_at DESC);
```

### Goals Table

```sql
CREATE TABLE goals (
  id TEXT PRIMARY KEY,                    -- UUID v4
  user_id TEXT NOT NULL,                  -- Foreign key to users
  title TEXT NOT NULL,                    -- Goal title
  description TEXT,                       -- Detailed description
  target_type TEXT CHECK(target_type IN ('duration', 'sessions', 'pieces', 'tempo', 'custom')),
  target_value INTEGER,                   -- Numeric target
  target_unit TEXT,                       -- Unit (minutes, count, bpm, etc)
  current_value INTEGER DEFAULT 0,        -- Current progress
  deadline INTEGER,                       -- Target completion date
  piece_ids TEXT,                         -- JSON array of linked pieces
  recurring TEXT,                         -- Recurrence pattern (daily, weekly, etc)
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'abandoned')),
  created_at INTEGER NOT NULL,            -- Creation timestamp
  updated_at INTEGER NOT NULL,            -- Last update
  completed_at INTEGER,                   -- Completion timestamp
  deleted_at INTEGER,                     -- Soft delete
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_goals_user_status ON goals(user_id, status);
CREATE INDEX idx_goals_user_deadline ON goals(user_id, deadline);
```

### Goal Progress Table

```sql
CREATE TABLE goal_progress (
  id TEXT PRIMARY KEY,                    -- UUID v4
  goal_id TEXT NOT NULL,                  -- Foreign key to goals
  date INTEGER NOT NULL,                  -- Progress date
  value INTEGER NOT NULL,                 -- Progress value
  notes TEXT,                             -- Progress notes
  created_at INTEGER NOT NULL,            -- Creation timestamp
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

CREATE INDEX idx_goal_progress_goal_date ON goal_progress(goal_id, date DESC);
```

### Sync Tables

```sql
-- Sync data storage
CREATE TABLE sync_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,              -- logbook, repertoire, goals
  entity_id TEXT NOT NULL,                -- Entity UUID
  data TEXT NOT NULL,                     -- JSON blob
  version INTEGER DEFAULT 1,              -- Version number
  updated_at INTEGER NOT NULL,            -- Last update
  deleted INTEGER DEFAULT 0,              -- Deletion flag
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX idx_sync_data_user_type ON sync_data(user_id, entity_type);
CREATE INDEX idx_sync_data_updated ON sync_data(updated_at);

-- Sync events log
CREATE TABLE sync_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,               -- create, update, delete
  entity_type TEXT NOT NULL,              -- logbook, repertoire, goals
  entity_id TEXT NOT NULL,
  data TEXT,                              -- Event data
  created_at INTEGER NOT NULL,
  processed INTEGER DEFAULT 0
);

CREATE INDEX idx_sync_events_user ON sync_events(user_id, created_at DESC);
CREATE INDEX idx_sync_events_processed ON sync_events(processed, created_at);
```

### Idempotency Keys Table

```sql
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,                   -- Idempotency key
  user_id TEXT NOT NULL,
  response TEXT,                          -- Cached response
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_idempotency_user ON idempotency_keys(user_id);
CREATE INDEX idx_idempotency_created ON idempotency_keys(created_at);
```

## Scores Service Database (scores-prod)

### Scores Table

```sql
CREATE TABLE scores (
  id TEXT PRIMARY KEY,                    -- UUID v4
  title TEXT NOT NULL,                    -- Score title
  composer TEXT,                          -- Composer name
  normalized_composer TEXT,               -- Canonicalized composer
  arranger TEXT,                          -- Arranger name
  opus TEXT,                              -- Opus number
  catalog_number TEXT,                    -- Catalog number (BWV, K, etc)
  difficulty INTEGER CHECK(difficulty BETWEEN 1 AND 10),
  genre TEXT,                             -- Musical genre
  period TEXT,                            -- Musical period
  year_composed INTEGER,                  -- Year of composition
  duration_seconds INTEGER,               -- Estimated duration
  page_count INTEGER DEFAULT 1,           -- Number of pages
  instruments TEXT,                       -- JSON array of instruments
  key_signature TEXT,                     -- Key signature
  time_signature TEXT,                    -- Time signature
  tempo_marking TEXT,                     -- Tempo marking
  file_url TEXT,                          -- R2 URL for PDF
  thumbnail_url TEXT,                     -- Thumbnail image URL
  source TEXT,                            -- upload, imslp, import
  source_url TEXT,                        -- Original source URL
  imslp_id TEXT,                          -- IMSLP work ID
  metadata TEXT,                          -- JSON additional metadata
  ai_extracted INTEGER DEFAULT 0,         -- AI extraction status
  user_id TEXT,                           -- Uploader user ID
  visibility TEXT DEFAULT 'private' CHECK(visibility IN ('public', 'private', 'unlisted')),
  view_count INTEGER DEFAULT 0,           -- View counter
  download_count INTEGER DEFAULT 0,       -- Download counter
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX idx_scores_composer ON scores(normalized_composer);
CREATE INDEX idx_scores_user ON scores(user_id);
CREATE INDEX idx_scores_visibility ON scores(visibility);
CREATE INDEX idx_scores_title ON scores(title);
```

### Score Pages Table

```sql
CREATE TABLE score_pages (
  id TEXT PRIMARY KEY,
  score_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,                -- R2 URL for page image
  thumbnail_url TEXT,                     -- Thumbnail URL
  width INTEGER,                          -- Image width
  height INTEGER,                         -- Image height
  ocr_text TEXT,                          -- Extracted text
  created_at INTEGER NOT NULL,
  FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE,
  UNIQUE(score_id, page_number)
);

CREATE INDEX idx_score_pages_score ON score_pages(score_id, page_number);
```

### User Collections Table

```sql
CREATE TABLE user_collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  visibility TEXT DEFAULT 'private' CHECK(visibility IN ('public', 'private', 'unlisted')),
  featured INTEGER DEFAULT 0,             -- Featured collection flag
  cover_image_url TEXT,                   -- Collection cover image
  score_ids TEXT,                         -- JSON array of score IDs
  subscriber_count INTEGER DEFAULT 0,     -- Number of subscribers
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, name)
);

CREATE INDEX idx_collections_user ON user_collections(user_id);
CREATE INDEX idx_collections_visibility ON user_collections(visibility, featured);
```

### Score Annotations Table

```sql
CREATE TABLE score_annotations (
  id TEXT PRIMARY KEY,
  score_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  page_number INTEGER DEFAULT 1,
  annotation_data TEXT,                   -- JSON drawing/annotation data
  annotation_type TEXT,                   -- drawing, text, highlight
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (score_id) REFERENCES scores(id) ON DELETE CASCADE,
  UNIQUE(score_id, user_id, page_number)
);

CREATE INDEX idx_annotations_score_user ON score_annotations(score_id, user_id);
```

### Composers Table

```sql
CREATE TABLE composers (
  id TEXT PRIMARY KEY,
  canonical_name TEXT UNIQUE NOT NULL,    -- Standardized name
  aliases TEXT,                           -- JSON array of alternatives
  birth_year INTEGER,
  death_year INTEGER,
  nationality TEXT,
  period TEXT,                            -- Baroque, Classical, etc
  wikipedia_url TEXT,
  imslp_url TEXT,
  biography TEXT,                         -- Brief biography
  portrait_url TEXT,                      -- Composer portrait
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_composers_name ON composers(canonical_name);
CREATE INDEX idx_composers_period ON composers(period);
```

## Dictionary Service Database (dictionary-prod)

### Terms Table

```sql
CREATE TABLE terms (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,                     -- Musical term
  language TEXT NOT NULL,                 -- ISO language code
  definition TEXT NOT NULL,               -- Term definition
  category TEXT,                          -- tempo, dynamics, technique, etc
  examples TEXT,                          -- JSON array of usage examples
  related_terms TEXT,                     -- JSON array of related terms
  pronunciation TEXT,                     -- IPA pronunciation
  etymology TEXT,                         -- Word origin
  difficulty_level INTEGER,               -- Beginner/Intermediate/Advanced
  quality_score REAL,                     -- AI quality metric (0-1)
  review_status TEXT DEFAULT 'pending' CHECK(review_status IN ('pending', 'approved', 'rejected')),
  source TEXT,                            -- ai, manual, import
  source_model TEXT,                      -- AI model used
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(term, language)
);

CREATE INDEX idx_terms_language ON terms(language);
CREATE INDEX idx_terms_category ON terms(category);
CREATE INDEX idx_terms_quality ON terms(quality_score DESC);
CREATE INDEX idx_terms_status ON terms(review_status);
```

### Term Embeddings Table

```sql
CREATE TABLE term_embeddings (
  term_id TEXT PRIMARY KEY,
  embedding BLOB NOT NULL,                -- Vector embedding
  model_version TEXT,                     -- Embedding model version
  created_at INTEGER NOT NULL,
  FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE
);
```

### Term Searches Table

```sql
CREATE TABLE term_searches (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  language TEXT,
  user_id TEXT,
  found INTEGER DEFAULT 1,                -- Whether term was found
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_searches_term ON term_searches(term);
CREATE INDEX idx_searches_created ON term_searches(created_at DESC);
```

## Data Types & Conventions

### Primary Keys

- All primary keys are UUID v4 strings
- Generated using `crypto.randomUUID()`

### Timestamps

- All timestamps are Unix timestamps (seconds since epoch)
- Stored as INTEGER type
- Generated using `Math.floor(Date.now() / 1000)`

### JSON Fields

- Complex data stored as JSON strings
- Parsed/stringified at application layer
- Examples: arrays, nested objects, metadata

### Soft Deletes

- `deleted_at` field for soft deletes
- NULL = active, timestamp = deleted
- Queries filter by `deleted_at IS NULL`

### Indexes

- Primary key automatically indexed
- Foreign keys indexed for joins
- Frequently queried fields indexed
- Composite indexes for common query patterns

## Migration Strategy

See [Migrations](./migrations.md) for detailed migration procedures.

## Related Documentation

- [Migrations](./migrations.md) - Database migration strategy
- [Sync Strategy](./sync-strategy.md) - Data synchronization
- [API Specification](../03-api/rest-api.md) - API endpoints
- [Microservices](../01-architecture/microservices.md) - Service architecture

---

_Last updated: December 2024 | Version 1.7.6_
