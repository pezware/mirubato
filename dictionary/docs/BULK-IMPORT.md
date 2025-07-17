# Bulk Import Feature

## Overview

The Bulk Import feature allows administrators to efficiently import multiple musical terms into the dictionary's seed queue for AI processing. This feature is available through the admin portal and supports importing up to 500 terms in a single operation.

## Access

1. Navigate to the dictionary admin portal: `https://dictionary.mirubato.com/admin`
2. Authenticate with a `@mirubato.com` email address
3. Click on the "Bulk Import" tab

## How to Use

### Import Interface

The bulk import interface consists of:

1. **Terms Input**: A large textarea where you enter terms, one per line
2. **Priority Selector**: Choose the processing priority (1-10, default is 5)
   - Higher priority terms are processed first
   - Use priority 8-10 for essential terms
   - Use priority 5-7 for standard terms
   - Use priority 1-4 for low-priority terms
3. **Language Selection**: Checkboxes for target languages
   - English (en)
   - Spanish (es)
   - French (fr)
   - German (de)
   - Simplified Chinese (zh-CN)
   - Traditional Chinese (zh-TW)
4. **Term Type** (Optional): Select the category for all imported terms
   - Leave blank to let AI determine the type

### Import Process

1. **Enter Terms**:

   ```
   Allegro
   Andante
   Fortissimo
   Crescendo
   Staccato
   ```

2. **Configure Options**:
   - Set priority based on importance
   - Select target languages (all selected by default)
   - Optionally set term type

3. **Submit**: Click "Import to Queue"

4. **Review Results**:
   - **Successfully Queued**: Terms added to the processing queue
   - **Skipped Duplicates**: Terms that already exist (with reasons)
   - **Errors**: Any terms that couldn't be processed

## Features

### Intelligent Duplicate Detection

The system checks for duplicates in two places:

- **Dictionary Entries**: Existing terms in the database
- **Seed Queue**: Terms already pending processing

### Partial Language Support

If a term exists in some languages but not others, the system will:

- Only queue the missing languages
- Skip languages where the term already exists
- Report this in the results

### Example Scenarios

**Scenario 1: New Terms**

- Import: "Rubato, Glissando, Sforzando"
- Languages: All
- Result: All terms queued for all languages

**Scenario 2: Partial Duplicates**

- Import: "Forte" (already exists in English)
- Languages: All
- Result: Queued for es, fr, de, zh-CN, zh-TW only

**Scenario 3: Complete Duplicates**

- Import: "Piano" (exists in all languages)
- Languages: All
- Result: Skipped with reason "Already exists in dictionary for all requested languages"

## Limits and Constraints

- **Maximum Terms**: 500 per import
- **Term Length**: Maximum 100 characters per term
- **Character Limit**: Total input limited to ~50KB
- **Processing**: Terms are queued, not immediately processed

## Best Practices

1. **Batch Similar Terms**: Group related terms together
2. **Use Appropriate Priority**:
   - Essential terms: 8-10
   - Common terms: 5-7
   - Specialized terms: 1-4
3. **Review Before Import**: Check for typos and formatting
4. **Monitor Queue**: Check the seed queue status after import

## API Details

The bulk import feature uses the following endpoint:

```http
POST /api/v1/admin/seed/bulk-import
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "terms": "term1\nterm2\nterm3",
  "priority": 5,
  "languages": ["en", "es", "fr"],
  "type": "technique" // optional
}
```

Response format:

```json
{
  "success": true,
  "summary": {
    "total_submitted": 3,
    "successfully_queued": 2,
    "skipped_duplicates": 1,
    "errors": 0
  },
  "details": {
    "queued": ["term1", "term2"],
    "duplicates": [
      {
        "term": "term3",
        "reason": "Already exists in dictionary for all requested languages"
      }
    ],
    "errors": []
  }
}
```

## Integration with Auto-Seeding

Imported terms are added to the same seed queue used by the auto-seeding system:

- Terms are processed based on priority
- AI generates definitions for each term/language combination
- Quality scoring is applied automatically
- Low-quality results may require manual review

## Troubleshooting

**Import Button Disabled**

- Ensure at least one language is selected
- Verify you have terms in the textarea

**All Terms Skipped**

- Check if terms already exist in the dictionary
- Verify terms aren't already in the processing queue

**Import Fails**

- Check your authentication status
- Ensure terms don't exceed length limits
- Verify the service is healthy (`/health` endpoint)

## Future Enhancements

- CSV/Excel file upload support
- Term validation before import
- Progress tracking for large imports
- Bulk editing of queued items
