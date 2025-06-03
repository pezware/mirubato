# Mirubato Development Guide

This guide covers both local development setup and deployment procedures for Mirubato.

## Table of Contents

- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Deployment](#deployment)
- [Authentication System](#authentication-system)
- [Local-First Architecture](#local-first-architecture)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)

## Project Structure

Mirubato is organized as a monorepo with separate frontend and backend packages, plus a shared types package:

```
mirubato/
├── frontend/              # React frontend application
│   ├── src/              # Frontend source code
│   ├── public/           # Static assets
│   ├── tests/            # Frontend tests
│   ├── wrangler.toml     # Cloudflare Workers config
│   └── package.json      # Frontend dependencies
├── backend/              # GraphQL API (Cloudflare Workers)
│   ├── src/              # Backend source code
│   ├── migrations/       # Database migrations
│   ├── wrangler.toml     # Cloudflare Workers config
│   └── package.json      # Backend dependencies
├── shared/               # Shared types and utilities
│   ├── types/            # TypeScript type definitions
│   │   ├── index.ts      # Main types export
│   │   └── validation.ts # Data validation utilities
│   ├── config/           # Unified configuration
│   │   └── environment.ts # Environment detection and config
│   └── package.json      # Shared package configuration
├── config/               # Global configuration
│   └── environments.json # Environment settings (IDs, domains)
├── scripts/              # Build and utility scripts
├── docs/                 # Documentation
└── package.json          # Root monorepo configuration
```

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/mirubato.git
cd mirubato

# Install all dependencies (root + workspaces)
npm install
```

### 2. Configure Your Domain

Edit `config/environments.json` to set your domain and Cloudflare team:

```json
{
  "MYDOMAIN": "yourdomain.com",
  "MYTEAM": "yourteam"
}
```

### 3. Start Development Servers

```bash
# Start frontend (http://localhost:3000)
npm run dev

# Start backend in another terminal (http://localhost:8787)
npm run dev:backend
```

## Development Setup

### Environment Configuration

We use `wrangler.toml` files that define all environments in a single file. No manual configuration generation is needed.

#### Available Environments

1. **Production** (default - no `--env` flag)

   - This is the default configuration used by Cloudflare's automated deployment
   - Frontend: `https://{MYDOMAIN}`, `https://www.{MYDOMAIN}`
   - Backend: `https://api.{MYDOMAIN}`
   - Uses production database and KV namespaces

2. **Local Development** (`--env local`)

   - Uses placeholder IDs for D1 and KV namespaces
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:8787`
   - GraphQL Playground: `http://localhost:8787/graphql`

3. **Development/Preview** (`--env dev`)

   - Deploys to Cloudflare with dev database and KV namespaces
   - Frontend: `https://*-mirubato.{MYTEAM}.workers.dev`
   - Backend: `https://*-mirubato-backend.{MYTEAM}.workers.dev`

4. **Staging** (`--env staging`)

   - Uses staging database and KV namespaces
   - Frontend: `https://mirubato-staging.{MYTEAM}.workers.dev`
   - Backend: `https://mirubato-backend-staging.{MYTEAM}.workers.dev`

### Local Development

```bash
# Backend development server
cd backend
npm run dev

# Frontend development server (in another terminal)
cd frontend
npm run dev
```

### Environment Variables

For local development, create `.dev.vars` file in the backend directory:

```
JWT_SECRET=your-local-jwt-secret
RESEND_API_KEY=your-local-api-key
```

For environment-specific local secrets, create `.dev.vars.<environment>`:

- `.dev.vars.dev`
- `.dev.vars.staging`

## Deployment

### Prerequisites

1. **Cloudflare Account**: Create a free account at cloudflare.com
2. **Wrangler CLI**: Installed automatically with npm install
3. **Domain Name**: Optional for staging, required for production

### Step 1: Create Cloudflare Resources

#### Create D1 Databases

```bash
# Development database (if not exists)
wrangler d1 create mirubato-dev

# Staging database
wrangler d1 create mirubato-staging

# Production database
wrangler d1 create mirubato-prod
```

#### Create KV Namespaces

```bash
# Development KV namespace
wrangler kv:namespace create "MIRUBATO_MAGIC_LINKS" --preview

# Staging KV namespace
wrangler kv:namespace create "MIRUBATO_MAGIC_LINKS" --env staging

# Production KV namespace
wrangler kv:namespace create "MIRUBATO_MAGIC_LINKS" --env production
```

### Step 2: Update Configuration

After creating resources, update the IDs in `backend/wrangler.toml` and `frontend/wrangler.toml` with the IDs returned by Wrangler.

### Step 3: Run Database Migrations

```bash
cd backend

# Apply migrations to local database
npm run db:migrate

# Apply to production (default environment)
npm run db:migrate:remote

# Apply to dev environment
npm run db:migrate:dev

# Apply to staging
npm run db:migrate:staging

# Apply to production explicitly
npm run db:migrate:production
```

### Step 4: Deploy

#### Backend Deployment

```bash
cd backend

# Deploy to development
npm run deploy:dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

#### Frontend Deployment

```bash
cd frontend

# Build the frontend first
npm run build

# Deploy to development
npm run deploy:dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

### Step 5: Configure Secrets

Secrets must be set per environment:

```bash
# Set JWT secret for production
wrangler secret put JWT_SECRET --env production

# Set email API key for production
wrangler secret put RESEND_API_KEY --env production
```

### Step 6: Custom Domain Setup (Production)

1. **Frontend Domain** (yourdomain.com):

   - Go to Workers & Pages → Your Frontend Worker → Triggers
   - Add custom domains: `yourdomain.com` and `www.yourdomain.com`
   - Configure DNS as instructed

2. **Backend Domain** (api.yourdomain.com):
   - Go to Workers & Pages → Your Backend Worker → Triggers
   - Add custom domain: `api.yourdomain.com`
   - Configure DNS as instructed

## Authentication System

Mirubato uses a passwordless magic link authentication system:

1. User enters email address
2. Backend generates a unique token and stores it in KV namespace
3. Email is sent with a magic link containing the token
4. User clicks the link and is redirected to `/auth/verify?token=...`
5. Backend verifies the token and issues JWT tokens
6. User is logged in and redirected to the practice page

### Email Service Setup

1. **Create Resend Account**: Sign up at resend.com
2. **Verify Domain**: Add your domain to Resend and verify DNS records
3. **Get API Key**: Copy your API key from Resend dashboard
4. **Configure**: Add `RESEND_API_KEY` to backend environment variables

## Local-First Architecture

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
5. **Add frontend functionality**

### Testing

```bash
# Run all tests
npm test

# Unit tests only
npm test:unit

# Integration tests
npm test:integration

# Test coverage
npm test:coverage
```

### Available Scripts

#### Root Level

- `npm run dev` - Start frontend development server
- `npm run dev:backend` - Start backend development server
- `npm test` - Run all workspace tests
- `npm run lint` - Run ESLint on all workspaces
- `npm run type-check` - TypeScript checking

#### Backend Scripts

- `npm run build` - Build for production
- `npm run build:dev` - Build for development (skips version generation)
- `npm run deploy:dev` - Deploy to development
- `npm run deploy:staging` - Deploy to staging
- `npm run deploy:production` - Deploy to production

#### Frontend Scripts

- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run deploy:dev` - Deploy to development
- `npm run deploy:staging` - Deploy to staging
- `npm run deploy:production` - Deploy to production

## Cloudflare Build Integration

For automatic deployments via Cloudflare's GitHub integration:

1. **Build Command**: `npm run build`
2. **Deploy Command**: `npm run deploy:version` (for version uploads)
3. **Root Directory**: `/backend` or `/frontend` (depending on which app)

## Troubleshooting

### Common Issues

1. **CORS errors**

   - Check that the backend is running
   - Verify frontend is configured with correct GraphQL endpoint
   - Each environment has its own CORS configuration

2. **TypeScript errors with shared types**

   - Run `npm install` from root to link workspaces

3. **Database connection issues**

   - Ensure D1 database ID is correctly set in wrangler.toml
   - Verify you've run migrations for your environment

4. **Email not sending**

   - Verify RESEND_API_KEY is set in environment variables
   - Check Resend dashboard for domain verification

5. **Build loops in development**
   - The wrangler.toml configuration uses different build commands:
     - Local/dev uses `npm run build:dev` (skips version generation)
     - Staging/production uses `npm run build` (includes version generation)

### Development Tips

1. **GraphQL Playground**: Access at `http://localhost:8787/graphql`
2. **Apollo DevTools**: Install browser extension for debugging
3. **Hot Reload**: Both frontend and backend support hot reload
4. **Type Safety**: Run `npm run type-check` frequently

## Best Practices

1. **Always test in staging** before deploying to production
2. **Use version uploads** for production deployments to enable rollbacks
3. **Set secrets per environment** - never commit secrets to the repository
4. **Monitor deployments** via the Cloudflare dashboard
5. **Run migrations manually** before deploying code that depends on schema changes

## Rollback Procedure

If a deployment causes issues:

```bash
# List available versions
wrangler versions list --env production

# Deploy a previous version
wrangler versions deploy <version-id> --env production
```

## Security Notes

- **JWT Secret**: Use a strong, random secret in production
- **CORS**: Configuration is centralized in `backend/src/config/cors.ts`
- **Environment Variables**: Never commit secrets to the repository
- **KV Namespace**: Magic link tokens expire after 1 hour

## Next Steps

After setting up your development environment:

1. Run the application locally to ensure everything works
2. Create your Cloudflare resources (databases and KV namespaces)
3. Deploy to staging for testing
4. Configure custom domains for production
5. Set up email service with Resend
6. Deploy to production

For any issues or questions, refer to the troubleshooting section or create an issue in the GitHub repository.
