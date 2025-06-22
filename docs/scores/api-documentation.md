# Mirubato Scores API Documentation

## Overview

The Mirubato Scores Service provides comprehensive API documentation using multiple documentation tools:

1. **Stoplight Elements** - Primary documentation at `/docs`
2. **Swagger UI** - Alternative at `/docs/swagger`
3. **RapiDoc** - Modern UI at `/docs/rapidoc`
4. **OpenAPI Spec** - Raw spec at `/api/openapi.json`

## Accessing Documentation

### Production

- Main Docs: https://scores.mirubato.com/docs
- Health Check: https://scores.mirubato.com/livez
- Metrics: https://scores.mirubato.com/metrics

### Local Development

```bash
cd scores
npm run dev
# Visit http://localhost:8787/docs
```

## Health Endpoints

### Liveness Probe (`/livez`)

Simple check to verify the service is alive:

```bash
curl https://scores.mirubato.com/livez
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Readiness Probe (`/readyz`)

Checks if service is ready to handle requests:

```bash
curl https://scores.mirubato.com/readyz
```

Response:

```json
{
  "ready": true,
  "checks": {
    "database": { "status": "ok", "latency": 5 },
    "storage": { "status": "ok", "latency": 12 },
    "cache": { "status": "ok", "latency": 2 }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Health Check (`/health`)

Comprehensive health status with all dependencies:

```bash
curl https://scores.mirubato.com/health
```

Response:

```json
{
  "status": "healthy",
  "service": "mirubato-scores",
  "environment": "production",
  "timestamp": "2024-01-01T00:00:00Z",
  "checks": {
    "database": {
      "status": "ok",
      "latency": 5,
      "message": "42 scores in database"
    },
    "storage": {
      "status": "ok",
      "latency": 12,
      "message": "R2 bucket accessible"
    },
    "cache": {
      "status": "ok",
      "latency": 2,
      "message": "KV cache operational"
    },
    "browserRendering": {
      "status": "ok",
      "message": "Browser Rendering API available"
    },
    "workersAI": {
      "status": "ok",
      "message": "Workers AI available"
    },
    "queue": {
      "status": "ok",
      "message": "Queue service available"
    }
  },
  "version": "1.0.0"
}
```

### Metrics (`/metrics`)

Prometheus-compatible metrics:

```bash
curl https://scores.mirubato.com/metrics
```

Response:

```
# HELP scores_total Total number of scores
# TYPE scores_total gauge
scores_total 42

# HELP collections_total Total number of collections
# TYPE collections_total gauge
collections_total 7

# HELP score_views_total Total number of score views
# TYPE score_views_total counter
score_views_total 1337
```

## Documentation Features

### Stoplight Elements (`/docs`)

- **Interactive API Explorer**: Try API calls directly from the docs
- **Schema Visualization**: See request/response schemas
- **Code Examples**: Generated code snippets for multiple languages
- **Search**: Full-text search across endpoints
- **Dark Mode**: Toggle between light and dark themes

### Swagger UI (`/docs/swagger`)

- Classic Swagger interface
- Try-it-out functionality
- Model definitions
- Authentication support (when implemented)

### RapiDoc (`/docs/rapidoc`)

- Modern, fast documentation
- Advanced search and filtering
- Request/response examples
- API playground

## OpenAPI Specification

The complete OpenAPI 3.1.0 specification is available at:

- JSON: `/api/openapi.json`
- YAML: Coming soon

You can use this spec to:

- Generate client SDKs
- Import into Postman/Insomnia
- Set up API testing
- Generate documentation

## Using the Documentation

### Making API Calls

1. **From Documentation UI**:

   - Navigate to an endpoint
   - Click "Try it out"
   - Fill in parameters
   - Click "Execute"
   - View the response

2. **Using cURL**:

   ```bash
   # List scores
   curl https://scores.mirubato.com/api/scores

   # Search scores
   curl "https://scores.mirubato.com/api/search?query=bach&instrument=PIANO"

   # Get specific score
   curl https://scores.mirubato.com/api/scores/score_bach_invention_1
   ```

3. **Using JavaScript**:

   ```javascript
   // List scores
   const response = await fetch('https://scores.mirubato.com/api/scores')
   const data = await response.json()

   // Upload PDF
   const formData = new FormData()
   formData.append('file', pdfFile)
   formData.append(
     'metadata',
     JSON.stringify({
       title: 'My Score',
       composer: 'Bach',
     })
   )

   const upload = await fetch('https://scores.mirubato.com/api/import/pdf', {
     method: 'POST',
     body: formData,
   })
   ```

## API Authentication

Currently, the API is public for read operations. Future versions will implement:

- API keys for write operations
- OAuth 2.0 for user-specific data
- Rate limiting per API key

## Rate Limiting

- **Anonymous**: 100 requests/minute per IP
- **Authenticated**: Higher limits (coming soon)
- **429 Response**: When rate limit exceeded

## CORS Policy

The API supports CORS for:

- `https://*.mirubato.com`
- `http://localhost:*`
- Specific allowed origins

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "code": 404
}
```

Common error codes:

- `400`: Bad Request - Invalid parameters
- `404`: Not Found - Resource doesn't exist
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error
- `503`: Service Unavailable - Health check failed

## Webhook Support

Coming soon:

- Score processing complete
- Import status updates
- Collection changes

## SDK Support

Client SDKs are planned for:

- JavaScript/TypeScript
- Python
- Go
- Ruby

## Getting Help

- **Documentation Issues**: Open issue on GitHub
- **API Support**: support@mirubato.com
- **Status Page**: https://status.mirubato.com
