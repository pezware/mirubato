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

The frontend uses Apollo Client to communicate with the backend GraphQL API. Both frontend and backend are deployed as separate Cloudflare Workers.

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

### Key Configuration Files

- **Apollo Client**: `frontend/src/lib/apollo/client.ts`
- **GraphQL Queries**: `frontend/src/lib/apollo/queries/`
- **AuthContext**: `frontend/src/contexts/AuthContext.tsx`
- **Environment Variables**: `frontend/.env.local` and `frontend/.env.production`

## Shared Types Package

### Purpose

The `@mirubato/shared` package ensures type consistency between frontend and backend. It is used during build time only and is NOT deployed as a separate service.

### Structure

```
shared/
├── types/
│   ├── index.ts          # Main type definitions and exports
│   └── validation.ts     # Data validation and migration utilities
├── package.json
└── tsconfig.json
```

### Usage

- Frontend imports: `import { Instrument, SessionType } from '@mirubato/shared/types'`
- Backend imports: `import { User, PracticeSession } from '@mirubato/shared/types'`
- Data validation: `import { DataValidator } from '@mirubato/shared/types'`

## Local-First Architecture

### Overview

Mirubato uses a local-first approach where:

1. **Anonymous users** can use all features without registration
2. **Data is stored locally** in the browser's localStorage
3. **Optional cloud sync** for registered users
4. **Seamless migration** from anonymous to authenticated

### Key Services

- **Local Storage Service**: `frontend/src/services/localStorage.ts`
- **Data Sync Service**: `frontend/src/services/dataSync.ts`
- **Auth Context**: `frontend/src/contexts/AuthContext.tsx`

## Development Workflow

### Adding New Features

1. **Define types in shared package**: Update `shared/types/index.ts`
2. **Update GraphQL schema**: Edit `backend/src/schema/schema.graphql`
3. **Generate GraphQL types**:
   ```bash
   cd frontend && npm run codegen
   cd ../backend && npm run codegen
   ```
4. **Implement backend resolver** in `backend/src/resolvers/`
5. **Add frontend functionality**:
   - Local storage support
   - GraphQL queries/mutations
   - UI components
   - Data sync logic

### Testing

- **Unit tests**: Use `MockedProvider` from `@apollo/client/testing`
- **Integration tests**: Use MSW for API mocking
- **Run tests**: `npm test` or `npm test -w @mirubato/frontend`

## Deployment

### Important Notes

- **Automatic Deployment**: Cloudflare automatically builds and deploys when code is pushed to GitHub
- **No Manual Commands**: You do NOT need to run `wrangler deploy` manually
- **Shared Package**: The `@mirubato/shared` package is used during build time only and is NOT deployed
- **Custom Domains**: Must be configured in Cloudflare Dashboard (not in wrangler.json)

### Environment Configuration

#### Frontend (`frontend/wrangler.json`)

```json
{
  "name": "mirubato",
  "main": "src/index.js",
  "compatibility_date": "2025-01-01",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS"
  }
}
```

#### Backend (`backend/wrangler.json`)

```json
{
  "name": "mirubato-backend",
  "main": "dist/index.js",
  "compatibility_date": "2024-09-23",
  "workers_dev": true,
  "vars": {
    "ENVIRONMENT": "development"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "mirubato-dev",
      "database_id": "4510137a-7fdf-4fcd-83c9-a1b0adb7fe3e"
    }
  ],
  "build": {
    "command": "npm run build"
  },
  "compatibility_flags": ["nodejs_compat"]
}
```

### Custom Domain Setup

1. **Frontend Domain** (mirubato.com):

   - Configure in Cloudflare Dashboard → Workers & Pages → Custom Domains
   - Add `mirubato.com` to the frontend Worker

2. **Backend Domain** (api.mirubato.com):
   - Configure in Cloudflare Dashboard → Workers & Pages → Custom Domains
   - Add `api.mirubato.com` to the backend Worker

### Environment Variables

1. **Frontend Production** (`.env.production`):

   ```env
   VITE_GRAPHQL_ENDPOINT=https://api.mirubato.com/graphql
   VITE_PUBLIC_URL=https://mirubato.com
   ```

2. **Backend Production**:
   - Set in Cloudflare Dashboard → Workers → Settings → Variables
   - Add `FRONTEND_URL=https://mirubato.com` for CORS

### GraphQL Code Generation

The `npm run codegen` command must be run locally before pushing changes:

```bash
# After updating GraphQL schema or queries
cd frontend && npm run codegen
cd ../backend && npm run codegen
```

**Important Notes:**

- Frontend codegen uses the schema file directly from `../backend/src/schema/schema.graphql`
- Backend server does NOT need to be running for codegen
- This generates TypeScript types from the GraphQL schema
- This is NOT part of the Cloudflare build process - must be done locally

**Common Schema Alignment Issues:**

When updating GraphQL queries, ensure they match the backend schema exactly:

- Token field: Use `accessToken` (not `authToken`)
- User preferences: Use flat structure with `theme`, `notationSize`, `practiceReminders`, `dailyGoalMinutes`
- Mutations: Use `updateUser` for preferences updates (no separate `updateUserPreferences`)
- Practice sessions: Use `startPracticeSession` and `completePracticeSession` (no sync mutations)

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
