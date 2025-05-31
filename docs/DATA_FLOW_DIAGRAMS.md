# Mirubato Data Flow Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   Pages     │  │  Components  │  │    State (Zustand)     │ │
│  │             │  │              │  │                        │ │
│  │ • Practice  │  │ • Sheet      │  │ • User State          │ │
│  │ • Progress  │  │   Music      │  │ • Practice State      │ │
│  │ • Analytics │  │ • Timer      │  │ • Progress Cache      │ │
│  │ • Profile   │  │ • Piano Keys │  │ • Offline Queue       │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    Service Layer (TypeScript)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ API Client  │  │Offline Manager│ │   Audio Manager        │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers (API)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │Auth Service │  │Practice Svc  │  │  Analytics Service     │ │
│  ├─────────────┤  ├──────────────┤  ├────────────────────────┤ │
│  │User Service │  │Progress Svc  │  │  Sheet Music Service   │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     Middleware & Utilities                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │JWT Handler  │  │Rate Limiter  │  │  Request Validator     │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ SQL
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare D1                             │
│                      (SQLite Database)                           │
├─────────────────────────────────────────────────────────────────┤
│  • users            • practice_logs      • progress_tracking    │
│  • sheet_music      • practice_sessions  • user_sheet_progress  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
├─────────────┬─────────────┬────────────────┬───────────────────┤
│ Cloudflare  │   Tone.js   │    Email       │   Future: ML      │
│    KV       │   CDN       │   (Resend)     │   Service         │
│  (Cache)    │  (Audio)    │  (Auth)        │ (Recommendations) │
└─────────────┴─────────────┴────────────────┴───────────────────┘
```

## Authentication Flow

```
User                Frontend            API                 Email Service
 │                     │                 │                      │
 ├──Enter Email────────►│                 │                      │
 │                     ├──POST /login────►│                      │
 │                     │                 ├──Generate Token────►  │
 │                     │                 ├──Send Email─────────►│
 │                     │◄──202 Accepted──┤                      │
 │◄──Check Email───────┤                 │                      │
 │                     │                 │                      │
 ├──Click Link─────────►│                 │                      │
 │                     ├──POST /verify───►│                      │
 │                     │                 ├──Validate Token      │
 │                     │                 ├──Create JWT          │
 │                     │◄──200 OK────────┤                      │
 │                     ├──Store Token    │                      │
 │                     ├──Redirect───────►│                      │
 │◄──Logged In─────────┤                 │                      │
```

## Practice Session Flow

```
User            Frontend          API            D1 Database      Cache
 │                 │               │                  │             │
 ├──Start Practice─►│               │                  │             │
 │                 ├──POST /start──►│                  │             │
 │                 │               ├──Create Session──►│             │
 │                 │               │◄──Session ID──────┤             │
 │                 │◄──Session─────┤                  │             │
 │                 ├──Start Timer  │                  │             │
 │◄──Timer Running─┤               │                  │             │
 │                 │               │                  │             │
 ├──Play Notes────►│               │                  │             │
 │                 ├──Local State  │                  │             │
 │◄──Feedback──────┤               │                  │             │
 │                 │               │                  │             │
 ├──End Practice──►│               │                  │             │
 │                 ├──POST /log────►│                  │             │
 │                 │               ├──Save Log────────►│             │
 │                 │               ├──Update Progress─►│             │
 │                 │               ├──Clear Cache─────────────────►│
 │                 │◄──Summary─────┤                  │             │
 │◄──Show Results──┤               │                  │             │
```

## Offline Practice Sync

```
User (Offline)   Frontend       LocalStorage      API (Online)     D1
 │                 │                 │               │               │
 ├──Practice───────►│                 │               │               │
 │                 ├──No Network     │               │               │
 │                 ├──Store Local────►│               │               │
 │                 │◄──Saved─────────┤               │               │
 │◄──Confirmed─────┤                 │               │               │
 │                 │                 │               │               │
 │ [Time Passes]   │                 │               │               │
 │                 │                 │               │               │
 ├──Open App───────►│                 │               │               │
 │                 ├──Check Network  │               │               │
 │                 ├──Network OK     │               │               │
 │                 ├──Get Queue──────►│               │               │
 │                 │◄──5 Logs────────┤               │               │
 │                 ├──POST /sync─────────────────────►│               │
 │                 │                 │               ├──Batch Save──►│
 │                 │                 │               │◄──Success─────┤
 │                 │◄──Synced────────────────────────┤               │
 │                 ├──Clear Queue────►│               │               │
 │◄──Updated───────┤                 │               │               │
```

## Progress Calculation Flow

```
Practice Log      API             D1 Database       Analytics Engine
    │              │                  │                    │
    ├──New Log────►│                  │                    │
    │              ├──Save Log────────►│                    │
    │              ├──Get User Stats──►│                    │
    │              │◄──Current Stats──┤                    │
    │              ├──Calculate New───────────────────────►│
    │              │                  │                    ├─Accuracy
    │              │                  │                    ├─Speed
    │              │                  │                    ├─Consistency
    │              │                  │                    ├─Level XP
    │              │◄──New Metrics─────────────────────────┤
    │              ├──Update Progress─►│                    │
    │              ├──Check Achievements──────────────────►│
    │              │◄──New Achievements───────────────────┤
    │              ├──Update User─────►│                    │
    │              │◄──Success────────┤                    │
```

## Sheet Music Recommendation Flow

```
User           Frontend         API          ML Service      D1
 │               │               │               │           │
 ├──Request──────►│               │               │           │
 │               ├──GET /recommended             │           │
 │               │               ├──Get History──────────────►│
 │               │               │◄──User Data───────────────┤
 │               │               ├──ML Request──►│           │
 │               │               │               ├─Analyze   │
 │               │               │               ├─Score     │
 │               │               │               ├─Rank      │
 │               │               │◄──Top 10──────┤           │
 │               │               ├──Get Details─────────────►│
 │               │◄──Sheet Music─┤◄──Full Data───────────────┤
 │◄──Display─────┤               │               │           │
```

## Analytics Export Flow

```
User          Frontend          API           D1          File Storage
 │              │                │             │               │
 ├──Export PDF─►│                │             │               │
 │              ├──GET /export───►│             │               │
 │              │                ├──Query All──►│               │
 │              │                │◄──Data──────┤               │
 │              │                ├──Generate PDF               │
 │              │                ├──Upload─────────────────────►│
 │              │                │◄──URL───────────────────────┤
 │              │◄──Download URL─┤             │               │
 │◄──Download───┤                │             │               │
```

## Real-time Features (Future)

```
User A          Server          Pub/Sub         Server         User B
 │               │                │               │              │
 ├──Join Duet───►│                │               │              │
 │               ├──Subscribe─────►│               │              │
 │               │                │◄──Subscribe───┤◄──Join───────┤
 │               ├──Notify────────►│──User A──────►│              │
 │               │                │               ├──Notify──────►│
 │               │                │               │              │
 ├──Play Note───►│                │               │              │
 │               ├──Publish───────►│──Note Event──►│              │
 │               │                │               ├──Broadcast───►│
 │               │                │               │              │
 │               │◄──Feedback─────┤◄──Score──────┤◄──Play Note──┤
```

## Caching Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    Cache Layers                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Browser Cache (Service Worker)                         │
│  └─ Static assets, sheet music images                   │
│  └─ TTL: 7 days                                        │
│                                                          │
│  LocalStorage                                           │
│  └─ User preferences, recent logs                       │
│  └─ Offline queue                                      │
│  └─ TTL: Persistent                                    │
│                                                          │
│  Cloudflare Edge Cache                                 │
│  └─ API responses (GET requests)                       │
│  └─ TTL: 5 minutes                                     │
│                                                          │
│  Cloudflare KV                                         │
│  └─ User sessions, progress snapshots                  │
│  └─ TTL: 1 hour                                        │
│                                                          │
│  Database Query Cache                                  │
│  └─ Complex analytics queries                          │
│  └─ TTL: 15 minutes                                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
Frontend          API            Error Handler      Logging
  │               │                   │               │
  ├──Request──────►│                   │               │
  │               ├──Process          │               │
  │               ├──Error Occurs     │               │
  │               ├──Catch Error──────►│               │
  │               │                   ├──Log Error────►│
  │               │                   ├──Categorize   │
  │               │                   ├──Format       │
  │               │◄──Error Response──┤               │
  │◄──4xx/5xx─────┤                   │               │
  ├──Retry Logic  │                   │               │
  ├──Show Error   │                   │               │
  │               │                   │               │
```

## Data Privacy & GDPR Flow

```
User           Frontend         API            D1          Archive
 │               │               │              │             │
 ├──Export Data─►│               │              │             │
 │               ├──GET /me/data─►│              │             │
 │               │               ├──Collect All─►│             │
 │               │               │◄──User Data──┤             │
 │               │◄──JSON/PDF────┤              │             │
 │◄──Download────┤               │              │             │
 │               │               │              │             │
 ├──Delete Account               │              │             │
 │               ├──DELETE /me───►│              │             │
 │               │               ├──Soft Delete─►│             │
 │               │               ├──Schedule────────────────►│
 │               │               │              │  (30 days)  │
 │               │◄──Confirmed───┤              │             │
 │◄──Logged Out──┤               │              │             │
```