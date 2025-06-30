# Cloudflare Browser Rendering Implementation Plan

## Overview

This document outlines the implementation plan for migrating our PDF rendering to Cloudflare's Browser Rendering API, based on the latest API documentation.

## API Capabilities

### Available Endpoints

1. **Screenshot** (`POST /accounts/{account_id}/browser-rendering/screenshot`)
   - Most relevant for our PDF rendering needs
   - Can capture webpage screenshots in various formats

2. **PDF** (`POST /accounts/{account_id}/browser-rendering/pdf`)
   - Direct PDF generation from URLs or HTML
   - Could be useful for generating PDFs from rendered content

3. **Content** (`POST /accounts/{account_id}/browser-rendering/content`)
   - Fetches rendered HTML content
   - Useful for extracting text from PDFs

### Integration Options

1. **REST API** (Recommended for initial implementation)
   - Simple, stateless operations
   - Good for converting PDF pages to images
   - Can be called from Workers

2. **Workers Bindings** (For advanced features)
   - Direct integration with Puppeteer/Playwright
   - More control over rendering process
   - Better for complex workflows

## Implementation Architecture

### Phase 1: Basic PDF to Image Rendering

```typescript
// scores/src/workers/pdf-renderer.ts
export interface Env {
  BROWSER: any // Browser Rendering binding
  SCORES_BUCKET: R2Bucket
  RENDER_CACHE: KVNamespace
  ACCOUNT_ID: string
  API_TOKEN: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Pattern: /render/{scoreId}/page/{pageNumber}
    const match = url.pathname.match(/\/render\/([^\/]+)\/page\/(\d+)/)
    if (!match) {
      return new Response('Invalid URL pattern', { status: 400 })
    }

    const [, scoreId, pageNumber] = match
    const width = parseInt(url.searchParams.get('width') || '1200')
    const format = url.searchParams.get('format') || 'webp'

    // Check cache first
    const cacheKey = `render:${scoreId}:${pageNumber}:${width}:${format}`
    const cached = await env.RENDER_CACHE.get(cacheKey, { type: 'stream' })
    if (cached) {
      return new Response(cached, {
        headers: {
          'Content-Type': `image/${format}`,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    // Get PDF URL from R2
    const pdfObject = await env.SCORES_BUCKET.get(`pdfs/${scoreId}.pdf`)
    if (!pdfObject) {
      return new Response('PDF not found', { status: 404 })
    }

    // Create temporary URL for PDF
    const pdfUrl = await createTempUrl(pdfObject, env)

    // Use Browser Rendering API to screenshot PDF page
    const screenshot = await renderPdfPage(
      pdfUrl,
      pageNumber,
      width,
      format,
      env
    )

    // Cache the result
    await env.RENDER_CACHE.put(cacheKey, screenshot, {
      expirationTtl: 86400 * 30, // 30 days
    })

    return new Response(screenshot, {
      headers: {
        'Content-Type': `image/${format}`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  },
}

async function renderPdfPage(
  pdfUrl: string,
  pageNumber: number,
  width: number,
  format: string,
  env: Env
): Promise<ArrayBuffer> {
  // Option 1: Using REST API
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/browser-rendering/screenshot`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `${pdfUrl}#page=${pageNumber}`,
        options: {
          viewport: {
            width: width,
            height: Math.floor(width * 1.414), // A4 ratio
          },
          fullPage: false,
          type: format === 'webp' ? 'webp' : 'jpeg',
          quality: 85,
        },
        waitForOptions: {
          waitUntil: 'networkidle2',
          timeout: 30000,
        },
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Browser rendering failed: ${response.statusText}`)
  }

  return response.arrayBuffer()
}
```

### Phase 2: Workers Binding Implementation (Advanced)

```typescript
// wrangler.toml
name = 'pdf-renderer'
main = 'src/workers/pdf-renderer.ts'
compatibility_date = '2024-12-29'[[r2_buckets]]
binding = 'SCORES_BUCKET'
bucket_name = 'mirubato-scores'[[kv_namespaces]]
binding = 'RENDER_CACHE'
id = 'render-cache-kv-id'[browser]
binding = 'BROWSER'

// Advanced implementation using Puppeteer
import puppeteer from '@cloudflare/puppeteer'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const browser = await puppeteer.launch(env.BROWSER)

    try {
      const page = await browser.newPage()

      // Set viewport
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2, // High DPI
      })

      // Navigate to PDF
      await page.goto(pdfUrl, {
        waitUntil: 'networkidle2',
      })

      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'webp',
        quality: 85,
        clip: {
          x: 0,
          y: (pageNumber - 1) * 1600,
          width: 1200,
          height: 1600,
        },
      })

      return new Response(screenshot, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    } finally {
      await browser.close()
    }
  },
}
```

### Phase 3: Frontend Integration

```typescript
// frontendv2/src/components/score/CloudflareImageViewer.tsx
import { useState, useEffect } from 'react';

interface CloudflareImageViewerProps {
  scoreId: string;
  totalPages: number;
  className?: string;
}

export function CloudflareImageViewer({
  scoreId,
  totalPages,
  className,
}: CloudflareImageViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Determine optimal width based on device
  const getOptimalWidth = () => {
    const width = window.innerWidth;
    if (width < 640) return 600;  // Mobile
    if (width < 1024) return 900; // Tablet
    return 1200; // Desktop
  };

  const renderUrl = (page: number) => {
    const width = getOptimalWidth();
    const format = 'webp'; // Modern browsers support WebP
    return `/api/scores/render/${scoreId}/page/${page}?width=${width}&format=${format}`;
  };

  // Preload adjacent pages
  useEffect(() => {
    const preloadPages = [];
    if (currentPage > 1) {
      preloadPages.push(currentPage - 1);
    }
    if (currentPage < totalPages) {
      preloadPages.push(currentPage + 1);
    }

    preloadPages.forEach(page => {
      const img = new Image();
      img.src = renderUrl(page);
    });
  }, [currentPage, totalPages, scoreId]);

  return (
    <div className={className}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}

      <img
        src={renderUrl(currentPage)}
        alt={`Page ${currentPage}`}
        className="w-full h-auto"
        onLoadStart={() => setLoading(true)}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          // Fallback to client-side rendering
          console.error('Failed to load server-rendered page');
        }}
      />

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Previous
        </button>

        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

## Configuration Requirements

### 1. Cloudflare Account Setup

- Enable Browser Rendering API
- Generate API token with Browser Rendering permissions
- Note account ID

### 2. Environment Variables

```env
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

### 3. Wrangler Configuration

```toml
# wrangler.toml additions
[env.production]
vars = { ENVIRONMENT = "production" }

[env.staging]
vars = { ENVIRONMENT = "staging" }

# Browser rendering binding
[browser]
binding = "BROWSER"
```

## Implementation Timeline

### Week 1-2: Setup and Proof of Concept

- [ ] Enable Browser Rendering API in Cloudflare account
- [ ] Create test Worker with screenshot endpoint
- [ ] Test PDF page rendering with various PDFs
- [ ] Benchmark performance and costs

### Week 3-4: Production Implementation

- [ ] Implement full Worker with caching
- [ ] Add error handling and fallbacks
- [ ] Set up monitoring and analytics
- [ ] Create CloudflareImageViewer component

### Week 5-6: Integration and Testing

- [ ] Integrate with existing scorebook
- [ ] A/B testing framework
- [ ] Performance monitoring
- [ ] Mobile device testing

### Week 7-8: Rollout

- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Monitor metrics and costs
- [ ] Optimize based on real usage
- [ ] Remove old PDF rendering code

## Cost Estimation

Based on Cloudflare pricing:

- Browser Rendering: ~$5 per 1000 renders
- Workers: $0.50 per million requests
- KV Storage: $0.50 per million reads

Estimated monthly cost for 10,000 users:

- Renders: 100,000 pages × $0.005 = $500
- Workers: 1M requests × $0.50 = $0.50
- Cache hits (90%): Minimal cost
- **Total: ~$500-600/month**

## Monitoring and Success Metrics

### Performance Metrics

- P95 render time < 500ms
- Cache hit rate > 85%
- Error rate < 0.1%

### Business Metrics

- Mobile usage increase > 25%
- Support tickets decrease > 50%
- User satisfaction > 4.5/5

## Fallback Strategy

Keep existing PDF.js implementation as fallback:

1. If Browser Rendering fails → Use client-side rendering
2. If costs exceed budget → Implement rate limiting
3. If performance issues → Scale down image quality

## Next Steps

1. **Immediate**: Review and approve implementation plan
2. **Week 1**: Set up Cloudflare Browser Rendering
3. **Week 2**: Deploy POC to staging
4. **Week 3**: Begin production implementation

---

_Document Status: Ready for Implementation_  
_Last Updated: December 29, 2024_
