# Translation Management Scripts

This directory contains scripts to help maintain and validate translations across all supported languages in the Mirubato application.

## Overview

We support 6 languages across 7 namespaces:

- **Languages**: English (en), Spanish (es), French (fr), German (de), Traditional Chinese (zh-TW), Simplified Chinese (zh-CN)
- **Namespaces**: common, auth, errors, logbook, reports, scorebook, toolbox

## Available Scripts

### 1. validate-translations.js

Validates all translation files to ensure completeness and consistency.

```bash
# Basic validation
npm run validate:i18n

# With detailed JSON export
npm run validate:i18n -- --json

# Continue even if issues found (for CI)
npm run validate:i18n -- --no-fail
```

**Features:**

- Checks for missing translation keys
- Identifies empty or undefined values
- Finds extra keys not in reference language
- Provides completeness percentage for each language
- Generates detailed report with specific issues
- Can export results to JSON for further analysis

**Example Output:**

```
📊 Translation Validation Report
============================================================

REPORTS (324 keys)
  ✓ es: 100.00% complete - Complete
  ✗ fr: 98.15% complete - Issues found
     Missing: 6 keys
  ✓ de: 100.00% complete - Complete
  ⚠ zh-TW: 100.00% complete - Extra keys
     Extra: 2 keys
  ✓ zh-CN: 100.00% complete - Complete
```

### 2. sync-translations.js

Automatically synchronizes translation files with the reference language (English).

```bash
# Dry run - see what would change
npm run sync:i18n -- --dry-run

# Basic sync - adds missing keys only
npm run sync:i18n

# Sync with key sorting
npm run sync:i18n -- --sort-keys

# Remove extra keys not in reference
npm run sync:i18n -- --remove-extra

# Sync specific namespace only
npm run sync:i18n -- --namespace reports

# Full sync with all options
npm run sync:i18n -- --sort-keys --remove-extra
```

**Features:**

- Adds missing keys with `[NEEDS TRANSLATION]` prefix
- Preserves existing translations
- Optional removal of extra keys
- Optional alphabetical key sorting
- Dry-run mode for safety
- Can target specific namespaces

## NPM Scripts Setup

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "validate:i18n": "node scripts/validate-translations.js",
    "sync:i18n": "node scripts/sync-translations.js",
    "i18n:check": "npm run validate:i18n",
    "i18n:fix": "npm run sync:i18n -- --sort-keys"
  }
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Translation Validation

on:
  pull_request:
    paths:
      - 'frontendv2/src/locales/**'

jobs:
  validate-translations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Validate translations
        run: npm run validate:i18n
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check if locale files were modified
if git diff --cached --name-only | grep -q "locales/"; then
  echo "🌐 Validating translations..."
  npm run validate:i18n
fi
```

## Best Practices

### 1. Translation Workflow

1. **Before adding new features:**
   - Add keys to English files first
   - Run `npm run sync:i18n` to propagate to other languages
   - Keys will be marked with `[NEEDS TRANSLATION]`

2. **After receiving translations:**
   - Replace `[NEEDS TRANSLATION]` prefixes with actual translations
   - Run `npm run validate:i18n` to ensure completeness

3. **Regular maintenance:**
   - Run `npm run validate:i18n` before commits
   - Use `npm run sync:i18n -- --sort-keys` periodically for consistency

### 2. Key Naming Conventions

```javascript
// Good - descriptive and hierarchical
{
  "practice": {
    "session": {
      "start": "Start Practice",
      "stop": "Stop Practice",
      "duration": "Duration: {{time}}"
    }
  }
}

// Bad - flat and unclear
{
  "practiceStart": "Start",
  "stop": "Stop",
  "time": "{{time}}"
}
```

### 3. Translation Guidelines

- Use interpolation for dynamic values: `"welcome": "Welcome, {{name}}!"`
- Keep translations concise but clear
- Maintain consistent terminology across namespaces
- Consider cultural context, not just literal translation

## Advanced Usage

### ESLint Integration

For compile-time validation, consider adding:

1. **eslint-plugin-i18next-no-undefined-translation-keys**

   ```bash
   npm install --save-dev eslint-plugin-i18next-no-undefined-translation-keys
   ```

2. **eslint-plugin-i18n-json**
   ```bash
   npm install --save-dev eslint-plugin-i18n-json
   ```

### i18next-parser Integration

For automatic key extraction from code:

```bash
npm install --save-dev i18next-parser

# Create i18next-parser.config.js
module.exports = {
  locales: ['en', 'es', 'fr', 'de', 'zh-TW', 'zh-CN'],
  output: 'src/locales/$LOCALE/$NAMESPACE.json',
  input: ['src/**/*.{ts,tsx}'],
  keepRemoved: false,
  keySeparator: '.',
  namespaceSeparator: ':',
  defaultNamespace: 'common'
};
```

## Troubleshooting

### Common Issues

1. **"Missing reference file" error**
   - Ensure English translations exist for all namespaces
   - English (en) is the reference language

2. **False positives for "extra keys"**
   - Usually happens with nested objects
   - Run sync with `--remove-extra` carefully

3. **Performance with large files**
   - Scripts handle files with 300+ keys efficiently
   - Consider splitting very large namespaces

### Debug Mode

Set `DEBUG=i18n` environment variable for verbose output:

```bash
DEBUG=i18n npm run validate:i18n
```

## Future Enhancements

1. **Planned Features:**
   - Integration with translation services (Google Translate API)
   - Git hooks for automatic validation
   - Visual diff tool for translation changes
   - Translation coverage badges

2. **Community Contributions:**
   - Additional language support
   - Translation memory integration
   - Pluralization rule validation
   - Context-aware translations

---

For questions or issues, please open a GitHub issue with the `i18n` label.
