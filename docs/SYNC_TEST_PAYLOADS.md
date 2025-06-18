# Sync Test Payloads

This document contains test payloads for manually testing the sync functionality in Mirubato.

## GraphQL Mutations

### 1. Sync Anonymous Data Mutation

This mutation syncs anonymous user data to the cloud after authentication.

```graphql
mutation SyncAnonymousData($input: SyncAnonymousDataInput!) {
  syncAnonymousData(input: $input) {
    success
    syncedSessions
    syncedLogs
    syncedEntries
    syncedGoals
    errors
  }
}
```

#### Test Payload 1: Basic Logbook Entry

```json
{
  "input": {
    "sessions": [],
    "logs": [],
    "entries": [
      {
        "id": "test-entry-1",
        "timestamp": "2024-01-15T10:30:00Z",
        "duration": 1800,
        "type": "PRACTICE",
        "instrument": "PIANO",
        "pieces": [
          {
            "id": "piece-1",
            "title": "Moonlight Sonata",
            "composer": "Beethoven"
          }
        ],
        "techniques": ["scales", "arpeggios"],
        "goalIds": [],
        "notes": "Focused on dynamics in the first movement",
        "mood": "SATISFIED",
        "tags": ["classical", "evening-practice"],
        "metadata": {
          "source": "manual",
          "deviceId": "test-device-123"
        }
      }
    ],
    "goals": []
  }
}
```

#### Test Payload 2: Multiple Entries with Goal

```json
{
  "input": {
    "sessions": [],
    "logs": [],
    "entries": [
      {
        "id": "test-entry-2",
        "timestamp": "2024-01-16T09:00:00Z",
        "duration": 2700,
        "type": "PRACTICE",
        "instrument": "GUITAR",
        "pieces": [
          {
            "title": "Asturias",
            "composer": "Albéniz"
          }
        ],
        "techniques": ["tremolo", "rasgueado"],
        "goalIds": ["goal-1"],
        "notes": "Working on tremolo consistency",
        "mood": "FOCUSED",
        "tags": ["classical-guitar", "morning"],
        "metadata": {
          "source": "manual"
        }
      },
      {
        "id": "test-entry-3",
        "timestamp": "2024-01-16T14:30:00Z",
        "duration": 1200,
        "type": "PERFORMANCE",
        "instrument": "GUITAR",
        "pieces": [
          {
            "title": "Recuerdos de la Alhambra",
            "composer": "Tárrega"
          }
        ],
        "techniques": ["tremolo"],
        "goalIds": ["goal-1"],
        "notes": "Recording session",
        "mood": "SATISFIED",
        "tags": ["recording", "performance"]
      }
    ],
    "goals": [
      {
        "id": "goal-1",
        "title": "Master Classical Guitar Tremolo",
        "description": "Achieve consistent and musical tremolo technique",
        "targetDate": "2024-06-01T00:00:00Z",
        "milestones": [
          {
            "id": "milestone-1",
            "title": "Play tremolo at 120 BPM",
            "completed": false
          },
          {
            "id": "milestone-2",
            "title": "Complete Recuerdos de la Alhambra",
            "completed": false
          }
        ]
      }
    ]
  }
}
```

#### Test Payload 3: Edge Cases

```json
{
  "input": {
    "sessions": [],
    "logs": [],
    "entries": [
      {
        "id": "test-entry-minimal",
        "timestamp": "2024-01-17T12:00:00Z",
        "duration": 600,
        "type": "PRACTICE",
        "instrument": "PIANO",
        "pieces": [],
        "techniques": [],
        "goalIds": [],
        "notes": "",
        "tags": []
      },
      {
        "id": "test-entry-unicode",
        "timestamp": "2024-01-17T13:00:00Z",
        "duration": 3600,
        "type": "PRACTICE",
        "instrument": "PIANO",
        "pieces": [
          {
            "title": "月光ソナタ",
            "composer": "ベートーヴェン"
          }
        ],
        "techniques": ["スケール", "アルペジオ"],
        "goalIds": [],
        "notes": "日本語のノート 🎹",
        "mood": "EXCITED",
        "tags": ["日本語", "emoji-🎵"]
      }
    ],
    "goals": []
  }
}
```

## GraphQL Queries

### 1. Get Logbook Entries

```graphql
query GetLogbookEntries(
  $filter: LogbookFilterInput
  $limit: Int
  $offset: Int
) {
  myLogbookEntries(filter: $filter, limit: $limit, offset: $offset) {
    edges {
      node {
        id
        timestamp
        duration
        type
        instrument
        pieces {
          id
          title
          composer
        }
        techniques
        notes
        mood
        tags
        metadata
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

#### Query Variables

```json
{
  "limit": 10,
  "offset": 0,
  "filter": {
    "type": ["PRACTICE"],
    "instrument": "PIANO",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
}
```

### 2. Sync Debug Info Query

```graphql
query GetSyncDebugInfo($userId: ID!) {
  syncDebugInfo(userId: $userId) {
    devices {
      deviceId
      deviceName
      lastSeen
      entryCount
    }
    localEntryCount
    cloudEntryCount
    conflicts {
      entityId
      entityType
      localVersion
      remoteVersion
      conflictType
    }
    lastSyncLogs {
      timestamp
      deviceId
      operation
      status
      message
    }
  }
}
```

## cURL Examples

### 1. Sync Anonymous Data

```bash
curl -X POST https://api.mirubato.com/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_AUTH_TOKEN" \
  -d '{
    "query": "mutation SyncAnonymousData($input: SyncAnonymousDataInput!) { syncAnonymousData(input: $input) { success syncedEntries errors } }",
    "variables": {
      "input": {
        "sessions": [],
        "logs": [],
        "entries": [{
          "id": "curl-test-1",
          "timestamp": "2024-01-18T10:00:00Z",
          "duration": 1800,
          "type": "PRACTICE",
          "instrument": "PIANO",
          "pieces": [{"title": "Test Piece"}],
          "techniques": ["scales"],
          "goalIds": [],
          "notes": "Test from cURL",
          "mood": "SATISFIED",
          "tags": ["test"]
        }],
        "goals": []
      }
    }
  }'
```

### 2. Query Logbook Entries

```bash
curl -X POST https://api.mirubato.com/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_AUTH_TOKEN" \
  -d '{
    "query": "query { myLogbookEntries(limit: 5) { edges { node { id timestamp duration type instrument notes } } totalCount } }"
  }'
```

## Testing Scenarios

### Scenario 1: Anonymous to Authenticated Sync

1. Create entries while logged out (stored in localStorage)
2. Log in with magic link
3. Execute sync mutation with local entries
4. Verify entries appear in cloud via query

### Scenario 2: Multi-Device Sync

1. Create entries on Device A
2. Sync to cloud
3. Log in on Device B
4. Query cloud entries
5. Verify Device A entries appear on Device B

### Scenario 3: Conflict Resolution

1. Create entry with ID "conflict-test" on Device A
2. Create different entry with same ID on Device B
3. Sync both devices
4. Verify newer entry wins (based on timestamp)

### Scenario 4: Offline-Online Sync

1. Create entries while offline
2. Queue sync operations
3. Go online
4. Verify queued operations sync automatically

### Scenario 5: Data Validation

1. Try to sync entry with invalid type (e.g., "INVALID_TYPE")
2. Try to sync entry with missing required fields
3. Verify appropriate error messages

## Debugging Tips

1. Use browser DevTools Network tab to inspect GraphQL requests/responses
2. Check browser localStorage for:
   - `logbook:*` entries
   - `goal:*` entries
   - `sync:queue` for pending operations
3. Use the `syncDebugInfo` query to check sync status
4. Check browser console for sync-related logs
5. Verify auth token is properly set in cookies

## Common Issues

1. **401 Unauthorized**: Auth token missing or expired
2. **Empty results**: User context not properly set
3. **Duplicate entries**: ID-based deduplication not working
4. **Sync conflicts**: Check timestamps and sync versions
5. **Missing data**: Verify all required fields are included
