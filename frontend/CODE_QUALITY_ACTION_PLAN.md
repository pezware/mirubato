# Code Quality Improvement Action Plan

## Overview

This document outlines the comprehensive action plan for improving code quality in the Mirubato project. Based on the analysis of documentation and frontend modules, we've identified critical issues that need immediate attention.

## Current Status

- **Frontend Coverage**: 71.45% (Target: 80%) - 8.55% below target
- **Backend Coverage**: 74.13% (Target: 80%) - 5.87% below target
- **Branch Coverage**: ~60% (Target: 80%)
- **Critical Issues**: Module coupling, zero-coverage components, type safety, documentation navigation

## Priority Levels

- 🔴 **TOP PRIORITY**: Must be completed first
- 🟠 **HIGH PRIORITY**: Critical for code quality
- 🟡 **MEDIUM PRIORITY**: Important improvements
- 🟢 **LOW PRIORITY**: Nice to have

## Action Items

### 🔴 TOP PRIORITY

#### 1. Add Tests for Zero-Coverage Critical Components

**Objective**: Achieve minimum 80% coverage for critical components

**Components to Test**:

- `MusicPlayer.tsx` (0% → 80%+)
- `dataSync.ts` (0% → 80%+)
- `audioManager.ts` (9.85% → 80%+)
- `middleware/logging.ts` (0% → 80%+)

**Actions**:

1. Write comprehensive unit tests for MusicPlayer component
2. Create dataSync service tests with mock API calls
3. Refactor audioManager to enable proper testing (see item 2)
4. Add logging middleware tests with proper mocking

**Success Criteria**:

- All critical components have >80% coverage
- No console errors in tests
- All tests pass in CI/CD pipeline

#### 2. Refactor AudioManager from Singleton to Dependency Injection

**Objective**: Enable proper unit testing and improve modularity

**Current Issues**:

- Singleton pattern prevents proper mocking
- Tight coupling with Tone.js
- Global state management issues

**Actions**:

1. Create AudioManagerInterface
2. Implement AudioManager class (not singleton)
3. Use dependency injection in components
4. Create MockAudioManager for testing
5. Update all components using audioManager

**Implementation Plan**:

```typescript
// Before (singleton)
export const audioManager = new AudioManager()

// After (dependency injection)
export interface AudioManagerInterface {
  initialize(): Promise<void>
  playNote(note: string): void
  // ... other methods
}

export class AudioManager implements AudioManagerInterface {
  constructor(private toneInstance: typeof Tone) {}
  // ... implementation
}
```

**Success Criteria**:

- AudioManager is fully testable
- No global state
- All components use injected instance

#### 3. Documentation Overhaul with Better-Docs

**Objective**: Replace current hard-to-navigate documentation with better-docs

**Current Issues**:

- Generated docs checked into git
- Poor navigation structure
- No live component previews
- Inconsistent documentation style

**Actions**:

1. **Install and Configure better-docs**:

   ```bash
   npm install --save-dev better-docs jsdoc
   ```

2. **Create jsdoc configuration** (`jsdoc.json`):

   ```json
   {
     "tags": {
       "allowUnknownTags": ["category", "subcategory", "component", "optional"]
     },
     "source": {
       "include": ["./src"],
       "includePattern": "\\.(jsx|js|ts|tsx)$",
       "excludePattern": "(node_modules/|docs)"
     },
     "plugins": [
       "node_modules/better-docs/typescript",
       "node_modules/better-docs/category",
       "node_modules/better-docs/component"
     ],
     "opts": {
       "encoding": "utf8",
       "destination": "docs/",
       "recurse": true,
       "template": "node_modules/better-docs"
     },
     "templates": {
       "better-docs": {
         "name": "Mirubato Documentation",
         "title": "Mirubato - Music Practice Platform",
         "logo": "../assets/logo.png",
         "navLinks": [
           {
             "label": "GitHub",
             "href": "https://github.com/mirubato/mirubato"
           },
           {
             "label": "Live Demo",
             "href": "https://mirubato.com"
           }
         ]
       }
     }
   }
   ```

3. **Update package.json scripts**:

   ```json
   {
     "scripts": {
       "docs:generate": "jsdoc -c jsdoc.json",
       "docs:serve": "http-server ./docs -p 8080"
     }
   }
   ```

4. **Add to .gitignore**:

   ```
   # Generated documentation
   /docs/
   /public/docs/
   ```

5. **Create GitHub Action** (`.github/workflows/docs.yml`):

   ```yaml
   name: Generate Documentation

   on:
     push:
       branches: [main]
     pull_request:
       branches: [main]

   jobs:
     build-docs:
       runs-on: ubuntu-latest

       steps:
         - uses: actions/checkout@v3

         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'

         - name: Install dependencies
           run: |
             npm ci
             npm install -g parcel-bundler

         - name: Generate documentation
           run: npm run docs:generate

         - name: Deploy to GitHub Pages
           if: github.ref == 'refs/heads/main'
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./docs
   ```

6. **Update documentation with categories**:

   ```typescript
   /**
    * Progress Analytics Module for tracking user progress
    * @category Analytics
    * @subcategory Core Modules
    */
   export class ProgressAnalyticsModule {
     // ...
   }
   ```

7. **Add component documentation**:
   ```tsx
   /**
    * Music Player Component
    * @component
    * @category UI Components
    * @example
    * return (
    *   <MusicPlayer
    *     sheetMusic={mockSheetMusic}
    *     onPlaybackComplete={() => console.log('Complete')}
    *   />
    * )
    */
   export const MusicPlayer: React.FC<MusicPlayerProps> = props => {
     // ...
   }
   ```

**Success Criteria**:

- Documentation auto-generated on push to main
- No generated docs in git repository
- Live component previews working
- Clear category-based navigation
- TypeScript types properly documented

### 🟠 HIGH PRIORITY

#### 4. Fix Module Decoupling - Implement True Event-Driven Storage

**Objective**: Remove direct dependencies between business modules and storage

**Current Issues**:

- 7 out of 8 modules directly depend on StorageModule
- StorageService is just a thin wrapper, not true decoupling
- Violates event-driven architecture principles

**Actions**:

1. Create storage events (STORAGE_READ, STORAGE_WRITE, STORAGE_DELETE)
2. Implement storage event handlers in StorageModule
3. Remove StorageService from all business modules
4. Use EventBus for all storage operations
5. Add proper error handling for storage failures

**Implementation Example**:

```typescript
// Before
const data = await this.storageService.get('key')

// After
const data = await new Promise((resolve, reject) => {
  const subscription = this.eventBus.subscribe(
    'storage:read:response',
    payload => {
      if (payload.requestId === requestId) {
        subscription.unsubscribe()
        resolve(payload.data)
      }
    }
  )

  this.eventBus.emit('storage:read:request', {
    requestId,
    key: 'key',
    userId,
  })
})
```

**Success Criteria**:

- No direct storage dependencies in business modules
- All storage operations via EventBus
- Proper error handling and timeouts

### 🟡 MEDIUM PRIORITY

#### 5. Fix Type Safety Issues - Remove All `any` Types

**Objective**: Achieve 100% type safety

**Actions**:

1. Replace all `any` types with proper interfaces
2. Add runtime validation with zod
3. Create shared type definitions
4. Add strict TypeScript rules

**Files to Update**:

- `ProgressAnalyticsModule.ts`: Line 201
- `PerformanceTrackingModule.ts`: Line 187
- `PracticeSessionModule.ts`: Line 402
- All other instances of `any`

**Success Criteria**:

- No `any` types in codebase
- All data validated at runtime
- TypeScript strict mode enabled

#### 6. Implement Proper Error Handling and Logging

**Objective**: Replace console.error with structured logging

**Actions**:

1. Create LoggerInterface
2. Implement structured logger
3. Add log levels (ERROR, WARN, INFO, DEBUG)
4. Integrate with monitoring service
5. Remove all console.\* statements

**Success Criteria**:

- No console statements in production code
- All errors properly logged
- Monitoring dashboard available

#### 7. Add Input Validation Across Modules

**Objective**: Validate all external inputs

**Actions**:

1. Install and configure zod
2. Create validation schemas for all DTOs
3. Add validation middleware
4. Validate all event payloads
5. Add sanitization for user inputs

**Success Criteria**:

- All inputs validated
- Clear validation error messages
- No security vulnerabilities

### 🟢 LOW PRIORITY

#### 8. Refactor Large Modules (>300 lines)

**Objective**: Improve maintainability

**Modules to Refactor**:

- `PerformanceTrackingModule` (750+ lines)
- Other modules exceeding 300 lines

**Actions**:

1. Apply Single Responsibility Principle
2. Extract helper functions
3. Create sub-modules for complex logic
4. Add proper abstractions

**Success Criteria**:

- No module exceeds 300 lines
- Clear separation of concerns
- Improved testability

## Implementation Timeline

### Week 1-2: TOP PRIORITY Items

- [ ] Start with AudioManager refactoring (enables testing)
- [ ] Add tests for zero-coverage components
- [ ] Set up better-docs infrastructure

### Week 3-4: HIGH PRIORITY Items

- [ ] Implement event-driven storage
- [ ] Complete documentation migration
- [ ] Deploy documentation pipeline

### Week 5-6: MEDIUM PRIORITY Items

- [ ] Fix type safety issues
- [ ] Implement proper logging
- [ ] Add input validation

### Week 7-8: LOW PRIORITY Items

- [ ] Refactor large modules
- [ ] Performance optimizations
- [ ] Final cleanup

## Success Metrics

1. **Test Coverage**:

   - Frontend: 80%+ overall, 90%+ for critical paths
   - Backend: 80%+ overall, 90%+ for critical paths
   - Branch coverage: 80%+

2. **Code Quality**:

   - 0 `any` types
   - 0 console statements
   - All modules <300 lines

3. **Documentation**:

   - Auto-generated on push
   - Live component previews
   - Clear navigation structure

4. **Architecture**:
   - True event-driven architecture
   - No direct module coupling
   - Proper dependency injection

## Risk Mitigation

1. **Breaking Changes**:

   - Implement changes incrementally
   - Maintain backward compatibility
   - Comprehensive testing before deployment

2. **Performance Impact**:

   - Profile before and after changes
   - Monitor event bus performance
   - Optimize critical paths

3. **Team Adoption**:
   - Document all patterns
   - Provide code examples
   - Conduct code reviews

## Next Steps

1. Review and approve this action plan
2. Create feature branch for each priority group
3. Begin with TOP PRIORITY items
4. Set up weekly progress reviews
5. Track metrics in project dashboard

---

**Note**: This is a living document. Update progress and adjust priorities as needed.
