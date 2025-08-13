# Composer Name Mappings

This directory contains shared resources for composer name canonicalization across the Mirubato application.

## Files

- `composerMappings.ts` - Contains the canonical composer name mappings, catalog number patterns, and name formatting rules

## Important Note

⚠️ **This file is duplicated in both locations for build compatibility:**

- `/api/src/shared/resources/composerMappings.ts` (Backend)
- `/frontendv2/src/shared/resources/composerMappings.ts` (Frontend)

**When making changes, update BOTH files to maintain consistency!**

## How to Add a New Composer

1. Open `composerMappings.ts` in BOTH locations
2. Find the appropriate era/category section (Baroque, Classical, Romantic, etc.)
3. Add entries in this format:

```typescript
// Basic entry
'lastname': 'Full Canonical Name',

// With common variations
'chopin': 'Frédéric Chopin',
'frederic chopin': 'Frédéric Chopin',
'f. chopin': 'Frédéric Chopin',
'frédéric chopin': 'Frédéric Chopin',
'chopin, frédéric': 'Frédéric Chopin',
```

### Guidelines for Adding Composers

1. **Always use lowercase for the key** (left side)
2. **Use the most common/accepted spelling** for the canonical name (right side)
3. **Include common variations**:
   - Last name only (`'beethoven'`)
   - Full name (`'ludwig van beethoven'`)
   - With initials (`'l.v. beethoven'`)
   - Reversed format (`'beethoven, ludwig van'`)
   - Common misspellings
   - Alternative transliterations (e.g., Rachmaninoff/Rachmaninov)

4. **For names with particles** (van, von, de, etc.):
   - Keep particles lowercase in the canonical name
   - Example: `'Ludwig van Beethoven'` (not "Van")

5. **For hyphenated names**:
   - Include both hyphenated and non-hyphenated versions
   - Example: `'villa-lobos'` and `'villa lobos'`

## Catalog Number Patterns

The system automatically removes catalog numbers that are incorrectly included in composer names:

- BWV (Bach Works Catalog)
- Op. (Opus numbers)
- K. or KV (Köchel catalog for Mozart)
- And many others...

To add a new catalog pattern, add it to the `CATALOG_NUMBER_PATTERNS` array.

## Testing Changes

After making changes, run the tests to ensure everything works:

```bash
# Backend tests
cd api && pnpm test -- composerCanonicalizer

# Frontend tests
cd frontendv2 && pnpm test -- composerCanonicalizer
```

## Examples of Common Corrections

| User Input         | Canonical Output          |
| ------------------ | ------------------------- |
| "Bach BWV 772"     | "Johann Sebastian Bach"   |
| "beethoven op. 27" | "Ludwig van Beethoven"    |
| "mozart k. 331"    | "Wolfgang Amadeus Mozart" |
| "J.S. Bach"        | "Johann Sebastian Bach"   |
| "rachmaninov"      | "Sergei Rachmaninoff"     |
| "unknown"          | "Unknown"                 |
| "traditional"      | "Traditional"             |
