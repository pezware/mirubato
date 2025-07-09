# i18n Translation Validation & Management

This project includes comprehensive tooling for managing internationalization (i18n) translations across multiple languages.

## Supported Languages

- English (en) - Reference language
- Spanish (es)
- French (fr)
- German (de)
- Traditional Chinese (zh-TW)
- Simplified Chinese (zh-CN)

## Available Scripts

### npm run validate:i18n

Validates all translation files for completeness and consistency.

```bash
npm run validate:i18n
```

Features:

- Checks for missing keys in each language
- Identifies empty translation values
- Reports extra keys not in reference language
- Shows completion percentage per namespace
- Provides detailed issue reports

Options:

- `--json` - Export results to JSON file

### npm run sync:i18n

Synchronizes translation files with the English reference.

```bash
npm run sync:i18n
```

Features:

- Adds missing keys from reference language
- Marks new keys with `[NEEDS TRANSLATION]`
- Preserves existing translations
- Supports dry-run mode

Options:

- `--dry-run` - Preview changes without modifying files
- `--remove-extra` - Remove keys not in reference language
- `--sort-keys` - Sort all keys alphabetically
- `--namespace <name>` - Sync only specific namespace

### npm run i18n:fix

Runs sync with key sorting enabled:

```bash
npm run i18n:fix
```

This is equivalent to `npm run sync:i18n -- --sort-keys`.

## Translation Workflow

1. **Check Current Status**

   ```bash
   npm run validate:i18n
   ```

2. **Sync Missing Keys**

   ```bash
   npm run sync:i18n
   ```

3. **Translate Missing Keys**
   - Look for `[NEEDS TRANSLATION]` markers in the files
   - Replace with appropriate translations
   - Use the translate-missing.cjs script for bulk translations

4. **Verify Completeness**
   ```bash
   npm run validate:i18n
   ```

## File Structure

```
src/locales/
├── en/          # English (reference language)
│   ├── auth.json
│   ├── common.json
│   ├── errors.json
│   ├── logbook.json
│   ├── reports.json
│   ├── scorebook.json
│   └── toolbox.json
├── es/          # Spanish
├── fr/          # French
├── de/          # German
├── zh-TW/       # Traditional Chinese
└── zh-CN/       # Simplified Chinese
```

## Translation Guidelines

1. **Consistency**: Use consistent terminology across namespaces
2. **Context**: Consider the UI context when translating
3. **Placeholders**: Preserve interpolation variables like `{{count}}` or `{{email}}`
4. **Musical Terms**: Be careful with music-specific terminology
5. **Length**: Consider UI space constraints, especially for buttons and labels

## Common Issues & Solutions

### Issue: Keys exist in non-English files but not in English

**Solution**: This indicates the English reference file is incomplete. The fix-english-reference.cjs script can identify and add these missing keys to the English files.

### Issue: Duplicate keys across namespaces

**Solution**: Each namespace should have unique keys. Move shared keys to the `common` namespace.

### Issue: Inconsistent translations

**Solution**: Use the validation tool regularly and maintain a glossary of standard translations for common terms.

## Adding a New Language

1. Create a new directory in `src/locales/` with the language code
2. Copy all JSON files from the English directory
3. Add the language to the `LANGUAGES` array in the validation scripts
4. Run `npm run sync:i18n` to ensure structure consistency
5. Translate all content

## Best Practices

1. **Run validation before commits**: Add to pre-commit hooks if possible
2. **Regular audits**: Check for unused translation keys periodically
3. **Collaborative translation**: Use translation management tools for large teams
4. **Context comments**: Add comments in code where translation context is important
5. **Test with different languages**: Ensure UI works with varying text lengths

## Script Maintenance

All i18n scripts are located in `frontendv2/scripts/`:

- `validate-translations.cjs` - Validation tool
- `sync-translations.cjs` - Synchronization tool
- `translate-missing.cjs` - Helper for bulk translations
- `fix-english-reference.cjs` - Fix incomplete English files

These use CommonJS format (`.cjs`) because the project uses ES modules.
