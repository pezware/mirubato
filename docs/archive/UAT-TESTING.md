# User Acceptance Testing (UAT) with D1

This document explains how to run comprehensive UAT tests using Cloudflare's local D1 database.

## Overview

We use Wrangler's built-in local D1 database for UAT testing. This provides a real SQLite database that mirrors production behavior, allowing us to test the complete user journey without mocking.

## Setup

1. **Install dependencies**:

   ```bash
   cd backend
   npm install
   ```

2. **Setup local D1 database**:
   ```bash
   ./scripts/setup-local-d1.sh
   ```

## Running UAT Tests

### Run all UAT tests:

```bash
npm run test:uat
```

### Run UAT tests in watch mode:

```bash
npm run test:uat:watch
```

### Run specific test suites:

```bash
# Anonymous user journey
npx vitest run --config vitest.config.ts src/__tests__/integration/d1-uat.test.ts -t "Anonymous User Journey"

# Authentication flow
npx vitest run --config vitest.config.ts src/__tests__/integration/d1-uat.test.ts -t "Authentication Flow"

# Data sync flow
npx vitest run --config vitest.config.ts src/__tests__/integration/d1-uat.test.ts -t "Data Sync Flow"
```

## Test Coverage

The UAT tests cover:

1. **Anonymous User Journey**

   - Creating practice sessions
   - Creating logbook entries
   - Storing data locally

2. **Authentication Flow**

   - Magic link creation
   - User creation/retrieval
   - Token generation

3. **Data Sync Flow**

   - Anonymous data creation
   - User authentication
   - Data migration from anonymous to authenticated

4. **Complex Queries**

   - Aggregate statistics
   - Practice streaks
   - Reporting queries

5. **Performance Testing**
   - Bulk operations
   - Batch inserts
   - Query performance

## Benefits

1. **Real Database**: Uses actual SQLite, not mocks
2. **Production Parity**: Same SQL dialect and behavior as production
3. **Isolated Tests**: Each test runs in a clean environment
4. **Fast Execution**: Local SQLite is very fast
5. **Debugging**: Can inspect the database directly during development

## Debugging

To inspect the local D1 database:

```bash
# Execute SQL queries directly
npx wrangler d1 execute DB --local --command "SELECT * FROM users"

# Use the D1 console
npx wrangler d1 console DB --local
```

## Integration with CI/CD

These tests can be run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Setup D1
  run: ./scripts/setup-local-d1.sh

- name: Run UAT Tests
  run: npm run test:uat
```

## Troubleshooting

### Database not found

Run `./scripts/setup-local-d1.sh` to create the database.

### Migration errors

Check that all migrations in `migrations/` are valid SQL.

### Test timeouts

Increase timeout in `vitest.config.ts`:

```ts
test: {
  timeout: 30000, // 30 seconds
}
```

### Permission errors

Make sure the setup script is executable:

```bash
chmod +x ./scripts/setup-local-d1.sh
```
