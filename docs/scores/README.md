# Mirubato Scores Service

A standalone Cloudflare Worker service for managing sheet music scores, including storage, processing, and delivery.

## Overview

The Scores Service provides:

- Score metadata management with D1 database
- Binary file storage with R2
- PDF upload and processing
- IMSLP integration (planned)
- Score rendering API
- Curated collections
- Search and filtering

## Architecture

- **Runtime**: Cloudflare Workers
- **Database**: D1 (SQLite)
- **Storage**: R2 for PDFs and rendered scores
- **Cache**: KV for API responses
- **API**: RESTful with JSON responses

## Getting Started

### Installation

```bash
cd scores
npm install
```

### Local Development

```bash
# Run database migrations locally
npm run db:migrate

# Start development server
npm run dev
```

The service will be available at `http://localhost:8787`

### Deployment

```bash
# Deploy to development
npm run deploy:dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy
```

## API Endpoints

### Scores

- `GET /api/scores` - List all scores with pagination and filtering
- `GET /api/scores/:id` - Get a single score by ID
- `POST /api/scores` - Create a new score entry
- `PUT /api/scores/:id` - Update a score
- `DELETE /api/scores/:id` - Delete a score

### Search

- `GET /api/search` - Advanced search with filters
- `GET /api/search/popular` - Get popular scores
- `GET /api/search/recent` - Get recently added scores

### Rendering

- `GET /api/scores/:id/render` - Render score in various formats
- `GET /api/scores/:id/download/:format` - Download score file

### Import

- `POST /api/import/pdf` - Import score from PDF upload
- `POST /api/import/imslp` - Import score from IMSLP URL

### Collections

- `GET /api/collections` - List all collections
- `GET /api/collections/:slug` - Get collection with scores
- `POST /api/collections` - Create a new collection
- `PUT /api/collections/:id` - Update a collection
- `DELETE /api/collections/:id` - Delete a collection

## Data Models

### Score

```typescript
{
  id: string
  title: string
  composer: string
  opus?: string
  movement?: string
  instrument: 'PIANO' | 'GUITAR' | 'BOTH'
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  difficultyLevel?: number // 1-10
  gradeLevel?: string
  stylePeriod?: 'BAROQUE' | 'CLASSICAL' | 'ROMANTIC' | 'MODERN' | 'CONTEMPORARY'
  tags: string[]
  metadata?: object
}
```

### Collection

```typescript
{
  id: string
  name: string
  slug: string
  description?: string
  instrument?: Instrument
  difficulty?: Difficulty
  scoreIds: string[]
  isFeatured: boolean
}
```

## Development

### Adding New Endpoints

1. Create handler in `src/api/handlers/`
2. Add route in `src/api/routes.ts`
3. Update types in `src/types/`

### Database Migrations

Create new migration files in `migrations/` with incrementing numbers:

```sql
-- migrations/0002_add_new_table.sql
CREATE TABLE new_table (...);
```

Run migrations:

```bash
npm run db:migrate:dev
```

## Environment Variables

Configure in `wrangler.toml`:

- `ENVIRONMENT` - Current environment (local/development/staging/production)

## Future Enhancements

- [ ] MusicXML parsing and conversion
- [ ] IMSLP web scraping
- [ ] Score rendering with VexFlow
- [ ] OCR for scanned scores
- [ ] User upload management
- [ ] Batch import tools

## License

MIT
