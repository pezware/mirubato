# R2 Hybrid Architecture Analysis: Public + Private Buckets

## The Licensing Challenge

**User uploads MUST be private** due to:

- Copyright concerns (users might upload copyrighted scores)
- Privacy expectations (personal practice sheets, annotations)
- Future photo uploads (handwritten scores, personal notes)
- Legal liability protection

## Option 1: Hybrid Architecture (Public + Private R2)

### Setup

- **Public R2 Bucket**: `mirubato-public-scores`
  - IMSLP imports
  - Public domain scores
  - Mirubato-curated content
- **Private R2 Bucket**: `mirubato-user-scores`
  - User uploads
  - Copyrighted material
  - Personal scores/photos

### Implementation Complexity

```typescript
// Score service would need to track source
interface Score {
  id: string
  source: 'imslp' | 'public' | 'user_upload' | 'managed'
  storage_bucket: 'public' | 'private'
  // ...
}

// Different URL generation
function getScorePdfUrl(score: Score): string {
  if (score.storage_bucket === 'public') {
    return `https://public-scores.mirubato.com/${score.r2_key}`
  } else {
    return `https://api.mirubato.com/scores/${score.id}/pdf`
  }
}
```

### Pros

- ✅ Optimal performance for public content (200-500ms faster)
- ✅ Legal protection for user content
- ✅ Cost savings at scale for public content
- ✅ Clear separation of concerns

### Cons

- ❌ More complex codebase
- ❌ Two storage systems to manage
- ❌ Migration complexity
- ❌ Potential confusion during imports

## Option 2: Keep Everything Private

### Pros

- ✅ Simple, unified architecture
- ✅ All content protected by default
- ✅ No migration needed
- ✅ Easier permission management
- ✅ 500ms latency is acceptable for sheet music

### Cons

- ❌ Slightly slower for all content
- ❌ Higher costs at scale (>10M requests)
- ❌ Worker overhead for public domain content

## Performance Impact Analysis

### Current latency breakdown (Private R2):

- Worker cold start: 50-100ms
- Worker execution: 20-30ms
- R2 fetch: 50-100ms
- Network: 50-100ms
- **Total: 170-330ms**

### Direct R2 latency:

- CDN cache hit: 10-30ms
- R2 direct fetch: 50-100ms
- **Total: 50-100ms**

### Real-world impact:

- First page load: 200-300ms faster with public R2
- Subsequent pages: Often cached either way
- **User perception**: Minimal for sheet music viewing

## Cost Projection

| Monthly Requests | Private R2 | Hybrid (70% public) | Savings |
| ---------------- | ---------- | ------------------- | ------- |
| 500K (current)   | $0.48      | $0.48               | $0      |
| 5M               | $2.28      | $1.96               | $0.32   |
| 50M              | $25.48     | $21.48              | $4.00   |
| 100M             | $50.48     | $41.48              | $9.00   |

## Recommendation: Keep Private R2 (For Now)

### Why:

1. **Legal safety first** - Avoiding copyright issues is paramount
2. **Simplicity wins** - 500ms is acceptable for sheet music
3. **Future flexibility** - Can always migrate public content later
4. **User trust** - "All content is secure" is a simple message

### Migration Path (If Needed Later):

```bash
# Phase 1: Add bucket field to database
ALTER TABLE scores ADD COLUMN storage_bucket TEXT DEFAULT 'private';

# Phase 2: Mark public domain content
UPDATE scores SET storage_bucket = 'public'
WHERE source IN ('imslp', 'mutopia', 'managed');

# Phase 3: Gradual migration
# Move files to public bucket in batches
# Update URLs as you go
```

### When to Reconsider Hybrid:

- ✓ Over 10M monthly requests (cost benefit)
- ✓ User complaints about loading speed
- ✓ Need for embed/iframe functionality
- ✓ Building a public score library feature

## Alternative: Smart Caching Strategy

Instead of public R2, optimize the private setup:

1. **Aggressive CDN caching** for verified public domain
2. **Longer cache headers** (already implemented!)
3. **Prefetch next pages** in the viewer
4. **Service Worker** for offline access

This gives you most benefits without the complexity!
