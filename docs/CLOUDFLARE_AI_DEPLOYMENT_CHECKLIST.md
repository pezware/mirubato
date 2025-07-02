# Cloudflare AI Deployment Checklist

## Current Status ✅

### Already Completed

- [x] **Code Implementation**: CloudflareAiExtractor and HybridAiExtractor services
- [x] **AI Bindings**: Configured in wrangler.toml for staging and production
- [x] **Database Migration**: Run on both staging and production
- [x] **Observability**: Logs enabled for all environments
- [x] **Tests**: All unit tests passing
- [x] **TypeScript**: No type errors

### Environment Configuration Required

#### 1. Cloudflare Dashboard - Environment Variables

You need to add the following in Cloudflare Dashboard > Workers > mirubato-scores-staging > Settings > Variables:

```
GEMINI_API_KEY = "your-gemini-api-key-here"
```

⚠️ **Important**: This is required for hybrid AI functionality. Without it, only Cloudflare AI will work.

#### 2. Verify AI Binding

In Cloudflare Dashboard > Workers > mirubato-scores-staging > Settings > Bindings:

- Confirm "AI" binding is listed
- It should be automatically available (no configuration needed)

## Quick UAT Commands

### 1. Test with Sample IMSLP PDF

```bash
# Test with a Bach invention (simple, clear PDF)
./scores/scripts/test-ai-import.sh staging \
  "https://imslp.org/wiki/Special:ImagefromIndex/389960/ivwm" \
  cloudflare

# Test with hybrid approach
./scores/scripts/test-ai-import.sh staging \
  "https://imslp.org/wiki/Special:ImagefromIndex/389960/ivwm" \
  hybrid
```

### 2. Monitor Logs

1. Go to Cloudflare Dashboard
2. Navigate to Workers > mirubato-scores-staging
3. Click on "Logs" tab
4. Start "Log Stream"
5. Run import tests and watch real-time logs

### 3. Check Database Results

In Cloudflare Dashboard > D1 > mirubato-scores-staging:

```sql
-- View recent imports with AI analysis
SELECT
  id,
  title,
  composer,
  visual_confidence,
  json_extract(ai_metadata, '$.provider') as provider,
  created_at
FROM scores
WHERE created_at > datetime('now', '-1 hour')
ORDER BY created_at DESC;
```

## Staging URLs

- **Import API**: `https://scores-staging.mirubato.com/api/import`
- **Health Check**: `https://scores-staging.mirubato.com/api/import/health`
- **Score Browser**: `https://staging.mirubato.com/scores` (frontend)

## Expected Behavior

### With Cloudflare AI Only (`aiProvider: "cloudflare"`)

- Fast processing (1-2 seconds)
- Visual analysis of first rendered page
- May have limited text extraction
- Free tier usage

### With Gemini Only (`aiProvider: "gemini"`)

- Slower processing (3-5 seconds)
- Full PDF text analysis
- More detailed metadata
- Costs ~$0.01 per PDF

### With Hybrid (default)

- Combines both approaches
- Cross-validation of results
- Highest accuracy
- Balanced cost

## Troubleshooting

### Issue: "No AI provider configured"

**Solution**: Add GEMINI_API_KEY environment variable in Cloudflare dashboard

### Issue: Rate limit errors

**Solution**: Authenticated requests bypass rate limits. For testing, wait 10 minutes between requests.

### Issue: Visual analysis not appearing

**Check**:

1. Database has `visual_analysis` column
2. PDF processing queue is running
3. First page renders successfully

### Issue: Low confidence scores

**Expected**: Some PDFs (handwritten, poor quality) will have low confidence. This is normal.

## Production Deployment Steps

Once UAT is successful:

1. **Merge PR**

   ```bash
   gh pr merge 198
   ```

2. **Verify Production Config**
   - Ensure GEMINI_API_KEY is set in production environment
   - Confirm AI binding exists

3. **Monitor Deployment**
   - Watch Cloudflare deployment progress
   - Check production logs
   - Test with production URL

4. **Gradual Rollout**
   - Start with internal testing
   - Monitor costs and performance
   - Gradually enable for all users

## Cost Monitoring

Track AI usage in Cloudflare Dashboard:

- Workers AI requests (free tier: 10k/day)
- Check Gemini API usage in Google Cloud Console
- Set up alerts for unusual usage patterns
