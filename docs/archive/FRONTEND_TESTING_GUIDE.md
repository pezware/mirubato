# Frontend Testing Guide

## Overview

This directory contains test utilities and setup files for the Mirubato frontend application.

## Test Setup

### Apollo Client Mock Warnings

To prevent Apollo Client "No more mocked responses" warnings in tests, we've implemented the following solutions:

1. **Global Warning Suppression** (`setup/apollo-setup.ts`):
   - Automatically filters out common Apollo testing warnings
   - Included in the unit test setup to apply to all tests

2. **Test Utilities** (`utils/apollo-test-helpers.ts`):
   - `createInfiniteGetCurrentUserMock()`: Creates reusable mocks for user queries
   - `withDefaultUserMock()`: Adds default user mocks to prevent warnings

3. **Enhanced Test Utils** (`utils/test-utils.tsx`):
   - Custom render function with Apollo MockedProvider
   - Proper error handling and cache management
   - BrowserRouter integration for routing tests

## Writing Tests

### Basic Test Example

```typescript
import { render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { MyComponent } from './MyComponent'

const mocks = [
  // Add your GraphQL mocks here
]

test('renders correctly', () => {
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MyComponent />
    </MockedProvider>
  )

  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

### Using Test Utilities

For components that need routing or make user queries:

```typescript
import { render, screen } from '../tests/utils/test-utils'
import { createInfiniteGetCurrentUserMock } from '../tests/utils/apollo-test-helpers'
import { MyComponent } from './MyComponent'

test('renders with user context', () => {
  const mocks = [
    createInfiniteGetCurrentUserMock({ id: '123', email: 'test@example.com' })
  ]

  render(<MyComponent />, { mocks })

  expect(screen.getByText('Welcome')).toBeInTheDocument()
})
```

## Common Patterns

### Mocking User Authentication

```typescript
const mockAuthenticatedUser = {
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  primaryInstrument: 'PIANO',
}

const mocks = [createInfiniteGetCurrentUserMock(mockAuthenticatedUser)]
```

### Testing Loading States

```typescript
const mocks = [
  {
    request: { query: MY_QUERY },
    result: {
      data: {
        /* ... */
      },
    },
    delay: 100, // Add delay to test loading state
  },
]
```

### Testing Errors

```typescript
const mocks = [
  {
    request: { query: MY_QUERY },
    error: new Error('Network error'),
  },
]
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test MyComponent.test.tsx

# Run tests matching pattern
npm test -- --testPathPattern="Auth"
```

## Test Organization

- `setup/`: Test configuration and setup files
- `utils/`: Shared test utilities and helpers
- Component tests: Co-located with components (e.g., `Component.test.tsx`)
- Integration tests: In `tests/integration/`

## Best Practices

1. **Use MSW for API Mocking**: For complex API interactions, consider using Mock Service Worker
2. **Test User Interactions**: Focus on testing what users see and do
3. **Avoid Implementation Details**: Test behavior, not implementation
4. **Keep Tests Simple**: Each test should verify one behavior
5. **Use Descriptive Names**: Test names should explain what they test

## Troubleshooting

### Common Issues

1. **Apollo warnings still appearing**: Ensure the test setup files are imported correctly
2. **Router errors**: Use the custom render from test-utils which includes BrowserRouter
3. **Async warnings**: Always use `waitFor` or `findBy` queries for async operations
