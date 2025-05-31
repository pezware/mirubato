# Mirubato API Specification

## Overview

This document provides detailed API specifications for all mirubato endpoints. The API follows RESTful principles and uses JSON for request/response bodies.

## Base URL

```
Production: https://api.mirubato.com
Development: http://localhost:8787
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

## Endpoints

### Authentication Endpoints

#### POST /api/auth/login
Request magic link for email authentication.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Magic link sent to your email"
  }
}
```

#### POST /api/auth/verify
Verify magic link token and get JWT.

**Request:**
```json
{
  "token": "magic_link_token_from_email"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "expiresIn": 900,
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "displayName": "John Doe",
      "primaryInstrument": "piano"
    }
  }
}
```

### User Endpoints

#### GET /api/users/me
Get current user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "displayName": "John Doe",
    "primaryInstrument": "piano",
    "skillLevel": "intermediate",
    "preferences": {
      "theme": "light",
      "notationSize": "medium",
      "practiceReminders": true,
      "dailyGoalMinutes": 15
    },
    "stats": {
      "totalPracticeTime": 45300,
      "consecutiveDays": 7,
      "piecesCompleted": 42
    }
  }
}
```

#### PUT /api/users/me
Update user profile.

**Request:**
```json
{
  "displayName": "Jane Doe",
  "primaryInstrument": "guitar",
  "skillLevel": "advanced",
  "preferences": {
    "theme": "dark",
    "notationSize": "large"
  }
}
```

### Sheet Music Endpoints

#### GET /api/sheet-music
List sheet music with filters.

**Query Parameters:**
- `instrument`: piano | guitar | both
- `difficulty`: 1-10
- `style`: baroque | classical | romantic | modern | contemporary
- `duration`: max duration in seconds
- `tags`: comma-separated tags
- `search`: search in title/composer
- `page`: page number (default: 1)
- `perPage`: items per page (default: 20)

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

#### GET /api/sheet-music/random
Get random sheet music based on criteria.

**Query Parameters:**
- `instrument`: required
- `difficulty`: optional difficulty range (e.g., "3-5")
- `style`: optional style period
- `maxDuration`: optional max duration in seconds

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sheet_456",
    "title": "Etude Op. 60, No. 3",
    "composer": "Fernando Sor",
    "instrument": "guitar",
    // ... full sheet music object
  }
}
```

### Practice Endpoints

#### POST /api/practice/sessions/start
Start a new practice session.

**Request:**
```json
{
  "sessionType": "free_practice",
  "instrument": "piano"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_789",
    "startTime": "2024-01-15T10:30:00Z",
    "sessionType": "free_practice",
    "instrument": "piano"
  }
}
```

#### POST /api/practice/logs
Create a practice log entry.

**Request:**
```json
{
  "sessionId": "session_789",
  "activityType": "repertoire",
  "sheetMusicId": "sheet_123",
  "instrument": "piano",
  "duration": 900,
  "composer": "Beethoven",
  "workTitle": "Moonlight Sonata",
  "opusNumber": "Op. 27 No. 2",
  "movementSection": "3rd movement, measures 1-50",
  "tempoPracticed": 120,
  "targetTempo": 160,
  "focusAreas": ["accuracy", "dynamics", "tempo"],
  "selfRating": 7,
  "practiceNotes": "Worked on maintaining tempo in arpeggios"
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

### Progress Endpoints

#### GET /api/progress/overview
Get user's overall progress.

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

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication required |
| `TOKEN_EXPIRED` | JWT token has expired |
| `INVALID_TOKEN` | Invalid or malformed token |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Request validation failed |
| `RATE_LIMIT` | Rate limit exceeded |
| `SERVER_ERROR` | Internal server error |

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

## SDK Support

Official SDKs planned for:
- JavaScript/TypeScript
- Python
- Swift (iOS)
- Kotlin (Android)