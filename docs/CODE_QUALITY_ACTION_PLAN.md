# Code Quality Improvement Action Plan

## Overview

This document outlines the comprehensive action plan for improving code quality in the Mirubato project. Based on the analysis of documentation and frontend modules, we've identified critical issues that need immediate attention.

## Current Status

- **Frontend Coverage**: ~29% → 71.45% (Target: 80%) - 8.55% below target
- **Backend Coverage**: ~43% → 74.13% (Target: 80%) - 5.87% below target
- **Branch Coverage**: ~60% (Target: 80%)
- **Critical Issues**: Module coupling, zero-coverage components, type safety, documentation navigation

## Completed Items (Latest Update)

✅ **ESLint Configuration Update** (2025-02-06)

- Configured ESLint to differentiate between test and production code
- Kept `no-explicit-any` as error for production code to maintain quality standards
- Allowed `no-explicit-any` as warning in test files for flexible mocking
- Added pretest hooks and lint:fix scripts
- Fixed Jest configuration issues preventing tests from running

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

- ✅ `MusicPlayer.tsx` (0% → 80%+) - **COMPLETED**
- ✅ `dataSync.ts` (0% → 80%+) - **COMPLETED**
- ✅ `audioManager.ts` (9.85% → 91.54%) - **COMPLETED**
- ✅ `middleware/logging.ts` (0% → 100%) - **COMPLETED**

**Actions**:

1. ✅ Write comprehensive unit tests for MusicPlayer component - **COMPLETED**
2. ✅ Create dataSync service tests with mock API calls - **COMPLETED**
3. ✅ Refactor audioManager to enable proper testing (see item 2) - **COMPLETED**
4. Add logging middleware tests with proper mocking

**Success Criteria**:

- All critical components have >80% coverage
- No console errors in tests
- All tests pass in CI/CD pipeline

#### 2. ✅ Refactor AudioManager from Singleton to Dependency Injection - **COMPLETED**

**Objective**: Enable proper unit testing and improve modularity

**Current Issues**: ✅ **RESOLVED**

- ~~Singleton pattern prevents proper mocking~~
- ~~Tight coupling with Tone.js~~
- ~~Global state management issues~~

**Actions**: ✅ **ALL COMPLETED**

1. ✅ Create AudioManagerInterface
2. ✅ Implement AudioManager class (not singleton)
3. ✅ Use dependency injection in components (via AudioContext)
4. ✅ Create MockAudioManager for testing
5. ✅ Update all components using audioManager

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

**Success Criteria**: ✅ **ALL MET**

- ✅ AudioManager is fully testable (91.54% coverage)
- ✅ No global state (uses dependency injection)
- ✅ All components use injected instance (via AudioContext)

#### 3. ✅ Documentation Overhaul with TypeDoc Improvements - **COMPLETED**

**Objective**: ✅ **ACHIEVED** - Improved documentation system with better structure and content

**Issues Resolved**: ✅ **ALL RESOLVED**

- ~~Generated docs checked into git~~ → Now excluded from git, generated in CI
- ~~Poor navigation structure~~ → Improved TypeDoc config with categorization and custom CSS
- ~~No live component previews~~ → Enhanced HTML output with interactive TypeDoc interface
- ~~Inconsistent documentation style~~ → Comprehensive JSDoc comments with examples

**Actions**: ✅ **ALL COMPLETED**

1. ✅ **TypeDoc Configuration Enhanced**:

   - Switched from markdown to HTML output for better navigation
   - Added custom CSS theme for improved visual design
   - Configured proper categorization and sorting
   - Enhanced navigation links and branding

   - EventBus: Complete class and method documentation with examples
   - AudioManager: Detailed constructor and method documentation
   - All public interfaces documented with usage examples
   - Proper categorization using @category tags

   - Auto-deployment to GitHub Pages with proper caching
   - PR preview comments for documentation changes
   - Artifact retention for debugging
   - Custom domain support for docs.mirubato.com

2. ✅ **Git Repository Cleanup**:
   - Removed all generated documentation from git history
   - Updated .gitignore to exclude future generated docs
   - Configured proper CI/CD workflow for documentation

**Success Criteria**: ✅ **ALL MET**

- ✅ Documentation auto-generated on push to main via GitHub Actions
- ✅ No generated docs in git repository (properly excluded)
- ✅ Interactive TypeDoc interface with search and navigation
- ✅ Clear category-based navigation with custom CSS theme
- ✅ TypeScript types properly documented with JSDoc examples
- ✅ Enhanced GitHub Actions workflow with artifact handling

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

- [x] Start with AudioManager refactoring (enables testing) - **COMPLETED**
- [x] Add tests for zero-coverage components - **MOSTLY COMPLETED** (3/4 done)
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
