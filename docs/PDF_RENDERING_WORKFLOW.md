# PDF Rendering Workflow Design

## Overview

Based on Cloudflare Browser Rendering API capabilities and constraints, here's a comprehensive workflow for PDF processing.

## Key Constraints

- **Browser timeout**: 60 seconds (extendable to 600 seconds with keepAlive)
- **HTTP request timeout**: 100 seconds for proxied requests
- **Navigation timeout**: 30 seconds (configurable)
- **Typical rendering time**: <200ms for simple PDFs, but can be much longer for complex ones

## Workflow Architecture

### Phase 1: Upload & Initial Processing

```
User uploads PDF → API → Queue message → Background processing
```

1. **PDF Upload** (Synchronous)
   - User uploads PDF to `/api/import/pdf`
   - Store original PDF in R2
   - Create database entry in `scores` table
   - Queue message for background processing
   - Return immediately with score ID

2. **Queue Message Format**
   ```typescript
   {
     type: 'process-new-score',
     scoreId: string,
     r2Key: string,
     uploadedAt: string
   }
   ```

### Phase 2: Background Pre-processing (Asynchronous)

```
Queue consumer → Analyze PDF → Render all pages → Store in R2
```

1. **PDF Analysis** (5-10 seconds)

   ```typescript
   async function analyzePdf(pdfUrl: string) {
     const browser = await launch(env.BROWSER, {
       keepAlive: 300, // 5 minutes for complex PDFs
     })

     // Load PDF and get metadata
     const pageCount = await getPageCount(pdfUrl)
     const dimensions = await getPageDimensions(pdfUrl)

     return { pageCount, dimensions }
   }
   ```

2. **Page-by-Page Rendering** (200ms - 2s per page)

   ```typescript
   async function renderAllPages(
     scoreId: string,
     pdfUrl: string,
     pageCount: number
   ) {
     const browser = await launch(env.BROWSER, { keepAlive: 600 })

     for (let page = 1; page <= pageCount; page++) {
       // Render each page individually
       const imageBuffer = await renderPage(browser, pdfUrl, page)

       // Store in R2 with predictable key
       const key = `rendered/${scoreId}/page-${page}.webp`
       await env.SCORES_BUCKET.put(key, imageBuffer)

       // Update progress in database
       await updateRenderProgress(scoreId, page, pageCount)
     }

     await browser.close()
   }
   ```

### Phase 3: On-Demand Rendering (Fallback)

```
Client request → Check cache → Render if needed → Return image
```

1. **Cached Response** (<50ms)

   ```typescript
   GET /api/pdf/render/:scoreId/page/:pageNumber

   // Check if pre-rendered exists
   const preRenderedKey = `rendered/${scoreId}/page-${pageNumber}.webp`
   const cached = await env.SCORES_BUCKET.get(preRenderedKey)
   if (cached) return cached
   ```

2. **On-Demand Rendering** (2-5 seconds)

   ```typescript
   // If not pre-rendered, render on demand
   const browser = await launch(env.BROWSER)
   const image = await renderSinglePage(browser, pdfUrl, pageNumber)

   // Cache for future requests
   await env.SCORES_BUCKET.put(preRenderedKey, image)

   return image
   ```

## Implementation Details

### 1. Optimized HTML Template

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 0;
      }
      #container {
        width: 100vw;
        height: 100vh;
      }
      canvas {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    </style>
  </head>
  <body>
    <div id="container">
      <canvas id="pdf-canvas"></canvas>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs"></script>
    <script>
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

      (async () => {
        try {
          const pdf = await pdfjsLib.getDocument('${pdfUrl}').promise;
          const page = await pdf.getPage(${pageNumber});

          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.getElementById('pdf-canvas');
          const context = canvas.getContext('2d');

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: context, viewport }).promise;

          window.renderComplete = true;
        } catch (error) {
          window.renderError = error.message;
        }
      })();
    </script>
  </body>
</html>
```

### 2. Render Function with Proper Timeouts

```typescript
async function renderSinglePage(
  browser: Browser,
  pdfUrl: string,
  pageNumber: number
): Promise<ArrayBuffer> {
  const page = await browser.newPage()

  try {
    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2,
    })

    // Load optimized HTML
    const html = generatePdfViewerHtml(pdfUrl, pageNumber)
    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    // Wait for render with shorter timeout
    const renderResult = await Promise.race([
      page.waitForFunction('window.renderComplete === true', {
        timeout: 10000,
      }),
      page.waitForFunction('window.renderError !== undefined', {
        timeout: 10000,
      }),
    ])

    // Check for errors
    const error = await page.evaluate(() => window.renderError)
    if (error) throw new Error(`PDF render error: ${error}`)

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'webp',
      quality: 85,
      fullPage: false,
    })

    return screenshot
  } finally {
    await page.close()
  }
}
```

### 3. Queue Consumer with Progress Tracking

```typescript
export async function handleProcessNewScore(message: QueueMessage, env: Env) {
  const { scoreId, r2Key } = message

  try {
    // Update status to processing
    await updateScoreStatus(scoreId, 'processing')

    // Get PDF URL
    const pdfUrl = await generatePresignedUrl(r2Key)

    // Analyze PDF
    const { pageCount } = await analyzePdf(pdfUrl)

    // Update score_versions table
    await createScoreVersion(scoreId, 'pdf', r2Key, pageCount)

    // Render all pages
    await renderAllPages(scoreId, pdfUrl, pageCount)

    // Update status to completed
    await updateScoreStatus(scoreId, 'completed')
  } catch (error) {
    console.error(`Failed to process score ${scoreId}:`, error)
    await updateScoreStatus(scoreId, 'failed', error.message)
  }
}
```

## Performance Targets

| Operation                      | Target Time | Notes                     |
| ------------------------------ | ----------- | ------------------------- |
| Initial upload response        | <500ms      | Just store and queue      |
| Single page render             | 200ms - 2s  | Depends on PDF complexity |
| Full PDF processing (10 pages) | 5-30s       | Background job            |
| Cached page retrieval          | <50ms       | From R2                   |
| On-demand render               | 2-5s        | Fallback only             |

## Error Handling Strategy

1. **Timeout Errors**: If rendering takes >10s per page, mark as "complex" and use lower quality settings
2. **Memory Errors**: Process in smaller batches
3. **Network Errors**: Retry with exponential backoff
4. **Invalid PDFs**: Mark as failed, notify user

## Monitoring

Track these metrics:

- Average render time per page
- Cache hit rate
- Failed render rate
- Queue processing time
- Memory usage per render
