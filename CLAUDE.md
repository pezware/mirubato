# CLAUDE.md - AI Agent Quick Reference

## 🚨 CRITICAL: Start Here

### Deployment Architecture (2025)

- **Frontend & Backend**: Both are Cloudflare Workers (NOT Pages)
- **Configuration**: Environment-based `wrangler.toml` files (no manual generation)
- **Deployment**: Auto-triggered by GitHub push (uses top-level production config)
- **Key Files**: `frontend/wrangler.toml`, `backend/wrangler.toml`

### Essential Commands

```bash
# Local Development
npm install                    # Install all dependencies
npm run dev                    # Start frontend (port 3000)
npm run dev:backend            # Start backend (port 8787) - uses --env local

# Backend Development (NEW SYSTEM)
cd backend && npm run dev      # Full dev workflow (build + server)
cd backend && npm run dev:build # Development build only
cd backend && npm run dev:watch # TypeScript watch mode
cd backend && npm run build    # Production build

# GraphQL Development (IMPORTANT!)
npm run codegen                # Generate TypeScript types from GraphQL schema
npm run codegen:watch          # Auto-generate on schema changes
npm run codegen:check          # Verify frontend-backend alignment

# Deployment (from respective directories)
# Backend
cd backend && wrangler deploy              # Deploy to production (default)
cd backend && wrangler deploy --env staging # Deploy to staging
cd backend && wrangler deploy --env dev    # Deploy to development

# Frontend
cd frontend && wrangler deploy             # Deploy to production (default)
cd frontend && wrangler deploy --env staging # Deploy to staging
cd frontend && wrangler deploy --env dev   # Deploy to development

# API
cd api && wrangler deploy                  # Deploy to production (default)
cd api && wrangler deploy --env staging    # Deploy to staging

# Scores
cd scores && wrangler deploy               # Deploy to production (default)
cd scores && wrangler deploy --env staging # Deploy to staging
```

### Project Structure

```
mirubato/
├── frontend/          # React app → Cloudflare Worker
│   └── wrangler.toml  # All environments defined here
├── backend/           # GraphQL API → Cloudflare Worker
│   └── wrangler.toml  # All environments defined here
├── shared/            # Shared types & configs
└── config/
    └── environments.json  # Domain and team configuration
```

## 🛠 Quick Debugging Reference

For comprehensive debugging information, see **[docs/DEBUG.md](./docs/DEBUG.md)**

### Quick Links

- **Production Health Check**: `https://api.mirubato.com/health`
- **GraphQL Playground**: `https://api.mirubato.com/graphql`
- **CORS Debug**: `https://api.mirubato.com/debug/cors`

### Common Issues

| Problem                  | See DEBUG.md Section         |
| ------------------------ | ---------------------------- |
| VexFlow "Too Many Ticks" | Known Issues #1              |
| GraphQL 500 errors       | Known Issues #2              |
| Mobile audio issues      | Known Issues #6              |
| Type misalignment        | Common Development Issues #1 |
| Memory leaks             | Common Development Issues #4 |

## 📋 Development Checklist

### Before Starting Work

- [ ] Pull latest from main
- [ ] Run `npm install` if package.json changed
- [ ] Generate configs for your environment
- [ ] Check `/health` endpoint if working with production

### When Writing New Code

- [ ] **Write tests FIRST** - Follow Test-Driven Development (TDD)
- [ ] Ensure >80% test coverage (90% for critical paths)
- [ ] No function is complete without tests
- [ ] Tests are the primary metric of feature completeness

### Before Committing

- [ ] All tests pass with proper coverage
- [ ] Let pre-commit hooks run (NEVER use `--no-verify`)
- [ ] No `console.log` statements in code
- [ ] No `any` types in TypeScript
- [ ] **GraphQL types are generated and up-to-date** (run `npm run codegen`)
- [ ] Update CLAUDE.md if you discover new patterns

### Key Principles

1. **Test First**: Write tests before implementation - tests define the spec
2. **Education First**: Features must enhance sight-reading learning
3. **Instrument Specific**: Guitar ≠ Piano (positions, fingerings, notation)
4. **Mobile First**: Test on actual devices
5. **Open Source**: Keep endpoints public for debugging
6. **PATH** always use pwd to check what is current path
7. **BRANCH** always check what is current branch, if at main branch, must create a new branch before editing.

## 🎯 Current Focus Areas

### Immediate Priority: MVP Simplification (2 Weeks)

1. **Week 1**: Stabilization & Bug Fixes

   - Fix VexFlow rendering bugs
   - Fix audio playback issues
   - Ensure mobile compatibility
   - Disable complex modules temporarily

2. **Week 2**: Content & Polish
   - Add 10 curated pieces (5 piano, 5 guitar)
   - Implement preset practice workouts
   - Simplify UI to single "Practice" mode

### Technical Debt (Ongoing)

1. **Type Alignment** (IN PROGRESS)

   - Unify types across backend/frontend/shared
   - Setup GraphQL Code Generator
   - Remove duplicate type definitions

2. **Code Quality**
   - Remove console.log statements
   - Split large classes (700+ lines)
   - Replace `any` types with proper types

### Core Technologies

- **Frontend**: React + TypeScript + Vite + Tailwind
- **Backend**: Cloudflare Workers + GraphQL + D1 (SQLite)
- **Auth**: Magic links + JWT
- **Music**: VexFlow.js (notation) + Tone.js (audio)

### Module Implementation Guidelines

When implementing any new module, **ALWAYS** follow these steps:

1. **Write Tests First (TDD)**

   - Create comprehensive test suite BEFORE implementation
   - Aim for >80% coverage (90% for critical modules)
   - Tests define the specification

2. **Add TypeDoc Documentation**

   - Document all public interfaces with JSDoc comments
   - Include examples in documentation
   - Run `npm run docs:generate` to verify

3. **Verify Test Coverage**
   - Run `npm test -- --coverage` for the module
   - Ensure coverage meets requirements
   - No module is complete without proper tests

Example workflow:

```bash
# 1. Create test file first
touch src/modules/newModule/NewModule.test.ts

# 2. Write tests that define behavior
# 3. Implement module to make tests pass
# 4. Add JSDoc comments
# 5. Generate and verify documentation
npm run docs:generate

# 6. Check coverage
npm test -- src/modules/newModule --coverage
```

### GraphQL Development Workflow

**IMPORTANT**: We use GraphQL Code Generation to ensure frontend-backend alignment. Never write GraphQL queries manually without running codegen!

```bash
# When modifying GraphQL schema or queries:
1. Make changes to backend schema or frontend queries
2. Run: npm run codegen
3. Commit generated files with your changes
4. Pre-commit hook will verify alignment

# During development:
npm run codegen:watch  # Auto-generates on file changes
```

**Generated files location**: `frontend/src/generated/`

- `graphql.ts` - All types and hooks
- `introspection.json` - Schema introspection for tooling

### Musical Implementation

```typescript
// Guitar: positions (I-XIX), strings, fingerings (p,i,m,a)
// Piano: grand staff, hand independence, fingerings (1-5)

// Always handle audio context for mobile
await Tone.start() // Required for mobile browsers
```

### Database Pattern

```sql
-- D1 uses SQLite syntax
-- Always include proper indexes
CREATE INDEX idx_sessions_user ON practice_sessions(user_id);
```

## 🚀 Deployment Workflow

### Configuration System

1. **Environment-based**: All environments defined in `wrangler.toml`
2. **Production default**: Top-level config is production (no --env flag needed)
3. **Local development**: Uses `--env local` for placeholder values
4. **No manual generation**: Direct deployment with wrangler

### Environment Detection

- Local: `localhost:3000`
- Staging: `mirubato.pezware.workers.dev`
- Production: `mirubato.com`, `api.mirubato.com`

### Database Migrations

```bash
cd backend

# Local migrations
npm run db:migrate

# Remote migrations by environment
npm run db:migrate:dev         # Development environment
npm run db:migrate:staging     # Staging environment
npm run db:migrate:production  # Production environment
```

## 🧪 Testing Guidelines

### Test-Driven Development (TDD)

1. **Write the test first** - The test defines the expected behavior
2. **Run the test** - It should fail (red)
3. **Write minimal code** - Just enough to make the test pass (green)
4. **Refactor** - Improve the code while keeping tests passing

### Coverage Requirements

- **Overall**: Minimum 80% coverage
- **Critical Paths**: Minimum 90% coverage (auth, payments, core features)
- **New Code**: Must have tests before merging

### Running Tests

```bash
# Run all tests with coverage
npm run test:coverage

# Run specific workspace tests
npm test -w @mirubato/frontend
npm test -w @mirubato/backend

# Run specific test file
npm test -- src/utils/audioManager.test.ts

# Watch mode for development
npm test -- --watch
```

### Current Test Status (as of latest update)

- **Frontend Coverage**: ~29% (Target: 80%)
  - ✅ AuthContext: 100%
  - ✅ notationRenderer: 100%
  - ✅ audioManager: 91.54%
  - ✅ Practice page: 91.66%
- **Backend Coverage**: ~43% (Target: 80%)
  - ✅ practice resolver: 100%
  - ✅ sheetMusic resolver: 100%
  - ✅ auth service: 100%

## 📚 Key Documentation

- **Development**: `docs/DEVELOPMENT.md` (setup, development, deployment)
- **Infrastructure**: `docs/DESIGN.md`
- **Roadmap**: `docs/ROADMAP.md` (includes detailed test coverage status)

## 🎓 Educational Context

### Sight-Reading Method

- **Keep Going**: Don't stop for mistakes
- **Progressive**: Gradual difficulty increase
- **Instrument-Specific**: Respect guitar vs piano differences

### Content Licensing

- Educational content: CC BY 4.0 (attribute properly)
- Code: MIT License
- Music: Public domain from IMSLP

---

**Remember**: When in doubt, check the production endpoints first. They're your debugging lifeline.
