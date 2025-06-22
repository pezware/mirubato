# Mirubato API Service

REST API service for Mirubato authentication and data synchronization.

## Architecture

This API follows a local-first architecture where:

- Unlogged users work 100% offline with localStorage
- Logged users get cloud sync as an additive feature
- API handles only authentication and data synchronization

## Setup

### First Time Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create D1 databases:

   ```bash
   ./scripts/setup-db.sh create
   ```

   This will create the staging and production databases. Copy the database IDs from the output and update them in `wrangler.toml`.

3. Run migrations:

   ```bash
   # Local development
   npm run db:migrate

   # Staging
   npm run db:migrate:staging

   # Production
   npm run db:migrate:production
   ```

### Development

```bash
# Start local development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Type check
npm run typecheck
```

### Deployment

```bash
# Deploy to production (default)
npm run deploy

# Deploy to staging
npm run deploy:staging
```

## API Endpoints

### Authentication

- `POST /api/auth/request-magic-link` - Request magic link email
- `POST /api/auth/verify-magic-link` - Verify magic link token
- `POST /api/auth/google` - Google OAuth authentication
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Sync (Authenticated)

- `POST /api/sync/pull` - Get all user data from cloud
- `POST /api/sync/push` - Push local changes to cloud
- `POST /api/sync/batch` - Bidirectional sync batch operation
- `GET /api/sync/status` - Get sync metadata and status

### User Management (Authenticated)

- `GET /api/user/me` - Get current user information
- `PUT /api/user/preferences` - Update user preferences
- `DELETE /api/user/me` - Delete user account

### Health & Monitoring

- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics
- `GET /docs` - Interactive API documentation
- `GET /openapi.json` - OpenAPI specification

## Environment Variables

### Required Secrets

- `JWT_SECRET` - Secret for JWT signing
- `MAGIC_LINK_SECRET` - Secret for magic link tokens
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (optional)
- `SENDGRID_API_KEY` - SendGrid API key for emails (optional)

### Configuration

- `ENVIRONMENT` - Environment name (local/staging/production)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID

## Database Schema

See `migrations/0001_initial_schema.sql` for the complete schema.

### Tables

- `users` - User accounts
- `sync_data` - Generic storage for synced entities
- `sync_metadata` - Sync tracking information

## Testing

The test suite uses Vitest with Node environment:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm test -- --watch

# Run with UI
npm run test:ui
```

## Documentation

Interactive API documentation is available at:

- Local: http://localhost:8787/docs
- Production: https://api.mirubato.com/docs

The documentation is powered by Stoplight Elements and uses the OpenAPI specification.
