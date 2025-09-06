# Microservices Architecture

## Service Overview

Mirubato employs a microservices architecture with five independent services, each responsible for specific domain functionality. All services run as Cloudflare Workers and communicate via HTTP/WebSocket protocols.

## Service Inventory

| Service     | Domain              | Port (Local) | Production URL          | Repository Path |
| ----------- | ------------------- | ------------ | ----------------------- | --------------- |
| Frontend    | User Interface      | 4000         | mirubato.com            | `/frontendv2`   |
| API         | Core Business Logic | 9797         | api.mirubato.com        | `/api`          |
| Scores      | Sheet Music         | 9788         | scores.mirubato.com     | `/scores`       |
| Dictionary  | Music Terms         | 9799         | dictionary.mirubato.com | `/dictionary`   |
| Sync Worker | Real-time Sync      | 9800         | sync.mirubato.com       | `/sync-worker`  |

## Service Details

### 1. Frontend Service

#### Purpose

Serves the React single-page application and static assets.

#### Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Native Fetch API

#### Key Responsibilities

- Serve SPA with client-side routing
- Handle static asset delivery
- Manage service worker for PWA
- Implement offline-first functionality

#### Worker Configuration

```javascript
// frontendv2/src/index.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // Serve static assets
    if (url.pathname.startsWith('/assets/')) {
      return env.ASSETS.fetch(request)
    }

    // SPA routing - always return index.html
    const asset = await env.ASSETS.fetch(
      new Request(url.origin + '/index.html')
    )
    return new Response(asset.body, {
      ...asset,
      headers: {
        ...asset.headers,
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  },
}
```

### 2. API Service

#### Purpose

Core business logic, authentication, and data management.

#### Technology Stack

- **Framework**: Hono
- **Database**: Cloudflare D1
- **Cache**: Cloudflare KV
- **Validation**: Zod
- **Authentication**: JWT

#### Key Responsibilities

- User authentication and authorization
- Logbook entries CRUD operations
- Repertoire management
- Goals tracking
- Data synchronization coordination

#### Core Endpoints

```typescript
// Authentication
POST   /api/auth/login
POST   /api/auth/magic-link
POST   /api/auth/google
GET    /api/auth/verify
POST   /api/auth/refresh
POST   /api/auth/logout

// Logbook
GET    /api/logbook/entries
POST   /api/logbook/entries
PUT    /api/logbook/entries/:id
DELETE /api/logbook/entries/:id
POST   /api/logbook/sync

// Repertoire
GET    /api/repertoire
POST   /api/repertoire
PUT    /api/repertoire/:id
DELETE /api/repertoire/:id

// Goals
GET    /api/goals
POST   /api/goals
PUT    /api/goals/:id
DELETE /api/goals/:id
```

#### Database Schema (Key Tables)

```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  primary_instrument TEXT,
  role TEXT DEFAULT 'user',
  created_at INTEGER,
  updated_at INTEGER
);

-- Logbook Entries
CREATE TABLE logbook_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  type TEXT,
  instrument TEXT,
  pieces TEXT, -- JSON
  mood TEXT,
  notes TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 3. Scores Service

#### Purpose

Sheet music management, PDF processing, and AI-powered metadata extraction.

#### Technology Stack

- **Framework**: Hono
- **Storage**: Cloudflare R2
- **Database**: Cloudflare D1
- **Queue**: Cloudflare Queues
- **AI**: Cloudflare Workers AI

#### Key Responsibilities

- PDF upload and storage
- Multi-page score processing
- AI metadata extraction
- IMSLP integration
- Collections management
- Score search and discovery

#### Core Endpoints

```typescript
// Scores Management
GET    /api/scores
POST   /api/scores/upload
GET    /api/scores/:id
PUT    /api/scores/:id
DELETE /api/scores/:id

// Collections
GET    /api/collections
POST   /api/collections
PUT    /api/collections/:id
DELETE /api/collections/:id

// Import
POST   /api/import/url
POST   /api/import/imslp
GET    /api/import/status/:jobId

// Search
GET    /api/search
GET    /api/composers
```

#### Processing Pipeline

```
Upload → Validation → Queue → AI Processing → Storage → Index
            ↓           ↓          ↓            ↓        ↓
        File Check   Convert   Extract Meta    R2    Search DB
```

### 4. Dictionary Service

#### Purpose

Music terminology definitions with AI-powered content generation.

#### Technology Stack

- **Framework**: Hono
- **Database**: Cloudflare D1
- **AI**: Cloudflare Workers AI
- **Cache**: Cloudflare KV

#### Key Responsibilities

- AI-generated definitions
- Multi-language support (6 languages)
- Semantic search with embeddings
- Quality scoring
- Content curation

#### Core Endpoints

```typescript
// Terms
GET    /api/terms
GET    /api/terms/:term
POST   /api/terms/generate

// Search
GET    /api/search
POST   /api/search/semantic

// Languages
GET    /api/languages
GET    /api/terms/:term/translations

// Analytics
GET    /api/analytics/popular
POST   /api/analytics/track
```

#### Content Generation Flow

```
Request → Cache Check → AI Generation → Quality Score → Store
             ↓              ↓               ↓           ↓
          KV Cache     GPT/Claude      Validation    D1 + Index
```

### 5. Sync Worker Service

#### Purpose

Real-time data synchronization across devices using WebSockets.

#### Technology Stack

- **Framework**: Hono with WebSocket support
- **State**: Cloudflare Durable Objects
- **Database**: Cloudflare D1
- **Protocol**: WebSocket

#### Key Responsibilities

- WebSocket connection management
- Real-time event broadcasting
- Conflict resolution
- Device presence tracking
- Offline queue management

#### WebSocket Protocol

```typescript
// Message Types
interface SyncMessage {
  type: 'SYNC_EVENT' | 'BULK_SYNC' | 'PING' | 'PONG'
  data: {
    event?: {
      type: 'ENTRY_CREATED' | 'ENTRY_UPDATED' | 'ENTRY_DELETED'
      entity: 'logbook' | 'repertoire' | 'goals'
      payload: any
    }
    entries?: any[]
    timestamp: number
  }
}
```

#### Durable Object Implementation

```typescript
export class SyncCoordinator {
  private sessions: Map<string, WebSocket> = new Map()

  async handleWebSocket(ws: WebSocket, userId: string) {
    ws.accept()
    this.sessions.set(userId, ws)

    ws.addEventListener('message', async event => {
      const message = JSON.parse(event.data)
      await this.handleSyncMessage(message, userId)
      this.broadcast(message, userId)
    })

    ws.addEventListener('close', () => {
      this.sessions.delete(userId)
    })
  }

  broadcast(message: any, excludeUserId?: string) {
    this.sessions.forEach((ws, userId) => {
      if (userId !== excludeUserId) {
        ws.send(JSON.stringify(message))
      }
    })
  }
}
```

## Inter-Service Communication

### Authentication Flow

All inter-service communication uses JWT tokens for authentication:

```typescript
// Service-to-service call
const response = await fetch(`${env.SCORES_URL}/api/internal/score/${id}`, {
  headers: {
    Authorization: `Bearer ${serviceToken}`,
    'X-Service': 'api',
    'X-Request-ID': crypto.randomUUID(),
  },
})
```

### Service Discovery

Services discover each other through environment variables:

```typescript
interface ServiceUrls {
  API_URL: string // api.mirubato.com
  SCORES_URL: string // scores.mirubato.com
  DICTIONARY_URL: string // dictionary.mirubato.com
  SYNC_URL: string // sync.mirubato.com
}
```

### Communication Patterns

#### 1. Synchronous HTTP

Used for real-time queries and immediate responses:

```typescript
// API calling Scores service
const scoreData = await fetch(`${SCORES_URL}/api/score/${id}`)
```

#### 2. Asynchronous Queue

Used for heavy processing tasks:

```typescript
// API queuing PDF processing
await env.PDF_QUEUE.send({
  scoreId,
  operation: 'extract-metadata',
})
```

#### 3. WebSocket (Real-time)

Used for live synchronization:

```typescript
// Client connecting to Sync Worker
const ws = new WebSocket('wss://sync.mirubato.com')
ws.onmessage = event => {
  const update = JSON.parse(event.data)
  applyUpdate(update)
}
```

## Service Health & Monitoring

### Health Check Endpoints

Every service implements standard health checks:

```typescript
// GET /health
{
  "service": "api",
  "version": "1.7.6",
  "status": "healthy",
  "timestamp": "2024-12-01T00:00:00Z",
  "checks": {
    "database": "healthy",
    "cache": "healthy",
    "dependencies": {
      "scores": "healthy",
      "dictionary": "healthy"
    }
  }
}
```

### Monitoring Strategy

- **Uptime Monitoring**: Cloudflare Analytics
- **Error Tracking**: Structured logging with JSON
- **Performance Metrics**: Custom analytics engine
- **Distributed Tracing**: Request ID propagation

## Deployment Strategy

### Independent Deployment

Each service can be deployed independently:

```bash
cd api && wrangler deploy --env production
cd scores && wrangler deploy --env production
cd dictionary && wrangler deploy --env production
cd sync-worker && wrangler deploy --env production
cd frontendv2 && wrangler deploy --env production
```

### Version Management

Services maintain backward compatibility:

```typescript
// API versioning
app.route('/v1', v1Routes) // Legacy
app.route('/v2', v2Routes) // Current
```

### Rollback Strategy

```bash
# Instant rollback to previous version
wrangler rollback --env production
```

## Scaling Characteristics

### Horizontal Scaling

- Automatic scaling by Cloudflare
- No configuration required
- Scales to millions of requests

### Service-Specific Scaling

- **API**: CPU-bound, scales with user requests
- **Scores**: I/O-bound, scales with R2 throughput
- **Dictionary**: Cache-heavy, scales with KV performance
- **Sync Worker**: Connection-bound, scales with Durable Objects

## Security Considerations

### Service Isolation

- Each service has its own database/storage
- Services cannot access each other's data directly
- Communication only through defined APIs

### Authentication

- JWT tokens for user authentication
- Service tokens for inter-service communication
- Rate limiting per service

### Data Protection

- Encryption in transit (HTTPS/WSS)
- Encryption at rest (R2, D1)
- User data isolation

## Related Documentation

- [System Overview](./overview.md) - High-level architecture
- [Cloudflare Services](./cloudflare-services.md) - Platform services
- [API Specification](../03-api/rest-api.md) - Detailed API docs
- [WebSocket Protocol](../03-api/websocket.md) - Real-time sync protocol

---

_Last updated: December 2024 | Version 1.7.6_
