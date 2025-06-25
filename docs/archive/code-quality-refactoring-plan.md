# Code Quality Refactoring Plan

## Overview

Comprehensive refactoring to address code quality issues, SOLID principle violations, testability concerns, and type alignment issues identified in the codebase analysis.

## Current Problem Analysis

### Critical Issues

1. **Type Misalignment** ⚠️ **NEW**
   - Backend defines duplicate types instead of using shared/types
   - Frontend has mixed usage of shared and local types
   - GraphQL schema doesn't align with shared types
   - No code generation from GraphQL schema

2. **Large Classes (700+ lines)**
   - `PerformanceTrackingModule`: Violates Single Responsibility Principle
   - `PracticeSessionModule`: Handles too many concerns
3. **Production Console Logs**
   - Found in 8 files including core modules
   - Security risk: may expose sensitive data
4. **Poor Error Handling**
   - Generic catch blocks losing error context
   - Swallowed errors preventing proper debugging

### Code Smells

1. **Magic Numbers**: Hardcoded values throughout codebase
2. **Long Methods**: 60+ line methods with complex logic
3. **Tight Coupling**: Direct instantiation instead of dependency injection
4. **Type Safety**: Excessive type assertions and `any` usage

### SOLID Violations

1. **Single Responsibility**: Classes doing too much
2. **Open/Closed**: Switch statements requiring modification
3. **Dependency Inversion**: Modules creating own dependencies
4. **Interface Segregation**: Large interfaces with unused methods

## Strategy and Approach

### Phase 0: Type Alignment (1 week) ⚠️ **NEW PRIORITY**

- Unify type definitions across backend/frontend/shared
- Setup GraphQL code generation
- Remove all duplicate type definitions
- See detailed plan: `/docs/plan/type-alignment-refactoring-plan.md`

### Phase 1: Quick Wins (1-2 days)

- Remove console.log statements
- Extract magic numbers to constants
- Add pre-commit hooks for code quality

### Phase 2: Module Refactoring (1 week)

- Split large classes into focused components
- Implement dependency injection
- Replace singleton patterns

### Phase 3: Type Safety (3-4 days)

- Remove `any` types
- Add proper type guards
- Improve error handling with typed errors

### Phase 4: Testing Infrastructure (3-4 days)

- Create test doubles for dependencies
- Add time provider abstractions
- Improve test coverage to 80%+

## Implementation Steps

### Phase 0: Type Alignment ⏳ **PRIORITY**

- [ ] Replace backend/src/types/shared.ts with imports from shared/types
- [ ] Remove frontend type duplicates in modules/core/sharedTypes.ts
- [ ] Setup GraphQL Code Generator
- [ ] Align GraphQL schema with shared types
- [ ] Update all type imports across codebase

### Phase 1: Quick Wins ⏳

- [ ] Create constants file for magic numbers
- [ ] Remove all console.log statements
- [ ] Add pre-commit hook for console.log detection
- [ ] Configure ESLint rules for code quality

### Phase 2: Module Refactoring ⏳

- [ ] Refactor PerformanceTrackingModule
  - [ ] Extract PerformanceRecorder class
  - [ ] Extract PerformanceAnalyzer class
  - [ ] Extract PerformanceStorage class
  - [ ] Extract PerformanceFeedback class
- [ ] Refactor PracticeSessionModule
  - [ ] Extract SessionManager class
  - [ ] Extract SessionTimer class
  - [ ] Extract SessionStorage class
- [ ] Replace EventBus singleton with dependency injection
- [ ] Create factory functions for module creation

### Phase 3: Type Safety ⏳

- [ ] Replace all `any` types with proper types from shared
- [ ] Create type guards using shared validators
- [ ] Implement typed error classes
- [ ] Add exhaustive type checking for switch statements

### Phase 4: Testing Infrastructure ⏳

- [ ] Create TimeProvider interface and implementation
- [ ] Create EventBus test double
- [ ] Create Storage test double
- [ ] Update all tests to use dependency injection
- [ ] Add integration tests for refactored modules

## Timeline

- **Week 1**: Phase 0 (Type Alignment) - CRITICAL
- **Week 2**: Phase 1 + Start Phase 2
- **Week 3**: Complete Phase 2 + Phase 3
- **Week 4**: Phase 4 + Testing/Documentation

## Risk Assessment

### High Risk

- **Type Breaking Changes**: Aligning types may break existing code
  - _Mitigation_: Fix type alignment first before other refactoring
- **Breaking Changes**: Refactoring core modules may break dependent code
  - _Mitigation_: Comprehensive test coverage before refactoring

### Medium Risk

- **Performance Impact**: New abstractions may add overhead
  - _Mitigation_: Performance benchmarks before/after

### Low Risk

- **Team Adaptation**: New patterns require learning
  - _Mitigation_: Documentation and code examples

## Success Criteria

- [ ] All types imported from shared/types (no duplicates)
- [ ] GraphQL types generated from schema
- [ ] All console.log statements removed
- [ ] No classes over 300 lines
- [ ] No methods over 30 lines
- [ ] 0 uses of `any` type
- [ ] 80%+ test coverage maintained
- [ ] All pre-commit hooks passing
- [ ] Performance benchmarks within 5% of baseline

## Progress Tracking

- ⏳ Phase 0: Type Alignment (Priority)
- ⏳ Phase 1: Not Started
- ⏳ Phase 2: Not Started
- ⏳ Phase 3: Not Started
- ⏳ Phase 4: Not Started

**Overall Status**: ⏳ Planning Phase

## Related Files

### Phase 0 Type Files (Priority)

- `/shared/types/index.ts` - Source of truth
- `/backend/src/types/shared.ts` - To be replaced
- `/backend/src/schema/schema.graphql` - To be aligned
- `/frontend/src/modules/core/sharedTypes.ts` - Remove duplicates

### Phase 1 Files

- `/frontend/src/config/constants.ts` (new)
- `/frontend/.husky/pre-commit` (new)
- `.eslintrc.js` (modify)

### Phase 2 Core Files

- `/frontend/src/modules/performance/PerformanceTrackingModule.ts`
- `/frontend/src/modules/practice/PracticeSessionModule.ts`
- `/frontend/src/modules/core/EventBus.ts`
- `/frontend/src/modules/core/ModuleFactory.ts` (new)

### Phase 3 Type Files

- `/frontend/src/types/errors.ts` (new)
- `/frontend/src/types/guards.ts` (new)
- All module type definitions

### Phase 4 Test Files

- `/frontend/src/test-utils/providers.ts` (new)
- `/frontend/src/test-utils/doubles.ts` (new)
- All `.test.ts` files

## Notes

- **CRITICAL**: Fix type alignment FIRST before other refactoring
- Type alignment affects every other phase
- Prioritize modules with highest usage first
- Maintain backwards compatibility where possible
- Document all breaking changes
- Consider feature flags for gradual rollout
