# R2 Storage Optimization Implementation

## Overview

Based on Gemini's analysis, we've implemented several optimizations to improve R2 storage efficiency for serving PDF files.

## Changes Implemented

### 1. Removed Manual ETag Override

- **File**: `scores/src/index.ts`
- **Change**: Removed the code that was overriding R2's content-based ETags
- **Impact**: Now properly uses R2's automatic ETag generation for efficient caching

### 2. Updated Cache Configuration

- **File**: `scores/src/utils/cache.ts`
- **Change**: PDFs are now treated as immutable content with 1-year cache duration
- **Before**: 1 week cache for static content
- **After**: 1 year cache for PDFs (`max-age=31536000, immutable`)

### 3. Set Cache Headers on Upload

- **Files Updated**:
  - `scores/src/api/handlers/import.ts`
  - `scores/src/services/uploadService.ts`
- **Change**: Added `cacheControl: 'public, max-age=31536000, immutable'` to R2 upload operations
- **Impact**: PDFs are now stored with proper cache headers, reducing worker invocations

## Benefits

1. **Reduced Worker Invocations**: With proper cache headers, browsers and CDN will cache PDFs for 1 year
2. **Lower Costs**: Fewer R2 read operations and worker invocations
3. **Better Performance**: PDFs served directly from browser/CDN cache when possible
4. **Proper ETags**: Using R2's content-based ETags for efficient conditional requests

## Testing

After deployment, verify:

1. PDF responses include `Cache-Control: public, max-age=31536000, immutable`
2. ETags are present and working for conditional requests
3. Subsequent PDF loads are served from cache (check Network tab)

## Future Optimizations

Consider implementing:

1. Public R2 bucket for direct PDF serving (bypassing worker entirely)
2. Signed URLs for temporary access to private content
3. CDN integration for global edge caching
