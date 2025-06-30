# Scores Service - Working Endpoints Summary

## 🎉 All Systems Operational!

The Scores Service is now fully functional with documentation and health monitoring.

## Available Endpoints

### 📚 Documentation

- **Homepage**: http://localhost:8787
- **Interactive Docs**: http://localhost:8787/docs
- **Swagger UI**: http://localhost:8787/docs/swagger
- **RapiDoc**: http://localhost:8787/docs/rapidoc
- **OpenAPI Spec**: http://localhost:8787/api/openapi.json

### 🏥 Health & Monitoring

- **Liveness**: http://localhost:8787/livez

  ```json
  { "status": "ok", "timestamp": "2025-06-21T15:50:51.547Z" }
  ```

- **Health Check**: http://localhost:8787/health

  ```json
  {
    "status": "healthy",
    "service": "mirubato-scores",
    "environment": "local",
    "checks": {
      "database": { "status": "ok", "message": "6 scores in database" },
      "storage": { "status": "ok", "message": "R2 bucket accessible" },
      "cache": { "status": "ok", "message": "KV cache operational" }
    }
  }
  ```

- **Metrics**: http://localhost:8787/metrics
  ```
  # TYPE scores_total gauge
  scores_total 6
  collections_total 7
  ```

### 🎼 API Endpoints

#### Scores

- `GET /api/scores` - List all scores
- `GET /api/scores/:id` - Get single score
- `POST /api/scores` - Create score
- `PUT /api/scores/:id` - Update score
- `DELETE /api/scores/:id` - Delete score

#### Search

- `GET /api/search?query=bach` - Search scores
- `GET /api/search/popular` - Popular scores
- `GET /api/search/recent` - Recent scores

#### Collections

- `GET /api/collections` - List collections
- `GET /api/collections/:slug` - Get collection

#### Import

- `POST /api/import/pdf` - Upload PDF
- `POST /api/import/imslp` - Import from IMSLP

## Sample Data

The service comes pre-loaded with 6 classical pieces:

- Bach: Invention No. 1, Minuet in G
- Mozart: Piano Sonata No. 16
- Chopin: Prelude Op. 28 No. 4
- Sor: Study No. 1
- Tárrega: Lágrima

And 7 curated collections:

- Piano for Beginners
- Classical Piano Essentials
- Guitar First Steps
- Monthly Staff Picks

## Quick Tests

```bash
# Check health
curl http://localhost:8787/health | jq

# List scores
curl http://localhost:8787/api/scores | jq

# Search for Bach
curl "http://localhost:8787/api/search?query=bach" | jq

# Get collections
curl http://localhost:8787/api/collections | jq

# View metrics
curl http://localhost:8787/metrics
```

## Features Working

✅ Complete REST API  
✅ Interactive documentation (3 UIs!)  
✅ Health checks and monitoring  
✅ Prometheus metrics  
✅ Database with sample data  
✅ Search and filtering  
✅ Collections management  
✅ CORS properly configured  
✅ Error handling

## Next Steps

1. **Deploy to Cloudflare**: `npm run deploy:dev`
2. **Add real scores**: Upload PDFs or import from IMSLP
3. **Implement rendering**: Add VexFlow for score display
4. **Enable advanced features**: Browser Rendering, Queues, etc.

The service is production-ready for basic score management!
