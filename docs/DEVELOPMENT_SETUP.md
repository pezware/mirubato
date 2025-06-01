# Mirubato Development Setup

## Project Structure

Mirubato is organized as a monorepo with separate frontend and backend packages, plus a shared types package:

```
mirubato/
├── frontend/              # React frontend application
│   ├── src/              # Frontend source code
│   ├── public/           # Static assets
│   ├── tests/            # Frontend tests
│   └── package.json      # Frontend dependencies
├── backend/              # GraphQL API (Cloudflare Workers)
│   ├── src/              # Backend source code
│   ├── migrations/       # Database migrations
│   └── package.json      # Backend dependencies
├── shared/               # Shared types and utilities
│   ├── types/            # TypeScript type definitions
│   │   ├── index.ts      # Main types export
│   │   └── validation.ts # Data validation utilities
│   └── package.json      # Shared package configuration
├── docs/                 # Documentation
└── package.json          # Root monorepo configuration
```

## Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/mirubato.git
   cd mirubato
   ```

2. **Install dependencies**

   ```bash
   # Install all dependencies (root + workspaces)
   npm install

   # Or install for specific workspace
   npm install -w @mirubato/frontend
   npm install -w @mirubato/backend
   ```

3. **Set up environment variables**

   ```bash
   # Frontend environment
   cp frontend/.env.example frontend/.env.local

   # Backend environment
   cp backend/.env.example backend/.env.local
   ```

4. **Configure environment variables**

   Create `.env.local` in the frontend directory:

   ```env
   # Frontend .env.local
   VITE_GRAPHQL_ENDPOINT=http://localhost:8787/graphql
   VITE_PUBLIC_URL=http://localhost:3000
   ```

   For production deployment on Cloudflare Workers:

   ```env
   # Frontend .env.production
   VITE_GRAPHQL_ENDPOINT=https://api.mirubato.com/graphql
   VITE_PUBLIC_URL=https://mirubato.com
   ```

5. **Start development servers**

   ```bash
   # Start frontend development server
   npm run dev
   # Frontend runs at http://localhost:3000

   # Start backend development server (in another terminal)
   npm run dev:backend
   # Backend GraphQL API runs at http://localhost:8787/graphql
   ```

## Frontend Structure

```
frontend/
├── src/
│   ├── components/      # React components
│   │   ├── LandingPage.tsx
│   │   ├── PianoKey.tsx
│   │   ├── PianoChord.tsx
│   │   ├── CircularControl.tsx
│   │   ├── MusicPlayer.tsx
│   │   └── SheetMusicDisplay.tsx
│   ├── data/           # Sheet music and exercise data
│   │   └── sheetMusic/
│   │       ├── index.ts
│   │       └── moonlightSonata3rd.ts
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   │   └── Practice.tsx
│   ├── types/          # TypeScript type definitions
│   │   └── sheetMusic.ts
│   ├── utils/          # Utility functions
│   │   ├── audioManager.ts
│   │   ├── notationRenderer.ts
│   │   └── theme.ts
│   ├── styles/         # Global styles
│   │   └── index.css
│   ├── App.tsx         # Main app component with routing
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── tests/              # Integration tests
└── package.json        # Frontend-specific dependencies
```

## Backend Structure

```
backend/
├── src/
│   ├── __tests__/      # Unit and integration tests
│   ├── resolvers/      # GraphQL resolvers
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── practice.ts
│   │   └── sheetMusic.ts
│   ├── schema/         # GraphQL schema
│   │   └── schema.graphql
│   ├── services/       # Business logic
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   └── email.ts
│   ├── types/          # TypeScript types
│   ├── utils/          # Utilities
│   └── index.ts        # Entry point
├── migrations/         # D1 database migrations
├── wrangler.toml      # Cloudflare Workers config
└── package.json       # Backend-specific dependencies
```

## Apollo Client Integration

### Overview

The frontend uses Apollo Client to communicate with the backend GraphQL API. Both frontend and backend are deployed as separate Cloudflare Workers, with the frontend serving the React app and the backend providing the GraphQL API.

### Architecture

```
┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │
│  Frontend       │  HTTP   │  Backend        │
│  (React App)    │ ──────> │  (GraphQL API)  │
│  Worker         │         │  Worker         │
│                 │         │                 │
└─────────────────┘         └─────────────────┘
        │                           │
        │                           │
        ▼                           ▼
   Static Assets                D1 Database
   (HTML/JS/CSS)               (SQLite)
```

### Frontend Apollo Client Configuration

The Apollo Client is configured in `frontend/src/lib/apollo/client.ts`:

```typescript
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'

// HTTP connection to the API
const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:8787/graphql',
})

// Authentication link - adds JWT token to requests
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('authToken')
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }
})

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
    )
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`)
  }
})

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      User: { keyFields: ['id'] },
      SheetMusic: { keyFields: ['id'] },
      PracticeSession: { keyFields: ['id'] },
    },
  }),
})
```

### Using Apollo Client in Components

1. **Wrap your app with ApolloProvider** (`frontend/src/main.tsx`):

```typescript
import { ApolloProvider } from '@apollo/client'
import { apolloClient } from './lib/apollo/client'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
)
```

2. **Query data in components**:

```typescript
import { useQuery, gql } from '@apollo/client'

const GET_USER = gql`
  query GetUser {
    me {
      id
      email
      displayName
      primaryInstrument
    }
  }
`

function Profile() {
  const { loading, error, data } = useQuery(GET_USER)

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error: {error.message}</p>

  return <div>Welcome, {data.me.displayName}!</div>
}
```

3. **Mutations for data updates**:

```typescript
import { useMutation, gql } from '@apollo/client'

const UPDATE_PRIMARY_INSTRUMENT = gql`
  mutation UpdatePrimaryInstrument($instrument: Instrument!) {
    updatePrimaryInstrument(instrument: $instrument) {
      id
      primaryInstrument
    }
  }
`

function InstrumentSelector() {
  const [updateInstrument] = useMutation(UPDATE_PRIMARY_INSTRUMENT)

  const handleChange = (instrument: Instrument) => {
    updateInstrument({
      variables: { instrument },
      optimisticResponse: {
        updatePrimaryInstrument: {
          id: 'temp-id',
          primaryInstrument: instrument,
        },
      },
    })
  }

  return (
    <select onChange={(e) => handleChange(e.target.value as Instrument)}>
      <option value="PIANO">Piano</option>
      <option value="GUITAR">Guitar</option>
    </select>
  )
}
```

## Shared Types Package

### Purpose

The `@mirubato/shared` package ensures type consistency between frontend and backend, especially important for:

- Local storage data structures
- GraphQL type definitions
- Data validation
- Database schema alignment

### Structure

```
shared/
├── types/
│   ├── index.ts          # Main type definitions and exports
│   └── validation.ts     # Data validation and migration utilities
├── package.json
└── tsconfig.json
```

### Key Types

The shared package defines all core data structures:

```typescript
// Enums that match database constraints
export enum Instrument {
  PIANO = 'PIANO',
  GUITAR = 'GUITAR',
}

export enum SessionType {
  FREE_PRACTICE = 'FREE_PRACTICE',
  GUIDED_PRACTICE = 'GUIDED_PRACTICE',
  ASSESSMENT = 'ASSESSMENT',
}

// User and practice data types
export interface User {
  id: string
  email: string
  displayName?: string | null
  primaryInstrument: Instrument
  createdAt: string
  updatedAt: string
}

export interface PracticeSession {
  id: string
  userId: string
  instrument: Instrument
  sheetMusicId?: string | null
  sessionType: SessionType
  startedAt: string
  completedAt?: string | null
  pausedDuration: number
  accuracyPercentage?: number | null
  notesAttempted: number
  notesCorrect: number
}

// Local storage specific types
export interface LocalPracticeSession extends PracticeSession {
  isSynced: boolean
  sheetMusicTitle?: string
}
```

### Using Shared Types

1. **Import in frontend**:

```typescript
import {
  Instrument,
  SessionType,
  LocalPracticeSession,
} from '@mirubato/shared/types'
```

2. **Import in backend**:

```typescript
import {
  Instrument,
  SessionType,
  PracticeSession,
} from '@mirubato/shared/types'
```

3. **Data validation**:

```typescript
import { DataValidator } from '@mirubato/shared/types'

// Validate data before saving
if (DataValidator.validatePracticeSession(sessionData)) {
  // Safe to save
  localStorageService.savePracticeSession(sessionData)
}
```

## Local-First Architecture

### Overview

Mirubato uses a local-first approach where:

1. **Anonymous users** can use all features without registration
2. **Data is stored locally** in the browser's localStorage
3. **Optional cloud sync** for registered users
4. **Seamless migration** from anonymous to authenticated

### Data Flow

```
┌─────────────────┐
│   User Action   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Local Storage  │────>│  Apollo Cache   │
└────────┬────────┘     └─────────────────┘
         │                       │
         │                       │ (if authenticated)
         │                       ▼
         │              ┌─────────────────┐
         │              │  GraphQL API    │
         │              └────────┬────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         └─────────────>│  Data Sync      │
                        │  Service        │
                        └─────────────────┘
```

### Implementation Details

1. **Anonymous User Creation**:

```typescript
// Automatically created on first visit
const anonymousUser = {
  id: `anon_${crypto.randomUUID()}`,
  email: '',
  isAnonymous: true,
  primaryInstrument: Instrument.PIANO,
  // ... preferences and stats
}
```

2. **Local Storage Service** (`frontend/src/services/localStorage.ts`):

   - Manages all local data
   - Provides same API as GraphQL mutations
   - Handles data validation
   - Tracks sync status

3. **AuthContext Integration**:

   - Detects user authentication state
   - Triggers data migration on login
   - Manages sync operations

4. **Data Sync Service** (`frontend/src/services/dataSync.ts`):
   - Batch syncs local data to cloud
   - Handles conflicts
   - Provides progress feedback

## Development Workflow

### Adding New Features

1. **Define types in shared package**:

```typescript
// shared/types/index.ts
export interface NewFeature {
  id: string
  // ... fields
}
```

2. **Update GraphQL schema**:

```graphql
# backend/src/schema/schema.graphql
type NewFeature {
  id: ID!
  # ... fields
}
```

3. **Generate GraphQL types**:

```bash
cd frontend && npm run codegen
cd ../backend && npm run codegen
```

4. **Implement backend resolver**:

```typescript
// backend/src/resolvers/newFeature.ts
export const newFeatureResolvers = {
  Query: {
    getNewFeature: async (_, { id }, context) => {
      // Implementation
    },
  },
  Mutation: {
    createNewFeature: async (_, args, context) => {
      // Implementation
    },
  },
}
```

5. **Add frontend functionality**:
   - Local storage support
   - GraphQL queries/mutations
   - UI components
   - Data sync logic

### Testing Apollo Integration

1. **Unit tests**: Mock Apollo Client

```typescript
import { MockedProvider } from '@apollo/client/testing'

const mocks = [{
  request: { query: GET_USER },
  result: { data: { me: mockUser } },
}]

render(
  <MockedProvider mocks={mocks}>
    <Profile />
  </MockedProvider>
)
```

2. **Integration tests**: Use MSW for API mocking

```typescript
import { setupServer } from 'msw/node'
import { graphql } from 'msw'

const server = setupServer(
  graphql.query('GetUser', (req, res, ctx) => {
    return res(ctx.data({ me: mockUser }))
  })
)
```

## Deployment

### Environment Configuration

Both frontend and backend are deployed as Cloudflare Workers:

1. **Frontend Worker** (`frontend/wrangler.json`):

```json
{
  "name": "mirubato-frontend",
  "compatibility_date": "2024-12-18",
  "main": "dist/index.js",
  "site": {
    "bucket": "./dist"
  },
  "env": {
    "production": {
      "vars": {
        "VITE_GRAPHQL_ENDPOINT": "https://api.mirubato.com/graphql"
      }
    }
  }
}
```

2. **Backend Worker** (`backend/wrangler.json`):

```json
{
  "name": "mirubato-backend",
  "compatibility_date": "2024-12-18",
  "main": "dist/index.js",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "mirubato-db",
      "database_id": "your-database-id"
    }
  ]
}
```

### CORS Configuration

The backend includes CORS headers for the frontend:

```typescript
// backend/src/index.ts
const cors = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}
```

### Production Deployment

1. **Deploy backend first**:

```bash
cd backend
npm run build
wrangler deploy
# Note the deployed URL
```

2. **Update frontend environment**:

```bash
# Update VITE_GRAPHQL_ENDPOINT with backend URL
cd frontend
npm run build
wrangler deploy
```

## Available Scripts

### Root Scripts (Monorepo)

- `npm run dev` - Start frontend development server
- `npm run dev:backend` - Start backend development server
- `npm run build` - Build frontend for production
- `npm run build:backend` - Build backend for production
- `npm run test` - Run all tests
- `npm run test:unit` - Run unit tests
- `npm run test:integration` - Run integration tests
- `npm run lint` - Run ESLint on all workspaces
- `npm run type-check` - Run TypeScript checking on all workspaces

### Frontend-Specific Scripts

```bash
# Run from root with workspace flag
npm run dev -w @mirubato/frontend
npm run build -w @mirubato/frontend
npm run test -w @mirubato/frontend
```

### Backend-Specific Scripts

```bash
# Run from root with workspace flag
npm run dev -w @mirubato/backend
npm run build -w @mirubato/backend
npm run test -w @mirubato/backend
```

## Design System

The project uses a nature-inspired color palette extracted from the mirubato-cover.jpeg image:

- **Primary (Leaf Green)**: `#a3e635` - Used for interactive elements
- **Secondary (Wood Gray)**: `#d4d4d8` - Used for backgrounds and panels
- **Text**: Various shades of gray from the wood palette

The design system is configured in:

- `frontend/tailwind.config.js` - Tailwind CSS configuration
- `frontend/src/utils/theme.ts` - TypeScript theme configuration
- `frontend/src/styles/index.css` - Global styles and CSS custom properties

## Key Features Implemented

### Frontend Features

1. **Landing Page**

   - Full-screen background image from mirubato-cover.jpeg
   - Elegant title and subtitle with fade-in animations
   - Glass-morphism effect on content panels
   - Interactive piano chord demonstration

2. **Practice Page**

   - Full music notation rendering with VexFlow
   - 20 measures of Beethoven's Moonlight Sonata 3rd Movement
   - Real piano sounds using Salamander Grand Piano samples
   - Adjustable tempo control (30-180 BPM)
   - Responsive design for desktop, tablet, and mobile
   - Measure tracking and progress display
   - Circular volume control

3. **Audio System**

   - Real piano samples via Tone.js Sampler
   - audioManager utility for centralized audio handling
   - Support for multiple instruments (piano implemented, guitar ready)
   - Mobile audio context handling

4. **Sheet Music System**
   - Organized data structure in `frontend/src/data/sheetMusic/`
   - TypeScript interfaces for type safety
   - Reusable NotationRenderer for any sheet music
   - Easy to add new pieces

### Backend Features

1. **GraphQL API**

   - Apollo Server on Cloudflare Workers
   - Complete type-safe schema
   - Authentication with magic links and JWT

2. **Database**

   - Cloudflare D1 (SQLite) database
   - 5 migration files for complete schema
   - User management and practice tracking

3. **Services**
   - User authentication service
   - Email service (console.log for development)
   - Rate limiting utilities

## Dependencies

### Frontend Dependencies

- `react` & `react-dom` - UI framework
- `react-router-dom` - Page routing
- `vexflow` - Music notation rendering
- `tone` - Audio synthesis and scheduling
- `tailwindcss` - Styling
- `typescript` - Type safety
- `vite` - Build tool

### Backend Dependencies

- `@apollo/server` - GraphQL server
- `@as-integrations/cloudflare-workers` - Apollo Server adapter
- `graphql` - GraphQL language and execution
- `jsonwebtoken` - JWT authentication
- `nanoid` - ID generation
- `zod` - Schema validation

## Testing

The project includes comprehensive testing:

- **Unit Tests**: Component and service logic
- **Integration Tests**: API endpoints and user flows
- **23 backend tests** all passing
- **52 frontend tests** all passing

Run tests with:

```bash
# All tests
npm test

# Frontend tests only
npm test -w @mirubato/frontend

# Backend tests only
npm test -w @mirubato/backend

# Watch mode
npm run test:watch
```

## Troubleshooting

### Common Issues

1. **CORS errors when connecting frontend to backend**:

   - Ensure backend is running on `http://localhost:8787`
   - Check that `VITE_GRAPHQL_ENDPOINT` is set correctly
   - Verify CORS configuration in backend allows frontend origin

2. **TypeScript errors with shared types**:

   - Run `npm install` from root to link workspaces
   - Ensure shared package is built: `npm run build -w @mirubato/shared`
   - Check that imports use `@mirubato/shared/types`

3. **Apollo Client authentication issues**:

   - Verify JWT token is stored in localStorage as `authToken`
   - Check that auth link is adding Bearer token to requests
   - Ensure backend is validating tokens correctly

4. **Local storage data not persisting**:
   - Check browser's localStorage quota
   - Verify data validation is passing
   - Look for console errors during save operations

### Development Tips

1. **GraphQL Playground**: Access at `http://localhost:8787/graphql` to test queries
2. **Apollo DevTools**: Install browser extension for debugging Apollo Client
3. **Type Generation**: Run `npm run codegen` after schema changes
4. **Hot Reload**: Both frontend and backend support hot reload in development

## Next Steps

### Frontend

- ✅ Apollo Client configured and integrated
- ✅ Local-first architecture implemented
- ✅ Shared types package created
- Create authentication UI (login/magic link pages)
- Build data sync UI for authenticated users
- Add instrument selection (guitar/piano toggle)
- Add visual feedback for currently playing notes

### Backend

- ✅ GraphQL API fully implemented
- ✅ Authentication system complete
- Implement real email service (Resend/SendGrid)
- Add data sync mutations for practice sessions
- Complete sheet music service
- Deploy to production Cloudflare Workers

## Development Tips

1. **Working with Workspaces**: When adding dependencies, specify the workspace:

   ```bash
   # Add to frontend
   npm install package-name -w @mirubato/frontend

   # Add to backend
   npm install package-name -w @mirubato/backend
   ```

2. **Running Scripts**: You can run scripts from the root or navigate to the workspace:

   ```bash
   # From root
   npm run dev

   # Or from workspace directory
   cd frontend && npm run dev
   ```

3. **GraphQL Development**: The backend includes GraphQL playground in development mode. Access it at http://localhost:8787/graphql

4. **Database Migrations**: Run migrations with:
   ```bash
   cd backend
   wrangler d1 migrations apply mirubato-db --local
   ```
