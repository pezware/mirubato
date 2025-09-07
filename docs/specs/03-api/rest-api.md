# REST API Specification

## Purpose

The Mirubato REST API enables client applications to manage musical practice data through a consistent, RESTful interface. Built on Cloudflare Workers for global edge performance, the API prioritizes speed, reliability, and offline-first design.

## Why This API Design

- **Edge-first**: Runs globally on Cloudflare's network for <50ms latency
- **Stateless**: JWT authentication enables horizontal scaling
- **Predictable**: Consistent patterns across all endpoints
- **Offline-capable**: Designed for sync and conflict resolution
- **Type-safe**: Full TypeScript definitions available

## Base URLs

| Environment | Base URL                           |
| ----------- | ---------------------------------- |
| Production  | https://api.mirubato.com           |
| Staging     | https://api-staging.mirubato.com   |
| Local       | http://api-mirubato.localhost:9797 |

## Authentication

Most endpoints require JWT authentication. See [Authentication Specification](./authentication.md) for detailed auth flows.

### Required Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Request-ID: <uuid>  # Optional but recommended for tracing
```

### Public Endpoints

These endpoints don't require authentication:

- `GET /health` - Health check
- `GET /api/auth/providers` - List auth methods
- `POST /api/auth/magic-link` - Request magic link
- `GET /api/auth/verify` - Verify magic link
- `POST /api/auth/google` - Google OAuth callback

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-12-01T00:00:00Z",
    "version": "1.7.6"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
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
    "limit": 50,
    "total": 150,
    "hasMore": true
  }
}
```

## API Endpoints Overview

### Authentication

- `POST /api/auth/login` - Email/password login
- `POST /api/auth/magic-link` - Send magic link
- `POST /api/auth/google` - Google OAuth
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

See [Authentication](./authentication.md) for detailed specifications.

## Logbook Endpoints

### Get Logbook Entries

```http
GET /api/logbook/entries
```

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50, max: 100)
- `from` (string): Start date (ISO 8601)
- `to` (string): End date (ISO 8601)
- `instrument` (string): Filter by instrument
- `type` (string): Filter by type (practice, performance, etc.)
- `mood` (string): Filter by mood
- `sort` (string): Sort field (timestamp, duration)
- `order` (string): Sort order (asc, desc)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "timestamp": 1701388800,
      "duration": 3600,
      "type": "practice",
      "instrument": "piano",
      "pieces": [
        {
          "title": "Moonlight Sonata",
          "composer": "Beethoven"
        }
      ],
      "techniques": ["scales", "arpeggios"],
      "mood": "satisfied",
      "notes": "Good progress on the first movement",
      "goalIds": ["goal_uuid"],
      "scorePages": [
        {
          "scoreId": "score_uuid",
          "pages": [1, 2, 3]
        }
      ],
      "tags": ["classical", "sonata"],
      "source": "manual",
      "createdAt": 1701388800,
      "updatedAt": 1701388800
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "hasMore": true
  }
}
```

### Create Logbook Entry

```http
POST /api/logbook/entries
```

**Request Body:**

```json
{
  "timestamp": 1701388800,
  "duration": 3600,
  "type": "practice",
  "instrument": "piano",
  "pieces": [
    {
      "title": "Moonlight Sonata",
      "composer": "Beethoven"
    }
  ],
  "techniques": ["scales", "arpeggios"],
  "mood": "satisfied",
  "notes": "Good progress on the first movement",
  "goalIds": ["goal_uuid"],
  "tags": ["classical", "sonata"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "new_uuid",
    ...
  }
}
```

### Update Logbook Entry

```http
PUT /api/logbook/entries/:id
```

**Request Body:**

```json
{
  "duration": 4200,
  "notes": "Updated notes",
  "mood": "excited"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    ...
  }
}
```

### Delete Logbook Entry

```http
DELETE /api/logbook/entries/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Entry deleted successfully"
  }
}
```

### Bulk Delete Entries

```http
POST /api/logbook/entries/bulk-delete
```

**Request Body:**

```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "deleted": 3
  }
}
```

### Export Logbook

```http
GET /api/logbook/export
```

**Query Parameters:**

- `format` (string): Export format (csv, json)
- `from` (string): Start date
- `to` (string): End date

**Response:**

- CSV: Returns CSV file with `Content-Type: text/csv`
- JSON: Returns JSON array of entries

## Repertoire Endpoints

### Get Repertoire

```http
GET /api/repertoire
```

**Query Parameters:**

- `status` (string): Filter by status (planned, learning, working, polished, performance_ready)
- `composer` (string): Filter by composer
- `sort` (string): Sort field (title, composer, lastPracticed, added)
- `order` (string): Sort order (asc, desc)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "scoreId": "score_uuid",
      "scoreTitle": "Moonlight Sonata",
      "scoreComposer": "Beethoven",
      "normalizedComposer": "Ludwig van Beethoven",
      "status": "learning",
      "statusHistory": [
        {
          "status": "planned",
          "timestamp": 1701388800
        },
        {
          "status": "learning",
          "timestamp": 1701475200
        }
      ],
      "difficulty": 7,
      "notes": "Working on dynamics",
      "goalIds": ["goal_uuid"],
      "practiceCount": 15,
      "totalPracticeTime": 54000,
      "lastPracticedAt": 1701475200,
      "targetTempo": 120,
      "currentTempo": 100,
      "performanceDate": 1704067200,
      "addedAt": 1701388800,
      "updatedAt": 1701475200
    }
  ]
}
```

### Add to Repertoire

```http
POST /api/repertoire
```

**Request Body:**

```json
{
  "scoreId": "score_uuid",
  "scoreTitle": "Moonlight Sonata",
  "scoreComposer": "Beethoven",
  "status": "planned",
  "difficulty": 7,
  "notes": "Want to learn this piece",
  "targetTempo": 120
}
```

### Update Repertoire Item

```http
PUT /api/repertoire/:id
```

**Request Body:**

```json
{
  "status": "learning",
  "currentTempo": 100,
  "notes": "Making good progress"
}
```

### Remove from Repertoire

```http
DELETE /api/repertoire/:id
```

### Get Practice History

```http
GET /api/repertoire/:id/history
```

**Response:**

```json
{
  "success": true,
  "data": {
    "repertoireId": "uuid",
    "entries": [
      {
        "id": "entry_uuid",
        "timestamp": 1701388800,
        "duration": 1800,
        "notes": "Focused on difficult passages"
      }
    ],
    "statistics": {
      "totalSessions": 15,
      "totalTime": 54000,
      "averageSessionTime": 3600,
      "lastWeek": 7200,
      "lastMonth": 28800
    }
  }
}
```

## Goals Endpoints

### Get Goals

```http
GET /api/goals
```

**Query Parameters:**

- `status` (string): Filter by status (active, paused, completed, abandoned)
- `type` (string): Filter by type (duration, sessions, pieces, tempo, custom)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Practice 1 hour daily",
      "description": "Maintain consistent daily practice",
      "targetType": "duration",
      "targetValue": 60,
      "targetUnit": "minutes",
      "currentValue": 45,
      "deadline": 1704067200,
      "pieceIds": [],
      "recurring": "daily",
      "status": "active",
      "progress": 75,
      "createdAt": 1701388800,
      "updatedAt": 1701475200
    }
  ]
}
```

### Create Goal

```http
POST /api/goals
```

**Request Body:**

```json
{
  "title": "Master Moonlight Sonata",
  "description": "Learn all three movements",
  "targetType": "pieces",
  "targetValue": 3,
  "deadline": 1704067200,
  "pieceIds": ["piece_uuid"]
}
```

### Update Goal

```http
PUT /api/goals/:id
```

**Request Body:**

```json
{
  "currentValue": 2,
  "status": "active"
}
```

### Delete Goal

```http
DELETE /api/goals/:id
```

### Update Goal Progress

```http
POST /api/goals/:id/progress
```

**Request Body:**

```json
{
  "value": 30,
  "date": 1701388800,
  "notes": "Good practice session"
}
```

## User Endpoints

### Get User Profile

```http
GET /api/user/profile
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "primaryInstrument": "piano",
    "instruments": ["piano", "violin"],
    "role": "user",
    "avatarUrl": "https://...",
    "preferences": {
      "theme": "light",
      "language": "en",
      "notifications": true
    },
    "stats": {
      "totalPracticeTime": 360000,
      "totalSessions": 150,
      "currentStreak": 7,
      "longestStreak": 30
    },
    "createdAt": 1701388800
  }
}
```

### Update User Profile

```http
PUT /api/user/profile
```

**Request Body:**

```json
{
  "displayName": "Jane Doe",
  "primaryInstrument": "violin",
  "preferences": {
    "theme": "dark",
    "language": "en"
  }
}
```

## Sync Endpoints

### Data Synchronization

- `POST /api/sync/push` - Push local changes
- `GET /api/sync/pull` - Pull remote changes
- `POST /api/sync/resolve` - Resolve conflicts

Real-time sync is handled via WebSocket. See [WebSocket Protocol](./websocket.md) for details.

## Health & Monitoring

### Health Check

```http
GET /health
```

**Response:**

```json
{
  "service": "api",
  "version": "1.7.6",
  "status": "healthy",
  "timestamp": "2024-12-01T00:00:00Z",
  "checks": {
    "database": "healthy",
    "cache": "healthy",
    "dependencies": {
      "scores": "healthy",
      "dictionary": "healthy"
    }
  }
}
```

### Metrics

```http
GET /metrics
```

**Response:** Prometheus-formatted metrics

## Error Codes

| Code                  | HTTP Status | Description                       |
| --------------------- | ----------- | --------------------------------- |
| UNAUTHORIZED          | 401         | Missing or invalid authentication |
| FORBIDDEN             | 403         | Insufficient permissions          |
| NOT_FOUND             | 404         | Resource not found                |
| VALIDATION_ERROR      | 400         | Invalid request data              |
| RATE_LIMIT_EXCEEDED   | 429         | Too many requests                 |
| INTERNAL_SERVER_ERROR | 500         | Server error                      |

## Rate Limiting

- **Authenticated requests**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour
- **Bulk operations**: 10 requests per minute

Headers returned:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1701392400
```

## Related Documentation

- [Authentication](./authentication.md) - Detailed auth flows and security
- [WebSocket Protocol](./websocket.md) - Real-time sync specification
- [Service APIs](./service-apis.md) - Inter-service communication
- [Database Schema](../02-database/schema.md) - Database structure
- [API Client Examples](./client-examples.md) - Implementation examples

---

_Last updated: December 2024 | Version 1.7.6_
