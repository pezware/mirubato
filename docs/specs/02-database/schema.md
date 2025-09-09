# Database Schema Specification

**What**: Service-isolated D1 databases with migration-driven schema evolution.

**Why**:

- Service autonomy enables independent schema changes
- D1 provides edge SQL with automatic replication
- Migration-only changes ensure reproducible deployments
- JSON columns provide flexibility without schema changes

**How**:

- Each service owns its D1 database binding
- All changes via numbered SQL migrations
- Sync Worker shares API database (no separate DB)
- Additive changes preferred over destructive ones

## Database Distribution

| Service     | DB Binding | Purpose                                 | Migration Count | Latest Migration            |
| ----------- | ---------- | --------------------------------------- | --------------- | --------------------------- |
| API         | `DB`       | Users, sync data, repertoire, goals     | 11 migrations   | 0010_add_dropped_status.sql |
| Scores      | `DB`       | Scores metadata, collections, pages     | 18 migrations   | 0018_add_normalized_id.sql  |
| Dictionary  | `DB`       | Terms, embeddings, analytics            | 8 migrations    | 0008_add_queue_tables.sql   |
| Sync Worker | (uses API) | Shares API database for sync operations | N/A             | N/A                         |

**Code References**:

- Migration files: `*/migrations/*.sql`
- Wrangler configs: `*/wrangler.toml` (d1_databases bindings)

## API Service Database

### Core Tables

**Users Table**

- Purpose: User identity and authentication
- Key columns: `id`, `email`, `display_name`, `auth_provider`, `google_id`
- Constraints: Unique email and google_id
- Auth providers: `magic_link`, `google`
- Source: `api/migrations/0001_initial_schema.sql`

**Sync Data Table**

- Purpose: Universal storage for synced entities
- Key columns: `user_id`, `entity_type`, `entity_id`, `data` (JSON), `checksum`
- Entity types: `logbook_entry`, `goal`, `user_preferences`
- Unique constraint: `(user_id, entity_type, entity_id)`
- Soft deletes: `deleted_at` timestamp
- Source: `api/migrations/0001_initial_schema.sql`

**Sync Metadata Table**

- Purpose: Track per-user sync state
- Key columns: `user_id`, `last_sync_token`, `last_sync_time`, `device_count`
- Note: No FK constraints in D1 implementation
- Source: `api/migrations/0001_initial_schema.sql`, `0004_fix_sync_metadata_schema.sql`

### Deduplication Support

**Idempotency Keys Table**

- Purpose: Prevent duplicate sync operations
- Key columns: `key`, `user_id`, `request_hash`, `response` (JSON), `expires_at`
- Indexes: `(key, user_id)`, `expires_at`
- TTL: Configurable expiration for cleanup
- Source: `api/migrations/0008_duplicate_prevention.sql`

### Repertoire Tables

**User Repertoire Table**

- Purpose: Track user's repertoire pieces
- Key columns: `user_id`, `score_id`, `status`, `difficulty_rating`, `personal_notes`
- Status values: `planned`, `learning`, `polished`, `dropped`
- Unique constraint: `(user_id, score_id)`
- Source: `api/migrations/0008_repertoire_and_annotations.sql`, `0010_add_dropped_status.sql`

**Score Annotations Table**

- Purpose: User annotations on PDF scores
- Key columns: `user_id`, `score_id`, `page_number`, `annotation_data` (JSON)
- Annotation types: `highlight`, `text`, `drawing`, `measure_bracket`
- Indexes: `(user_id, score_id)`, `(score_id, page_number)`
- Source: `api/migrations/0008_repertoire_and_annotations.sql`

### Goals

**Goals Storage**

- Purpose: User practice goals
- Storage: Via `sync_data` table as entity_type='goal'
- Common fields in JSON: `title`, `description`, `type`, `target_value`, `status`
- Source: Referenced in `api/src/api/handlers/goals.ts`

**Goal Progress Table**

- Purpose: Track goal progress history
- Key columns: `goal_id`, `value`, `notes`, `session_id`, `recorded_at`
- Indexes: `goal_id`, `recorded_at`
- Source: `api/migrations/0009_add_goal_progress.sql`

## Scores Service Database

### Core Tables

**Scores Table**

- Purpose: Canonical score metadata
- Key columns: `id`, `title`, `composer`, `instrument`, `difficulty`
- Enums:
  - instrument: `PIANO`, `GUITAR`, `BOTH`
  - difficulty: `BEGINNER`, `INTERMEDIATE`, `ADVANCED`
  - style_period: `BAROQUE`, `CLASSICAL`, `ROMANTIC`, `MODERN`, `CONTEMPORARY`
  - source: `imslp`, `upload`, `generated`, `manual`
- Additional: `normalized_id` for deduplication
- Source: `scores/migrations/0001_initial_schema.sql`, `0018_add_normalized_id.sql`

**Score Versions Table**

- Purpose: Different formats of same score
- Key columns: `score_id`, `format`, `r2_key`, `processing_status`
- Formats: `pdf`, `musicxml`, `vexflow`, `image`, `abc`
- Processing: `pending`, `processing`, `completed`, `failed`
- Source: `scores/migrations/0001_initial_schema.sql`

**Score Pages Table**

- Purpose: Individual page metadata and images
- Key columns: `score_id`, `page_number`, `image_url`, `thumbnail_url`
- Unique: `(score_id, page_number)`
- Source: `scores/migrations/0010_create_score_pages_table.sql`

### Collections

**Collections Table**

- Purpose: Curated platform collections
- Key columns: `name`, `slug`, `score_ids` (JSON), `is_featured`
- Source: `scores/migrations/0001_initial_schema.sql`, `0014_update_collections_schema.sql`

**User Collections Table**

- Purpose: User-created collections
- Key columns: `user_id`, `name`, `slug`, `visibility`, `score_ids` (JSON)
- Visibility: `private`, `public`, `shared`
- Unique: `(user_id, slug)`
- Source: `scores/migrations/0011_create_user_collections_table.sql`

**Collection Members Table**

- Purpose: Collection membership (for future scale)
- Key columns: `collection_id`, `score_id`, `display_order`
- Unique: `(collection_id, score_id)`
- Note: Currently using JSON arrays in collections tables
- Source: `scores/migrations/0001_initial_schema.sql`

### Analytics

**Score Analytics Table**

- Purpose: Track score usage metrics
- Key columns: `score_id`, `view_count`, `download_count`, `render_count`
- Source: `scores/migrations/0001_initial_schema.sql`

## Dictionary Service Database

### Core Tables

**Dictionary Entries Table**

- Purpose: Music terminology definitions
- Key columns: `term`, `normalized_term`, `lang`, `definition`, `metadata` (JSON)
- Languages: `en`, `es`, `fr`, `de`, `zh-TW`, `zh-CN`
- Unique: `(normalized_term, lang)`
- Quality: `overall_score` for ranking
- Source: `dictionary/migrations/0001_initial_schema.sql`

**Term Embeddings Table**

- Purpose: Semantic search vectors
- Key columns: `entry_id`, `embedding` (BLOB), `model`, `dimension`
- Models: Various Cloudflare AI embedding models
- Source: `dictionary/migrations/0002_add_embeddings.sql`

### Analytics & Queues

**Search Analytics Table**

- Purpose: Track search patterns
- Key columns: `term`, `normalized_term`, `result_count`, `search_type`
- Source: `dictionary/migrations/0003_add_analytics.sql`

**AI Token Usage Table**

- Purpose: Track AI API usage
- Key columns: `date`, `model`, `tokens`
- Primary key: `(date, model)`
- Source: `dictionary/migrations/0006_add_ai_token_usage.sql`

**Queue Tables**

- Seed queue: Terms to generate
- Manual review queue: Terms needing review
- Dead letter queue: Failed processing
- Source: `dictionary/migrations/0008_add_queue_tables.sql`

### Supporting Tables

- `user_feedback` — User ratings on definitions
- `related_terms` — Term relationships
- `ai_model_usage` — Model performance metrics
- `cache_metrics` — Cache hit/miss tracking
- `daily_statistics` — Aggregated daily metrics
- `export_history` — Data export tracking

## Data Conventions

**Primary Keys**

- Format: Text (nanoid/UUID generated by application)
- No auto-increment (D1 limitation awareness)

**Timestamps**

- Stored as: INTEGER (Unix epoch) or DATETIME
- Managed by: Application layer helpers
- Auto-update: Via triggers where applicable

**JSON Fields**

- Storage: TEXT columns
- Parsing: Application layer (not database)
- Examples: `metadata`, `tags`, `score_ids`

**Soft Deletes**

- Column: `deleted_at` timestamp
- Queries: Must filter WHERE deleted_at IS NULL
- Used in: `sync_data` table

**Enums via CHECK**

- Lowercase convention (after migration 0006/0007)
- Enforced via CHECK constraints
- Examples: status, instrument, difficulty

## Operational Limits

**D1 Limits**

- Database size: 2GB per database
- Query time: 10 seconds max
- Batch size: 100 statements
- Result size: 100MB

**Index Strategy**

- Primary lookups: user_id, entity_type
- Performance: updated_at for sync
- Search: composer, instrument, difficulty

## Related Documentation

- [Migrations](./migrations.md) — Migration strategy and procedures
- [Sync Strategy](./sync-strategy.md) — Data synchronization patterns
- [Microservices](../01-architecture/microservices.md) — Service architecture

---

_Last updated: 2025-09-09 | Version 1.7.6_
