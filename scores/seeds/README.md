# Scores Service Seed Data

This directory contains environment-specific seed data for the Mirubato Scores service.

## Structure

- `development/` - Test data for local development
- `staging/` - Demo data for staging environment
- `production/` - Initial catalog for production

## Usage

```bash
# Seed local development database
npm run seed:dev

# Seed staging (requires confirmation)
npm run seed:staging

# Seed production (requires explicit confirmation)
npm run seed:production:confirm
```

## Important Notes

1. **No PDFs are stored here** - Only metadata
2. PDFs are imported using the `/api/import` endpoint
3. All seeds use `INSERT OR REPLACE` for idempotency
4. Production seeds require explicit confirmation

## Adding New Seeds

1. Create a new SQL file with incrementing number (e.g., `0002_additional_scores.sql`)
2. Use `INSERT OR REPLACE` to ensure idempotency
3. Include comprehensive metadata but no binary data
4. Test in development before applying to staging/production

## Import Workflow

After seeding metadata, import PDFs using:

```bash
# Import a single score
curl -X POST https://scores.mirubato.com/api/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"url": "https://imslp.org/..."}'

# Or use the import UI at /scorebook/import
```
