# Multi-Language Dictionary Support

## Overview

The Mirubato Dictionary Service now supports multiple languages, allowing users to:

- Search for terms in their preferred language
- Get definitions in multiple languages for comparison
- Automatically fall back to other languages when a term isn't available in the UI language
- Pre-seed common musical terms in all supported languages

## Supported Languages

- **English** (en) - Default language
- **Spanish** (es)
- **French** (fr)
- **German** (de)
- **Traditional Chinese** (zh-TW)
- **Simplified Chinese** (zh-CN)

Additionally, the `source_lang` field supports:

- **Italian** (it) - Many musical terms originate from Italian
- **Latin** (la) - Some classical music terms have Latin origins

## Database Schema

### New Fields in `dictionary_entries`

```sql
lang TEXT NOT NULL DEFAULT 'en' -- The language this entry is written in
source_lang TEXT -- The original language of the term (e.g., 'it' for Italian musical terms)
lang_confidence REAL DEFAULT 1.0 -- Confidence score for language detection (0-1)
```

### Unique Constraint

The unique constraint has been updated to `(normalized_term, lang)`, allowing the same term to exist in multiple languages.

### Seed Queue Table

```sql
CREATE TABLE seed_queue (
  id TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  languages TEXT NOT NULL, -- JSON array of language codes
  priority INTEGER DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TEXT,
  completed_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL
)
```

## API Endpoints

### Search with Language Support

```bash
# Search in a specific language
GET /api/v1/search?q=forte&lang=es

# Search across all languages
GET /api/v1/search?q=pianissimo&searchAllLanguages=true

# Search with preferred languages for comparison
GET /api/v1/search?q=allegro&preferredLangs=en,es,fr

# Filter results by specific languages
GET /api/v1/search?q=tempo&filters[languages]=en,es,fr
```

### Get Term with Language

```bash
# Get term in specific language
GET /api/v1/terms/adagio?lang=fr

# Search all languages if not found in specified language
GET /api/v1/terms/adagio?lang=zh-CN&searchAllLanguages=true
```

### Get Term in Multiple Languages

```bash
# Get all available languages for a term
GET /api/v1/terms/forte/languages

# Get specific languages
GET /api/v1/terms/forte/languages?languages=en,es,fr,de
```

### Batch Query with Language

```bash
POST /api/v1/batch/query
{
  "terms": ["allegro", "andante", "adagio"],
  "lang": "fr"
}
```

## Frontend Integration

### TypeScript Types

```typescript
import { SupportedLanguage, SearchOptions } from '@/types/dictionary'

// Search with language options
const searchOptions: SearchOptions = {
  query: 'forte',
  lang: 'es', // UI language
  searchAllLanguages: false, // Only search in Spanish
  filters: {
    languages: ['es', 'en'], // Filter results to these languages
  },
}

// Get term with language fallback
const term = await dictionaryAPI.getTerm('allegro', {
  lang: 'zh-CN',
  searchAllLanguages: true, // Fall back to other languages if not found
})

// Get term in multiple languages for comparison
const multiLangTerm = await dictionaryAPI.getTermInLanguages('adagio', [
  'en',
  'es',
  'fr',
  'de',
])
```

### Using with i18n

```typescript
import { useTranslation } from 'react-i18next'
import { dictionaryAPI } from '@/api/dictionary'

function DictionarySearch() {
  const { i18n } = useTranslation()

  const searchTerm = async (query: string) => {
    const results = await dictionaryAPI.searchTerms({
      query,
      lang: i18n.language as SupportedLanguage,
      searchAllLanguages: true, // Enable cross-language fallback
    })

    return results
  }
}
```

## Admin Features

### Initialize Seed Queue

```bash
POST /api/v1/admin/seed/initialize
{
  "priority_threshold": 8,  // Only seed terms with priority >= 8
  "clear_existing": false   // Clear pending items before adding
}
```

### Process Seed Queue

```bash
POST /api/v1/admin/seed/process
{
  "batch_size": 10,
  "dry_run": false  // Set to true to preview without processing
}
```

### Check Seed Queue Status

```bash
GET /api/v1/admin/seed/status
```

### Clear Seed Queue

```bash
DELETE /api/v1/admin/seed/clear
{
  "status": "failed"  // Clear only failed items
}
```

## Search Behavior

### Language Priority

When searching, the system prioritizes results in this order:

1. Exact match in requested language
2. Exact match in other languages (if `searchAllLanguages` is true)
3. Partial matches in requested language
4. Partial matches in other languages

### Cross-Language Search

When `searchAllLanguages` is enabled:

- The system searches across all language entries
- Results are sorted by language match first (UI language preferred)
- The response includes `suggestedLanguages` for terms available in multiple languages
- `detectedTermLanguage` indicates the likely source language of the term

### Example Response

```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "dict_forte_en_1234",
        "term": "Forte",
        "lang": "en",
        "source_lang": "it",
        "lang_confidence": 0.95,
        "definition": {
          "concise": "Loud or strong in music",
          "detailed": "An Italian musical term meaning to play loudly..."
        }
      }
    ],
    "total": 1,
    "suggestedLanguages": ["es", "fr", "de"],
    "detectedTermLanguage": "it"
  }
}
```

## Testing

### Run Language Tests

```bash
# Run the test helper script
npm run test:language

# Test specific endpoints
curl "http://localhost:9799/api/v1/search?q=forte&lang=es"
curl "http://localhost:9799/api/v1/terms/allegro/languages?languages=en,es,fr"
```

### Manual Testing

1. **Test cross-language search**:
   - Search for "pianissimo" with Chinese UI language
   - Should return results from other languages

2. **Test multi-language comparison**:
   - Get "forte" in all languages
   - Compare definitions across languages

3. **Test seed queue**:
   - Initialize with high-priority terms
   - Process a small batch
   - Verify terms are created in all requested languages

## Migration Guide

### Running the Migration

```bash
# Local development
npm run db:migrate

# Staging
npm run db:migrate:staging

# Production
npm run db:migrate:production
```

### Data Migration

Existing entries will:

- Default to `lang = 'en'`
- Have `source_lang = NULL`
- Have `lang_confidence = 1.0`

### Backward Compatibility

The API maintains backward compatibility:

- Language parameters are optional
- Default language is English
- Existing endpoints work without modification

## Best Practices

1. **Always specify language**: Pass the user's UI language to ensure relevant results
2. **Enable cross-language search**: For musical terms, enable `searchAllLanguages` as many terms are Italian
3. **Use language detection**: Check `detectedTermLanguage` to show term origins
4. **Implement comparison views**: Use multi-language endpoints for educational features
5. **Cache by language**: Include language in cache keys to avoid mixing results

## Future Enhancements

1. **Automatic translation**: Generate translations for existing entries
2. **Language detection**: Automatically detect the language of search queries
3. **Pronunciation variations**: Different pronunciations by language
4. **Cultural context**: Add cultural notes for terms used differently across regions
5. **RTL support**: Add support for right-to-left languages (Arabic, Hebrew)
