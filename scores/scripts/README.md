# Scores Service Scripts

This directory contains utility scripts for managing the Mirubato Scores service.

## Production Scripts

### `seed-production.sh`

Seeds the production database with test scores and uploads PDFs to R2.

- **⚠️ WARNING**: This modifies production data!
- Requires confirmation before running
- Runs database migrations if needed
- Uploads test PDFs to production R2

```bash
./scripts/seed-production.sh
```

### `seed-staging.sh`

Seeds the staging environment with test scores and provides upload instructions.

- Safe to run multiple times (uses INSERT OR REPLACE)
- Uploads PDFs to staging R2
- No confirmation required

```bash
./scripts/seed-staging.sh
```

## Development Scripts

### `seed-r2-miniflare.sh`

Seeds local Miniflare R2 storage with test PDFs for development.

- Only works in local development
- Uses the upload-real-pdfs.js script

```bash
./scripts/seed-r2-miniflare.sh
```

### `seed-test-scores.sh`

Seeds the local development database with test scores.

- Creates tables if they don't exist
- Inserts test score entries
- Safe to run multiple times

```bash
./scripts/seed-test-scores.sh
```

### `upload-real-pdfs.js`

Node.js script to upload actual PDF files to local R2 storage.

- Requires local API to be running
- Uploads files from test-data/ directory
- Only works in development environment

```bash
node scripts/upload-real-pdfs.js
```

## Test Data

The `test-data/` directory contains:

- `score_01.pdf` - Aire Sureño by Agustín Barrios Mangoré
- `score_02.pdf` - Romance (Spanish Romance) - Anonymous

## Environment URLs

- **Production**: https://scores.mirubato.com
- **Staging**: https://scores-staging.mirubato.com
- **Local**: http://localhost:8787
