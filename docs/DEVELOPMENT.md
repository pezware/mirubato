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
npm run dev:backend              # Start local server
npm run build:backend            # Build for deployment
npm run db:migrate               # Run local migrations
npm run codegen                  # Generate GraphQL types
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
