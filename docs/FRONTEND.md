# Mirubato Frontend v2

A modernized frontend for Mirubato that uses REST API instead of GraphQL, maintaining the same visual design and user experience.

## Key Differences from v1

- **REST API** instead of GraphQL
- **Zustand** for state management instead of Context API
- **SWR** for data fetching and caching instead of Apollo Client
- **Vitest** for unit testing instead of Jest
- **Playwright + Stagehand** for E2E testing
- Simplified architecture with better separation of concerns

## Architecture

```
src/
├── api/           # REST API client modules
├── components/    # React components
├── pages/         # Page components
├── stores/        # Zustand stores
├── hooks/         # Custom hooks
├── types/         # TypeScript types
├── utils/         # Utility functions
└── styles/        # Global styles
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_URL=http://localhost:8787
```

## API Endpoints

The frontend connects to the REST API with these main endpoints:

- **Auth**: `/api/auth/*` - Magic link and Google OAuth
- **Logbook**: `/api/logbook/*` - CRUD operations for entries
- **Goals**: `/api/goals/*` - Goal management
- **Sync**: `/api/sync/*` - Data synchronization

## State Management

Uses Zustand for global state management:

- `authStore` - User authentication state
- `logbookStore` - Logbook entries and goals

## Data Storage

- **Anonymous users**: Data stored in localStorage
- **Authenticated users**: Data synced to cloud via API

## Testing

### Unit Tests (Vitest)

```bash
npm test
```

Current coverage: 100 tests passing across 5 test files

- API client tests: 14 tests
- Auth store tests: 20 tests
- Logbook store tests: 21 tests
- Utility tests: 31 tests
- Additional API tests: 14 tests

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

### Stagehand AI Testing

Configure Stagehand in `stagehand/stagehand.config.ts` for AI-driven testing.

## Deployment

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## Current Status

- [x] Project setup
- [x] Core architecture
- [x] API client
- [x] Auth flow
- [x] Logbook functionality
- [x] Migration from legacy frontend completed
- [x] Production deployment active
- [ ] Complete E2E test coverage
- [ ] Performance optimization
- [ ] UI/UX polish (roadmap priority 1)
