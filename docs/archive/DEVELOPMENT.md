# Development Guide

## Quick Start

```bash
# Clone and install
git clone https://github.com/pezware/mirubato.git
cd rubato
npm install

# Start development
npm run dev              # Frontend (http://localhost:3000)
npm run dev:backend      # Backend (http://localhost:8787)

# Run tests
npm test                 # All tests
npm run test:coverage    # With coverage report
```

## Project Structure

```
rubato/
├── frontend/            # React PWA (Cloudflare Worker)
├── backend/             # GraphQL API (Cloudflare Worker)
├── shared/              # Shared types and utilities
└── docs/                # Documentation
```

## Essential Resources

- **Live API**: https://api.rubato.pezware.com/graphql
- **API Playground**: https://api.rubato.pezware.com/graphql (introspection enabled)
- **Documentation**: https://docs.rubato.pezware.com/
- **Health Check**: https://api.rubato.pezware.com/health

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Wrangler CLI (`npm install -g wrangler`)

### Environment Variables

Create `.env.local` files:

```bash
# backend/.env.local
JWT_SECRET=your-secret-key-here
RESEND_API_KEY=your-resend-api-key
FRONTEND_URL=http://localhost:3000
IS_DEV=true

# frontend/.env.local
VITE_API_URL=http://localhost:8787/graphql
VITE_APP_URL=http://localhost:3000
```

### Database Setup

```bash
# Create local D1 database
cd backend
wrangler d1 create rubato-db --local

# Run migrations
npm run db:migrate
```

## Key Development Commands

### Frontend Development

```bash
npm run dev                      # Start dev server
npm run build                    # Build for production
npm run preview                  # Preview production build
npm run test:unit                # Run unit tests
npm run docs:generate            # Generate TypeDoc documentation
```

### Backend Development

```bash
npm run dev:backend              # Start local server (wrangler dev --env local)
npm run build:backend            # Build for deployment
npm run db:migrate               # Run local migrations
npm run codegen                  # Generate GraphQL types

# Alternative backend workflows
cd backend
npm run dev                      # Recommended: Wrangler dev with hot reload
npm run dev:full                 # File watcher with auto-restart
npm run dev:watch                # TypeScript watch mode only
npm run dev:server               # Wrangler dev server only
```

### Testing

```bash
npm test                         # Run all tests
npm run test:coverage            # Generate coverage report
npm run test:watch               # Watch mode
npm run lint                     # Run ESLint
npm run typecheck                # Run TypeScript checks
```

## Deployment

### Production Deployment

```bash
# Deploy backend
cd backend
wrangler deploy --env production

# Deploy frontend
cd frontend
wrangler deploy --env production

# Run production migrations
npm run db:migrate:production
```

### Environment Management

- **Local**: Development with local D1 database
- **Staging**: Test environment at `*.workers.dev`
- **Production**: Live at `rubato.pezware.com`

### Secrets Management

```bash
# Set production secrets
wrangler secret put JWT_SECRET --env production
wrangler secret put RESEND_API_KEY --env production
```

## Architecture Overview

### Frontend (React + TypeScript)

- **State**: Module-based with EventBus
- **Styling**: Tailwind CSS
- **Music**: VexFlow (notation) + Tone.js (audio)
- **Build**: Vite

### Backend (Cloudflare Workers)

- **API**: GraphQL with Apollo Server
- **Database**: D1 (SQLite)
- **Auth**: Magic links with JWT
- **Email**: Resend API

### Key Modules

1. **SheetMusic**: Exercise generation, music library
2. **Practice**: Session tracking, performance metrics
3. **Audio**: Playback, metronome, audio synthesis
4. **Analytics**: Progress tracking, insights

## Testing Guidelines

### Coverage Requirements

- **Minimum**: 80% overall coverage
- **Critical paths**: 90% (auth, payments, core features)
- **New code**: Must have tests before merging

### Test Structure

```typescript
// Unit test example
describe('SheetMusicModule', () => {
  it('should generate exercises with correct parameters', () => {
    // Test implementation
  })
})

// Integration test example
describe('Practice Session Flow', () => {
  it('should track complete practice session', async () => {
    // Test implementation
  })
})
```

### Frontend Testing

#### Apollo Client Testing

To prevent "No more mocked responses" warnings:

```typescript
import { render, screen } from '../tests/utils/test-utils'
import { createInfiniteGetCurrentUserMock } from '../tests/utils/apollo-test-helpers'

test('renders with user context', () => {
  const mocks = [
    createInfiniteGetCurrentUserMock({ id: '123', email: 'test@example.com' })
  ]

  render(<MyComponent />, { mocks })
  expect(screen.getByText('Welcome')).toBeInTheDocument()
})
```

#### Common Testing Patterns

**Testing Loading States**:

```typescript
const mocks = [
  {
    request: { query: MY_QUERY },
    result: {
      data: {
        /* ... */
      },
    },
    delay: 100, // Test loading state
  },
]
```

**Testing Errors**:

```typescript
const mocks = [
  {
    request: { query: MY_QUERY },
    error: new Error('Network error'),
  },
]
```

#### Test Organization

- `setup/`: Test configuration and setup files
- `utils/`: Shared test utilities and helpers
- Component tests: Co-located with components (e.g., `Component.test.tsx`)
- Integration tests: In `tests/integration/`

#### Testing Best Practices

1. **Use MSW for API Mocking**: For complex API interactions
2. **Test User Interactions**: Focus on what users see and do
3. **Avoid Implementation Details**: Test behavior, not implementation
4. **Keep Tests Simple**: Each test should verify one behavior
5. **Use Descriptive Names**: Test names should explain what they test

#### Troubleshooting Tests

- **Apollo warnings**: Ensure test setup files are imported correctly
- **Router errors**: Use custom render from test-utils (includes BrowserRouter)
- **Async warnings**: Always use `waitFor` or `findBy` queries

## Development Principles

### Test-First Development (TDD)

We follow Test-Driven Development practices for all new features:

1. **Write the test first** - Tests define the expected behavior
2. **Run the test** - It should fail (red phase)
3. **Write minimal code** - Just enough to make the test pass (green phase)
4. **Refactor** - Improve the code while keeping tests passing

### GraphQL Development

We use GraphQL Code Generation for type-safe API interactions:

#### Setup

```bash
# Generate types from schema
npm run codegen

# Watch mode during development
npm run codegen:watch
```

#### Using Generated Hooks

Instead of manual queries:

```typescript
// ❌ Manual query
import { useQuery } from '@apollo/client'
import { GET_LOGBOOK_ENTRIES } from '../graphql/queries/practice'
const { data } = useQuery(GET_LOGBOOK_ENTRIES)

// ✅ Generated hook
import { useGetLogbookEntriesQuery } from '../generated/graphql'
const { data } = useGetLogbookEntriesQuery()
```

#### GraphQL Best Practices

1. **Name all operations** - Enables better debugging and hook generation
2. **Use fragments** - Reuse common field selections across queries
3. **Commit generated files** - They're part of your source code
4. **Run codegen before commits** - Ensures frontend-backend alignment

### Code Quality Standards

- **No `any` types** - All TypeScript code must be properly typed
- **No `console.log`** - Use proper logging service or remove before commit
- **80%+ test coverage** - Required for all new modules (90% for critical paths)
- **ESLint compliance** - All code must pass linting rules
- **Module boundaries** - Modules communicate only via EventBus

### Module Implementation Guidelines

When implementing a new module:

1. **Define the interface** - Start with the module interface in `/shared/interfaces`
2. **Write comprehensive tests** - Test file must exist before implementation
3. **Follow event patterns** - Use EventBus for all cross-module communication
4. **Document with JSDoc** - All public methods must have documentation
5. **Update TypeDoc** - Run `npm run docs:generate` to verify documentation

### Code Documentation Standards

Use JSDoc comments for all public APIs:

````typescript
/**
 * Brief description of the class/function
 *
 * @category CategoryName
 * @example
 * ```typescript
 * const example = new ExampleClass();
 * example.doSomething();
 * ```
 */
export class ExampleClass {
  /**
   * Method description
   * @param param - Parameter description
   * @returns Return value description
   */
  doSomething(param: string): void {
    // Implementation
  }
}
````

#### Standard Categories

Use these categories in `@category` tags:

- **Core**: Core functionality and infrastructure
- **UI Components**: React components
- **Services**: Service layer classes
- **Utilities**: Helper functions and utilities
- **Analytics**: Analytics and reporting modules
- **Practice**: Practice session related modules
- **Performance**: Performance tracking modules
- **Audio**: Audio-related functionality
- **Contexts**: React contexts
- **Types**: TypeScript type definitions

### Performance Considerations

- **Bundle size** - Keep dependencies minimal (Workers have 1MB limit)
- **Lazy loading** - Load modules only when needed
- **Memory management** - Clean up event listeners and audio resources
- **Response time** - API responses must be <100ms (critical: <200ms)

### Security Best Practices

- **No secrets in code** - Use environment variables
- **Input validation** - Validate all user inputs
- **SQL injection prevention** - Use parameterized queries
- **XSS prevention** - Sanitize all rendered content
- **HTTPS only** - All endpoints must use HTTPS

## Code Standards

### TypeScript

```typescript
// Use explicit types
interface PracticeSession {
  id: string
  userId: string
  startTime: Date
  // ...
}

// Avoid any
function processMusic(data: MusicData): ProcessedMusic {
  // Implementation
}
```

### React Components

```tsx
// Functional components with TypeScript
interface Props {
  sheetMusic: SheetMusic
  onPlay: () => void
}

export const MusicPlayer: React.FC<Props> = ({ sheetMusic, onPlay }) => {
  // Component logic
}
```

### Music-Specific Guidelines

```typescript
// Always handle audio context
await Tone.start() // Required for mobile

// Proper measure tracking
const currentMeasure = Math.floor(currentBeat / beatsPerMeasure)

// Instrument-specific logic
if (instrument === 'guitar') {
  // Handle fret positions
} else if (instrument === 'piano') {
  // Handle hand positions
}
```

## Common Issues & Solutions

### CSP Headers for Audio

The app requires specific CSP headers for Tone.js Web Workers. These are configured in `frontend/public/_headers`:

```
/assets/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' blob:; worker-src 'self' blob:; connect-src 'self' https://tonejs.github.io
```

### Mobile Audio Context

Always initialize audio context on user interaction:

```typescript
button.addEventListener('click', async () => {
  await Tone.start()
  // Now audio will work
})
```

### VexFlow Rendering

Ensure proper cleanup to avoid memory leaks:

```typescript
useEffect(() => {
  const renderer = new Renderer(div, Renderer.Backends.SVG)
  // ... rendering logic

  return () => {
    // Cleanup
    div.innerHTML = ''
  }
}, [measures])
```

## Backend Build System

### Overview

The backend uses a Cloudflare-native build system that lets Wrangler handle TypeScript compilation and bundling directly.

### Build Pipeline

```
TypeScript Source → Wrangler Build → Deployment
        ↓                 ↓              ↓
   Standard TS        ESBuild +      Workers
   + GraphQL          Bundling       Runtime
```

### Key Configuration

**wrangler.toml**:

```toml
name = "mirubato-backend"
main = "dist/backend/src/index.js"  # NOT "dist/index.js" due to shared imports
# NO [build] section - causes infinite loops
```

### Common Build Issues

#### 1. Entry Point Not Found

**Error**: `The entry-point file at 'dist/index.js' was not found`

**Cause**: TypeScript preserves directory structure when importing from `../shared`

**Solution**: Update `wrangler.toml` main entry to `dist/backend/src/index.js`

#### 2. Infinite Build Loop

**Symptoms**: `npm run dev` constantly rebuilds with high CPU usage

**Cause**: Circular dependency between wrangler.toml build command and npm scripts

**Solution**: Remove `[build]` section from wrangler.toml

#### 3. \_\_dirname Not Defined

**Error**: `__dirname is not defined` in Workers runtime

**Solution**: Pre-generate static content during build (e.g., schema files)

#### 4. JavaScript Files Break Tests

**Symptoms**: Jest fails with "Unexpected token" errors on generated JS files

**Solution**:

- Add `shared/**/*.js` to .gitignore
- Never commit generated JavaScript from TypeScript

### Cloudflare Dashboard Settings

For proper deployment configuration:

- **Build command**: `npm run build`
- **Deploy command**: `cd backend && npx wrangler deploy`
- **Root directory**: `/` (NOT `/backend/` due to npm install limitation)
- **Version command**: Leave empty (unless using gradual deployments)

### Build System Best Practices

1. **Let Wrangler handle TypeScript** - Don't add custom build steps
2. **Verify output paths** - Check actual TypeScript output structure
3. **Keep commands simple** - Avoid circular references
4. **Use environment flags** - `--env local` for development

## Performance Considerations

### Targets

- Initial load: <2s
- API response: <100ms
- Frame rate: 60fps for animations
- Memory: <100MB usage

### Optimizations

1. **Lazy load** sheet music pages
2. **Cache** generated exercises in IndexedDB
3. **Debounce** search and filter operations
4. **Use Web Workers** for heavy computations

## Security Guidelines

### Environment Variables

- Never commit `.env` files
- Use `wrangler secret` for production
- Rotate secrets regularly

### API Security

- All mutations require authentication
- Rate limiting enforced (20-120 req/min)
- Input validation on all endpoints

### Data Privacy

- Local-first architecture
- Minimal data collection
- GDPR compliant data export/deletion

## Debugging

### Local Development

```bash
# Frontend debugging
npm run dev
# Open Chrome DevTools

# Backend debugging
npm run dev:backend
# Check terminal output

# Database inspection
wrangler d1 execute rubato-db --local --command "SELECT * FROM users"
```

### Production Debugging

- Check health endpoint: https://api.rubato.pezware.com/health
- View Cloudflare dashboard for Worker logs
- Use Wrangler tail for real-time logs:

```bash
wrangler tail --env production
```

## Additional Resources

- [GraphQL Schema Explorer](https://api.rubato.pezware.com/graphql)
- [Module Documentation](https://docs.rubato.pezware.com/)
- [VexFlow Documentation](https://www.vexflow.com/)
- [Tone.js Documentation](https://tonejs.github.io/)
