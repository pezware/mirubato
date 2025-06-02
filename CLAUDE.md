# CLAUDE.md - AI Agent Quick Reference

## 🚨 CRITICAL: Start Here

### Deployment Architecture (2025)

- **Frontend & Backend**: Both are Cloudflare Workers (NOT Pages)
- **Configuration**: Unified config in `config/environments.json`
- **Deployment**: Auto-triggered by GitHub push (no GitHub Actions needed)
- **Key Files**: `frontend/wrangler.json`, `backend/wrangler.json`

### Essential Commands

```bash
# Local Development
npm install                                          # Install all dependencies
node scripts/generate-wrangler-config.js both local  # Generate local configs
npm run dev                                          # Start frontend (port 3000)
npm run dev:backend                                  # Start backend (port 8787)

# Deployment
node scripts/generate-wrangler-config.js both production
cd backend && wrangler deploy
cd ../frontend && wrangler deploy
```

### Project Structure

```
mirubato/
├── frontend/          # React app → Cloudflare Worker
├── backend/           # GraphQL API → Cloudflare Worker
├── shared/            # Shared types & configs
├── config/
│   └── environments.json  # ⚡ All env configs here
└── scripts/           # Config generation scripts
```

## 🛠 Quick Debugging Tools

### Production Endpoints (Always Available)

1. **Health Check**: `https://api.mirubato.com/health`

   - Shows version, environment, timestamp
   - First thing to check when debugging

2. **GraphQL Playground**: `https://api.mirubato.com/graphql`

   - Test queries, check schema, debug auth
   - Introspection enabled for transparency

3. **CORS Debug**: `https://api.mirubato.com/debug/cors`
   - Diagnose cross-origin issues

### Common Issues & Solutions

| Problem          | Quick Fix                                             |
| ---------------- | ----------------------------------------------------- |
| CORS errors      | Check origin in `/debug/cors` endpoint                |
| Backend down     | Check `/health` endpoint                              |
| Config issues    | Regenerate with `scripts/generate-wrangler-config.js` |
| Version mismatch | Compare `/health` version with git commits            |

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
- [ ] Update CLAUDE.md if you discover new patterns

### Key Principles

1. **Test First**: Write tests before implementation - tests define the spec
2. **Education First**: Features must enhance sight-reading learning
3. **Instrument Specific**: Guitar ≠ Piano (positions, fingerings, notation)
4. **Mobile First**: Test on actual devices
5. **Open Source**: Keep endpoints public for debugging

## 🎯 Focus Areas

### Core Technologies

- **Frontend**: React + TypeScript + Vite + Tailwind
- **Backend**: Cloudflare Workers + GraphQL + D1 (SQLite)
- **Auth**: Magic links + JWT
- **Music**: VexFlow.js (notation) + Tone.js (audio)

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

1. Edit `config/environments.json` (single source of truth)
2. Run generation scripts
3. Deploy with wrangler

### Environment Detection

- Local: `localhost:3000`
- Staging: `mirubato.pezware.workers.dev`
- Production: `mirubato.com`, `api.mirubato.com`

### Database Migrations

```bash
# Generate config first!
node scripts/generate-wrangler-config.js backend [env]
cd backend && wrangler d1 migrations apply DB --remote
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

- **Setup**: `docs/DEVELOPMENT_SETUP.md`
- **Guidelines**: `docs/DEVELOPMENT_GUIDELINES.md`
- **Infrastructure**: `docs/INFRASTRUCTURE.md`
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
