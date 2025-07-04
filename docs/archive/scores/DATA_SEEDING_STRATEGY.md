# Data Seeding Strategy for Scores Service

## Overview

This document outlines a unified approach for managing seed data across all environments.

## Proposed Structure

```
scores/
├── migrations/
│   ├── 0001_initial_schema.sql
│   ├── ...
│   └── 0007_seed_collections.sql      # Collections only (no scores)
├── seeds/
│   ├── development/
│   │   ├── 0001_test_scores.sql       # Test data for local dev
│   │   └── README.md
│   ├── staging/
│   │   ├── 0001_demo_scores.sql       # Demo data for staging
│   │   └── README.md
│   └── production/
│       ├── 0001_initial_catalog.sql   # Real curated content
│       └── README.md
└── docs/
    └── IMPORT_CATALOG.md              # Instructions for importing PDFs
```

## Principles

1. **Single Source of Truth**: All metadata in SQL migrations/seeds
2. **Environment-Specific Seeds**: Different data for dev/staging/prod
3. **No PDFs in Repo**: Use import API or R2 upload scripts
4. **Idempotent**: All seeds use INSERT OR REPLACE
5. **Version Controlled**: Track what data was seeded when

## Implementation Plan

### Phase 1: Clean Up Current Structure

```bash
# Archive old approaches
mkdir -p archives/old-seeding
mv test-data/ archives/old-seeding/
mv music-library/ archives/old-seeding/
mv scripts/seed-*.sh archives/old-seeding/
```

### Phase 2: Create New Seed Structure

```sql
-- seeds/production/0001_initial_catalog.sql
-- Initial curated catalog for production launch
INSERT OR REPLACE INTO scores (
    id, slug, title, subtitle, composer, opus,
    instrument, difficulty, difficulty_level,
    year, style_period, tags, description,
    source, source_url, processing_status
) VALUES
-- Bach - Prelude in C Major
(
    'imslp_bach_prelude_c_major',
    'bach-prelude-c-major-bwv846',
    'Prelude in C Major',
    'from The Well-Tempered Clavier, Book I',
    'Johann Sebastian Bach',
    'BWV 846',
    'PIANO',
    'BEGINNER',
    3,
    1722,
    'BAROQUE',
    '["baroque", "prelude", "study", "harmony"]',
    'A masterclass in harmony and finger dexterity.',
    'imslp',
    'https://imslp.org/wiki/Special:ImagefromIndex/91865/hfpn',
    'pending'  -- Will be imported via API
);
```

### Phase 3: Import Workflow

```bash
# New import workflow using the AI-powered import API
curl -X POST https://scores.mirubato.com/api/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "url": "https://imslp.org/wiki/Special:ImagefromIndex/91865/hfpn"
  }'
```

### Phase 4: Environment Commands

```json
// package.json scripts
{
  "seed:dev": "wrangler d1 execute DB --local --file seeds/development/0001_test_scores.sql",
  "seed:staging": "wrangler d1 execute DB --env staging --remote --file seeds/staging/0001_demo_scores.sql",
  "seed:production": "echo 'Use seed:production:confirm to seed production data'",
  "seed:production:confirm": "wrangler d1 execute DB --env production --remote --file seeds/production/0001_initial_catalog.sql"
}
```

## Benefits

1. **Clear Separation**: Test vs staging vs production data
2. **Version Control**: Track exactly what was seeded
3. **No Binary Files**: PDFs imported via API, not stored
4. **Automation Ready**: Can be part of CI/CD pipeline
5. **Disaster Recovery**: Can recreate entire catalog from seeds

## Migration Path

1. Create new `seeds/` directory structure
2. Convert catalog.json to SQL format
3. Update package.json with new seed commands
4. Test in development first
5. Document PDF import process
6. Archive old seeding approach
7. Update deployment docs

## Notes

- Use the import API for all PDF uploads (supports AI metadata extraction)
- Keep test data minimal and focused
- Production seeds should only include metadata, not PDFs
- Consider using GitHub Actions to automate seeding after deployments
