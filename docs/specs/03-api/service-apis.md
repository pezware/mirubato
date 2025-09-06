# Service APIs Specification

## Overview

Mirubato's microservices communicate via HTTP APIs with JWT-based service authentication. Each service exposes specific endpoints for inter-service communication while maintaining security and isolation.

## Service Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │      │     API      │      │    Scores    │
│   (React)    │─────▶│   (Gateway)  │─────▶│   (PDF/AI)   │
└──────────────┘      └──────────────┘      └──────────────┘
                             │                      │
                             ▼                      ▼
                      ┌──────────────┐      ┌──────────────┐
                      │  Dictionary  │      │ Sync Worker  │
                      │   (Terms)    │      │  (WebSocket) │
                      └──────────────┘      └──────────────┘
```

## Service Authentication

### Service Tokens

```typescript
// Service-to-service authentication
interface ServiceToken {
  iss: string // Issuing service
  sub: string // Target service
  aud: string[] // Allowed services
  scope: string[] // Permissions
  iat: number // Issued at
  exp: number // Expiration
  jti: string // Token ID
}

// Generate service token
async function generateServiceToken(
  fromService: string,
  toService: string,
  scopes: string[]
): Promise<string> {
  const payload: ServiceToken = {
    iss: fromService,
    sub: toService,
    aud: [toService],
    scope: scopes,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    jti: crypto.randomUUID(),
  }

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(env.SERVICE_SECRET)
}
```

### Service Registry

```typescript
// Service endpoints configuration
const SERVICE_REGISTRY = {
  api: {
    production: 'https://api.mirubato.com',
    staging: 'https://api-staging.mirubato.com',
    local: 'http://api-mirubato.localhost:9797',
  },
  scores: {
    production: 'https://scores.mirubato.com',
    staging: 'https://scores-staging.mirubato.com',
    local: 'http://scores-mirubato.localhost:9788',
  },
  dictionary: {
    production: 'https://dictionary.mirubato.com',
    staging: 'https://dictionary-staging.mirubato.com',
    local: 'http://dictionary-mirubato.localhost:9799',
  },
  sync: {
    production: 'wss://sync.mirubato.com',
    staging: 'wss://sync-staging.mirubato.com',
    local: 'ws://localhost:9798',
  },
}

// Get service URL
function getServiceUrl(service: keyof typeof SERVICE_REGISTRY): string {
  return SERVICE_REGISTRY[service][env.ENVIRONMENT]
}
```

## Scores Service API

### Service Overview

Handles PDF processing, sheet music management, AI metadata extraction, and collections.

### Internal Endpoints

#### Process PDF

```http
POST /internal/scores/process
Authorization: Bearer <service_token>
```

**Request:**

```json
{
  "scoreId": "score_123",
  "fileUrl": "https://r2.mirubato.com/scores/file.pdf",
  "userId": "user_456",
  "operations": ["extract_metadata", "generate_preview", "ocr"]
}
```

**Response:**

```json
{
  "scoreId": "score_123",
  "metadata": {
    "title": "Moonlight Sonata",
    "composer": "Ludwig van Beethoven",
    "key": "C# minor",
    "tempo": "Adagio sostenuto",
    "difficulty": 7,
    "pages": 8,
    "duration": "15:00"
  },
  "preview": {
    "thumbnailUrl": "https://r2.mirubato.com/previews/score_123_thumb.jpg",
    "firstPageUrl": "https://r2.mirubato.com/previews/score_123_page1.jpg"
  },
  "ocr": {
    "text": "Extracted text content...",
    "confidence": 0.95
  }
}
```

#### AI Metadata Extraction

```http
POST /internal/scores/ai-extract
Authorization: Bearer <service_token>
```

**Request:**

```json
{
  "imageUrl": "https://r2.mirubato.com/scores/page1.jpg",
  "extractFields": ["title", "composer", "tempo", "key", "instruments"]
}
```

**Response:**

```json
{
  "extracted": {
    "title": {
      "value": "Moonlight Sonata",
      "confidence": 0.98
    },
    "composer": {
      "value": "L. van Beethoven",
      "normalized": "Ludwig van Beethoven",
      "confidence": 0.95
    },
    "tempo": {
      "value": "Adagio sostenuto",
      "bpm": 60,
      "confidence": 0.9
    }
  }
}
```

#### Collection Management

```http
GET /internal/scores/collections/:userId
POST /internal/scores/collections
PUT /internal/scores/collections/:id
DELETE /internal/scores/collections/:id
```

### Queue Integration

```typescript
// PDF processing queue consumer
export default {
  async queue(batch: MessageBatch<PDFJob>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        const job = message.body

        // Process PDF
        const result = await processPDF(job)

        // Notify API service
        await fetch(`${env.API_URL}/internal/scores/complete`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${await generateServiceToken('scores', 'api', ['write'])}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(result),
        })

        message.ack()
      } catch (error) {
        message.retry()
      }
    }
  },
}
```

## Dictionary Service API

### Service Overview

Provides music terminology, definitions, and AI-powered explanations.

### Internal Endpoints

#### Generate Definition

```http
POST /internal/dictionary/generate
Authorization: Bearer <service_token>
```

**Request:**

```json
{
  "term": "crescendo",
  "language": "en",
  "context": "dynamics",
  "includeExamples": true
}
```

**Response:**

```json
{
  "term": "crescendo",
  "definition": "A gradual increase in loudness or intensity",
  "pronunciation": "krə-SHEN-dō",
  "etymology": "Italian, literally 'growing'",
  "category": "dynamics",
  "relatedTerms": ["diminuendo", "forte", "sforzando"],
  "examples": [
    "The crescendo builds to the climax in measure 32",
    "Mark the crescendo starting from piano to fortissimo"
  ],
  "translations": {
    "de": "Crescendo",
    "fr": "Crescendo",
    "es": "Crescendo",
    "zh-CN": "渐强",
    "zh-TW": "漸強"
  }
}
```

#### Bulk Term Import

```http
POST /internal/dictionary/import
Authorization: Bearer <service_token>
```

**Request:**

```json
{
  "terms": [
    {
      "term": "allegro",
      "definition": "Fast, lively tempo",
      "category": "tempo"
    }
  ],
  "source": "admin_import",
  "replaceExisting": false
}
```

#### Search Terms

```http
GET /internal/dictionary/search?q=tempo&category=tempo&limit=10
Authorization: Bearer <service_token>
```

### Caching Strategy

```typescript
// Dictionary caching with KV
class DictionaryCache {
  async get(term: string, language: string): Promise<Definition | null> {
    const key = `dict:${language}:${term.toLowerCase()}`
    const cached = await env.KV.get(key, 'json')

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }

    return null
  }

  async set(term: string, language: string, definition: Definition) {
    const key = `dict:${language}:${term.toLowerCase()}`
    await env.KV.put(
      key,
      JSON.stringify({
        data: definition,
        expiresAt: Date.now() + 86400000, // 24 hours
      })
    )
  }
}
```

## Sync Worker API

### Service Overview

Manages WebSocket connections and real-time data synchronization.

### Internal Endpoints

#### Get Connection Status

```http
GET /internal/sync/status/:userId
Authorization: Bearer <service_token>
```

**Response:**

```json
{
  "userId": "user_456",
  "connected": true,
  "connections": [
    {
      "id": "conn_789",
      "deviceInfo": "Chrome on Windows",
      "connectedAt": 1701388800000,
      "lastActivity": 1701389000000
    }
  ],
  "pendingMessages": 3
}
```

#### Force Sync

```http
POST /internal/sync/force
Authorization: Bearer <service_token>
```

**Request:**

```json
{
  "userId": "user_456",
  "entities": [
    {
      "type": "logbook",
      "id": "entry_123",
      "operation": "update",
      "data": { ... }
    }
  ]
}
```

#### Broadcast Message

```http
POST /internal/sync/broadcast
Authorization: Bearer <service_token>
```

**Request:**

```json
{
  "userIds": ["user_456", "user_789"],
  "message": {
    "type": "notification",
    "data": {
      "title": "System Maintenance",
      "message": "Service will be unavailable for 10 minutes"
    }
  }
}
```

## API Gateway Patterns

### Request Routing

```typescript
// API Gateway routes requests to services
class APIGateway {
  async routeToService(
    service: string,
    path: string,
    options: RequestInit
  ): Promise<Response> {
    const serviceUrl = getServiceUrl(service)
    const token = await generateServiceToken('api', service, ['read', 'write'])

    const response = await fetch(`${serviceUrl}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        'X-Request-ID': crypto.randomUUID(),
        'X-Forwarded-For': options.headers?.['CF-Connecting-IP'],
      },
    })

    // Add tracing headers to response
    const tracedResponse = new Response(response.body, response)
    tracedResponse.headers.set('X-Service', service)
    tracedResponse.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)

    return tracedResponse
  }
}
```

### Service Aggregation

```typescript
// Aggregate data from multiple services
async function getEnrichedScore(scoreId: string): Promise<EnrichedScore> {
  const [scoreData, practiceStats, userNotes] = await Promise.all([
    // Get score from Scores service
    fetch(`${SCORES_URL}/internal/scores/${scoreId}`, {
      headers: { Authorization: `Bearer ${scoresToken}` },
    }).then(r => r.json()),

    // Get practice statistics from API database
    getScorePracticeStats(scoreId),

    // Get user notes from API database
    getUserNotesForScore(scoreId),
  ])

  return {
    ...scoreData,
    statistics: practiceStats,
    userNotes: userNotes,
  }
}
```

## Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private threshold = 5,
    private timeout = 60000,
    private resetTimeout = 30000
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }

    try {
      const result = await fn()
      if (this.state === 'half-open') {
        this.state = 'closed'
        this.failures = 0
      }
      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()

      if (this.failures >= this.threshold) {
        this.state = 'open'
      }

      throw error
    }
  }
}

// Usage
const scoresCircuit = new CircuitBreaker()
const result = await scoresCircuit.call(() =>
  fetch(`${SCORES_URL}/internal/scores/${id}`)
)
```

## Health Checks

### Service Health Endpoint

```typescript
// Standard health check for all services
app.get('/internal/health', async c => {
  const checks = {
    service: c.env.SERVICE_NAME,
    version: c.env.VERSION,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dependencies: {},
  }

  // Check dependencies
  for (const [name, url] of Object.entries(SERVICE_DEPENDENCIES)) {
    try {
      const response = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(5000),
      })
      checks.dependencies[name] = response.ok ? 'healthy' : 'unhealthy'
    } catch {
      checks.dependencies[name] = 'unreachable'
    }
  }

  const isHealthy = Object.values(checks.dependencies).every(
    status => status === 'healthy'
  )

  checks.status = isHealthy ? 'healthy' : 'degraded'

  return c.json(checks, isHealthy ? 200 : 503)
})
```

## Error Handling

### Service Errors

```typescript
class ServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

// Error handling middleware
async function handleServiceError(
  error: unknown,
  service: string
): Promise<Response> {
  if (error instanceof ServiceError) {
    return new Response(
      JSON.stringify({
        error: {
          message: error.message,
          service: error.service,
          details: error.details,
        },
      }),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // Log to monitoring
  console.error(`Service error from ${service}:`, error)

  return new Response('Internal Server Error', { status: 500 })
}
```

## Monitoring & Tracing

### Distributed Tracing

```typescript
// Request tracing across services
interface TraceContext {
  traceId: string
  spanId: string
  parentSpanId?: string
  service: string
  operation: string
  startTime: number
  endTime?: number
  tags: Record<string, any>
}

class Tracer {
  startSpan(operation: string, parentSpan?: TraceContext): TraceContext {
    return {
      traceId: parentSpan?.traceId || crypto.randomUUID(),
      spanId: crypto.randomUUID(),
      parentSpanId: parentSpan?.spanId,
      service: env.SERVICE_NAME,
      operation,
      startTime: Date.now(),
      tags: {},
    }
  }

  endSpan(span: TraceContext) {
    span.endTime = Date.now()
    this.send(span)
  }

  private async send(span: TraceContext) {
    // Send to monitoring service
    await env.ANALYTICS.writeDataPoint({
      blobs: [span.traceId, span.spanId, span.service, span.operation],
      doubles: [span.startTime, span.endTime || 0],
    })
  }
}
```

## Related Documentation

- [REST API](./rest-api.md) - Public API endpoints
- [Authentication](./authentication.md) - Service authentication
- [WebSocket](./websocket.md) - Real-time communication
- [Microservices](../01-architecture/microservices.md) - Service architecture

---

_Last updated: December 2024 | Version 1.7.6_
