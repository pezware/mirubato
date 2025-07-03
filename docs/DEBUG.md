# Mirubato Debug Guide - Version 1.1.0

## Overview

This document contains known issues, their solutions, and debugging tools for the Mirubato platform. Use this guide when encountering problems during development or in production.

## Recent Fixes in v1.1.0

### ✅ D1 Database Sync Errors (RESOLVED)

- **Issue**: "D1_TYPE_ERROR: Type 'undefined' not supported" when creating/updating entries
- **Fix**: Comprehensive null value sanitization in all database operations
- **Files Updated**: `logbook.ts`, `ManualEntryForm.tsx`

### ✅ Calendar Rendering Issues (RESOLVED)

- **Issue**: Practice days showing as blank blocks due to missing Tailwind colors
- **Fix**: Complete color palette configuration including sage-600/700, stone-50/900, rose, and peach
- **File Updated**: `tailwind.config.js`

## Quick Debugging Tools

### Production Endpoints (Always Available)

1. **Health Check**: `https://api.mirubato.com/health`
   - Shows version, environment, timestamp
   - First thing to check when debugging

2. **API Documentation**: `https://api.mirubato.com/docs`
   - Interactive REST API documentation
   - Test endpoints directly from browser
   - View request/response schemas

3. **Scores API Health**: `https://scores.mirubato.com/health`
   - Check scores service status
   - View scores API documentation at `https://scores.mirubato.com/docs`

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

### 2. Authentication Issues

**Problem**: Users getting 401 errors or login failures

**Debugging Steps**:

1. Check if user is properly authenticated:

   ```javascript
   // In browser console
   localStorage.getItem('auth-token')
   ```

2. Test authentication endpoint:

   ```bash
   curl -X POST https://api.mirubato.com/api/auth/google \
     -H "Content-Type: application/json" \
     -d '{"credential": "your-google-jwt"}'
   ```

3. Verify token is being sent in requests:
   - Open Network tab in DevTools
   - Check if Authorization header is present

**Common Solutions**:

- Clear localStorage and re-login
- Check if Google OAuth is properly configured
- Verify API_URL environment variable

### 3. Sync Issues

**Problem**: Data not syncing between local storage and cloud

**Debugging Steps**:

1. Check sync status:

   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.mirubato.com/api/sync/status
   ```

2. Check local storage data:

   ```javascript
   // In browser console
   Object.keys(localStorage).filter(k => k.startsWith('mirubato:'))
   ```

3. Force sync:
   ```javascript
   // In browser console - if using logbook store
   const { syncWithServer } = useLogbookStore.getState()
   await syncWithServer()
   ```

**Common Solutions**:

- Check network connectivity
- Verify user is logged in
- Clear local cache and re-sync
- Check API health endpoint

### 4. LocalStorage Migration Issues

**Problem**: Old data not appearing after migration to current frontend

**Solution**: See [FRONTEND_DEBUG.md](./FRONTEND_DEBUG.md) for comprehensive migration debugging guide.

## Development Debugging

### Local Development Issues

1. **API not connecting**:
   - Check if API is running on port 8787
   - Verify VITE_API_URL in `.env` file
   - Check CORS settings

2. **Build failures**:
   - Clear node_modules and reinstall
   - Check TypeScript errors: `npm run type-check`
   - Verify all imports are correct

3. **Test failures**:
   - Run tests individually: `npm test -- --run --reporter=verbose`
   - Check test database setup
   - Verify mock configurations

### Performance Debugging

1. **Slow API responses**:
   - Check Cloudflare Worker metrics
   - Monitor D1 database query performance
   - Review API endpoint response times

2. **Frontend performance**:
   - Use React DevTools Profiler
   - Check bundle size: `npm run build -- --analyze`
   - Monitor Core Web Vitals

## Emergency Procedures

### Production Issues

1. **Complete service outage**:
   - Check Cloudflare Worker status
   - Verify domain DNS settings
   - Check D1 database connectivity

2. **Data corruption**:
   - Check recent backup files
   - Verify sync data integrity
   - Review recent deployment logs

### Recovery Steps

1. **Rollback deployment**:

   ```bash
   # Rollback to previous version
   wrangler rollback --name mirubato-api
   ```

2. **Database recovery**:
   - Restore from latest backup
   - Run data integrity checks
   - Verify user data consistency

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

**Known Issues**:

1. **EventBus Memory Leaks** (Fix exists in ImprovedEventBus.ts)
   - Unbounded event history growth
   - No cleanup of stale subscriptions
   - Solution: Use circular buffer, event type limits, WeakMap for callbacks

2. **Audio Event Memory Leaks** (Fix exists in improvedMultiVoiceAudioManager.ts)
   - scheduledEvents array growing without cleanup
   - Transport events not properly cleared
   - Solution: Track all events, implement clearAllScheduledEvents()

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

**Note**: Improved implementations exist but are not yet deployed to production.

## Known Test Issues

### Flaky Tests

A flaky test is one that passes and fails intermittently without code changes, often due to timing, randomness, or system state dependencies.

#### Current Flaky Tests

1. **SightReadingGenerator - Stepwise Motion Test**
   - **File**: `src/modules/sheetMusic/generators/__tests__/SightReadingGenerator.test.ts:169`
   - **Status**: Skipped with `it.skip`
   - **Issue**: Uses random generation without fixed seed; expects exactly 60% stepwise motion but randomness causes variation
   - **Fix Options**:
     - Use a fixed seed for the random generator
     - Lower threshold to 0.55 to account for randomness
     - Run multiple iterations and average the results

#### Handling Flaky Tests

1. **Immediate**: Skip the test with `it.skip` and add TODO comment
2. **Document**: Add to this section with details
3. **Track**: Create GitHub issue with "flaky-test" label
4. **Fix**: Address root cause when possible

#### Preventing Flaky Tests

- **Avoid randomness**: Use fixed seeds or mock random functions
- **Avoid timing dependencies**: Use fake timers or proper async handling
- **Isolate tests**: Each test should be independent
- **Mock external dependencies**: Don't rely on network, filesystem, etc.
- **Use explicit waits**: Replace arbitrary timeouts with proper conditions

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

## React Component Infinite Loop Issues

### PDF Viewer Infinite Loading Loop

**Problem**: PDF viewer enters infinite loop, repeatedly requesting the same PDF file every few seconds.

**Root Causes Identified** (July 2025):

1. **Unnecessary async operations**: AdaptivePdfViewer was making API calls even when `forcePdfViewer={true}`
2. **Unstable object references**: Document options object recreated on every render
3. **Circular dependencies**: useMemo depending on state that changes during async operations

**Symptoms**:

- Network tab shows repeated requests to same PDF URL (200 status)
- PDF never displays despite successful requests
- Requests happen at regular intervals (4-5 seconds)

**Solution Applied**:

1. **Skip async operations when forced** (commit e874e0c):

   ```typescript
   useEffect(() => {
     const detectViewerMode = async () => {
       // When forcePdfViewer is true, skip everything
       if (forcePdfViewer) {
         setUseImageViewer(false)
         setIsImageBasedScore(false)
         return
       }
       // Only check score type when NOT forced
       // ... rest of logic
     }
   }, [scoreId, forceImageViewer, forcePdfViewer])
   ```

2. **Memoize Document options** (commit 5bf7eae):
   ```typescript
   // Prevent options object recreation
   const documentOptions = useMemo(() => {
     const token = localStorage.getItem('auth-token')
     return {
       httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
     }
   }, []) // Empty deps - stable for session
   ```

### Image Viewer Infinite Loop

**Problem**: ImageScoreViewer repeatedly fetches score data in a loop.

**Root Causes**:

- Callback functions in useEffect dependencies
- Parent component recreating callbacks on every render

**Solution Applied** (commit 069a41d):

1. **Remove callbacks from dependencies**:

   ```typescript
   useEffect(() => {
     fetchPages()
   }, [scoreId]) // Remove onLoad and onError
   ```

2. **Memoize callbacks in parent**:
   ```typescript
   const handlePdfLoad = useCallback(
     (info: { numPages: number }) => {
       setTotalPages(info.numPages)
     },
     [setTotalPages]
   )
   ```

### Prevention Guidelines

**To prevent infinite loops in React components**:

1. **useEffect Dependencies**:
   - Only include values that should trigger re-execution
   - Avoid including callback functions unless memoized
   - Be cautious with objects/arrays as dependencies

2. **Memoization**:
   - Use `useMemo` for expensive computations
   - Use `useCallback` for functions passed as props
   - Memoize objects passed to third-party components

3. **Async Operations**:
   - Don't trigger async operations when component state is predetermined
   - Check for early exit conditions before async calls
   - Be aware of state updates during async operations

4. **Debugging Steps**:
   - Check Network tab for repeated requests
   - Use React DevTools Profiler to identify re-renders
   - Add console.logs to track effect execution
   - Review all useEffect dependencies

**Common Patterns to Avoid**:

```typescript
// ❌ BAD: Object created inline
<Component options={{ key: value }} />

// ✅ GOOD: Memoized object
const options = useMemo(() => ({ key: value }), [value])
<Component options={options} />

// ❌ BAD: Function in dependency array
useEffect(() => {
  fetchData()
}, [onSuccess, onError]) // These might be recreated

// ✅ GOOD: Remove or memoize callbacks
useEffect(() => {
  fetchData()
}, [dataId]) // Only depend on data that changes
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
