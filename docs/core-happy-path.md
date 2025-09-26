# Mirubato Core Happy Path

## User Journey: From Login to Practice Success

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as API Worker
    participant D1 as D1 Database
    participant KV as KV Cache
    participant S as Scores Worker
    participant R2 as R2 Storage
    participant SW as Sync Worker

    Note over U,SW: 1. Authentication Flow
    U->>F: Visit app
    F->>U: Show login page
    U->>F: Enter credentials
    F->>API: POST /api/auth/login
    API->>D1: Verify user credentials
    D1-->>API: User data
    API->>KV: Store session
    API-->>F: JWT token + user profile
    F->>F: Store token locally
    F-->>U: Redirect to dashboard

    Note over U,SW: 2. Dashboard & Goal Review
    F->>API: GET /api/goals (with JWT)
    API->>D1: Fetch active goals
    D1-->>API: Goals data
    API-->>F: Goals list
    F->>API: GET /api/logbook/stats
    API->>D1: Query practice stats
    D1-->>API: Weekly/monthly stats
    API-->>F: Practice statistics
    F-->>U: Show dashboard with goals & stats

    Note over U,SW: 3. Select Sheet Music
    U->>F: Navigate to Scorebook
    F->>S: GET /scores/list
    S->>D1: Query user's scores
    D1-->>S: Score metadata
    S-->>F: Scores list
    U->>F: Select a piece
    F->>S: GET /scores/{id}
    S->>R2: Fetch PDF/image
    R2-->>S: File data
    S-->>F: Score with viewer URL
    F-->>U: Display sheet music

    Note over U,SW: 4. Practice Session
    U->>F: Start practice timer
    F->>F: Begin local timer
    F->>SW: Open WebSocket connection
    SW-->>F: Connection established

    loop During Practice
        F->>F: Update timer (every second)
        F-->>U: Show elapsed time
    end

    U->>F: Stop timer
    F->>F: Calculate duration
    F-->>U: Show entry form
    U->>F: Add notes & select piece
    F->>API: POST /api/logbook/entries
    API->>D1: Save practice entry
    D1-->>API: Entry created
    API->>SW: Broadcast update
    SW-->>F: Real-time sync to other devices
    API-->>F: Entry confirmation

    Note over U,SW: 5. Review Progress
    F->>API: GET /api/repertoire/{pieceId}/stats
    API->>D1: Query practice history
    D1-->>API: Practice data
    API-->>F: Piece statistics
    F-->>U: Show progress chart

    U->>F: Check weekly heatmap
    F->>API: GET /api/logbook/heatmap
    API->>D1: Query daily totals
    D1-->>API: Heatmap data
    API-->>F: Calendar data
    F-->>U: Display practice heatmap

    Note over U,SW: 6. Goal Achievement
    F->>API: GET /api/goals/progress
    API->>D1: Calculate goal completion
    D1-->>API: Progress percentage
    API-->>F: Goal status

    alt Goal Completed
        F-->>U: Show celebration animation
        F->>API: POST /api/goals/{id}/complete
        API->>D1: Mark goal complete
        D1-->>API: Updated goal
        API-->>F: Achievement unlocked
        F-->>U: Display achievement badge
    else Goal In Progress
        F-->>U: Show progress bar
    end
```

## Key Interaction Patterns

### 1. **Offline-First Architecture**

- Frontend caches data locally using IndexedDB
- WebSocket sync ensures eventual consistency
- Service Workers handle offline mode

### 2. **Real-Time Synchronization**

- WebSocket connection via Sync Worker
- Automatic reconnection with exponential backoff
- Conflict resolution based on timestamps

### 3. **Performance Optimizations**

- KV cache for frequently accessed data (sessions, user preferences)
- R2 CDN for sheet music files
- D1 connection pooling for database queries
- Edge computing via Cloudflare Workers (300+ locations)

### 4. **Data Flow Patterns**

```mermaid
graph LR
    subgraph "Write Path"
        W1[User Input] --> W2[Frontend Validation]
        W2 --> W3[API Worker]
        W3 --> W4[D1 Database]
        W3 --> W5[Sync Broadcast]
    end

    subgraph "Read Path"
        R1[User Request] --> R2[KV Cache Check]
        R2 -->|Cache Hit| R3[Return Cached]
        R2 -->|Cache Miss| R4[D1 Query]
        R4 --> R5[Update Cache]
        R5 --> R3
    end
```

## Success Metrics

The happy path is considered successful when:

1. **Authentication**: < 500ms response time
2. **Dashboard Load**: < 1s for initial data
3. **Sheet Music Display**: < 2s for PDF rendering
4. **Practice Entry Save**: < 300ms with sync confirmation
5. **Real-time Sync**: < 100ms for WebSocket updates
6. **Goal Progress**: Calculated in real-time without page reload

## Error Recovery

Each step includes fallback mechanisms:

- **Network failures**: Retry with exponential backoff
- **Auth failures**: Redirect to login with return URL
- **Sync failures**: Queue changes locally, retry on reconnection
- **PDF load failures**: Show thumbnail with retry option
- **Database errors**: Graceful degradation with cached data

## Mobile Considerations

The happy path adapts for mobile users:

- Touch-optimized UI components
- Reduced data transfer (image compression)
- Offline mode by default
- Background sync when network available
- Responsive layouts for practice timer
