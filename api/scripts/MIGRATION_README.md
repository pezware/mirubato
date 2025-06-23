# Backend to API Sync Data Migration

This directory contains scripts to migrate data from the backend tables (`logbook_entries`, `goals`, `practice_sessions`) to the API's `sync_data` table.

## Overview

The migration script is **idempotent** and can be run multiple times safely. It uses checksums to detect changes and only updates records that have been modified since the last run.

## Key Features

- **Idempotent**: Safe to run multiple times
- **Incremental**: Only processes changed records after initial run
- **Checksum-based**: Detects actual data changes
- **Batch processing**: Handles large datasets efficiently
- **Progress tracking**: Logs progress and maintains migration history
- **Dry-run mode**: Preview changes without modifying data

## Data Transformations

### Logbook Entries

- `timestamp` (Unix ms) → ISO string
- `pieces`, `techniques`, `tags`, `goal_ids` → Parsed JSON arrays
- `metadata` → Parsed JSON with default `{source: "manual"}`
- Uppercase enums preserved: `PRACTICE`, `PIANO`, etc.

### Goals

- `target_date`, `created_at`, `updated_at` → ISO strings
- `milestones`, `linked_entries` → Parsed JSON arrays
- Default status: `ACTIVE` if not set

### Practice Sessions

- All timestamps → ISO strings
- Uppercase enums preserved

## Usage

### Initial Setup

```bash
cd api
npm install
```

### Dry Run (Preview Changes)

Always start with a dry run to see what will be migrated:

```bash
npm run migrate:sync:dry
```

### Local Development

```bash
npm run migrate:sync
```

### Staging

```bash
npm run migrate:sync:staging
```

### Production

```bash
npm run migrate:sync:production
```

### Advanced Options

```bash
# Migrate specific user only
tsx scripts/migrate-backend-to-sync-data.ts --user=user_123

# Migrate specific entity type
tsx scripts/migrate-backend-to-sync-data.ts --entity=logbook_entry

# Custom batch size
tsx scripts/migrate-backend-to-sync-data.ts --batch-size=500

# Combine options
tsx scripts/migrate-backend-to-sync-data.ts --dry-run --user=user_123 --entity=goal
```

## Verification

After migration, verify the results:

```bash
# Check counts and integrity
wrangler d1 execute mirubato-prod --file=./scripts/verify-migration.sql

# Or for local
wrangler d1 execute mirubato-dev --local --file=./scripts/verify-migration.sql
```

## Weekly Migration Schedule

The migration is designed to run weekly:

1. **Sunday Night**: Run during low traffic (e.g., 2 AM PST)
2. **Incremental**: Only processes records modified since last run
3. **Monitoring**: Check migration_runs table for history

Example cron job:

```bash
# Run every Sunday at 2 AM
0 2 * * 0 cd /path/to/api && npm run migrate:sync:production >> /var/log/mirubato-migration.log 2>&1
```

## Troubleshooting

### Common Issues

1. **"Migration failed" error**

   - Check database connection
   - Verify tables exist: `logbook_entries`, `goals`, `practice_sessions`
   - Check user permissions

2. **High number of skipped records**

   - This is normal for subsequent runs
   - Only changed records are processed

3. **JSON parse errors**
   - Check for malformed JSON in source tables
   - Script logs specific record IDs that fail

### Debug Mode

For detailed logging, modify the script to add debug output:

```typescript
console.log('Processing entry:', entry.id, entry)
```

## Rollback

If needed, you can remove migrated data:

```sql
-- Remove all sync_data for specific entity type
DELETE FROM sync_data WHERE entity_type = 'logbook_entry';

-- Remove all sync_data for specific user
DELETE FROM sync_data WHERE user_id = 'user_123';

-- Remove all migrated data (careful!)
DELETE FROM sync_data;
```

## Migration Tracking

The script maintains a `migration_runs` table:

```sql
-- View migration history
SELECT * FROM migration_runs ORDER BY started_at DESC;

-- Check last successful migration
SELECT * FROM migration_runs
WHERE completed_at IS NOT NULL
ORDER BY completed_at DESC
LIMIT 1;
```

## Notes

- The script preserves uppercase enums (PRACTICE, PIANO) for compatibility
- Null/empty JSON fields get sensible defaults
- Timestamps are converted from Unix milliseconds to ISO strings
- User associations are preserved (same user_id)
- The backend tables remain unchanged (source of truth until full migration)
