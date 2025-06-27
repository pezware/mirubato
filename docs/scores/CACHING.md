# Cloudflare Caching Implementation

## Overview

The scores service now implements comprehensive caching using Cloudflare's edge network to improve performance for large files like PDFs and sheet music.

## Caching Strategies

### 1. **Immutable Content** (PDFs, versioned files)

- **Browser Cache**: 1 year
- **Edge Cache**: 1 year
- **Headers**: `Cache-Control: public, max-age=31536000, immutable`
- **Use Case**: Score versions, uploaded PDFs

### 2. **Static Content** (images, rendered scores)

- **Browser Cache**: 1 day
- **Edge Cache**: 1 week
- **Headers**: `Cache-Control: public, max-age=86400, s-maxage=604800`
- **Use Case**: Thumbnails, rendered PNGs/SVGs

### 3. **API Responses** (JSON data)

- **Browser Cache**: No cache
- **Edge Cache**: 1 minute
- **Headers**: `Cache-Control: no-cache, CDN-Cache-Control: public, max-age=60`
- **Use Case**: Score metadata, search results

### 4. **Dynamic Content** (user-specific)

- **Browser Cache**: No cache
- **Edge Cache**: No cache
- **Headers**: `Cache-Control: no-cache, no-store, must-revalidate`
- **Use Case**: Authenticated requests, user data

## Implementation Details

### Cache Utilities (`/scores/src/utils/cache.ts`)

```typescript
// Check edge cache
const cachedResponse = await getCachedResponse(request, context)

// Add cache headers
response = addCacheHeaders(response, contentType, {
  isVersioned: true, // For immutable content
  isPublic: true, // For public content
})

// Store in edge cache
await cacheResponse(request, response, context)

// Handle conditional requests (304 Not Modified)
const conditionalResponse = handleConditionalRequest(request, response)
```

### File Serving Endpoints

1. **Download Endpoint** (`/api/scores/:id/download/:format`)
   - Caches PDFs and sheet music files at edge
   - Uses ETag from R2 for conditional requests
   - Immutable caching for versioned content

2. **Generic File Endpoint** (`/files/*`)
   - Serves any file from R2 bucket
   - Auto-detects content type
   - Applies appropriate cache strategy

### Cache Headers

- **ETag**: Used for conditional requests (If-None-Match)
- **Last-Modified**: From R2 metadata
- **Vary**: `Accept, Accept-Encoding` for proper content negotiation
- **X-Cache-Status**: Debug header showing HIT/MISS

## Performance Benefits

1. **Reduced Latency**: Files served from edge locations near users
2. **Lower Bandwidth**: 304 responses for unchanged content
3. **Better UX**: Instant loading for cached PDFs
4. **Cost Savings**: Fewer R2 reads and worker invocations

## Cache Invalidation

- Versioned files use immutable caching (no invalidation needed)
- API responses expire after TTL
- Manual purge available via `purgeCache()` utility

## Monitoring

Cache performance can be monitored via:

- Cloudflare Analytics dashboard
- `X-Cache-Status` response headers
- Worker metrics for cache hit rates

## Configuration

Cache settings can be adjusted in:

- `/scores/src/utils/cache.ts` - TTL and header configurations
- Cloudflare dashboard - Page Rules for additional caching

## Best Practices

1. **Version Assets**: Use versioned URLs for immutable content
2. **Set ETags**: Enable conditional requests
3. **Vary Headers**: Ensure proper content negotiation
4. **Monitor Performance**: Track cache hit rates
5. **Test Locally**: Use `wrangler dev` to test caching behavior
