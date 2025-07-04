# Database Migration Required: Update Slugs with Opus

## Important: Run Migration on Staging

The new slug generation includes opus information to prevent conflicts. You need to run the migration to update existing slugs.

### Migration File

`scores/migrations/0008_update_slugs_with_opus.sql`

### How to Run

1. **Via Cloudflare Dashboard:**
   - Go to Cloudflare Dashboard > D1 > mirubato-scores-staging
   - Click "Console" tab
   - Copy and paste the migration SQL
   - Click "Execute"

2. **Via Wrangler CLI:**
   ```bash
   cd scores
   wrangler d1 execute mirubato-scores-staging --file=./migrations/0008_update_slugs_with_opus.sql --env=staging
   ```

### What it Does

- Drops the unique index temporarily
- Updates slugs to include opus (e.g., "etude" → "etude-op-3-no-3")
- Handles any remaining duplicates by appending ID suffix
- Recreates the unique index

### Before/After Examples

| Title         | Opus         | Old Slug      | New Slug                 |
| ------------- | ------------ | ------------- | ------------------------ |
| Les Favorites | Op. 11 No. 6 | les-favorites | les-favorites-op-11-no-6 |
| Etude         | Op. 3 No. 3  | etude         | etude-op-3-no-3          |
| Etude         | Op. 3 No. 4  | etude         | etude-op-3-no-4          |

### Testing After Migration

Import a score with opus to verify new slug generation:

```bash
./scores/scripts/test-ai-import.sh staging \
  "https://www.mutopiaproject.org/ftp/ChopinFF/O28/Chop-28-4/Chop-28-4.pdf" \
  cloudflare
```

This should generate a slug like `prelude-op-28-no-4` instead of just `prelude`.
