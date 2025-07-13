# Mirubato Music Dictionary Service

AI-powered music terminology dictionary service built on Cloudflare Workers.

## Overview

The Music Dictionary Service provides comprehensive access to musical terms, definitions, and educational content. It uses AI models (primarily Cloudflare Workers AI) to generate, enhance, and validate content quality.

## Features

- **AI-Powered Definitions**: Generate and enhance definitions using Cloudflare Workers AI
- **Quality Scoring**: Every entry has a multi-dimensional quality score
- **Smart Search**: Full-text and semantic search capabilities
- **Batch Operations**: Query multiple terms efficiently
- **Progressive Enhancement**: Continuous improvement of low-quality entries
- **Multi-layer Caching**: KV cache, edge cache, and conditional requests

## Local Development

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
# Service will be available at http://localhost:9799
```

## Database Setup

```bash
# Local database
npm run db:migrate

# Staging database
npm run db:migrate:staging

# Production database (requires confirmation)
npm run db:migrate:production
```

## API Endpoints

### Health & Monitoring
- `GET /health` - Comprehensive health check
- `GET /livez` - Liveness probe
- `GET /readyz` - Readiness probe
- `GET /metrics` - Prometheus metrics
- `GET /health/detailed` - Extended health information

### Documentation
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /docs/openapi.json` - OpenAPI specification

### Dictionary Operations
- `GET /api/v1/terms/:term` - Get definition by term
- `GET /api/v1/terms/id/:id` - Get definition by ID
- `POST /api/v1/terms/:id/feedback` - Submit feedback
- `GET /api/v1/search` - Search dictionary entries
- `POST /api/v1/search/semantic` - Semantic search using embeddings
- `POST /api/v1/batch/query` - Query multiple terms

### Authentication

Most endpoints are public. Protected endpoints require a JWT bearer token from the Mirubato authentication service.

```bash
# Example authenticated request
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://dictionary.mirubato.com/api/v1/enhance
```

## Environment Variables

```toml
# wrangler.toml
[env.production]
name = "mirubato-dictionary"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# D1 Database
[[env.production.d1_databases]]
binding = "DB"
database_name = "mirubato-dictionary-prod"
database_id = "your-database-id"

# KV Namespace for caching
[[env.production.kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

# R2 Bucket for storage
[[env.production.r2_buckets]]
binding = "STORAGE"
bucket_name = "mirubato-dictionary-storage"

# AI Binding
[env.production.ai]
binding = "AI"

# Secrets (set via wrangler secret put)
# JWT_SECRET - Shared secret with API service
# OPENAI_API_KEY - Optional OpenAI fallback
# ANTHROPIC_API_KEY - Optional Anthropic fallback
```

## Deployment

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## Architecture

### AI Pipeline
1. **Generation**: Llama 3.1 8B for comprehensive definitions
2. **Validation**: Mistral 7B for quality scoring
3. **Enhancement**: Weekly batch jobs to improve low-quality entries
4. **Embeddings**: BGE models for semantic search

### Storage Layers
1. **D1 Database**: Primary storage for dictionary entries
2. **KV Cache**: Fast access cache with TTL
3. **R2 Storage**: Future expansion for multimedia content
4. **Edge Cache**: CDN-level caching for public content

### Quality System
- **Accuracy**: Factual correctness (AI validated)
- **Completeness**: Coverage of definition aspects
- **Clarity**: Readability and educational value
- **References**: External resource quality
- **Overall**: Weighted average score

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Rate Limiting

- Anonymous users: 60 requests/minute
- Authenticated users: 120 requests/minute
- Premium users: 600 requests/minute
- Batch operations: Lower limits apply

## License

MIT License - See LICENSE file for details