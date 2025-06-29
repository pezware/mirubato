# E2E Test Failure Analysis

## Problem

Shard 3/3 is failing with timeout errors when waiting for elements after creating logbook entries. The tests are failing at:

1. Waiting for `div[class*="hover:bg-morandi-stone-50"]` (entry containers)
2. Waiting for "Practice Reports" text

## Error Details

```
TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
- waiting for locator('div[class*="hover:bg-morandi-stone-50"]') to be visible
```

## Key Observations

1. Tests pass in shard 1 and 2 but fail in shard 3
2. The same tests fail consistently in shard 3
3. The failures happen after supposedly creating entries
4. The search test passes (skips search functionality)

## Hypothesis

The issue might be related to:

1. State isolation between parallel tests
2. The entry creation not completing properly
3. Race conditions with the new parallel execution
4. The Overview tab navigation not working correctly

## Tests Failing

- Anonymous user can create and view logbook entries
- Data persists across page reloads
- User can view reports

## Gemini Command for Analysis

```bash
gemini -p "Analyze these Playwright E2E test failures in shard 3. The tests pass when run sequentially but fail when run in parallel with sharding. The failures occur when waiting for elements after creating entries.

Key issues:
1. Tests timeout waiting for div[class*='hover:bg-morandi-stone-50'] after creating entries
2. Tests can't find 'Practice Reports' text
3. Same tests pass in other shards
4. Search test (which doesn't create entries) passes

Please analyze:
1. Why would tests fail only in shard 3?
2. What race conditions could occur with parallel execution?
3. How to ensure proper test isolation in parallel mode?
4. Best practices for fixing flaky parallel tests

@tests/e2e/logbook.test.ts @tests/e2e/helpers/logbook-helpers.ts @playwright.config.ts"
```
