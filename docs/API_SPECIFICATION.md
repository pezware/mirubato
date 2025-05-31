# Mirubato API Specification

## Overview

This document provides detailed API specifications for all mirubato endpoints. The primary API is GraphQL-based, running on Cloudflare Workers with Apollo Server. The API uses JWT tokens for authentication and follows GraphQL best practices for queries and mutations.

## Base URL

```
Production: https://api.mirubato.com/graphql
Development: http://localhost:8787/graphql
```

## GraphQL Endpoint

All GraphQL requests are sent as POST requests to the `/graphql` endpoint.

### Request Format

```json
{
  "query": "query { ... }",
  "variables": { ... },
  "operationName": "..."
}
```

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0"
  }
}
```

### Pagination Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 145,
    "totalPages": 8
  },
  "meta": { ... }
}
```

## GraphQL Schema Overview

### Core Types

```graphql
type User {
  id: ID!
  email: String!
  displayName: String
  primaryInstrument: Instrument!
  preferences: UserPreferences!
  stats: UserStats!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type SheetMusic {
  id: ID!
  title: String!
  composer: String!
  opus: String
  movement: String
  instrument: Instrument!
  difficulty: Difficulty!
  difficultyLevel: Int!
  gradeLevel: String
  durationSeconds: Int!
  timeSignature: String!
  keySignature: String!
  tempoMarking: String
  suggestedTempo: Int!
  stylePeriod: StylePeriod!
  tags: [String!]!
  measures: [Measure!]!
  metadata: SheetMusicMetadata
  thumbnail: String
}

type PracticeSession {
  id: ID!
  user: User!
  instrument: Instrument!
  sheetMusic: SheetMusic
  sessionType: SessionType!
  startedAt: DateTime!
  completedAt: DateTime
  pausedDuration: Int!
  accuracy: Float
  notesAttempted: Int!
  notesCorrect: Int!
  logs: [PracticeLog!]!
}
```

## Queries and Mutations

### Authentication

#### Request Magic Link

```graphql
mutation RequestMagicLink($email: String!) {
  requestMagicLink(email: $email) {
    success
    message
  }
}
```

**Variables:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "data": {
    "requestMagicLink": {
      "success": true,
      "message": "Magic link sent to your email"
    }
  }
}
```

#### Verify Magic Link

```graphql
mutation VerifyMagicLink($token: String!) {
  verifyMagicLink(token: $token) {
    accessToken
    refreshToken
    expiresIn
    user {
      id
      email
      displayName
      primaryInstrument
    }
  }
}
```

**Variables:**

```json
{
  "token": "magic_link_token_from_email"
}
```

**Response:**

```json
{
  "data": {
    "verifyMagicLink": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token",
      "expiresIn": 900,
      "user": {
        "id": "user_123",
        "email": "user@example.com",
        "displayName": "John Doe",
        "primaryInstrument": "PIANO"
      }
    }
  }
}
```

### User Queries

#### Get Current User

```graphql
query Me {
  me {
    id
    email
    displayName
    primaryInstrument
    preferences {
      theme
      notationSize
      practiceReminders
      dailyGoalMinutes
      customSettings
    }
    stats {
      totalPracticeTime
      consecutiveDays
      piecesCompleted
      accuracyAverage
    }
    createdAt
    updatedAt
  }
}
```

**Headers Required:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "data": {
    "me": {
      "id": "user_123",
      "email": "user@example.com",
      "displayName": "John Doe",
      "primaryInstrument": "PIANO",
      "preferences": {
        "theme": "LIGHT",
        "notationSize": "MEDIUM",
        "practiceReminders": true,
        "dailyGoalMinutes": 15,
        "customSettings": {}
      },
      "stats": {
        "totalPracticeTime": 45300,
        "consecutiveDays": 7,
        "piecesCompleted": 42,
        "accuracyAverage": 0.85
      },
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### Update User Profile

```graphql
mutation UpdateUser($input: UpdateUserInput!) {
  updateUser(input: $input) {
    id
    displayName
    primaryInstrument
    preferences {
      theme
      notationSize
    }
  }
}
```

**Variables:**

```json
{
  "input": {
    "displayName": "Jane Doe",
    "primaryInstrument": "GUITAR",
    "preferences": {
      "theme": "DARK",
      "notationSize": "LARGE"
    }
  }
}
```

### Sheet Music Queries

#### List Sheet Music

```graphql
query ListSheetMusic(
  $filter: SheetMusicFilterInput
  $limit: Int
  $offset: Int
) {
  listSheetMusic(filter: $filter, limit: $limit, offset: $offset) {
    edges {
      cursor
      node {
        id
        title
        composer
        opus
        movement
        instrument
        difficulty
        difficultyLevel
        gradeLevel
        durationSeconds
        timeSignature
        keySignature
        tempoMarking
        suggestedTempo
        stylePeriod
        tags
        thumbnail
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

**Variables:**

```json
{
  "filter": {
    "instrument": "PIANO",
    "difficulty": "INTERMEDIATE",
    "stylePeriod": "CLASSICAL",
    "maxDuration": 600,
    "tags": ["sonata", "virtuosic"],
    "search": "beethoven"
  },
  "limit": 20,
  "offset": 0
}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "sheet_123",
      "title": "Moonlight Sonata, 3rd Movement",
      "composer": "Ludwig van Beethoven",
      "opus": "Op. 27 No. 2",
      "instrument": "piano",
      "difficultyLevel": 7,
      "gradeLevel": "ABRSM Grade 7",
      "durationSeconds": 420,
      "timeSignature": "4/4",
      "keySignature": "C# minor",
      "tempoMarking": "Presto agitato",
      "suggestedTempo": 160,
      "stylePeriod": "classical",
      "tags": ["sonata", "virtuosic", "arpeggios"],
      "thumbnail": "https://cdn.mirubato.com/thumbnails/sheet_123.png"
    }
  ],
  "pagination": { ... }
}
```

#### Get Random Sheet Music

```graphql
query RandomSheetMusic(
  $instrument: Instrument!
  $difficulty: Difficulty
  $maxDuration: Int
) {
  randomSheetMusic(
    instrument: $instrument
    difficulty: $difficulty
    maxDuration: $maxDuration
  ) {
    id
    title
    composer
    instrument
    difficulty
    measures {
      number
      notes {
        keys
        duration
        time
      }
      timeSignature
      keySignature
      clef
      tempo {
        bpm
        marking
      }
    }
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "sheet_456",
    "title": "Etude Op. 60, No. 3",
    "composer": "Fernando Sor",
    "instrument": "guitar"
    // ... full sheet music object
  }
}
```

### Practice Session Mutations

#### Start Practice Session

```graphql
mutation StartPracticeSession($input: StartPracticeSessionInput!) {
  startPracticeSession(input: $input) {
    id
    instrument
    sessionType
    startedAt
    sheetMusic {
      id
      title
    }
  }
}
```

**Variables:**

```json
{
  "input": {
    "sessionType": "FREE_PRACTICE",
    "instrument": "PIANO",
    "sheetMusicId": "sheet_123"
  }
}
```

#### Create Practice Log

```graphql
mutation CreatePracticeLog($input: CreatePracticeLogInput!) {
  createPracticeLog(input: $input) {
    id
    activityType
    durationSeconds
    tempoPracticed
    targetTempo
    focusAreas
    selfRating
    notes
    createdAt
  }
}
```

**Variables:**

```json
{
  "input": {
    "sessionId": "session_789",
    "activityType": "REPERTOIRE",
    "durationSeconds": 900,
    "tempoPracticed": 120,
    "targetTempo": 160,
    "focusAreas": ["accuracy", "dynamics", "tempo"],
    "selfRating": 7,
    "notes": "Worked on maintaining tempo in arpeggios"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "logId": "log_101112",
    "createdAt": "2024-01-15T10:45:00Z"
  }
}
```

#### POST /api/practice/quick-log

Quick practice log for professionals.

**Request:**

```json
{
  "activityType": "scales",
  "duration": 600,
  "piece": {
    "title": "C Major Scale",
    "tempo": 120
  },
  "selfRating": 8,
  "notes": "Focus on evenness"
}
```

### Complete Practice Session

```graphql
mutation CompletePracticeSession($input: CompletePracticeSessionInput!) {
  completePracticeSession(input: $input) {
    id
    completedAt
    accuracy
    notesAttempted
    notesCorrect
  }
}
```

**Variables:**

```json
{
  "input": {
    "sessionId": "session_789",
    "accuracy": 0.85,
    "notesAttempted": 150,
    "notesCorrect": 128
  }
}
```

### Progress Queries

#### Get User Progress

```graphql
query MyPracticeSessions($instrument: Instrument, $limit: Int, $offset: Int) {
  myPracticeSessions(instrument: $instrument, limit: $limit, offset: $offset) {
    edges {
      node {
        id
        instrument
        sessionType
        startedAt
        completedAt
        accuracy
        notesAttempted
        notesCorrect
        logs {
          activityType
          durationSeconds
          selfRating
        }
      }
    }
    totalCount
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "instruments": {
      "piano": {
        "currentLevel": 5,
        "currentGrade": "ABRSM Grade 4",
        "experiencePoints": 2450,
        "nextLevelPoints": 3000,
        "totalPracticeTime": 25200,
        "accuracyTrend": 0.85,
        "speedTrend": 0.72
      },
      "guitar": {
        "currentLevel": 3,
        "currentGrade": "RCM Level 3",
        "experiencePoints": 1200,
        "nextLevelPoints": 1500,
        "totalPracticeTime": 10800,
        "accuracyTrend": 0.78,
        "speedTrend": 0.65
      }
    },
    "streaks": {
      "current": 7,
      "longest": 21,
      "lastPracticeDate": "2024-01-15"
    },
    "achievements": [
      {
        "id": "first_week",
        "name": "First Week Complete",
        "description": "Practiced for 7 consecutive days",
        "unlockedAt": "2024-01-07T10:00:00Z",
        "icon": "🏆"
      }
    ],
    "recentMilestones": [
      {
        "date": "2024-01-10",
        "achievement": "Completed ABRSM Grade 3",
        "instrument": "piano"
      }
    ]
  }
}
```

### Analytics Endpoints

#### GET /api/analytics/practice-time

Get practice time analytics.

**Query Parameters:**

- `period`: day | week | month | year
- `startDate`: ISO date string
- `endDate`: ISO date string
- `groupBy`: day | week | month

**Response:**

```json
{
  "success": true,
  "data": {
    "totalTime": 45300,
    "averageDaily": 900,
    "distribution": {
      "sightReading": 15000,
      "scales": 8000,
      "repertoire": 20000,
      "other": 2300
    },
    "timeline": [
      {
        "date": "2024-01-01",
        "duration": 1200,
        "activities": {
          "sightReading": 600,
          "scales": 300,
          "repertoire": 300
        }
      }
    ],
    "peakHours": {
      "morning": 12000,
      "afternoon": 18000,
      "evening": 15300
    }
  }
}
```

#### GET /api/analytics/export

Export practice data.

**Query Parameters:**

- `format`: pdf | csv | json
- `startDate`: ISO date string
- `endDate`: ISO date string
- `includeDetails`: true | false

**Response:**

```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://cdn.mirubato.com/exports/user_123_2024_01.pdf",
    "expiresAt": "2024-01-16T10:30:00Z"
  }
}
```

## GraphQL Error Handling

GraphQL errors are returned in the standard format:

```json
{
  "errors": [
    {
      "message": "Authentication required",
      "extensions": {
        "code": "UNAUTHENTICATED",
        "details": { ... }
      },
      "path": ["me"],
      "locations": [{ "line": 2, "column": 3 }]
    }
  ],
  "data": null
}
```

### Error Codes

| Code                        | Description              |
| --------------------------- | ------------------------ |
| `UNAUTHENTICATED`           | Authentication required  |
| `FORBIDDEN`                 | Insufficient permissions |
| `BAD_USER_INPUT`            | Invalid input data       |
| `NOT_FOUND`                 | Resource not found       |
| `INTERNAL_SERVER_ERROR`     | Server error             |
| `GRAPHQL_VALIDATION_FAILED` | Query validation failed  |
| `RATE_LIMITED`              | Too many requests        |

## Rate Limiting

- **Unauthenticated**: 20 requests per minute
- **Authenticated**: 120 requests per minute
- **Practice logging**: 300 requests per hour

Headers included in response:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 115
X-RateLimit-Reset: 1705317000
```

## Webhooks (Future)

For future integrations, webhooks can be configured for:

- Practice goal achievements
- Streak milestones
- Level progression
- Weekly summaries

## API Versioning

The API uses URL versioning. Current version is v1. Future versions will be:

- `/api/v2/...` for version 2
- Legacy versions supported for 6 months after deprecation

## GraphQL Code Generation

The backend uses GraphQL Code Generator to create TypeScript types from the schema:

```bash
# Generate types
npm run codegen
```

Frontend can use the same schema for client-side code generation:

```typescript
// Example with Apollo Client
import { gql, useQuery } from '@apollo/client'
import { MeQuery } from './__generated__/graphql'

const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      displayName
    }
  }
`

function Profile() {
  const { data, loading } = useQuery<MeQuery>(ME_QUERY)
  // TypeScript knows the exact shape of data
}
```

## SDK Support

Official SDKs planned for:

- JavaScript/TypeScript (Apollo Client)
- React Native
- Swift (iOS)
- Kotlin (Android)
