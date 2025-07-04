# Cleanup Plan for Scores Service

## Current State

We have multiple overlapping approaches for seeding data:

- `test-data/` - Contains actual PDF files
- `scripts/` - Various seeding scripts
- `music-library/` - catalog.json with metadata
- Multiple SQL files with different approaches

## New Unified Approach

- `seeds/` - Environment-specific SQL seed files
- `migrations/` - Schema and essential data only
- Import API - For loading PDFs (with AI metadata extraction)

## Cleanup Steps

### 1. Archive Old Approach (Don't Delete Yet)

```bash
# Create archive directory
mkdir -p archives/old-seeding-approach

# Move old directories
mv test-data/ archives/old-seeding-approach/
mv music-library/ archives/old-seeding-approach/

# Move old seeding scripts (keep other utility scripts)
mv scripts/seed-*.sh archives/old-seeding-approach/
mv scripts/seed-*.sql archives/old-seeding-approach/
mv scripts/upload-real-pdfs.js archives/old-seeding-approach/
```

### 2. Update Documentation

- Update README to reference new seeding approach
- Document the import workflow
- Add examples of using the import API

### 3. Test New Approach

```bash
# Test local seeding
npm run seed:dev
./scripts/import-catalog.sh local

# Verify it works
npm run test:api
```

### 4. Benefits of New Approach

✅ Single source of truth (SQL files)
✅ No binary files in repo
✅ Environment-specific data
✅ Version controlled
✅ CI/CD friendly
✅ Uses the new AI-powered import system

### 5. Keep These Scripts

- `scripts/import-catalog.sh` - New import workflow
- `scripts/check-staging-schema.sh` - Still useful for debugging
- Other utility scripts that aren't seed-related

## Next Steps

1. Test the new seeding approach locally
2. Update CI/CD pipelines if needed
3. Document in team wiki
4. After 2 weeks of successful use, remove archives
