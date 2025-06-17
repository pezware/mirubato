# Rubato Debug Guide

## Overview

This document contains known issues, their solutions, and debugging tools for the Rubato platform. Use this guide when encountering problems during development or in production.

## Quick Debugging Tools

### Production Endpoints (Always Available)

1. **Health Check**: `https://api.mirubato.com/health`

   - Shows version, environment, timestamp
   - First thing to check when debugging

2. **GraphQL Playground**: `https://api.mirubato.com/graphql`

   - Test queries, check schema, debug auth
   - Introspection enabled for transparency

3. **CORS Debug**: `https://api.mirubato.com/debug/cors`
   - Diagnose cross-origin issues

## Known Issues & Solutions

### 1. VexFlow "Too Many Ticks" Error

**Problem**: Voice object receives more note durations than can fit within a measure's time signature when converting multi-voice piano music from MusicXML.

**Root Cause**:

- MusicXML contains multiple voices (treble/bass) that are being merged into a single measure
- Example: 3/4 time signature but trying to fit 10 beats worth of notes

**Current Workaround**:

- Simplified pieces to melody-only for MVP
- Acceptable for beginner sight-reading and single-line instruments

**Permanent Solution**:

- Implement proper multi-voice architecture (in progress)
- Timeline: ~2 weeks for full implementation
- See Phase 4.3 in ROADMAP for details

### 2. GraphQL Schema Loading Error (Production 500)

**Problem**: Schema loading failures causing 500 errors in production

**Solution Applied** (commits 5ef022d3, 37a87c13):

- Fixed GraphQL schema loading mechanism
- Ensured proper schema file bundling in build process

**Prevention**:

- Always test production build locally before deployment
- Check that schema.graphql is included in dist folder

### 3. TypeScript Nested Output Structure

**Problem**: Build script creates nested directory structure causing import failures

**Solution Applied** (commits df449dd2, 2731c527):

- Modified build script to move entire src directory structure to dist
- Maintains proper import paths

**Prevention**:

- Use proper TypeScript project references
- Consider shared types package approach (see Technical Debt in ROADMAP)

### 4. Logbook Undefined Arrays

**Problem**: TypeError when arrays are undefined in logbook entries

**Solution Applied** (commit 20869af1):

- Added null checks in LogbookEntryList for all array fields
- Created `sanitizeEntry` method in PracticeLoggerModule

**Prevention**:

- Always initialize arrays in data structures
- Use defensive programming for backward compatibility

### 5. Storage Module Initialization Errors

**Problem**: Storage timeout errors when module not properly initialized

**Solution Applied** (commit 83c55325a):

- Added StorageModule initialization at app startup
- Proper module dependency management

**Prevention**:

- Initialize all modules in correct order
- Use ModulesContext for centralized management

### 6. Mobile Audio Context Issues

**Problem**: Audio doesn't play on mobile devices

**Common Causes**:

- Browser autoplay policies require user gesture
- Audio context not properly initialized

**Solution**:

```typescript
// Always wait for user interaction
await Tone.start() // Required for mobile browsers

// Initialize on first user interaction
button.addEventListener('click', async () => {
  await Tone.start()
  // Now audio will work
})
```

### 7. Console.log Statements in Production

**Problem**: Security risk and performance impact

**Detection**:

```bash
# Find all console.log statements
grep -r "console.log" --include="*.ts" --include="*.tsx" src/

# Pre-commit hook to prevent
#!/bin/sh
if git diff --cached --name-only | xargs grep -l "console.log"; then
  echo "Error: console.log found in staged files"
  exit 1
fi
```

**Solution**:

- Use proper logging service
- Configure ESLint to error on console statements
- Add pre-commit hooks

### 8. Backend Build System Infinite Loop (RESOLVED)

**Problem**: Backend `npm run dev` was stuck in infinite loop, constantly rebuilding

**Root Cause Analysis** (2025-06-16):

- `wrangler.toml` had `build.command = "npm run build"`
- `package.json` had prebuild/postbuild hooks calling `build-modern.js`
- `build-modern.js` performed complex build orchestration
- This created circular dependency: wrangler → npm build → build-modern.js → prebuild hooks → wrangler

**Solution Applied**:

1. **Simplified build system**: Removed complex `build-modern.js` entirely
2. **Let Wrangler handle builds**: Removed `build.command` from `wrangler.toml`
3. **Streamlined package.json**: `npm run dev` now just runs `wrangler dev --env local`
4. **Updated documentation**: BUILD.md aligned with new simplified process
5. **Fixed dev-server.js**: Removed lodash dependency, simplified build process

**Prevention**: Follow Cloudflare best practices - let Wrangler handle TypeScript compilation directly

**Frontend vs Backend comparison**:

- Frontend: `npm run dev` → `vite` (simple, direct)
- Backend (fixed): `npm run dev` → `wrangler dev --env local` (simple, direct)

## Common Development Issues

### 1. Type Misalignment

**Problem**: Types don't match between backend/frontend/GraphQL

**Solution**:

- Use shared types from `/shared/types`
- Run type generation after GraphQL schema changes
- See Type Alignment Refactoring in ROADMAP

### 2. Module Import Errors

**Problem**: Circular dependencies or incorrect import paths

**Solution**:

- Use barrel exports (index.ts files)
- Follow module dependency hierarchy
- Use EventBus for cross-module communication

### 3. Test Failures After Refactoring

**Problem**: Tests fail after code changes

**Common Fixes**:

- Mock new dependencies properly
- Update test expectations for new behavior
- Check for timing issues in async tests

### 4. Memory Leaks in Audio/Notation

**Problem**: Memory usage increases over time

**Prevention**:

- Always cleanup Tone.js resources
- Remove VexFlow renderers on unmount
- Clear event listeners properly

```typescript
// Cleanup example
useEffect(() => {
  const renderer = new Renderer()

  return () => {
    renderer.cleanup()
    Tone.Transport.stop()
    Tone.Transport.cancel()
  }
}, [])
```

## Performance Debugging

### Frontend Performance

```javascript
// Measure component render time
console.time('ComponentRender')
// ... component code
console.timeEnd('ComponentRender')

// Check bundle size
npm run build
npm run analyze
```

### Backend Performance

```typescript
// Add timing to resolvers
const start = Date.now()
// ... resolver logic
console.log(`Resolver took ${Date.now() - start}ms`)
```

### Database Performance

```sql
-- Check slow queries
EXPLAIN QUERY PLAN
SELECT * FROM practice_sessions WHERE user_id = ?;

-- Add indexes for common queries
CREATE INDEX idx_sessions_user ON practice_sessions(user_id);
```

## Deployment Issues

### Cloudflare Workers Specific

1. **Bundle Size Limits**: Workers have 1MB limit

   - Solution: Code splitting, lazy loading
   - Remove unused dependencies

2. **Environment Variables**: Must be configured in wrangler.toml

   - Solution: Check all environments have required vars
   - Use --env flag for non-production deployments

3. **D1 Database Access**: Connection issues in production
   - Solution: Ensure database bindings are correct
   - Check migration status

## Error Monitoring

### Client-Side Errors

```typescript
// Global error handler
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason)
  // Send to error tracking service
})

// React Error Boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('React error:', error, errorInfo)
    // Send to error tracking service
  }
}
```

### Server-Side Errors

```typescript
// GraphQL error handling
const server = new GraphQLServer({
  formatError: error => {
    console.error('GraphQL error:', error)
    // Log to service, return sanitized error
    return {
      message: error.message,
      code: error.extensions?.code,
    }
  },
})
```

## Useful Commands

```bash
# Check TypeScript errors
npm run type-check

# Run specific tests
npm test -- --testNamePattern="VexFlow"

# Check bundle size
npm run build && npm run analyze

# Find large dependencies
npm ls --depth=0 | grep -E "^├|^└" | sort -k2 -hr

# Clean install (fixes many issues)
rm -rf node_modules package-lock.json
npm install

# Check for security vulnerabilities
npm audit
```

## When All Else Fails

1. Clear all caches (browser, service worker, CDN)
2. Check GitHub Issues for similar problems
3. Review recent commits for breaking changes
4. Test in incognito/private mode
5. Try a clean install
6. Check production logs in Cloudflare dashboard

---

_This document should be updated whenever new issues are discovered and resolved._
