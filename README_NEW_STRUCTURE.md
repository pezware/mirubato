# New Project Structure

This project has been reorganized into a monorepo structure with separate frontend and backend folders.

## Structure

```
mirubato/
├── frontend/              # React frontend application
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   ├── tests/            # Integration tests
│   ├── package.json      # Frontend dependencies
│   └── vite.config.ts    # Vite configuration
├── backend/              # GraphQL API (Cloudflare Workers)
│   ├── src/              # Source code
│   ├── migrations/       # Database migrations
│   ├── package.json      # Backend dependencies
│   └── wrangler.toml     # Cloudflare Workers config
├── docs/                 # Documentation
├── package.json          # Root monorepo configuration
└── README.md            # Main project README
```

## Installation

Due to some dependency issues with the current npm setup, you may need to install dependencies in each workspace separately:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies  
cd ../frontend
npm install
```

## Running the Project

From the root directory:

```bash
# Run frontend development server
npm run dev

# Run backend development server
npm run dev:backend

# Run tests
npm test

# Build for production
npm run build
```

## Benefits of This Structure

1. **Clear separation** between frontend and backend code
2. **Independent deployment** of frontend and backend
3. **Better dependency management** - no mixing of frontend/backend deps
4. **Easier onboarding** - clear where each type of code lives
5. **Scalability** - easy to add more services or packages

## Next Steps

1. Fix npm workspace installation issues
2. Update CI/CD scripts for the new structure
3. Update deployment configurations
4. Update documentation to reflect new paths