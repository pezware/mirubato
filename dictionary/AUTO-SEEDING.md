# Dictionary Auto-Seeding System

## Overview

The Mirubato Dictionary service includes an automatic pre-seeding system that generates high-quality musical term definitions while respecting Cloudflare AI free tier limits. The system prioritizes quality over quantity.

## Quick Start

### 1. Deploy Database Migration

```bash
cd dictionary
npm run db:migrate  # Local development
npm run db:migrate:staging  # Staging
npm run db:migrate:production  # Production
```

### 2. Initialize Seed Queue

```bash
# Initialize with high-priority terms only
curl -X POST https://dictionary-staging.mirubato.com/api/v1/admin/seed/initialize \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "priority_threshold": 10,
    "clear_existing": false
  }'
```

### 3. Monitor System Status

```bash
# Check system status
curl https://dictionary-staging.mirubato.com/api/v1/admin/seed/system-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Configuration

### Environment Variables

**Production:**

- `SEED_ENABLED`: "true"
- `SEED_DAILY_TOKEN_BUDGET`: "5000" (50% of free tier)
- `SEED_PRIORITY_THRESHOLD`: "8"
- `SEED_BATCH_SIZE`: "5"
- `QUALITY_MIN_THRESHOLD`: "85"

**Staging:**

- `SEED_ENABLED`: "true"
- `SEED_DAILY_LIMIT`: "10" (terms per day)
- `SEED_PRIORITY_THRESHOLD`: "10"
- `SEED_BATCH_SIZE`: "2"
- `QUALITY_MIN_THRESHOLD`: "90"

### Schedules

**Production:**

- Seed Processing: 02:00, 08:00, 14:00, 20:00 UTC
- Daily Cleanup: 00:00 UTC

**Staging:**

- Seed Processing: 12:00 UTC
- Daily Cleanup: 00:00 UTC

## Admin Endpoints

### Seed Management

```bash
# Initialize seed queue
POST /api/v1/admin/seed/initialize

# Process seed queue manually (for testing)
POST /api/v1/admin/seed/process

# Get seed queue status
GET /api/v1/admin/seed/status

# Clear seed queue
DELETE /api/v1/admin/seed/clear

# Get system status
GET /api/v1/admin/seed/system-status
```

### Manual Review

```bash
# Get review queue
GET /api/v1/admin/seed/review-queue?status=pending

# Approve/reject review item
PUT /api/v1/admin/seed/review/{id}
```

## Monitoring

### Key Metrics

1. **Token Usage**
   - Daily usage vs budget
   - Terms processed per day
   - Token efficiency (tokens per term)

2. **Quality Metrics**
   - Average quality score (target: >87%)
   - Success rate
   - Manual review queue size

3. **System Health**
   - Processing failures
   - Token budget overruns
   - Cron job execution

### Example System Status Response

```json
{
  "enabled": true,
  "environment": "staging",
  "configuration": {
    "daily_free_tier": 10000,
    "seed_allocation_percent": 0.5,
    "daily_seed_budget": 10,
    "daily_seed_limit": 10,
    "safety_buffer": 0
  },
  "token_usage": {
    "used_today": 0,
    "available_today": 10,
    "usage_percentage": 0,
    "daily_stats": [],
    "weekly_total": 0,
    "average_per_term": 0
  },
  "processing": {
    "terms_processed_week": 0,
    "average_quality_score": 0,
    "success_rate": 0,
    "manual_review_pending": 0,
    "token_efficiency": 0
  },
  "schedule": {
    "production": "02:00, 08:00, 14:00, 20:00 UTC",
    "staging": "12:00 UTC",
    "cleanup": "00:00 UTC daily"
  }
}
```

## Manual Testing

### 1. Test in Staging First

```bash
# Set small batch size for testing
SEED_DAILY_LIMIT=5
SEED_BATCH_SIZE=1

# Initialize with 1-2 test terms
# Monitor quality scores
# Check manual review queue
```

### 2. Process Single Batch

```bash
curl -X POST https://dictionary-staging.mirubato.com/api/v1/admin/seed/process \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_size": 1,
    "dry_run": false
  }'
```

### 3. Check Results

- Verify quality scores are >85%
- Check token usage is as expected
- Review generated definitions
- Monitor for any errors

## Troubleshooting

### Common Issues

1. **"Daily token budget exhausted"**
   - Check token usage with system-status endpoint
   - Wait for next day or increase budget
   - Review token efficiency metrics

2. **Low quality scores**
   - Check generation prompts
   - Review failed terms in manual review queue
   - Adjust quality threshold if needed

3. **Processing failures**
   - Check logs in Cloudflare dashboard
   - Verify AI service is available
   - Check for database connectivity issues

### Emergency Controls

```bash
# Disable seeding entirely
wrangler secret put SEED_ENABLED --env production
# Enter: false

# Clear failed items
curl -X DELETE https://dictionary.mirubato.com/api/v1/admin/seed/clear \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "failed"}'
```

## Future Enhancements

1. **Wikipedia Parser** (Phase 2)
   - Extract term relationships
   - Build knowledge graph
   - Enhance cross-references

2. **Progressive Enhancement** (Phase 3)
   - Re-process low-quality terms
   - Add pronunciation audio
   - Expand examples

3. **Multi-Model Strategy** (Phase 4)
   - Test smaller models for efficiency
   - A/B test quality differences
   - Optimize token usage
