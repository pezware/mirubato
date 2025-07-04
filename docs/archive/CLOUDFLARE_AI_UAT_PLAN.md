# Cloudflare AI Integration - UAT Plan

## Pre-UAT Checklist ✅

### Configuration Status

- [x] **AI Binding**: Configured for staging and production in `scores/wrangler.toml`
- [x] **Database Migration**: Already run on staging and production (`0007_add_visual_analysis_columns.sql`)
- [x] **Observability Logs**: Enabled for all environments
- [x] **Code Deployed**: PR #198 ready, will auto-deploy to staging once merged

### Required Environment Variables

Ensure these are set in Cloudflare dashboard for staging:

- `GEMINI_API_KEY` - For hybrid AI functionality

## UAT Test Scenarios

### 1. Basic Import Tests

#### Test 1.1: Import with Cloudflare AI Only

```bash
curl -X POST https://scores-staging.mirubato.com/api/import \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/sheet-music.pdf",
    "aiProvider": "cloudflare"
  }'
```

**Expected**: Score imported with visual analysis metadata

#### Test 1.2: Import with Gemini Only

```bash
curl -X POST https://scores-staging.mirubato.com/api/import \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/sheet-music.pdf",
    "aiProvider": "gemini"
  }'
```

**Expected**: Score imported with text-based analysis

#### Test 1.3: Import with Hybrid AI (Default)

```bash
curl -X POST https://scores-staging.mirubato.com/api/import \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/sheet-music.pdf"
  }'
```

**Expected**: Score imported with cross-validated metadata

### 2. Visual Analysis Verification

#### Test 2.1: Check Visual Analysis Storage

After importing a score, verify the visual analysis was stored:

```sql
-- Run in Cloudflare D1 console
SELECT id, title, visual_analysis, visual_confidence
FROM scores
WHERE visual_analysis IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

#### Test 2.2: Verify First Page Analysis

Check that only the first page gets visual analysis during PDF processing.

### 3. Error Handling Tests

#### Test 3.1: Invalid Image Format

Test with a non-PDF file to ensure proper error handling.

#### Test 3.2: AI Service Failure

Temporarily disable AI binding (if possible) to test fallback behavior.

### 4. Performance Tests

#### Test 4.1: Compare Processing Times

- Import same PDF with `cloudflare`, `gemini`, and `hybrid` providers
- Compare processing times and accuracy

#### Test 4.2: Concurrent Imports

Test multiple simultaneous imports to verify queue handling.

### 5. Quality Verification

#### Test 5.1: Metadata Accuracy

Compare extracted metadata across different AI providers:

- Title extraction
- Composer identification
- Instrument detection
- Difficulty assessment
- Visual features (staff count, notation type, etc.)

#### Test 5.2: Confidence Scoring

Verify confidence scores are reasonable (0.0 - 1.0 range).

## Test Data Sources

### Recommended Test PDFs

1. **Simple Piano Score**: Clear title, single instrument
   - IMSLP: Bach Inventions
2. **Complex Orchestral Score**: Multiple instruments, dense notation
   - IMSLP: Beethoven Symphony excerpts
3. **Guitar Tablature**: Different notation type
   - Public domain guitar tabs
4. **Handwritten Score**: Test visual analysis capabilities
5. **Poor Quality Scan**: Test error handling and low confidence

## Monitoring During UAT

### 1. Cloudflare Dashboard

- Monitor Workers logs for errors
- Check AI usage metrics
- Review invocation logs for performance

### 2. Database Queries

```sql
-- Check recent imports
SELECT id, title, composer, instrument, visual_confidence,
       json_extract(ai_metadata, '$.provider') as ai_provider,
       created_at
FROM scores
WHERE created_at > datetime('now', '-1 hour')
ORDER BY created_at DESC;

-- Check for errors
SELECT id, title, processing_status, processing_error
FROM scores
WHERE processing_status = 'failed'
AND created_at > datetime('now', '-1 day');

-- Analyze confidence distribution
SELECT
  CASE
    WHEN visual_confidence >= 0.8 THEN 'High (≥0.8)'
    WHEN visual_confidence >= 0.5 THEN 'Medium (0.5-0.8)'
    ELSE 'Low (<0.5)'
  END as confidence_level,
  COUNT(*) as count
FROM scores
WHERE visual_confidence IS NOT NULL
GROUP BY confidence_level;
```

### 3. API Health Check

```bash
curl https://scores-staging.mirubato.com/api/import/health
```

## Success Criteria

1. **Functional**: All import methods work without errors
2. **Performance**: Visual analysis completes within 5 seconds
3. **Accuracy**: Metadata extraction accuracy > 80%
4. **Reliability**: No queue processing failures
5. **Cost**: Verify Cloudflare AI usage stays within free tier

## Rollback Plan

If critical issues are found:

1. Revert to previous deployment
2. AI extraction will fallback to Gemini-only mode
3. Visual analysis columns will be ignored (no data loss)

## Post-UAT Actions

1. **Document Results**: Create summary of findings
2. **Performance Metrics**: Record processing times and costs
3. **Bug Fixes**: Address any issues found
4. **Production Readiness**: Confirm all tests pass before production deployment

## Production Deployment

Once UAT passes:

1. Merge PR #198 to main branch
2. Cloudflare will auto-deploy to production
3. Monitor production logs for first 24 hours
4. Gradually increase usage based on confidence
