# GraphQL Code Generation Migration Guide

This guide shows how to migrate from manual GraphQL queries to generated, type-safe hooks.

## Before Migration (Manual Queries)

```typescript
// frontend/src/pages/Logbook.tsx
import { useQuery } from '@apollo/client'
import { GET_LOGBOOK_ENTRIES } from '../graphql/queries/practice'

// Manual query with no type safety
const { data, loading, refetch } = useQuery(GET_LOGBOOK_ENTRIES, {
  variables: {
    filter: {},
    limit: 1000,
    offset: 0,
  },
})

// Need to manually handle types and structure
const entries = data?.myLogbookEntries?.edges?.map(edge => edge.node) || []
```

## After Migration (Generated Hooks)

```typescript
// frontend/src/pages/Logbook.tsx
import { useGetLogbookEntriesQuery } from '../generated/graphql'

// Fully typed hook with auto-completion
const { data, loading, refetch } = useGetLogbookEntriesQuery({
  variables: {
    filter: {},
    limit: 1000,
    offset: 0,
  },
})

// Type-safe access with auto-completion
const entries = data?.myLogbookEntries?.edges?.map(edge => edge.node) || []
// TypeScript knows the exact shape of 'edge.node'
```

## Migration Steps

### 1. Generate Types

```bash
npm run codegen
```

### 2. Update Imports

Replace manual query imports:

```typescript
// Before
import { GET_LOGBOOK_ENTRIES } from '../graphql/queries/practice'
import { useQuery } from '@apollo/client'

// After
import { useGetLogbookEntriesQuery } from '../generated/graphql'
```

### 3. Update Hook Usage

Replace generic hooks with generated ones:

```typescript
// Before
const { data } = useQuery(GET_LOGBOOK_ENTRIES, { variables })

// After
const { data } = useGetLogbookEntriesQuery({ variables })
```

### 4. Remove Type Assertions

Generated hooks provide full type safety:

```typescript
// Before - needed type assertions
const user = data?.me as User

// After - TypeScript knows the types
const user = data?.me // Type is User | undefined
```

## Benefits

1. **Compile-time Safety**: TypeScript catches field name errors
2. **Auto-completion**: IDE suggests available fields
3. **Refactoring**: Rename fields in schema, regenerate, fix all errors
4. **Documentation**: Hover over fields to see descriptions from schema
5. **No Manual Sync**: Changes to schema automatically update frontend

## Common Patterns

### Mutations

```typescript
// Before
import { CREATE_LOGBOOK_ENTRY } from '../graphql/queries/practice'
const [createEntry] = useMutation(CREATE_LOGBOOK_ENTRY)

// After
import { useCreateLogbookEntryMutation } from '../generated/graphql'
const [createEntry] = useCreateLogbookEntryMutation()
```

### Lazy Queries

```typescript
// Before
import { GET_GOALS } from '../graphql/queries/practice'
const [getGoals] = useLazyQuery(GET_GOALS)

// After
import { useGetGoalsLazyQuery } from '../generated/graphql'
const [getGoals] = useGetGoalsLazyQuery()
```

### Fragments

Define fragments in your `.graphql` files and they'll be generated too:

```graphql
fragment LogbookEntryFields on LogbookEntry {
  id
  timestamp
  duration
  type
}
```

Use in TypeScript:

```typescript
import { LogbookEntryFieldsFragment } from '../generated/graphql'

function processEntry(entry: LogbookEntryFieldsFragment) {
  // TypeScript knows all the fields
}
```

## Troubleshooting

### "Cannot find module '../generated/graphql'"

Run `npm run codegen` to generate the types.

### Types don't match backend

1. Pull latest backend changes
2. Run `npm run codegen`
3. Fix any TypeScript errors

### Query not generating a hook

Make sure your query has a name:

```graphql
// Bad - anonymous query
query {
  me { id }
}

// Good - named query
query GetCurrentUser {
  me { id }
}
```

## Best Practices

1. **Always name operations**: Helps with debugging and generates better hook names
2. **Use fragments**: Reuse common field selections
3. **Watch mode during development**: `npm run codegen:watch`
4. **Commit generated files**: They're part of your source code
5. **Don't edit generated files**: They'll be overwritten

## Next Steps

1. Migrate one file at a time
2. Run tests after each migration
3. Use the generated types everywhere (not just in queries)
4. Remove manual type definitions that duplicate schema types
