# Quick Start Guide

## 🚀 Running Locally

```bash
# Install dependencies
cd scores
npm install

# Run database migrations
npm run db:migrate

# Start development server
npm run dev

# Visit:
# - Homepage: http://localhost:8787
# - Docs: http://localhost:8787/docs
# - Health: http://localhost:8787/health
```

## 📊 Key URLs

### Documentation

- **Interactive Docs**: `/docs` - Stoplight Elements UI
- **Swagger UI**: `/docs/swagger` - Classic Swagger interface
- **RapiDoc**: `/docs/rapidoc` - Modern documentation
- **OpenAPI Spec**: `/api/openapi.json` - Raw specification

### Health & Monitoring

- **Liveness**: `/livez` - Is service alive?
- **Readiness**: `/readyz` - Is service ready?
- **Health**: `/health` - Comprehensive health check
- **Metrics**: `/metrics` - Prometheus metrics

### API Endpoints

- **Scores**: `/api/scores`
- **Search**: `/api/search`
- **Collections**: `/api/collections`
- **Import**: `/api/import/pdf`, `/api/import/imslp`

## 🧪 Testing the API

### Quick Tests

```bash
# Check if service is running
curl http://localhost:8787/livez

# Get health status
curl http://localhost:8787/health

# List scores
curl http://localhost:8787/api/scores

# Search scores
curl "http://localhost:8787/api/search?query=bach"

# View documentation
open http://localhost:8787/docs
```

### Import a PDF

```bash
# Upload a PDF score
curl -X POST http://localhost:8787/api/import/pdf \
  -F "file=@myscore.pdf" \
  -F 'metadata={"title":"Test Score","composer":"Bach"}'
```

### Import from IMSLP

```bash
# Import from IMSLP URL
curl -X POST http://localhost:8787/api/import/imslp \
  -H "Content-Type: application/json" \
  -d '{"url":"https://imslp.org/wiki/..."}'
```

## 🎯 Features at a Glance

### Available Now ✅

- Complete REST API
- Interactive documentation (3 different UIs!)
- Health checks and monitoring
- PDF upload support
- IMSLP import (with Browser Rendering API)
- Search and filtering
- Collections management
- R2 storage integration
- KV caching

### Coming Soon 🚧

- Actual score rendering (VexFlow integration)
- PDF preview generation
- Authentication
- Webhooks
- Client SDKs

## 🔧 Configuration

The service adapts based on available Cloudflare features:

- **Browser Rendering**: Enhanced PDF/IMSLP processing
- **Workers AI**: Future OCR and metadata extraction
- **Queues**: Async processing
- **Durable Objects**: Stateful operations

## 📚 Next Steps

1. **Explore the API**: Visit `/docs` for interactive documentation
2. **Import Some Scores**: Try uploading PDFs or importing from IMSLP
3. **Check Health**: Monitor service status at `/health`
4. **View Metrics**: Track usage at `/metrics`

## 🆘 Troubleshooting

### Service won't start

```bash
# Check if port 8787 is in use
lsof -i :8787

# Kill the process if needed
kill -9 <PID>
```

### Database errors

```bash
# Re-run migrations
npm run db:migrate

# Check database
wrangler d1 execute scores-db --local --command "SELECT * FROM scores"
```

### Can't upload files

- Check file size (max 10MB for Workers)
- Ensure it's a valid PDF
- Check browser console for errors

## 🎉 Ready to Deploy?

```bash
# Deploy to dev environment
npm run deploy:dev

# Deploy to production
npm run deploy
```

Visit your deployed service:

- Dev: https://scores-dev.pezware.workers.dev
- Prod: https://scores.mirubato.com
