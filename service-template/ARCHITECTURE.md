# Service Architecture

This document outlines the architectural patterns and decisions for this Mirubato microservice.

## Core Architecture Principles

### 1. Edge-First Design

- Runs on Cloudflare Workers globally
- Sub-100ms response times
- Automatic scaling and distribution
- No cold starts

### 2. Microservice Pattern

- Single responsibility principle
- Independent deployment
- Own database and storage
- Communicates via REST APIs

### 3. Security by Design

- JWT authentication with shared secret
- Rate limiting on all endpoints
- Input validation with Zod
- CORS protection

### 4. Performance Optimization

- Multi-layer caching (Edge, KV)
- Efficient database queries
- Async processing for heavy tasks
- Optimized bundle size

## Technical Stack

| Layer      | Technology         | Purpose                    |
| ---------- | ------------------ | -------------------------- |
| Runtime    | Cloudflare Workers | Edge computing platform    |
| Framework  | Hono               | Lightweight web framework  |
| Database   | D1 (SQLite)        | Edge SQL database          |
| Storage    | R2                 | Object storage (if needed) |
| Cache      | KV                 | Key-value cache            |
| Queue      | Queues             | Async job processing       |
| Auth       | JWT (jose)         | Token-based auth           |
| Validation | Zod                | Schema validation          |
| ORM        | Drizzle            | Type-safe database queries |

## Request Flow

```
Client Request
    ↓
Cloudflare Edge
    ↓
CORS Check
    ↓
Rate Limiting
    ↓
JWT Validation (if protected)
    ↓
Input Validation
    ↓
Business Logic
    ↓
Database/Cache
    ↓
Response (with cache headers)
```

## Database Design

### Principles

- Normalized schema for consistency
- Denormalized views for performance
- JSON columns for flexible metadata
- Proper indexes on query patterns

### Migration Strategy

1. Backward compatible changes only
2. Test migrations in staging first
3. Always backup before production migration
4. Use transactions for data integrity

## Caching Strategy

### Cache Layers

1. **Browser Cache**: Static assets, public data
2. **Edge Cache**: API responses via Cache API
3. **KV Cache**: Application-level caching
4. **Database Cache**: Query result caching

### Cache Invalidation

- Time-based expiration (TTL)
- Event-based invalidation
- Manual purge via API

## Error Handling

### Error Types

1. **Validation Errors** (400): Invalid input
2. **Authentication Errors** (401): Missing/invalid token
3. **Authorization Errors** (403): Insufficient permissions
4. **Not Found Errors** (404): Resource doesn't exist
5. **Rate Limit Errors** (429): Too many requests
6. **Server Errors** (500): Unexpected errors

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {} // Optional additional context
}
```

## Monitoring & Observability

### Health Checks

- `/livez`: Liveness probe
- `/readyz`: Readiness probe
- `/health`: Comprehensive health
- `/metrics`: Prometheus metrics

### Logging

- Structured JSON logs
- Request/response logging
- Error tracking
- Performance metrics

### Metrics

- Request count
- Response times
- Error rates
- Cache hit rates
- Database query times

## Security Considerations

### Authentication

- JWT tokens with short expiration
- Shared secret across services
- Token refresh mechanism

### Authorization

- Role-based access control
- Resource-level permissions
- User isolation

### Data Protection

- Input sanitization
- SQL injection prevention
- XSS protection
- Sensitive data encryption

## Deployment

### Environments

1. **Local**: Development with wrangler dev
2. **Development**: Shared development environment
3. **Staging**: Production-like testing
4. **Production**: Live environment

### CI/CD Pipeline

1. Code push to GitHub
2. Run tests and linting
3. Build and validate
4. Deploy to staging
5. Run smoke tests
6. Deploy to production
7. Monitor metrics

## Best Practices

### Code Organization

- Separation of concerns
- Single responsibility
- Dependency injection
- Testable design

### Performance

- Minimize bundle size
- Optimize database queries
- Use appropriate cache TTLs
- Implement pagination

### Reliability

- Graceful error handling
- Circuit breakers
- Retry logic
- Timeout handling

### Maintainability

- Clear documentation
- Consistent coding style
- Comprehensive tests
- Regular refactoring
