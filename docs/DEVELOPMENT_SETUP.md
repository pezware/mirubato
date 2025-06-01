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
   VITE_ENV=production
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
│   │   ├── AuthModal.tsx        # Magic link authentication modal
│   │   ├── LandingPage.tsx
│   │   ├── PianoKey.tsx
│   │   ├── PianoChord.tsx
│   │   ├── CircularControl.tsx
│   │   ├── MusicPlayer.tsx
│   │   └── SheetMusicDisplay.tsx
│   ├── contexts/       # React contexts
│   │   └── AuthContext.tsx      # Authentication state management
│   ├── data/           # Sheet music and exercise data
│   │   └── sheetMusic/
│   │       ├── index.ts
│   │       └── moonlightSonata3rd.ts
│   ├── graphql/        # GraphQL queries and mutations
│   │   └── queries/
│   │       ├── auth.ts
│   │       └── user.ts
│   ├── hooks/          # Custom React hooks
│   │   └── useAuth.ts
│   ├── lib/            # External library configurations
│   │   └── apollo/
│   │       └── client.ts
│   ├── pages/          # Page components
│   │   ├── Practice.tsx
│   │   └── AuthVerify.tsx       # Magic link verification page
│   ├── services/       # Frontend services
│   │   ├── localStorage.ts      # Local data persistence
│   │   └── dataSync.ts         # Cloud sync functionality
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
│   └── _headers        # Cloudflare Workers headers (CSP, etc.)
├── tests/              # Integration tests
└── package.json        # Frontend-specific dependencies
```

## Backend Structure

```
backend/
├── src/
│   ├── __tests__/      # Unit and integration tests
│   ├── middleware/     # Express-style middleware
│   │   └── logging.ts
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
│   ├── templates/      # Email templates
│   │   └── email/
│   │       ├── magic-link.html
│   │       ├── magic-link.txt
│   │       └── compiled-templates.ts  # Auto-generated
│   ├── types/          # TypeScript types
│   ├── utils/          # Utilities
│   └── index.ts        # Entry point
├── scripts/            # Build scripts
│   └── build-email-templates.js
├── migrations/         # D1 database migrations
├── wrangler.json       # Cloudflare Workers config
└── package.json        # Backend-specific dependencies
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
                                    │
                                    ▼
                               KV Namespace
                            (Magic Link Storage)
```

### Key Configuration Files

- **Apollo Client**: `frontend/src/lib/apollo/client.ts`
- **GraphQL Queries**: `frontend/src/graphql/queries/`
- **AuthContext**: `frontend/src/contexts/AuthContext.tsx`
- **Environment Variables**: `frontend/.env.local` and `frontend/.env.production`

## Authentication System

### Overview

Mirubato uses a passwordless magic link authentication system:

1. User enters email address
2. Backend generates a unique token and stores it in KV namespace
3. Email is sent with a magic link containing the token
4. User clicks the link and is redirected to `/auth/verify?token=...`
5. Backend verifies the token and issues JWT tokens
6. User is logged in and redirected to the practice page

### Key Components

- **AuthModal**: `frontend/src/components/AuthModal.tsx` - Email input modal
- **AuthVerify Page**: `frontend/src/pages/AuthVerify.tsx` - Token verification
- **Auth Service**: `backend/src/services/auth.ts` - Token generation/verification
- **Email Service**: `backend/src/services/email.ts` - Email sending (Resend API)

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

### Prerequisites

1. **Cloudflare Account**: Create a free account at cloudflare.com
2. **GitHub Repository**: Code must be in a GitHub repository
3. **Domain Name**: Optional, but recommended for production

### Setting Up Cloudflare Workers

#### 1. Create D1 Database

```bash
# Create production database
wrangler d1 create mirubato-prod

# Note the database_id returned, you'll need it for configuration
```

#### 2. Create KV Namespace

```bash
# Create KV namespace for magic links
wrangler kv:namespace create "MIRUBATO_MAGIC_LINKS"

# Note the namespace_id returned, you'll need it for configuration
```

#### 3. Run Database Migrations

```bash
cd backend
# Apply to local database
wrangler d1 migrations apply mirubato-dev --local

# Apply to production database
wrangler d1 migrations apply mirubato-prod --remote
```

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
    "ENVIRONMENT": "production",
    "JWT_SECRET": "your-production-secret-here"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "mirubato-prod",
      "database_id": "your-database-id-here"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "MIRUBATO_MAGIC_LINKS",
      "id": "your-kv-namespace-id-here"
    }
  ],
  "build": {
    "command": "npm run build"
  },
  "compatibility_flags": ["nodejs_compat"]
}
```

### Cloudflare Dashboard Setup

#### 1. Connect GitHub Repository

1. Go to Cloudflare Dashboard → Workers & Pages
2. Click "Create application" → "Pages" → "Connect to Git"
3. Select your GitHub repository
4. Configure build settings:
   - **Frontend**:
     - Build command: `npm run build`
     - Build output directory: `frontend/dist`
     - Root directory: `/`
   - **Backend**: Create as a separate Worker, not Pages

#### 2. Environment Variables

Set these in Cloudflare Dashboard → Your Worker → Settings → Variables:

**Backend Worker**:

- `JWT_SECRET`: A secure random string
- `ENVIRONMENT`: `production`
- `RESEND_API_KEY`: Your Resend API key (for sending emails)

**Frontend Worker**:

- No environment variables needed (uses .env.production during build)

#### 3. Bindings Configuration

In Cloudflare Dashboard → Your Backend Worker → Settings → Bindings:

**D1 Database**:

- Binding name: `DB`
- Database: Select your `mirubato-prod` database

**KV Namespace**:

- Binding name: `MIRUBATO_MAGIC_LINKS`
- Namespace: Select your created KV namespace

### Custom Domain Setup

1. **Frontend Domain** (mirubato.com):

   - Go to Workers & Pages → Your Frontend → Custom Domains
   - Add `mirubato.com`
   - Follow DNS configuration instructions

2. **Backend Domain** (api.mirubato.com):
   - Go to Workers & Pages → Your Backend Worker → Triggers
   - Add custom domain `api.mirubato.com`
   - Configure DNS as instructed

### Environment Variables

1. **Frontend Production** (`.env.production`):

   ```env
   VITE_GRAPHQL_ENDPOINT=https://api.mirubato.com/graphql
   VITE_PUBLIC_URL=https://mirubato.com
   VITE_ENV=production
   ```

2. **Backend Production**:
   Set in Cloudflare Dashboard → Workers → Settings → Variables:
   - `JWT_SECRET`: Generate a secure random string
   - `ENVIRONMENT`: `production`
   - `RESEND_API_KEY`: Your Resend API key

### Email Service Setup

1. **Create Resend Account**: Sign up at resend.com
2. **Verify Domain**: Add your domain to Resend and verify DNS records
3. **Get API Key**: Copy your API key from Resend dashboard
4. **Configure**: Add `RESEND_API_KEY` to backend environment variables

### Build Process

The build process for Cloudflare deployment:

1. **Email Templates**: Templates are pre-compiled during build

   ```bash
   cd backend
   npm run build:templates  # Generates compiled-templates.ts
   npm run build           # Builds TypeScript
   ```

2. **Frontend Build**:
   ```bash
   cd frontend
   npm run build  # Vite builds to dist/
   ```

### Deployment Checklist

- [ ] D1 database created and migrations applied
- [ ] KV namespace created for magic links
- [ ] GitHub repository connected to Cloudflare
- [ ] Environment variables configured in Cloudflare
- [ ] Custom domains configured (optional)
- [ ] Email service (Resend) configured
- [ ] Build commands tested locally
- [ ] Production environment files created

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
npm run codegen -w @mirubato/frontend
```

### Backend-Specific Scripts

```bash
# Run from root with workspace flag
npm run dev -w @mirubato/backend
npm run build -w @mirubato/backend
npm run build:templates -w @mirubato/backend
npm run test -w @mirubato/backend
npm run codegen -w @mirubato/backend
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

2. **Authentication**

   - Magic link authentication modal
   - Email validation and error handling
   - Token verification page
   - JWT token management with Apollo Client

3. **Practice Page**

   - Full music notation rendering with VexFlow
   - 20 measures of Beethoven's Moonlight Sonata 3rd Movement
   - Real piano sounds using Salamander Grand Piano samples
   - Adjustable tempo control (30-180 BPM)
   - Responsive design for desktop, tablet, and mobile
   - Measure tracking and progress display
   - Circular volume control

4. **Audio System**

   - Real piano samples via Tone.js Sampler
   - audioManager utility for centralized audio handling
   - Support for multiple instruments (piano implemented, guitar ready)
   - Mobile audio context handling

5. **Sheet Music System**
   - Organized data structure in `frontend/src/data/sheetMusic/`
   - TypeScript interfaces for type safety
   - Reusable NotationRenderer for any sheet music
   - Easy to add new pieces

### Backend Features

1. **GraphQL API**

   - Apollo Server on Cloudflare Workers
   - Complete type-safe schema
   - Authentication with magic links and JWT
   - Rate limiting support

2. **Database**

   - Cloudflare D1 (SQLite) database
   - 5 migration files for complete schema
   - User management and practice tracking

3. **Authentication System**

   - Magic link generation with KV storage
   - JWT token generation and validation
   - Secure password-less authentication
   - Token expiration handling

4. **Email Service**
   - HTML and text email templates
   - Build-time template compilation
   - Resend API integration
   - Development console logging

## Dependencies

### Frontend Dependencies

- `react` & `react-dom` - UI framework
- `react-router-dom` - Page routing
- `@apollo/client` - GraphQL client
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
- **Authentication Tests**: Magic link flow testing
- **Local Storage Tests**: Data persistence verification

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

5. **Magic link not working**:
   - Verify KV namespace is properly configured
   - Check email service configuration
   - Ensure frontend URL in email matches local port (3000)

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
- ✅ Authentication UI with magic links
- ✅ Auth verification page
- Build data sync UI for authenticated users
- Add instrument selection (guitar/piano toggle)
- Add visual feedback for currently playing notes

### Backend

- ✅ GraphQL API fully implemented
- ✅ Authentication system with magic links
- ✅ Email templates with build-time compilation
- ✅ KV namespace for token storage
- Implement real email service integration
- Add data sync mutations for practice sessions
- Complete sheet music service
- Add rate limiting with Durable Objects

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
   wrangler d1 migrations apply mirubato-dev --local
   ```

5. **Email Templates**: After modifying email templates, rebuild:
   ```bash
   cd backend
   npm run build:templates
   ```
