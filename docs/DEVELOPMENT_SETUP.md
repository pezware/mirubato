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
│   ├── config/           # Unified configuration
│   │   └── environment.ts # Environment detection and config
│   └── package.json      # Shared package configuration
├── config/               # Global configuration
│   └── environments.json # Unified environment configuration
├── scripts/              # Build and configuration scripts
│   ├── generate-wrangler-config.js # Generate wrangler.json files
│   └── generate-env-files.js       # Generate .env files
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

3. **Configure for your domain**

   Edit `config/environments.json`:

   ```json
   {
     "MYDOMAIN": "yourdomain.com",
     "MYTEAM": "yourteam"
   }
   ```

4. **Generate environment files**

   ```bash
   # Generate local development configs
   node scripts/generate-env-files.js both local

   # Generate wrangler configs for local development
   node scripts/generate-wrangler-config.js both local
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

## Unified Configuration System

### Overview

All configuration is managed through a single file: `config/environments.json`

This file contains:

- Your domain name (MYDOMAIN)
- Your Cloudflare team/account name (MYTEAM)
- Environment-specific settings for local, preview, staging, and production
- Database and KV namespace configurations
- Worker names and API paths

### Configuration Structure

```json
{
  "MYDOMAIN": "mirubato.com",  // Your primary domain
  "MYTEAM": "arbeitandy",       // Your Cloudflare account name

  "environments": {
    "local": { ... },          // Local development
    "preview": { ... },        // Preview deployments
    "staging": { ... },        // Staging environment
    "production": { ... }      // Production environment
  }
}
```

### Environment Details

#### Local Development

- Frontend: http://localhost:3000
- Backend: http://localhost:8787
- Database: mirubato-dev (local D1 instance)

#### Preview Deployments

- Frontend: https://\*-mirubato.{MYTEAM}.workers.dev
- Backend: https://\*-mirubato-backend.{MYTEAM}.workers.dev
- Database: mirubato-dev (shared development database)

#### Staging

- Frontend: https://mirubato.{MYTEAM}.workers.dev
- Backend: https://mirubato-backend.{MYTEAM}.workers.dev
- Database: mirubato-staging (separate staging database)

#### Production

- Frontend: https://{MYDOMAIN}, https://www.{MYDOMAIN}
- Backend: https://api.{MYDOMAIN}
- Database: mirubato-prod (production database)

## Deployment Guide

### Prerequisites

1. **Cloudflare Account**: Create a free account at cloudflare.com
2. **GitHub Repository**: Code must be in a GitHub repository
3. **Domain Name**: Optional for staging, required for production

### Step 1: Create Cloudflare Resources

#### Create D1 Databases

```bash
# Create development database (already exists by default)
wrangler d1 create mirubato-dev

# Create staging database
wrangler d1 create mirubato-staging

# Create production database
wrangler d1 create mirubato-prod
```

#### Create KV Namespaces

```bash
# Create development KV namespace
wrangler kv:namespace create "MIRUBATO_MAGIC_LINKS" --preview

# Create staging KV namespace
wrangler kv:namespace create "MIRUBATO_MAGIC_LINKS" --env staging

# Create production KV namespace
wrangler kv:namespace create "MIRUBATO_MAGIC_LINKS" --env production
```

### Step 2: Update Configuration

After creating these resources, update `config/environments.json` with the IDs returned by Wrangler:

```json
{
  "environments": {
    "staging": {
      "database": {
        "id": "YOUR-STAGING-DB-ID-HERE"
      },
      "kv": {
        "magicLinks": {
          "id": "YOUR-STAGING-KV-ID-HERE"
        }
      }
    },
    "production": {
      "database": {
        "id": "YOUR-PRODUCTION-DB-ID-HERE"
      },
      "kv": {
        "magicLinks": {
          "id": "YOUR-PRODUCTION-KV-ID-HERE"
        }
      }
    }
  }
}
```

### Step 3: Run Database Migrations

```bash
cd backend

# Apply to development database
wrangler d1 migrations apply mirubato-dev --local

# Apply to staging database
wrangler d1 migrations apply mirubato-staging --remote

# Apply to production database
wrangler d1 migrations apply mirubato-prod --remote
```

### Step 4: Generate Configuration Files

```bash
# Generate staging configurations
node scripts/generate-wrangler-config.js both staging
node scripts/generate-env-files.js both staging

# Generate production configurations
node scripts/generate-wrangler-config.js both production
node scripts/generate-env-files.js both production
```

### Step 5: Deploy to Cloudflare

#### Deploy to Staging

```bash
# Deploy backend
cd backend && wrangler deploy --env staging

# Deploy frontend
cd ../frontend && wrangler deploy --env staging
```

#### Deploy to Production

```bash
# Deploy backend
cd backend && wrangler deploy --env production

# Deploy frontend
cd ../frontend && wrangler deploy --env production
```

### Step 6: Configure Environment Variables

In Cloudflare Dashboard → Your Worker → Settings → Variables:

**Backend Worker**:

- `JWT_SECRET`: A secure random string
- `RESEND_API_KEY`: Your Resend API key (for sending emails)

### Step 7: Custom Domain Setup (Production Only)

1. **Frontend Domain** (yourdomain.com):

   - Go to Workers & Pages → Your Frontend Worker → Triggers
   - Add custom domain `yourdomain.com` and `www.yourdomain.com`
   - Configure DNS as instructed

2. **Backend Domain** (api.yourdomain.com):
   - Go to Workers & Pages → Your Backend Worker → Triggers
   - Add custom domain `api.yourdomain.com`
   - Configure DNS as instructed

## Frontend Structure

```
frontend/
├── src/
│   ├── components/      # React components
│   ├── contexts/       # React contexts
│   ├── config/         # Configuration files
│   │   └── endpoints.ts # API endpoint configuration
│   ├── data/           # Sheet music and exercise data
│   ├── graphql/        # GraphQL queries and mutations
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # External library configurations
│   ├── pages/          # Page components
│   ├── services/       # Frontend services
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── styles/         # Global styles
│   ├── App.tsx         # Main app component with routing
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── scripts/            # Build scripts
│   └── update-version.js # Version tracking script
├── tests/              # Integration tests
└── package.json        # Frontend-specific dependencies
```

## Backend Structure

```
backend/
├── src/
│   ├── __tests__/      # Unit and integration tests
│   ├── config/         # Configuration files
│   │   └── cors.ts     # CORS configuration
│   ├── middleware/     # Express-style middleware
│   ├── resolvers/      # GraphQL resolvers
│   ├── schema/         # GraphQL schema
│   ├── services/       # Business logic
│   ├── templates/      # Email templates
│   ├── types/          # TypeScript types
│   ├── utils/          # Utilities
│   └── index.ts        # Entry point
├── scripts/            # Build scripts
├── migrations/         # D1 database migrations
├── wrangler.json       # Cloudflare Workers config
└── package.json        # Backend-specific dependencies
```

## Authentication System

### Overview

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
5. **Add frontend functionality**

### Testing

- **Unit tests**: `npm test:unit`
- **Integration tests**: `npm test:integration`
- **All tests**: `npm test`

## Available Scripts

### Configuration Scripts

- `node scripts/generate-wrangler-config.js [backend|frontend|both] [environment]`
- `node scripts/generate-env-files.js [backend|frontend|both] [environment]`

### Development Scripts

- `npm run dev` - Start frontend development server
- `npm run dev:backend` - Start backend development server
- `npm run build` - Build frontend for production
- `npm run build:backend` - Build backend for production
- `npm test` - Run all tests
- `npm run lint` - Run ESLint on all workspaces
- `npm run type-check` - Run TypeScript checking

## Troubleshooting

### Common Issues

1. **CORS errors**: Check that the backend is running and frontend is configured with correct GraphQL endpoint

2. **TypeScript errors with shared types**: Run `npm install` from root to link workspaces

3. **Database connection issues**: Ensure D1 database ID is correctly set in wrangler.json

4. **Email not sending**: Verify RESEND_API_KEY is set in environment variables

### Development Tips

1. **GraphQL Playground**: Access at `http://localhost:8787/graphql`
2. **Apollo DevTools**: Install browser extension for debugging
3. **Hot Reload**: Both frontend and backend support hot reload
4. **Type Safety**: Run `npm run type-check` frequently

## Migrating to a New Domain

To deploy Mirubato to a different domain:

1. **Update configuration**:

   ```json
   {
     "MYDOMAIN": "newdomain.com",
     "MYTEAM": "yourteam"
   }
   ```

2. **Generate new configs**:

   ```bash
   node scripts/generate-wrangler-config.js both production
   node scripts/generate-env-files.js both production
   ```

3. **Deploy and configure custom domains in Cloudflare**

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
