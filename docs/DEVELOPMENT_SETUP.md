# Mirubato Development Setup

## Project Structure

Mirubato is organized as a monorepo with separate frontend and backend packages:

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

4. **Start development servers**
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

## Next Steps

### Frontend
- Install and configure Apollo Client
- Create authentication UI
- Connect to GraphQL backend
- Add instrument selection (guitar/piano toggle)
- Add visual feedback for currently playing notes

### Backend
- Implement real email service (Resend/SendGrid)
- Complete sheet music service
- Implement practice session service
- Deploy to Cloudflare Workers

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