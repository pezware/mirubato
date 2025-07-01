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
  -d '{"url": "https://www.mutopiaproject.org/..."}'

# Or use the import UI at /scorebook/import
```

### Respectful Import Guidelines

When importing from external sources like Mutopia Project:

1. **Be courteous**: Don't import too many files too quickly
2. **Use delays**: Wait 30+ seconds between imports
3. **Give attribution**: Credit the source (Mutopia Project)
4. **Respect licenses**: Ensure compliance with CC licenses
5. **Test locally first**: Use `import-mutopia.sh local` before production

### Import Scripts

```bash
# Courteous import with delays
./scripts/import-mutopia.sh local

# Test import functionality
./scripts/test-import-local.sh
```

## Troubleshooting

### Error: "table scores has no column named subtitle"

This happens when the local database is missing columns from recent migrations.

**Solution**:

```bash
# Fix migration conflicts (if needed)
./scripts/fix-local-migrations.sh

# Run migrations
npm run db:migrate

# Then try seeding again
npm run seed:dev
```

### Fresh Local Database Setup

If you want to start with a fresh local database:

```bash
# Remove local database
rm -rf .wrangler/state/v3/d1

# Run migrations
npm run db:migrate

# Seed development data
npm run seed:dev
```
