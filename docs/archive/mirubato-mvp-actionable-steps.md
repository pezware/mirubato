# Mirubato MVP Frontend Polish - Actionable Steps

## 1. Remove Time Filter Buttons from Logbook

### Requirements

- Remove 'By month' and 'By week' buttons from the logbook interface
- These buttons are confusing and don't properly enable collapsible cards functionality

### Actionable Steps

1. **Identify Component**
   - Locate the Logbook component file (likely `Logbook.tsx` or similar)
   - Find the time filter button components

2. **Remove UI Elements**
   - Remove the button components for 'By month' and 'By week'
   - Remove any associated state management for these filters
   - Remove event handlers tied to these buttons

3. **Clean Up Code**
   - Remove unused imports related to time filtering
   - Remove any unused types/interfaces for time filters
   - Update any tests that reference these buttons

4. **Update Localization**
   - Remove translation keys for 'By month' and 'By week' from all locale files:
     - `en.json`
     - `es.json`
     - `fr.json`
     - `zh-TW.json`

## 2. Implement Cloudflare Cached Autocomplete for Piece Title and Composer

### Requirements

- Enable autocomplete for "Piece Title" and "Composer" fields
- Use Cloudflare caching for performance
- Search from user's existing entries and cached common entries
- Dynamic search while typing (e.g., "Bee" suggests "Ludwig van Beethoven")

### Actionable Steps

#### Backend Implementation (Cloudflare Worker)

1. **Create Cache Strategy**

   ```typescript
   // api.mirubato.com/src/routes/autocomplete.ts
   - Create endpoint: GET /api/autocomplete/composers
   - Create endpoint: GET /api/autocomplete/pieces
   - Implement Cloudflare KV storage for caching
   - Set cache TTL (e.g., 24 hours for common entries)
   ```

2. **Database Queries**

   ```typescript
   // Get user's unique composers/pieces
   - Query D1 for distinct composers from user's logs
   - Query D1 for distinct piece titles from user's logs
   - Merge with pre-populated common entries
   ```

3. **Pre-populate Common Data**
   ```typescript
   // Create seed data for common composers and pieces
   - Top 100 classical composers (see separate artifact)
   - Top 300 practice pieces by grade (see separate artifact)
   - Store in Cloudflare KV on deployment
   ```

#### Frontend Implementation

1. **Create Autocomplete Component**

   ```typescript
   // components/Autocomplete/Autocomplete.tsx
   - Generic autocomplete component with debouncing
   - Support for both online and offline modes
   - TypeScript interfaces for autocomplete data
   ```

2. **Implement Search Logic**

   ```typescript
   // hooks/useAutocomplete.ts
   - Custom hook for autocomplete functionality
   - Debounce user input (300ms recommended)
   - Cache results in memory during session
   - Handle offline mode (search only local entries)
   ```

3. **Update Practice Form**

   ```typescript
   // components/PracticeForm/PracticeForm.tsx
   - Replace text inputs with Autocomplete components
   - Add loading states for suggestions
   - Handle selection events
   ```

4. **API Integration**
   ```typescript
   // services/api/autocomplete.ts
   - Create API service for autocomplete endpoints
   - Handle errors gracefully
   - Implement retry logic for failed requests
   ```

## 3. Localization (l10n/i18n) Review and Implementation

### Requirements

- Review all changes for proper l10n/i18n implementation
- Ensure all new text is translatable
- Maintain consistency across all locales

### Actionable Steps

1. **Audit New Features**
   - List all new user-facing strings
   - Ensure each string has a translation key
   - Check for hardcoded text in components

2. **Translation Key Standards**

   ```json
   // Follow naming convention:
   {
     "logbook.autocomplete.searchComposer": "Search composer...",
     "logbook.autocomplete.searchPiece": "Search piece title...",
     "logbook.autocomplete.noResults": "No results found",
     "logbook.autocomplete.loading": "Loading suggestions..."
   }
   ```

3. **Component Implementation**
   ```typescript
   // Use i18n hook consistently
   import { useTranslation } from 'react-i18next'
   const { t } = useTranslation()
   // Use: t('logbook.autocomplete.searchComposer')
   ```

## 4. Add New Locales: zh-CN (Simplified Chinese) and de (German)

### Requirements

- Add support for Simplified Chinese (zh-CN)
- Add support for German (de)
- Ensure all existing translations are provided

### Actionable Steps

1. **Create Locale Files**

   ```
   locales/
   ├── en.json (existing)
   ├── es.json (existing)
   ├── fr.json (existing)
   ├── zh-TW.json (existing)
   ├── zh-CN.json (new)
   └── de.json (new)
   ```

2. **Configure i18n**

   ```typescript
   // i18n/config.ts
   - Add 'zh-CN' and 'de' to supported locales
   - Update language detection logic
   - Add locale names for UI display
   ```

3. **Translation Process**
   - Copy structure from existing locale files
   - Translate all keys to zh-CN and de
   - Pay attention to:
     - Musical terminology consistency
     - Date/time formats
     - Number formats
     - Pluralization rules

4. **Language Switcher Update**

   ```typescript
   // components/LanguageSwitcher.tsx
   - Add new language options
   - Update flag icons or language codes
   - Test switching between all 6 languages
   ```

5. **Locale-Specific Formatting**
   ```typescript
   // Update date/time formatting for new locales
   - German: DD.MM.YYYY
   - Chinese: YYYY年MM月DD日
   ```

## Testing Checklist

### Unit Tests

- [ ] Remove tests for time filter buttons
- [ ] Add tests for Autocomplete component
- [ ] Add tests for useAutocomplete hook
- [ ] Update form validation tests

### E2E Tests (Playwright)

- [ ] Test autocomplete functionality
- [ ] Test offline mode behavior
- [ ] Test all 6 language switches
- [ ] Test form submission with autocomplete

### Localization Tests

- [ ] Verify all strings are translated
- [ ] Check for text overflow in UI
- [ ] Test RTL support (if needed)
- [ ] Verify date/time formats

### Performance Tests

- [ ] Measure autocomplete response time
- [ ] Test with large datasets
- [ ] Verify Cloudflare cache hit rates
- [ ] Test offline performance

## Deployment Steps

1. **Backend Deployment**
   - Deploy API changes first
   - Seed Cloudflare KV with initial data
   - Verify endpoints are accessible

2. **Frontend Deployment**
   - Deploy frontend changes
   - Clear CDN cache if necessary
   - Monitor for errors in production

3. **Post-Deployment**
   - Monitor autocomplete usage metrics
   - Check error rates
   - Gather user feedback
   - Plan iterations based on usage data

## Future Considerations

1. **Autocomplete Enhancements**
   - Add fuzzy matching for typos
   - Implement composer aliases (e.g., "Bach" → "Johann Sebastian Bach")
   - Add piece difficulty/grade to suggestions

2. **Performance Optimizations**
   - Implement virtual scrolling for long suggestion lists
   - Pre-fetch common suggestions on form load
   - Use service worker for offline caching

3. **Analytics**
   - Track most searched composers/pieces
   - Monitor autocomplete usage patterns
   - Use data to improve suggestion ranking
