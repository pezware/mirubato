# Cloudflare Services Architecture

## Overview

Mirubato leverages Cloudflare's comprehensive edge computing platform to deliver a globally distributed, highly performant music education platform. This document details how each Cloudflare service is utilized.

## Service Utilization Map

| Service               | Purpose in Mirubato            | Usage Details                    |
| --------------------- | ------------------------------ | -------------------------------- |
| **Workers**           | Application runtime            | All 5 microservices              |
| **D1**                | Edge SQL database              | User data, metadata, sync        |
| **R2**                | Object storage                 | PDFs, images, audio files        |
| **KV**                | Key-value cache                | Sessions, API cache, catalog     |
| **Queues**            | Async task processing          | PDF processing, emails           |
| **Durable Objects**   | Stateful WebSocket connections | Real-time sync coordination      |
| **AI**                | Machine learning               | Metadata extraction, definitions |
| **Browser Rendering** | Headless browser               | PDF preview generation           |
| **Analytics Engine**  | Custom analytics               | Usage tracking, performance      |
| **Rate Limiting**     | API protection                 | Prevent abuse                    |

## Cloudflare Workers

### Configuration

```toml
# wrangler.toml example
name = "mirubato-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
workers_dev = false
route = { pattern = "api.mirubato.com/*", zone_name = "mirubato.com" }
```

### Worker Limits & Considerations

- **CPU Time**: 50ms (Paid plan)
- **Memory**: 128MB
- **Request Size**: 100MB
- **Subrequests**: 50 per request
- **Script Size**: 10MB after compression

### Implementation Patterns

#### Request Handler

```typescript
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // Request handling at edge location
    const app = new Hono<{ Bindings: Env }>()

    // Middleware
    app.use('*', cors())
    app.use('*', logger())

    // Routes
    app.route('/api', apiRoutes)

    return app.fetch(request, env, ctx)
  },
}
```

#### Background Tasks

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Cron-triggered tasks
    ctx.waitUntil(performMaintenance(env))
  },
}
```

## D1 Database

### Database Configuration

```toml
[[d1_databases]]
binding = "DB"
database_name = "mirubato-prod"
database_id = "31ecc854-aecf-4994-8bda-7a9cd3055122"
```

### Usage Patterns

#### Connection Management

```typescript
// D1 automatically manages connections
const results = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
  .bind(userId)
  .first()
```

#### Batch Operations

```typescript
// Atomic batch operations
await env.DB.batch([
  env.DB.prepare('INSERT INTO logs...').bind(...),
  env.DB.prepare('UPDATE users...').bind(...),
  env.DB.prepare('DELETE FROM temp...').bind(...)
])
```

#### Prepared Statements

```typescript
// Reusable prepared statements
const stmt = env.DB.prepare(
  'SELECT * FROM logbook_entries WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?'
)
const entries = await stmt.bind(userId, 50).all()
```

### Performance Optimization

- Use indexes for frequent queries
- Batch operations when possible
- Limit result sets with pagination
- Use prepared statements for security

## R2 Storage

### Configuration

```toml
[[r2_buckets]]
binding = "SCORES_BUCKET"
bucket_name = "mirubato-scores-production"
```

### Usage Patterns

#### File Upload

```typescript
// Stream large files directly to R2
async function uploadScore(file: File, env: Env) {
  const key = `scores/${userId}/${scoreId}.pdf`
  await env.SCORES_BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType: 'application/pdf',
    },
    customMetadata: {
      userId,
      uploadedAt: new Date().toISOString(),
    },
  })
}
```

#### File Retrieval

```typescript
// Serve files with caching headers
async function getScore(key: string, env: Env) {
  const object = await env.SCORES_BUCKET.get(key)
  if (!object) return new Response('Not Found', { status: 404 })

  return new Response(object.body, {
    headers: {
      'Content-Type':
        object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
      ETag: object.httpEtag,
    },
  })
}
```

#### Multipart Upload

```typescript
// For large files > 100MB
const multipartUpload = await env.SCORES_BUCKET.createMultipartUpload(key)
// Upload parts...
await multipartUpload.complete(parts)
```

## KV Namespace

### Configuration

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "b04ae504f7884fc180d27c9320b378f6"
```

### Usage Patterns

#### Session Storage

```typescript
// Store session with TTL
await env.CACHE.put(
  `session:${sessionId}`,
  JSON.stringify(sessionData),
  { expirationTtl: 3600 } // 1 hour
)
```

#### API Response Caching

```typescript
// Cache API responses
const cacheKey = `api:${endpoint}:${params}`
const cached = await env.CACHE.get(cacheKey)
if (cached) return new Response(cached)

const response = await generateResponse()
await env.CACHE.put(cacheKey, response, { expirationTtl: 300 })
```

#### Catalog Storage

```typescript
// Store semi-static data
await env.MUSIC_CATALOG.put(
  'composers:popular',
  JSON.stringify(popularComposers),
  { metadata: { version: '1.0', updated: Date.now() } }
)
```

## Queues

### Configuration

```toml
[[queues.producers]]
binding = "PDF_QUEUE"
queue = "pdf-processing"

[[queues.consumers]]
queue = "pdf-processing"
max_batch_size = 10
max_batch_timeout = 30
```

### Implementation

#### Producer

```typescript
// Send to queue
await env.PDF_QUEUE.send({
  scoreId,
  userId,
  operation: 'extract-metadata',
  timestamp: Date.now(),
})
```

#### Consumer

```typescript
export default {
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processScore(message.body, env)
        message.ack() // Acknowledge successful processing
      } catch (error) {
        message.retry() // Retry on failure
      }
    }
  },
}
```

## Durable Objects

### Configuration

```toml
[[durable_objects.bindings]]
name = "SYNC_COORDINATOR"
class_name = "SyncCoordinator"

[[migrations]]
tag = "v1"
new_classes = ["SyncCoordinator"]
```

### Implementation

#### Durable Object Class

```typescript
export class SyncCoordinator implements DurableObject {
  private sessions: Map<string, WebSocket> = new Map()

  constructor(
    private state: DurableObjectState,
    private env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      await this.handleWebSocket(pair[1])
      return new Response(null, { status: 101, webSocket: pair[0] })
    }
    return new Response('Expected WebSocket', { status: 400 })
  }

  async handleWebSocket(ws: WebSocket) {
    // Handle real-time sync
    ws.accept()
    ws.addEventListener('message', async event => {
      // Broadcast to all connected clients
      this.broadcast(event.data)
    })
  }

  broadcast(message: string) {
    this.sessions.forEach(ws => ws.send(message))
  }
}
```

## Workers AI

### Configuration

```toml
[ai]
binding = "AI"
```

### Usage Examples

#### Text Generation

```typescript
// Generate music term definition
const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
  prompt: `Define the musical term "${term}" in simple language`,
  max_tokens: 200,
})
```

#### Embeddings

```typescript
// Generate embeddings for semantic search
const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
  text: [searchQuery],
})
```

#### Image Analysis

```typescript
// Extract text from sheet music
const result = await env.AI.run('@cf/microsoft/resnet-50', {
  image: scoreImageArray,
})
```

## Browser Rendering

### Configuration

```toml
[browser]
binding = "BROWSER"
```

### Usage

```typescript
// Generate PDF preview
const browser = await env.BROWSER.launch()
const page = await browser.newPage()
await page.goto(pdfUrl)
const screenshot = await page.screenshot({ fullPage: true })
await browser.close()
```

## Analytics Engine

### Configuration

```toml
[[analytics_engine_datasets]]
binding = "ANALYTICS"
dataset = "mirubato_analytics"
```

### Usage

```typescript
// Track custom events
env.ANALYTICS.writeDataPoint({
  blobs: [userId, action, resource],
  doubles: [duration, value],
  indexes: [eventType],
})
```

## Rate Limiting

### Configuration

```typescript
// In Worker code
const rateLimiter = {
  async check(key: string, limit: number, window: number) {
    const count = await env.CACHE.get(`rate:${key}`)
    if (parseInt(count) > limit) {
      throw new Error('Rate limit exceeded')
    }
    await env.CACHE.put(`rate:${key}`, (parseInt(count) + 1).toString(), {
      expirationTtl: window,
    })
  },
}
```

## Cost Optimization Strategies

### 1. Efficient Caching

- Use KV for frequently accessed data
- Implement multi-layer caching
- Set appropriate TTLs

### 2. Batch Operations

- Batch D1 queries
- Group queue messages
- Combine subrequests

### 3. Smart Storage

- Compress before storing in KV
- Use R2 for large files only
- Clean up unused data regularly

### 4. Request Optimization

- Minimize subrequests
- Use streaming where possible
- Implement request coalescing

## Monitoring & Debugging

### Wrangler Tail

```bash
# Real-time logs
wrangler tail --env production

# Filter logs
wrangler tail --env production --search "error"
```

### Custom Metrics

```typescript
// Add debug headers
response.headers.set('X-Worker-Version', env.VERSION)
response.headers.set('X-Processing-Time', `${Date.now() - start}ms`)
response.headers.set('X-Cache-Status', cacheHit ? 'HIT' : 'MISS')
```

## Related Documentation

- [System Overview](./overview.md) - High-level architecture
- [Microservices](./microservices.md) - Service-specific details
- [Deployment](./deployment.md) - Deployment configuration
- [Performance](../07-operations/performance.md) - Optimization strategies

---

_Last updated: December 2024 | Version 1.7.6_
