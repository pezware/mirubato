# Type Differences Between Original Frontend and Frontendv2

This document explains the exact type differences that affect data synchronization between the original frontend (GraphQL) and frontendv2 (REST API).

## Critical Field Differences

### 1. User Field

- **Original**: `user: User` (full user object with id, email, etc.)
- **localStorage**: `userId: string` (just the ID)
- **Frontendv2**: No user field at all

**Impact**: When syncing to D1 through GraphQL, the backend expects a user relationship. The REST API needs to handle this differently.

### 2. Goal References

- **Original localStorage**: `goals: string[]`
- **Original GraphQL**: `goalIds: string[]`
- **Frontendv2**: `goalIds: string[]`

**Impact**: Field name mismatch in localStorage data.

### 3. Timestamp Format

- **Original localStorage**: `timestamp: number` (Unix timestamp in milliseconds)
- **Original GraphQL**: `timestamp: DateTime` (ISO string)
- **Frontendv2**: `timestamp: string` (ISO string)

**Impact**: Need to convert number timestamps to ISO strings.

### 4. Type Enums

- **Original localStorage**: Lowercase (`'practice'`, `'performance'`)
- **Original GraphQL**: Uppercase (`'PRACTICE'`, `'PERFORMANCE'`)
- **Frontendv2**: Uppercase (`'PRACTICE'`, `'PERFORMANCE'`)

**Impact**: Need to uppercase the type values.

### 5. Audit Fields

- **Original localStorage**: No `createdAt`/`updatedAt`
- **Original GraphQL**: Has `createdAt`/`updatedAt` (required)
- **Frontendv2**: Has `createdAt`/`updatedAt` (required)

**Impact**: Need to generate these fields for legacy data.

### 6. Deletion Handling

- **Original**: No soft delete field
- **Frontendv2**: Has `deletedAt?: string`

**Impact**: New field for soft deletes in frontendv2.

## Data Flow Comparison

### Original Frontend Flow:

```
User Input → GraphQL Mutation → D1 Database
                              ↓
                          localStorage (backup)
```

### Frontendv2 Flow:

```
User Input → localStorage (immediate)
                ↓
           REST API Sync → D1 Database (when online)
```

## Transformation Required

When migrating from original to frontendv2:

1. **Timestamp**: Convert number to ISO string
2. **Type**: Convert to uppercase
3. **Instrument**: Convert to uppercase
4. **Mood**: Convert to uppercase (if present)
5. **Goals**: Rename field from `goals` to `goalIds`
6. **Audit fields**: Generate `createdAt` and `updatedAt` from timestamp
7. **User**: Remove `userId` field (not used in frontendv2)

## D1 Sync Considerations

### For GraphQL (Original Backend):

- Expects `user` relationship
- Requires `createdAt`/`updatedAt`
- Uses uppercase enums

### For REST API (New API):

- Stores in generic `sync_data` table
- No direct user relationship in entry
- Uses JSON blob storage

## Example Transformation

### Original localStorage Entry:

```javascript
{
  id: "abc123",
  userId: "user456",
  timestamp: 1703001600000,
  duration: 30,
  type: "practice",
  instrument: "piano",
  pieces: [{id: "p1", title: "Sonata"}],
  techniques: ["scales"],
  goals: ["goal789"],
  mood: "satisfied",
  tags: ["morning"],
  notes: "Good session"
}
```

### Transformed for Frontendv2:

```javascript
{
  id: "abc123",
  timestamp: "2023-12-19T16:00:00.000Z",
  duration: 30,
  type: "PRACTICE",
  instrument: "PIANO",
  pieces: [{id: "p1", title: "Sonata"}],
  techniques: ["scales"],
  goalIds: ["goal789"],
  mood: "SATISFIED",
  tags: ["morning"],
  notes: "Good session",
  createdAt: "2023-12-19T16:00:00.000Z",
  updatedAt: "2023-12-19T16:00:00.000Z"
}
```

## Recommendations

1. **Always transform data** before storing in frontendv2 format
2. **Keep transformation logic** in a single place (`transformLegacyEntry.ts`)
3. **Log transformation failures** to identify edge cases
4. **Test with real user data** to catch unknown formats
5. **Consider backward compatibility** when syncing to GraphQL backend
