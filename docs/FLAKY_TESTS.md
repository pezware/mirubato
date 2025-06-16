# Flaky Tests Tracking

This file tracks tests that are known to be flaky and need fixing.

## Definition of Flaky Test

A flaky test is a test that:

- Passes and fails intermittently without code changes
- Depends on external factors like timing, randomness, or system state
- Makes the test suite unreliable

## Current Flaky Tests

### 1. SightReadingGenerator - Stepwise Motion Test

**File**: `src/modules/sheetMusic/generators/__tests__/SightReadingGenerator.test.ts:169`
**Status**: Skipped with `it.skip`
**Issue**:

- Test uses random generation without a fixed seed
- Expects exactly 60% stepwise motion but randomness causes variation
- Observed failures with 58.33% (very close to threshold)

**Proposed Fix**:

```typescript
// Option 1: Use a fixed seed for the random generator
// Option 2: Lower threshold to 0.55 to account for randomness
// Option 3: Run multiple iterations and average the results
```

## How to Handle Flaky Tests

1. **Immediate Action**: Skip the test with `it.skip` and add a TODO comment
2. **Document**: Add entry to this file with details
3. **Create Issue**: Track in GitHub issues with "flaky-test" label
4. **Fix**: Address root cause when possible

## Best Practices to Avoid Flaky Tests

1. **Avoid randomness**: Use fixed seeds or mock random functions
2. **Avoid timing dependencies**: Use fake timers or proper async handling
3. **Isolate tests**: Each test should be independent
4. **Mock external dependencies**: Don't rely on network, filesystem, etc.
5. **Use explicit waits**: Replace arbitrary timeouts with proper conditions
