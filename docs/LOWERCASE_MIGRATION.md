# Lowercase Migration Plan

## Overview

This document outlines the step-by-step plan to migrate all uppercase enum values (instruments, practice types, moods) to lowercase across the Mirubato platform. This migration aligns with user preferences as most user inputs are naturally lowercase.

## Current State Analysis

### Data Distribution

| Service              | Current State | Details                                        |
| -------------------- | ------------- | ---------------------------------------------- |
| **API Database**     | Mixed         | 43 entries with lowercase in sync_data         |
| **Scores Database**  | Uppercase     | 26 entries with uppercase (17 PIANO, 9 GUITAR) |
| **Frontend Types**   | Uppercase     | All TypeScript enums use uppercase             |
| **Database Schemas** | Uppercase     | CHECK constraints require uppercase            |
| **i18n Files**       | Lowercase     | Already use lowercase keys                     |
| **localStorage**     | As stored     | No transformation on read/write                |

### Affected Enums

1. **Instruments**: `PIANO` → `piano`, `GUITAR` → `guitar`, `BOTH` → `both`
2. **Practice Types**: `PRACTICE` → `practice`, `PERFORMANCE` → `performance`, `LESSON` → `lesson`, `REHEARSAL` → `rehearsal`, `TECHNIQUE` → `technique`
3. **Moods**: `FRUSTRATED` → `frustrated`, `NEUTRAL` → `neutral`, `SATISFIED` → `satisfied`, `EXCITED` → `excited`
4. **Difficulty** (scores): `BEGINNER` → `beginner`, `INTERMEDIATE` → `intermediate`, `ADVANCED` → `advanced`
5. **Style Periods** (scores): `BAROQUE` → `baroque`, `CLASSICAL` → `classical`, etc.

## Migration Plan

### Phase 1: Frontend Updates (Day 1)

#### 1.1 Update TypeScript Type Definitions

**Files to update:**

- `frontendv2/src/api/logbook.ts`
- `scores/src/types/score.ts`
- `frontendv2/src/modules/auto-logging/types.ts`

```typescript
// frontendv2/src/api/logbook.ts
export interface LogbookEntry {
  // ...
  type: 'practice' | 'performance' | 'lesson' | 'rehearsal' | 'technique'
  instrument: 'piano' | 'guitar'
  mood?: 'frustrated' | 'neutral' | 'satisfied' | 'excited' | null
  // ...
}

// scores/src/types/score.ts
export type Instrument = 'piano' | 'guitar' | 'both'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type StylePeriod =
  | 'baroque'
  | 'classical'
  | 'romantic'
  | 'modern'
  | 'contemporary'
```

#### 1.2 Update Component Hardcoded Values

**Files to update:**

- `frontendv2/src/components/ManualEntryForm.tsx`
- Any other components with hardcoded enum values

```typescript
// ManualEntryForm.tsx - Lines ~240-246
{ value: 'piano', label: `🎹 ${t('common:instruments.piano')}` },
{ value: 'guitar', label: `🎸 ${t('common:instruments.guitar')}` },

// Lines ~258-269
{ value: 'practice', label: t('logbook:entry.typeOptions.practice') },
{ value: 'lesson', label: t('logbook:entry.typeOptions.lesson') },
{ value: 'performance', label: t('logbook:entry.typeOptions.performance') },
{ value: 'rehearsal', label: t('logbook:entry.typeOptions.rehearsal') },
{ value: 'technique', label: t('logbook:entry.typeOptions.technique') },

// Lines ~367-385
{ value: 'frustrated', label: '😤', fullLabel: t('logbook:mood.frustrated') },
{ value: 'neutral', label: '😐', fullLabel: t('logbook:mood.neutral') },
{ value: 'satisfied', label: '😊', fullLabel: t('logbook:mood.satisfied') },
{ value: 'excited', label: '🎉', fullLabel: t('logbook:mood.excited') },
```

#### 1.3 Add localStorage Migration

Create a new file: `frontendv2/src/utils/migrations/lowercaseMigration.ts`

```typescript
export const runLowercaseMigration = () => {
  const MIGRATION_KEY = 'mirubato:lowercase-migration-v1'

  // Check if migration already ran
  if (localStorage.getItem(MIGRATION_KEY)) {
    return
  }

  // Migrate logbook entries
  const entriesKey = 'mirubato:logbook:entries'
  const stored = localStorage.getItem(entriesKey)
  if (stored) {
    try {
      const entries = JSON.parse(stored)
      const migrated = entries.map((entry: any) => ({
        ...entry,
        type: entry.type?.toLowerCase(),
        instrument: entry.instrument?.toLowerCase(),
        mood: entry.mood?.toLowerCase(),
      }))
      localStorage.setItem(entriesKey, JSON.stringify(migrated))
    } catch (error) {
      console.error('Failed to migrate logbook entries:', error)
    }
  }

  // Mark migration as complete
  localStorage.setItem(MIGRATION_KEY, 'done')
}
```

Add to `frontendv2/src/App.tsx`:

```typescript
import { runLowercaseMigration } from './utils/migrations/lowercaseMigration'

function App() {
  useEffect(() => {
    runLowercaseMigration()
  }, [])
  // ...
}
```

#### 1.4 Add Temporary Compatibility Layer

Add to API response handlers to ensure smooth transition:

```typescript
// frontendv2/src/api/logbook.ts
const normalizeEntry = (entry: any): LogbookEntry => ({
  ...entry,
  type: entry.type?.toLowerCase(),
  instrument: entry.instrument?.toLowerCase(),
  mood: entry.mood?.toLowerCase()
})

// Apply to getEntries response
getEntries: async () => {
  const response = await apiClient.post('/api/sync/pull', {...})
  return (response.data.entries || []).map(normalizeEntry)
}
```

### Phase 2: API Updates (Day 1-2)

#### 2.1 Update Sync Handler

The API already converts to lowercase in `api/src/api/handlers/sync.ts` (line 118), but we need to ensure it's consistent:

```typescript
// Ensure pull endpoint also normalizes
entries.push({
  ...data,
  type: data.type?.toLowerCase(),
  instrument: data.instrument?.toLowerCase(),
  mood: data.mood?.toLowerCase(),
})
```

#### 2.2 Update Scores API

Add similar normalization to scores endpoints in `scores/src/api/handlers/scores.ts`.

### Phase 3: Database Schema Updates (Day 2)

#### 3.1 Create Migration Script

Create `api/migrations/0006_lowercase_enums.sql`:

```sql
-- Update CHECK constraints to accept lowercase values

-- Users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_primary_instrument_check;
ALTER TABLE users ADD CONSTRAINT users_primary_instrument_check
  CHECK (primary_instrument IN ('piano', 'guitar'));

-- Logbook entries
ALTER TABLE logbook_entries DROP CONSTRAINT IF EXISTS logbook_entries_type_check;
ALTER TABLE logbook_entries ADD CONSTRAINT logbook_entries_type_check
  CHECK (type IN ('practice', 'performance', 'lesson', 'rehearsal', 'technique'));

ALTER TABLE logbook_entries DROP CONSTRAINT IF EXISTS logbook_entries_instrument_check;
ALTER TABLE logbook_entries ADD CONSTRAINT logbook_entries_instrument_check
  CHECK (instrument IN ('piano', 'guitar'));

ALTER TABLE logbook_entries DROP CONSTRAINT IF EXISTS logbook_entries_mood_check;
ALTER TABLE logbook_entries ADD CONSTRAINT logbook_entries_mood_check
  CHECK (mood IN ('frustrated', 'neutral', 'satisfied', 'excited'));

-- Practice sessions
ALTER TABLE practice_sessions DROP CONSTRAINT IF EXISTS practice_sessions_instrument_check;
ALTER TABLE practice_sessions ADD CONSTRAINT practice_sessions_instrument_check
  CHECK (instrument IN ('piano', 'guitar'));

-- Sheet music
ALTER TABLE sheet_music DROP CONSTRAINT IF EXISTS sheet_music_instrument_check;
ALTER TABLE sheet_music ADD CONSTRAINT sheet_music_instrument_check
  CHECK (instrument IN ('piano', 'guitar'));
```

#### 3.2 Create Data Migration Script

Create `api/migrations/0007_migrate_data_to_lowercase.sql`:

```sql
-- Migrate existing data to lowercase

-- Update sync_data JSON content
UPDATE sync_data
SET data = json_set(
  json_set(
    json_set(
      data,
      '$.type', LOWER(json_extract(data, '$.type')),
      '$.instrument', LOWER(json_extract(data, '$.instrument'))
    ),
    '$.mood', LOWER(json_extract(data, '$.mood'))
  )
)
WHERE entity_type = 'logbook_entry'
AND (
  json_extract(data, '$.type') != LOWER(json_extract(data, '$.type'))
  OR json_extract(data, '$.instrument') != LOWER(json_extract(data, '$.instrument'))
  OR json_extract(data, '$.mood') != LOWER(json_extract(data, '$.mood'))
);

-- Update users table
UPDATE users SET primary_instrument = LOWER(primary_instrument)
WHERE primary_instrument != LOWER(primary_instrument);

-- Update logbook_entries (if any data exists)
UPDATE logbook_entries SET
  type = LOWER(type),
  instrument = LOWER(instrument),
  mood = LOWER(mood)
WHERE type != LOWER(type)
  OR instrument != LOWER(instrument)
  OR mood != LOWER(mood);

-- Update practice_sessions (if any data exists)
UPDATE practice_sessions SET instrument = LOWER(instrument)
WHERE instrument != LOWER(instrument);

-- Update sheet_music (if any data exists)
UPDATE sheet_music SET instrument = LOWER(instrument)
WHERE instrument != LOWER(instrument);
```

#### 3.3 Scores Database Migration

Create `scores/migrations/0001_migrate_to_lowercase.sql`:

```sql
-- Update scores table
UPDATE scores SET
  instrument = LOWER(instrument),
  difficulty = LOWER(difficulty),
  style_period = LOWER(style_period)
WHERE instrument != LOWER(instrument)
  OR difficulty != LOWER(difficulty)
  OR (style_period IS NOT NULL AND style_period != LOWER(style_period));

-- Update collections table if it has instrument/difficulty
UPDATE collections SET
  instrument = LOWER(instrument),
  difficulty = LOWER(difficulty)
WHERE instrument != LOWER(instrument)
  OR difficulty != LOWER(difficulty);
```

### Phase 4: Testing & Deployment (Day 3)

#### 4.1 Testing Checklist

- [ ] Frontend displays lowercase values correctly
- [ ] API accepts both cases during transition period
- [ ] Database constraints accept lowercase values
- [ ] Existing localStorage data migrated successfully
- [ ] New entries created with lowercase values
- [ ] Scores service works with lowercase values
- [ ] No breaking changes for existing users

#### 4.2 Deployment Order

1. **Deploy Frontend** (with compatibility layer)

   ```bash
   cd frontendv2
   npm run build
   wrangler deploy --env staging
   ```

2. **Deploy API** (already handles lowercase)

   ```bash
   cd api
   wrangler deploy --env staging
   ```

3. **Run Database Migrations**

   ```bash
   cd api
   ./scripts/safe-migrate.sh --env staging
   ```

4. **Deploy Scores Service**

   ```bash
   cd scores
   wrangler deploy --env staging
   ```

5. **Verify in Staging**
   - Test all features
   - Check data integrity
   - Monitor for errors

6. **Deploy to Production** (repeat steps 1-5 with production env)

### Phase 5: Cleanup (Day 4)

#### 5.1 Remove Compatibility Code

After verifying everything works:

1. Remove normalization functions from frontend
2. Remove uppercase handling from API (if any)
3. Update documentation

#### 5.2 Update Tests

Update any tests that might be checking for uppercase values.

## Rollback Plan

### Preparation

1. **Database Backup**

   ```bash
   cd api/scripts
   ./backup-database.sh --env production
   ```

2. **Keep Migration Scripts**
   Create reverse migration scripts before deployment

### Rollback Scripts

Create `api/migrations/rollback_lowercase.sql`:

```sql
-- Revert CHECK constraints to uppercase
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_primary_instrument_check;
ALTER TABLE users ADD CONSTRAINT users_primary_instrument_check
  CHECK (primary_instrument IN ('PIANO', 'GUITAR'));

-- Similar for other tables...

-- Revert data to uppercase
UPDATE sync_data
SET data = json_set(
  json_set(
    json_set(
      data,
      '$.type', UPPER(json_extract(data, '$.type')),
      '$.instrument', UPPER(json_extract(data, '$.instrument'))
    ),
    '$.mood', UPPER(json_extract(data, '$.mood'))
  )
)
WHERE entity_type = 'logbook_entry';
```

## Monitoring

### Key Metrics to Watch

1. **Error Rates** - Monitor for validation errors
2. **API Response Times** - Ensure no performance degradation
3. **User Reports** - Watch for user-reported issues
4. **Data Integrity** - Verify counts match before/after

### Logging

Add temporary logging to track migration:

```typescript
// In API sync handler
if (c.env.ENVIRONMENT === 'staging' || c.env.ENVIRONMENT === 'production') {
  console.log('[Migration] Processing entry:', {
    id: entry.id,
    originalInstrument: entry.instrument,
    normalizedInstrument: entry.instrument?.toLowerCase(),
  })
}
```

## Timeline

| Day     | Phase    | Tasks                                   |
| ------- | -------- | --------------------------------------- |
| Day 1   | Frontend | Update types, components, add migration |
| Day 1-2 | API      | Update handlers, ensure consistency     |
| Day 2   | Database | Create and test migration scripts       |
| Day 3   | Testing  | Test in staging, deploy to production   |
| Day 4   | Cleanup  | Remove compatibility code, update docs  |

## Success Criteria

- [ ] All new data uses lowercase values
- [ ] Existing data successfully migrated
- [ ] No user-facing errors
- [ ] Performance unchanged or improved
- [ ] Documentation updated

## Notes

- The API already converts to lowercase (line 118 in sync.ts)
- i18n files already use lowercase keys
- localStorage doesn't transform data
- Main work is frontend components and database constraints

---

Last Updated: 2025-07-10
