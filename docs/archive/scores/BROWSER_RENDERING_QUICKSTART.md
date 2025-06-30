# Cloudflare Browser Rendering Quick Start Guide

## Current Status (December 2024)

**🎉 Great News: Browser Rendering API is currently FREE within limits!**

- No billing active yet (pricing to be announced)
- Available to all paid Workers plans
- Free plan: 10 minutes/day limit
- Paid plan: 2 new browsers/minute, 2 concurrent browsers

## Immediate Action Plan

Since the service is currently free, this is the **perfect time** to implement and test our PDF rendering solution!

## Step 1: Prerequisites

```bash
# Check if we have a paid Workers plan
wrangler whoami

# If not on paid plan ($5/month), upgrade at:
# https://dash.cloudflare.com/?to=/:account/workers/plans
```

## Step 2: Enable Browser Rendering

1. Log into Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Enable Browser Rendering API
4. Note your Account ID

## Step 3: Create Test Worker

```bash
# Create new worker project
mkdir pdf-renderer-worker
cd pdf-renderer-worker
npm init -y
npm install --save-dev wrangler @cloudflare/workers-types
```

## Step 4: Basic Implementation

Create `src/index.ts`:

```typescript
export interface Env {
  BROWSER: any
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/test-screenshot') {
      try {
        // Test with a simple webpage first
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/browser-rendering/screenshot`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: 'https://example.com',
              options: {
                viewport: {
                  width: 1200,
                  height: 800,
                },
                type: 'webp',
              },
            }),
          }
        )

        if (!response.ok) {
          return new Response(`Error: ${response.statusText}`, {
            status: response.status,
          })
        }

        const image = await response.arrayBuffer()
        return new Response(image, {
          headers: {
            'Content-Type': 'image/webp',
          },
        })
      } catch (error) {
        return new Response(`Error: ${error.message}`, { status: 500 })
      }
    }

    return new Response('PDF Renderer Worker', { status: 200 })
  },
}
```

## Step 5: Configure wrangler.toml

```toml
name = "pdf-renderer"
main = "src/index.ts"
compatibility_date = "2024-12-29"

[browser]
binding = "BROWSER"

# Add your account ID
account_id = "YOUR_ACCOUNT_ID"

# For local development
[vars]
API_TOKEN = "YOUR_API_TOKEN"
```

## Step 6: Deploy and Test

```bash
# Deploy to Cloudflare
wrangler deploy

# Test the endpoint
curl https://pdf-renderer.YOUR-SUBDOMAIN.workers.dev/test-screenshot -o test.webp

# Open the image to verify
open test.webp  # macOS
# or
xdg-open test.webp  # Linux
```

## Step 7: PDF-Specific Testing

Once basic screenshot works, test with PDF:

```typescript
// Add PDF test endpoint
if (url.pathname === '/test-pdf') {
  const pdfUrl =
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/browser-rendering/screenshot`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `${pdfUrl}#page=1`,
        options: {
          viewport: {
            width: 1200,
            height: 1600,
          },
          type: 'webp',
          quality: 85,
        },
        waitForOptions: {
          waitUntil: 'networkidle0',
          timeout: 30000,
        },
      }),
    }
  )

  // ... handle response
}
```

## Cost Monitoring

While currently free, monitor usage to prepare for future pricing:

```typescript
// Add usage tracking
const logUsage = async (scoreId: string, pageNumber: number) => {
  // Log to Analytics Engine or KV
  const date = new Date().toISOString().split('T')[0]
  const key = `usage:${date}`

  // Increment daily counter
  const current = (await env.USAGE_KV.get(key)) || '0'
  await env.USAGE_KV.put(key, String(parseInt(current) + 1), {
    expirationTtl: 86400 * 30, // 30 days
  })
}
```

## Performance Optimization Tips

1. **Cache Aggressively**: Since renders are expensive

   ```typescript
   // Use Cloudflare Cache API
   const cache = caches.default
   const cacheKey = new Request(cacheUrl, request)
   const cachedResponse = await cache.match(cacheKey)
   ```

2. **Optimize Viewport**: Render only what's needed

   ```typescript
   // Mobile: smaller viewport
   const viewport = isMobile
     ? { width: 800, height: 1000 }
     : { width: 1200, height: 1600 }
   ```

3. **Use WebP Format**: Better compression
   ```typescript
   type: 'webp',
   quality: 85, // Good balance
   ```

## Monitoring Dashboard

Create a simple monitoring page:

```typescript
if (url.pathname === '/stats') {
  const stats = {
    dailyUsage: await env.USAGE_KV.get(`usage:${today}`),
    cacheHitRate: await calculateCacheHitRate(),
    averageRenderTime: await getAverageRenderTime(),
  }

  return new Response(JSON.stringify(stats, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

## Next Steps

1. **Today**: Deploy test worker and verify screenshots work
2. **Tomorrow**: Test with actual PDF files from scores
3. **This Week**: Implement caching and monitoring
4. **Next Week**: Integrate with frontend

## Important Notes

- Current limits: 2 browsers/minute, 2 concurrent
- No cost currently, but track usage for future
- REST API is simpler than Puppeteer binding for our use case
- Always implement fallback to client-side rendering

---

_Status: Ready to implement immediately_  
_Cost: FREE (for now)_  
_Risk: Very low_
