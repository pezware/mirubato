# E2E Test Improvements Plan

## Overview

This document outlines the improvements needed to stabilize E2E tests and reduce timeout issues.

## Key Issues Identified

### 1. Excessive Fixed Timeouts

- Many tests use `waitForTimeout(1000)` which adds unnecessary delays
- Fixed timeouts don't guarantee elements are ready
- Total test runtime is significantly increased

### 2. Flaky Selectors

- Text-based selectors that break when UI text changes
- Generic selectors (canvas, svg) without specific identifiers
- Regex patterns for dynamic content

### 3. Test Data Accumulation

- Tests create 5-28 entries without proper cleanup
- LocalStorage not cleared between tests
- Performance degrades as data accumulates

### 4. Race Conditions

- Network idle doesn't guarantee content is rendered
- Autocomplete debouncing uses arbitrary delays
- Chart rendering not properly awaited

## Implementation Plan

### Phase 1: Test Infrastructure (High Priority)

1. Create test helpers for common operations
2. Implement proper test isolation
3. Add retry mechanisms for flaky operations

### Phase 2: Selector Improvements (Medium Priority)

1. Add data-testid attributes to key UI elements
2. Replace text-based selectors with testid selectors
3. Create selector constants to avoid duplication

### Phase 3: Wait Strategy Optimization (High Priority)

1. Replace all fixed timeouts with smart waits
2. Implement custom wait functions for complex scenarios
3. Add explicit wait conditions for data loading

### Phase 4: Test Data Management (Medium Priority)

1. Reduce test data volume
2. Implement proper cleanup between tests
3. Create minimal test fixtures

## Specific File Changes

### LogbookPage.ts

- Remove 1000ms timeout after navigation
- Add explicit waits for tab content
- Improve autocomplete handling

### enhanced-reports.test.ts

- Replace regex selectors with testid
- Remove fixed timeouts
- Add proper chart rendering wait

### enhanced-reports-complete.test.ts

- Reduce dataset size from 28 to 10 entries
- Add cleanup in afterEach
- Improve navigation flow

### logbook.test.ts

- Use testid for composer names
- Remove waitForTimeout calls
- Add proper sync status checks

## Success Metrics

- Test execution time reduced by 50%
- Zero timeout failures in CI
- Consistent pass rate >95%
- No flaky test retries needed
