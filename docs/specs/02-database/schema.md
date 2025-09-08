# Database Schema Specification

## Overview

Mirubato uses Cloudflare D1 (SQLite) with one database per service for isolation and independent evolution. The Sync Worker shares the API’s database; there is no separate Sync DB. Schema changes are additive and applied via migrations only — no manual DB operations.

## Database Distribution

| Service    | DB Binding | Purpose                                         | Reference                 |
| ---------- | ---------- | ----------------------------------------------- | ------------------------- |
| API        | `DB`       | Core user data, sync storage, repertoire/goals  | `api/migrations/`         |
| Scores     | `DB`       | Scores metadata, versions, collections, metrics | `scores/migrations/`      |
| Dictionary | `DB`       | Dictionary entries, analytics, queues           | `dictionary/migrations/`  |

## API Service Database

### Users

Minimal user identity for auth and ownership.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  auth_provider TEXT DEFAULT 'magic_link' CHECK (auth_provider IN ('magic_link','google')),
  google_id TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

### Sync Storage

Authoritative store for user entities synced from clients.

```sql
-- Entity data (logbook entries, goals, user_preferences, etc.)
CREATE TABLE sync_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data TEXT NOT NULL,              -- JSON
  checksum TEXT NOT NULL,          -- Content hash for duplicate prevention
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX idx_sync_data_user ON sync_data(user_id);
CREATE INDEX idx_sync_data_type ON sync_data(entity_type);
CREATE INDEX idx_sync_data_updated ON sync_data(updated_at);

-- Per-user sync metadata
CREATE TABLE sync_metadata (
  user_id TEXT PRIMARY KEY,
  last_sync_token TEXT,
  last_sync_time TIMESTAMP,
  device_count INTEGER DEFAULT 1,
  last_device_id TEXT,
  sync_conflict_count INTEGER DEFAULT 0
);
```

### Idempotency Keys

Support for idempotent sync operations.

```sql
CREATE TABLE idempotency_keys (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response TEXT NOT NULL,          -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

CREATE INDEX idx_idempotency_lookup ON idempotency_keys(key, user_id);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);
```

### User Repertoire

Lightweight per-user repertoire records.

```sql
CREATE TABLE user_repertoire (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  score_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','learning','polished','dropped')),
  difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
  personal_notes TEXT,
  reference_links TEXT,             -- JSON array
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, score_id)
);

CREATE INDEX idx_repertoire_user ON user_repertoire(user_id);
CREATE INDEX idx_repertoire_score ON user_repertoire(score_id);
CREATE INDEX idx_repertoire_status ON user_repertoire(status);
```

### Score Annotations

Per-user PDF annotations stored with the API (not in Scores DB).

```sql
CREATE TABLE score_annotations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  score_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  annotation_data TEXT NOT NULL,    -- JSON
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('highlight','text','drawing','measure_bracket')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_annotations_user_score ON score_annotations(user_id, score_id);
CREATE INDEX idx_annotations_page ON score_annotations(score_id, page_number);
```

### Goals and Progress

Goal records with additive, JSON-friendly fields; separate progress history.

```sql
-- Goals (columns may include optional: score_id, measures JSON, practice_plan JSON)
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  target_value INTEGER,
  current_value INTEGER DEFAULT 0,
  target_date TEXT,
  status TEXT DEFAULT 'active',
  score_id TEXT,
  measures TEXT,
  practice_plan TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Progress history
CREATE TABLE goal_progress (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  value REAL NOT NULL,
  notes TEXT,
  session_id TEXT,
  recorded_at INTEGER NOT NULL
);
```

## Scores Service Database

### Scores

Canonical metadata for each score (enums simplified here; see migrations for full constraints).

```sql
CREATE TABLE scores (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT NOT NULL,
  opus TEXT,
  movement TEXT,
  instrument TEXT NOT NULL,           -- 'PIANO' | 'GUITAR' | 'BOTH'
  difficulty TEXT NOT NULL,           -- 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  difficulty_level INTEGER,
  grade_level TEXT,
  duration_seconds INTEGER,
  time_signature TEXT,
  key_signature TEXT,
  tempo_marking TEXT,
  suggested_tempo INTEGER,
  style_period TEXT,
  source TEXT,
  imslp_url TEXT,
  tags TEXT,                          -- JSON
  metadata TEXT,                      -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Score Versions

```sql
CREATE TABLE score_versions (
  id TEXT PRIMARY KEY,
  score_id TEXT NOT NULL,
  format TEXT NOT NULL,               -- 'pdf' | 'musicxml' | 'vexflow' | 'image' | 'abc'
  r2_key TEXT NOT NULL,
  file_size_bytes INTEGER,
  page_count INTEGER,
  resolution TEXT,
  processing_status TEXT DEFAULT 'pending',
  processing_error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Score Pages

```sql
CREATE TABLE score_pages (
  id TEXT PRIMARY KEY,
  score_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  ocr_text TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(score_id, page_number)
);
```

### Collections

Curated collections and user-owned collections (with membership table for scale).

```sql
-- Curated collections (platform-managed)
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  instrument TEXT,
  difficulty TEXT,
  score_ids TEXT NOT NULL,            -- JSON array of score IDs
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User collections
CREATE TABLE user_collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  visibility TEXT DEFAULT 'private',
  is_default BOOLEAN DEFAULT FALSE,
  collection_type TEXT DEFAULT 'personal',
  score_ids TEXT NOT NULL DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, slug)
);

CREATE TABLE collection_members (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  score_id TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(collection_id, score_id)
);
```

### Analytics

```sql
CREATE TABLE score_analytics (
  score_id TEXT PRIMARY KEY,
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  render_count INTEGER DEFAULT 0,
  last_viewed_at DATETIME
);
```

## Dictionary Service Database

### Dictionary Entries

Primary content table for terms across languages and categories.

```sql
CREATE TABLE dictionary_entries (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  lang TEXT NOT NULL,
  type TEXT,
  definition TEXT NOT NULL,          -- JSON/text
  metadata TEXT,                     -- JSON (related terms, categories, instruments, etc.)
  overall_score INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(normalized_term, lang)
);
```

### Supporting Tables (selected)

- `user_feedback` — ratings/feedback; indexed by `entry_id`, `user_id`.
- `related_terms` — relations across entries.
- `search_analytics` — searched terms, result status, timing, lang.
- `seed_queue` — queued generation items with priority/status.
- `ai_token_usage` — daily token accounting by model.
- `manual_review_queue`, `dead_letter_queue`, `recovery_history` — curation and recovery.
- Analytics tables: `ai_model_usage`, `cache_metrics`, `daily_statistics`, `export_history`.
- Optional: `term_embeddings` (if enabled by migrations).

## Data Types & Conventions

- Primary keys are strings (typically nanoid/UUID); generated by the application.
- Timestamps stored as INTEGER (unixepoch) or TIMESTAMP/DATETIME per migration; access via app helpers.
- JSON fields stored as TEXT and parsed/stringified at the application layer.
- Soft deletes via `deleted_at` (when present); queries must filter accordingly.

## Migrations

- All schema changes are additive and applied via per-service migrations. No manual DB operations.
- See `02-database/migrations.md` for workflow and safety guidelines.

## Related Documentation

- [Migrations](./migrations.md)
- [Sync Strategy](./sync-strategy.md)
- [Microservices](../01-architecture/microservices.md)

---

_Last updated: December 2024 | Version 1.7.6_
