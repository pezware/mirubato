# Mirubato Service Template

This template provides a standardized structure for creating new Cloudflare Workers-based services that align with the Mirubato architecture.

## Quick Start

1. Copy this template to create a new service:

   ```bash
   cp -r service-template my-new-service
   cd my-new-service
   ```

2. Update the service name in:
   - `package.json` - Update name and description
   - `wrangler.toml` - Update service name and routes
   - `.env.example` - Add service-specific variables

3. Install dependencies:

   ```bash
   npm install
   ```

4. Set up your development database:

   ```bash
   npm run db:generate     # Generate migrations
   npm run db:migrate      # Run migrations locally
   ```

5. Start development:
   ```bash
   npm run dev
   ```

## Architecture Overview

This template follows the Mirubato microservices architecture:

- **Runtime**: Cloudflare Workers (edge computing)
- **Framework**: Hono (lightweight, fast)
- **Database**: D1 (SQLite at the edge)
- **Storage**: R2 (when needed)
- **Cache**: KV namespace
- **Auth**: JWT with shared secret
- **Validation**: Zod schemas

## Key Features

- ✅ Multi-environment configuration (local, development, staging, production)
- ✅ JWT authentication middleware
- ✅ Rate limiting middleware
- ✅ CORS handling
- ✅ Health check endpoints (/health, /livez, /readyz, /metrics)
- ✅ OpenAPI documentation at /docs
- ✅ Comprehensive error handling
- ✅ Request/response logging
- ✅ Database migrations
- ✅ TypeScript with strict mode
- ✅ Testing setup with Vitest
- ✅ Multi-layer caching strategy

## Directory Structure

```
my-new-service/
├── src/
│   ├── index.ts           # Main entry point
│   ├── app.ts             # Hono app configuration
│   ├── types.ts           # TypeScript types and interfaces
│   ├── middleware/        # Custom middleware
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic
│   ├── utils/             # Utility functions
│   └── db/                # Database schemas and queries
├── migrations/            # D1 database migrations
├── tests/                 # Test files
├── wrangler.toml         # Cloudflare configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── vitest.config.ts      # Test configuration
```

## Configuration

### Environment Variables

Configure secrets using Wrangler:

```bash
# Set JWT secret (must match other services)
wrangler secret put JWT_SECRET --env production

# Set service-specific secrets
wrangler secret put API_KEY --env production
```

### Database Setup

1. Create D1 databases for each environment:

   ```bash
   wrangler d1 create my-service-dev
   wrangler d1 create my-service-staging
   wrangler d1 create my-service-prod
   ```

2. Update database IDs in `wrangler.toml`

3. Run migrations:
   ```bash
   npm run db:migrate:dev
   npm run db:migrate:staging
   npm run db:migrate:production
   ```

## Development

### Available Scripts

- `npm run dev` - Start local development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run format` - Format code with Prettier
- `npm run lint` - Lint code with ESLint
- `npm run type-check` - Check TypeScript types

### Adding New Routes

1. Create a new handler in `src/routes/`
2. Define Zod schemas for validation
3. Register routes in `src/app.ts`
4. Add tests in `tests/`

### Testing

Write tests using Vitest:

```typescript
import { describe, it, expect } from 'vitest'
import { app } from '../src/app'

describe('API', () => {
  it('should return health status', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
  })
})
```

## Deployment

### Staging Deployment

```bash
npm run deploy:staging
```

### Production Deployment

```bash
npm run deploy:production
```

## Monitoring

- Health check: `https://your-service.domain/health`
- Metrics: `https://your-service.domain/metrics`
- Logs: Available in Cloudflare dashboard

## Security

- Always use JWT authentication for protected endpoints
- Implement rate limiting for public endpoints
- Validate all inputs with Zod schemas
- Use CORS middleware with specific origins
- Never expose secrets in responses

## Best Practices

1. **Keep services focused** - One service, one responsibility
2. **Use queues for heavy processing** - Avoid timeout issues
3. **Implement comprehensive error handling** - User-friendly errors
4. **Add metrics and monitoring** - Know what's happening
5. **Document your API** - Keep OpenAPI spec updated
6. **Test everything** - Aim for >80% coverage
7. **Use caching wisely** - Reduce latency and costs
