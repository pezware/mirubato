# Leveraging Cloudflare Native Features for Scores Service

## Overview

This document outlines how we can use Cloudflare's native features to enhance the Scores Service without relying on external dependencies.

## 1. Browser Rendering API 🎯

The Browser Rendering API can be incredibly useful for our scores service:

### Use Cases

#### PDF to Image Conversion

```typescript
// Convert PDF pages to images for preview
async function generatePDFPreview(pdfUrl: string, pageNumber: number = 1) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/browser-rendering/screenshot`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: pdfUrl + `#page=${pageNumber}`,
        options: {
          viewport: {
            width: 1200,
            height: 1600,
          },
          fullPage: false,
          type: 'png',
        },
      }),
    }
  )

  return response.blob()
}
```

#### IMSLP Scraping

```typescript
// Scrape IMSLP page for metadata
async function scrapeIMSLP(imslpUrl: string) {
  // Get page content as markdown
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/browser-rendering/markdown`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: imslpUrl,
      }),
    }
  )

  const markdown = await response.text()

  // Parse metadata from markdown
  return parseIMSLPMetadata(markdown)
}

// Get all PDF links from IMSLP page
async function getIMSLPLinks(imslpUrl: string) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/browser-rendering/links`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: imslpUrl,
        options: {
          selector: 'a[href*=".pdf"]', // Find PDF links
        },
      }),
    }
  )

  return response.json()
}
```

#### Web-based Score Rendering

```typescript
// Render VexFlow score to image
async function renderScoreToImage(scoreData: any) {
  // Host a temporary HTML page with VexFlow
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/vexflow/build/vexflow-min.js"></script>
    </head>
    <body>
      <div id="output"></div>
      <script>
        const VF = Vex.Flow;
        const div = document.getElementById("output");
        const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
        // ... VexFlow rendering code ...
      </script>
    </body>
    </html>
  `

  // Store HTML temporarily in KV
  const tempKey = `temp-score-${Date.now()}`
  await env.CACHE.put(tempKey, htmlContent, { expirationTtl: 300 })

  // Render to screenshot
  const screenshot = await browserRender.screenshot({
    url: `${WORKER_URL}/temp/${tempKey}`,
    options: {
      viewport: { width: 800, height: 600 },
      waitUntil: 'networkidle2',
    },
  })

  return screenshot
}
```

## 2. Workers AI Integration 🤖

While Workers AI doesn't currently offer OCR models, we can use it for:

### Text Processing

```typescript
// Use LLM to extract metadata from text
async function extractMetadataFromText(text: string) {
  const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
    prompt: `Extract the following information from this music score description:
    - Title
    - Composer
    - Year composed
    - Difficulty level
    - Style period
    
    Text: ${text}
    
    Return as JSON.`,
  })

  return JSON.parse(response.response)
}
```

### Image Generation for Placeholders

```typescript
// Generate placeholder images for scores
async function generateScorePlaceholder(title: string, composer: string) {
  const image = await env.AI.run(
    '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    {
      prompt: `Elegant classical music sheet notation background, ${composer} style, minimalist, high quality`,
    }
  )

  return image
}
```

## 3. Cloudflare Images 📸

Use Cloudflare Images for optimized score preview storage:

```typescript
// Upload score preview to Cloudflare Images
async function uploadScorePreview(imageBlob: Blob, scoreId: string) {
  const formData = new FormData()
  formData.append('file', imageBlob)
  formData.append('metadata', JSON.stringify({ scoreId }))

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: formData,
    }
  )

  return response.json()
}

// Get optimized variants
function getImageVariants(imageId: string) {
  return {
    thumbnail: `https://imagedelivery.net/${ACCOUNT_HASH}/${imageId}/thumbnail`,
    preview: `https://imagedelivery.net/${ACCOUNT_HASH}/${imageId}/preview`,
    full: `https://imagedelivery.net/${ACCOUNT_HASH}/${imageId}/full`,
  }
}
```

## 4. Durable Objects for Processing 🔄

Use Durable Objects for stateful score processing:

```typescript
export class ScoreProcessor {
  constructor(
    private state: DurableObjectState,
    private env: Env
  ) {}

  async fetch(request: Request) {
    const url = new URL(request.url)

    switch (url.pathname) {
      case '/process-pdf':
        return this.processPDF(request)
      case '/status':
        return this.getStatus()
    }
  }

  async processPDF(request: Request) {
    const { scoreId, pdfUrl } = await request.json()

    // Update status
    await this.state.storage.put('status', 'processing')
    await this.state.storage.put('scoreId', scoreId)

    try {
      // Generate previews for each page
      const pageCount = await this.getPDFPageCount(pdfUrl)

      for (let i = 1; i <= pageCount; i++) {
        const preview = await generatePDFPreview(pdfUrl, i)
        await this.env.SCORES_BUCKET.put(
          `previews/${scoreId}/page-${i}.png`,
          preview
        )
      }

      await this.state.storage.put('status', 'completed')
      await this.state.storage.put('pageCount', pageCount)
    } catch (error) {
      await this.state.storage.put('status', 'failed')
      await this.state.storage.put('error', error.message)
    }

    return new Response('Processing started')
  }
}
```

## 5. Queues for Async Processing 📬

Use Cloudflare Queues for reliable async processing:

```typescript
// Queue consumer for score processing
export default {
  async queue(batch: MessageBatch<ScoreProcessingJob>, env: Env) {
    for (const message of batch.messages) {
      const { scoreId, action, data } = message.body

      try {
        switch (action) {
          case 'import-imslp':
            await processIMSLPImport(scoreId, data.url, env)
            break
          case 'generate-previews':
            await generateScorePreviews(scoreId, data.pdfUrl, env)
            break
          case 'extract-metadata':
            await extractPDFMetadata(scoreId, data.pdfUrl, env)
            break
        }

        message.ack()
      } catch (error) {
        message.retry()
      }
    }
  },
}
```

## 6. Email Workers for Notifications 📧

Send notifications when score processing is complete:

```typescript
export async function sendProcessingComplete(email: string, scoreId: string) {
  const message = {
    from: 'scores@mirubato.com',
    to: email,
    subject: 'Your score is ready!',
    html: `
      <h2>Score Processing Complete</h2>
      <p>Your uploaded score has been processed and is now available.</p>
      <a href="https://mirubato.com/scores/${scoreId}">View Score</a>
    `,
  }

  await env.EMAIL.send(message)
}
```

## Implementation Updates

### Updated Architecture

```typescript
// Updated wrangler.toml
;[[queues.producers]]
queue = 'score-processing'
binding = 'SCORE_QUEUE'[[queues.consumers]]
queue = 'score-processing'[[durable_objects.bindings]]
name = 'SCORE_PROCESSOR'
class_name = 'ScoreProcessor'[browser_rendering]
binding = 'BROWSER'[[email.bindings]]
name = 'EMAIL'
address = 'scores@mirubato.com'
```

### Updated Import Handler

```typescript
// Enhanced import handler using native features
export async function enhancedImportHandler(c: Context<{ Bindings: Env }>) {
  const { url } = await c.req.json()

  // 1. Create score entry
  const scoreId = nanoid()
  await createScoreEntry(scoreId, { source: 'imslp', imslpUrl: url })

  // 2. Queue for async processing
  await c.env.SCORE_QUEUE.send({
    scoreId,
    action: 'import-imslp',
    data: { url },
  })

  // 3. Use Browser Rendering for immediate preview
  const screenshot = await c.env.BROWSER.screenshot({
    url,
    options: { viewport: { width: 300, height: 400 } },
  })

  // 4. Store preview
  await c.env.SCORES_BUCKET.put(`previews/${scoreId}/thumbnail.png`, screenshot)

  return c.json({
    success: true,
    scoreId,
    status: 'processing',
    previewUrl: `/api/scores/${scoreId}/preview`,
  })
}
```

## Benefits of Native Features

1. **No External Dependencies**: Everything runs on Cloudflare's infrastructure
2. **Cost Effective**: Pay only for what you use
3. **Global Performance**: Leverage Cloudflare's edge network
4. **Integrated Security**: Built-in DDoS protection and security features
5. **Simplified Deployment**: One platform for everything

## Next Steps

1. Enable Browser Rendering API in your Cloudflare account
2. Set up Queues for async processing
3. Configure Durable Objects for stateful operations
4. Implement the enhanced handlers using native features
5. Test the complete workflow

This approach leverages Cloudflare's full platform capabilities to create a robust, scalable scores service without external dependencies.
