# Music Dictionary Service Architecture

## Overview

The Music Dictionary Service is a high-performance, AI-powered microservice that provides comprehensive musical term definitions and educational content. Built on Cloudflare Workers, it leverages edge computing for global low-latency access while integrating multiple AI providers for content generation and enhancement.

## Architecture Principles

1. **Edge-First**: Runs on Cloudflare Workers for global distribution
2. **AI-Powered**: Integrates multiple AI providers with fallback chains
3. **Quality-Focused**: Every definition has quality scoring and enhancement capabilities
4. **Cache-Optimized**: Multi-layer caching for performance
5. **Type-Safe**: Full TypeScript with Zod validation
6. **Observable**: Comprehensive health checks and metrics

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                              │
│            (Web App, Mobile App, API Consumers)              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare Edge                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Dictionary Service Worker                │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │    │
│  │  │   Routes    │  │  Middleware  │  │  Handlers  │  │    │
│  │  │             │  │              │  │            │  │    │
│  │  │ • Health    │  │ • Auth       │  │ • Terms    │  │    │
│  │  │ • Docs      │  │ • Rate Limit │  │ • Search   │  │    │
│  │  │ • API v1    │  │ • Cache      │  │ • Batch    │  │    │
│  │  │             │  │ • Logging    │  │ • Enhance  │  │    │
│  │  │             │  │ • CORS       │  │ • Export   │  │    │
│  │  │             │  │ • Request ID │  │ • Admin    │  │    │
│  │  └─────────────┘  └──────────────┘  └────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┬─────────────────┐
        │                 │                 │                 │
        ▼                 ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   D1 Database │ │  KV Namespace │ │   R2 Bucket   │ │ AI Providers  │
│               │ │               │ │               │ │               │
│ • Dictionary  │ │ • Cache       │ │ • Exports     │ │ • Cloudflare  │
│   entries     │ │ • Rate limits │ │ • Backups     │ │ • OpenAI      │
│ • Analytics   │ │ • Sessions    │ │ • Reports     │ │ • Anthropic   │
│ • Feedback    │ │               │ │               │ │ • Google      │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```

## Core Components

### 1. Application Entry Points

#### `src/index.ts` - Worker Entry Point

- Exports fetch, queue, and scheduled handlers
- Minimal logic, delegates to app.ts
- Handles Cloudflare Worker lifecycle

#### `src/app.ts` - Application Configuration

- Hono app initialization
- Global middleware setup
- Route mounting
- Error handling configuration

### 2. Routing Layer (`src/routes/`)

- **health.ts**: Health check endpoints (/health, /livez, /readyz, /metrics)
- **docs.ts**: OpenAPI documentation and Swagger UI
- **dictionary.ts**: Main API routes with version prefixing

### 3. Middleware Stack (`src/middleware/`)

#### Authentication (`auth.ts`)

- JWT validation with shared secret
- Multiple auth providers (Google, API keys)
- Role-based access control
- User context injection

#### Rate Limiting (`rate-limit.ts`)

- Tiered limits (anonymous, authenticated, premium)
- Sliding window algorithm
- KV-based distributed counting
- Configurable per-endpoint limits

#### Caching (`cache.ts`)

- KV-based response caching
- Edge cache headers
- Conditional request support (ETags)
- Cache invalidation patterns

#### Request Tracking

- **request-id.ts**: UUID generation and propagation
- **logging.ts**: Structured logging with context

### 4. API Handlers (`src/api/handlers/`)

#### Terms Handler

- Single term lookup with AI generation fallback
- Quality enhancement triggers
- Related term discovery
- Feedback collection

#### Search Handler

- Full-text search with filters
- Semantic search using AI embeddings
- Relevance scoring
- Search analytics tracking

#### Batch Handler

- Bulk term queries (up to 50)
- Efficient caching strategies
- Parallel processing
- Missing term generation

#### Enhancement Handler

- AI-powered quality improvement
- Multi-provider orchestration
- Quality score tracking
- Version management

### 5. Services Layer (`src/services/`)

#### Storage Services

- **DictionaryDatabase**: D1 queries with type safety
- **CacheService**: KV operations with TTL management
- **ExportService**: R2 storage for bulk exports

#### AI Services

- **DictionaryGenerator**: Multi-provider AI orchestration
- **QualityAnalyzer**: Definition scoring algorithms
- **EmbeddingService**: Semantic search vectors

### 6. Data Models (`src/types/`)

```typescript
interface DictionaryEntry {
  id: string
  term: string
  normalized_term: string
  type: TermType
  definition: {
    concise: string
    detailed: string
    etymology?: string
    pronunciation?: Pronunciation
    usage_example?: string
  }
  metadata: {
    instruments?: string[]
    difficulty_level?: string
    historical_period?: string
    cultural_origin?: string
  }
  references: References
  ai_metadata: AIMetadata
  quality_score: QualityScore
  created_at: string
  updated_at: string
  version: number
}
```

## Data Flow

### 1. Read Path (Term Lookup)

```
Client Request → Rate Limit Check → Cache Check (KV)
    → Database Query → AI Generation (if missing)
    → Quality Check → Cache Write → Response
```

### 2. Write Path (Enhancement)

```
Auth Check → Term Validation → AI Enhancement
    → Quality Analysis → Database Update
    → Cache Invalidation → Analytics Update
```

### 3. Search Path

```
Query Parse → Cache Check → Full-text Search
    → Semantic Embedding → Result Merge
    → Relevance Scoring → Analytics → Response
```

## Caching Strategy

### Multi-Layer Caching

1. **Browser Cache**: Cache-Control headers (5min - 1hr)
2. **Edge Cache**: Cloudflare CDN (1hr - 24hr)
3. **KV Cache**: Application-level (5min - 1hr)
4. **Database Cache**: D1 query caching

### Cache Keys

- Terms: `term:{normalized_term}:{type?}`
- Search: `search:{query_hash}:{filters}`
- User-specific: `user:{id}:term:{term}`

### Invalidation

- Term updates invalidate related caches
- Search caches expire on TTL
- Manual invalidation via admin endpoints

## AI Integration

### Provider Chain

1. **Cloudflare AI** (Primary - fastest, cheapest)
2. **OpenAI GPT-4** (High quality fallback)
3. **Anthropic Claude** (Alternative perspective)
4. **Google Gemini** (Backup option)

### Generation Pipeline

```
Term Input → Prompt Engineering → AI Generation
    → Response Validation → Quality Scoring
    → Reference Extraction → Storage
```

### Quality Scoring

- **Accuracy**: Technical correctness (0-1)
- **Completeness**: Coverage of aspects (0-1)
- **Clarity**: Readability and structure (0-1)
- **References**: Source quality (0-1)
- **Overall**: Weighted average

## Security

### Authentication

- JWT tokens with HS256 signing
- Shared secret across services
- Token expiration and refresh
- API key support for services

### Authorization

- Role-based access (user, premium, admin)
- Endpoint-level permissions
- Resource-level checks

### Data Protection

- Input validation with Zod schemas
- SQL injection prevention
- XSS protection in responses
- Rate limiting for abuse prevention

## Performance Optimizations

### Edge Computing

- Global distribution via Cloudflare network
- <50ms latency worldwide
- Automatic geographic routing

### Database Optimization

- Indexed columns for common queries
- Normalized term storage
- Batch query support
- Connection pooling via D1

### Response Optimization

- Gzip compression
- Minimal JSON payloads
- Pagination for large results
- Field filtering support

## Monitoring & Observability

### Health Checks

- **/health**: Comprehensive service health
- **/livez**: Simple liveness check
- **/readyz**: Readiness with dependency checks
- **/metrics**: Prometheus-compatible metrics

### Metrics Collection

```
# Request metrics
http_requests_total{method,path,status}
http_request_duration_seconds{method,path}

# Business metrics
dictionary_lookups_total{term_type,found}
ai_generations_total{provider,success}
cache_hits_total{cache_type}

# Resource metrics
database_queries_total{operation}
kv_operations_total{operation}
```

### Error Tracking

- Structured error logging
- Request ID correlation
- Stack trace capture
- User context preservation

## Development Workflow

### Local Development

```bash
npm install
npm run dev  # Starts wrangler dev server
```

### Testing

```bash
npm test           # Unit tests
npm run test:e2e   # Integration tests
```

### Deployment

```bash
# Staging
wrangler deploy --env staging

# Production
wrangler deploy --env production
```

## Configuration

### Environment Variables

- `ENVIRONMENT`: production, staging, development
- `QUALITY_THRESHOLD`: Minimum quality score (0.7)
- `CACHE_TTL`: Default cache duration (300s)
- `LOG_LEVEL`: error, warn, info, debug
- `CORS_ORIGIN`: Comma-separated allowed origins

### Secrets (via wrangler secret)

- `JWT_SECRET`: Shared authentication secret
- `OPENAI_API_KEY`: OpenAI API access
- `ANTHROPIC_API_KEY`: Anthropic API access
- `GOOGLE_API_KEY`: Google AI API access

## Future Enhancements

### Planned Features

1. **Multi-language Support**: Translations for definitions
2. **Audio Pronunciations**: TTS integration
3. **Visual Examples**: Image/diagram storage in R2
4. **Collaborative Editing**: User-contributed definitions
5. **Advanced Analytics**: ML-based usage insights

### Scaling Considerations

- Durable Objects for real-time features
- Queue processing for batch operations
- Multi-region database replication
- GraphQL API layer (optional)

## Dependencies

### Core Framework

- **Hono**: Lightweight web framework
- **TypeScript**: Type safety
- **Zod**: Runtime validation

### Cloudflare Services

- **Workers**: Edge compute runtime
- **D1**: Serverless SQL database
- **KV**: Key-value storage
- **R2**: Object storage
- **AI**: LLM inference

### Development Tools

- **Wrangler**: Cloudflare CLI
- **Vitest**: Testing framework
- **TSX**: TypeScript execution

## Migration Path

When migrating from the current dictionary implementation:

1. **Database Migration**: Use provided scripts to migrate schema
2. **Data Import**: Bulk import existing definitions
3. **Cache Warmup**: Pre-populate common terms
4. **Gradual Rollout**: Use canary deployments
5. **Monitoring**: Track error rates and performance

---

This architecture provides a scalable, maintainable, and performant foundation for the Music Dictionary Service, ready for production deployment on Cloudflare's edge infrastructure.
