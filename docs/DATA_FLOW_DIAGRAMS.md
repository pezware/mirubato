# Mirubato Data Flow Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   Pages     │  │  Components  │  │    State Management    │ │
│  │             │  │              │  │                        │ │
│  │ • Landing   │  │ • Sheet      │  │ • Apollo Client       │ │
│  │ • Practice  │  │   Music      │  │ • Local State         │ │
│  │ • Progress  │  │ • MusicPlayer│  │ • Cache Management    │ │
│  │ • Profile   │  │ • Piano Keys │  │ • Offline Queue       │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    Service Layer (TypeScript)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │Apollo Client│  │Offline Manager│ │   Audio Manager        │ │
│  │  + GraphQL  │  │ + IndexedDB  │  │   + Tone.js           │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ GraphQL over HTTPS
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│              Cloudflare Workers (GraphQL API)                    │
├─────────────────────────────────────────────────────────────────┤
│                    Apollo Server + GraphQL                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Resolvers  │  │   Services   │  │      Utilities         │ │
│  │             │  │              │  │                        │ │
│  │ • Query     │  │ • AuthService│  │ • JWT Handler         │ │
│  │ • Mutation  │  │ • UserService│  │ • Rate Limiter        │ │
│  │ • Scalars   │  │ • EmailService│ │ • Error Handler       │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     GraphQL Context & Auth                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │Context Builder│ │Auth Middleware│ │  Schema Validation     │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ SQL
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare D1                             │
│                      (SQLite Database)                           │
├─────────────────────────────────────────────────────────────────┤
│  • users             • practice_sessions   • sheet_music        │
│  • user_preferences  • practice_logs       • auth_tokens        │
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

## Authentication Flow (GraphQL)

```
User              Frontend          GraphQL API           Email Service
 │                   │                   │                     │
 ├──Enter Email──────►│                   │                     │
 │                   ├──mutation─────────►│                     │
 │                   │ requestMagicLink  │                     │
 │                   │                   ├──Generate Token──►   │
 │                   │                   ├──Queue Email────────►│
 │                   │◄──success─────────┤                     │
 │◄──Check Email─────┤                   │                     │
 │                   │                   │                     │
 ├──Click Link───────►│                   │                     │
 │                   ├──mutation─────────►│                     │
 │                   │ verifyMagicLink  │                     │
 │                   │                   ├──Validate Token     │
 │                   │                   ├──Create JWT         │
 │                   │                   ├──Create User        │
 │                   │◄──TokenPayload────┤                     │
 │                   ├──Store Tokens     │                     │
 │                   ├──Update Apollo    │                     │
 │◄──Navigate────────┤                   │                     │
```

## Practice Session Flow (GraphQL)

```
User          Frontend        GraphQL API      D1 Database    Apollo Cache
 │               │                 │                │              │
 ├──Start────────►│                 │                │              │
 │               ├──mutation───────►│                │              │
 │               │startPracticeSession              │              │
 │               │                 ├──Create────────►│              │
 │               │                 │◄──Session ID───┤              │
 │               │◄──Session Data──┤                │              │
 │               ├──Cache Update───────────────────────────────────►│
 │               ├──Start Timer    │                │              │
 │◄──Playing─────┤                 │                │              │
 │               │                 │                │              │
 ├──Complete─────►│                 │                │              │
 │               ├──mutation───────►│                │              │
 │               │completePracticeSession           │              │
 │               │                 ├──Update────────►│              │
 │               │                 ├──Calculate Stats│              │
 │               │◄──Updated Session┤                │              │
 │               ├──Update Cache───────────────────────────────────►│
 │◄──Results─────┤                 │                │              │
 │               │                 │                │              │
 ├──Log Activity─►│                 │                │              │
 │               ├──mutation───────►│                │              │
 │               │createPracticeLog│                │              │
 │               │                 ├──Save─────────►│              │
 │               │◄──Log Created───┤                │              │
```

## Offline Practice Sync (GraphQL)

```
User (Offline) Frontend    IndexedDB    Apollo Cache  GraphQL API    D1
 │               │            │             │            │            │
 ├──Practice─────►│            │             │            │            │
 │               ├─No Network │             │            │            │
 │               ├─Store──────►│             │            │            │
 │               ├─Optimistic─────────────────►│            │            │
 │               │◄─Saved─────┤             │            │            │
 │◄─Confirmed────┤            │             │            │            │
 │               │            │             │            │            │
 │ [Reconnect]   │            │             │            │            │
 │               │            │             │            │            │
 ├──Open App─────►│            │             │            │            │
 │               ├─Check Net  │             │            │            │
 │               ├─Online     │             │            │            │
 │               ├─Get Queue──►│             │            │            │
 │               │◄─5 Items───┤             │            │            │
 │               ├─mutation batch──────────────────────────►│            │
 │               │ syncOfflineLogs          │            │            │
 │               │            │             │            ├─Batch──────►│
 │               │            │             │            │◄─Success───┤
 │               │◄─Synced────────────────────────────────┤            │
 │               ├─Clear──────►│             │            │            │
 │               ├─Update Cache────────────────►│            │            │
 │◄─All Synced───┤            │             │            │            │
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

## GraphQL Query Flow Example

```
User          Frontend      Apollo Client    GraphQL API      Services
 │               │               │               │               │
 ├──Browse───────►│               │               │               │
 │               ├──query────────►│               │               │
 │               │listSheetMusic │               │               │
 │               │               ├──Request──────►│               │
 │               │               │               ├──Resolver─────►│
 │               │               │               │ (SheetMusic)  │
 │               │               │               │◄──Filter/Sort─┤
 │               │               │               ├──Check Auth   │
 │               │               │               ├──Apply Filters│
 │               │               │◄──Response─────┤               │
 │               │◄──Cached Data─┤               │               │
 │               ├──Update UI    │               │               │
 │◄──Display─────┤               │               │               │
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

## Real-time Features with GraphQL Subscriptions (Future)

```
User A        Apollo Client   GraphQL API    PubSub      Apollo Client   User B
 │               │               │             │             │              │
 ├──Join─────────►│               │             │             │              │
 │               ├──subscription─►│             │             │              │
 │               │ duetSession  │             │             │              │
 │               │               ├─Subscribe──►│             │              │
 │               │               │             │◄─Subscribe─┤◄─Join────────┤
 │               │               ├─Notify─────►│─User A────►│              │
 │               │               │             │             ├─Notify──────►│
 │               │               │             │             │              │
 ├──Play Note────►│               │             │             │              │
 │               ├──mutation─────►│             │             │              │
 │               │ playNote     │             │             │              │
 │               │               ├─Publish────►│─Event─────►│              │
 │               │               │             │             ├─Push────────►│
 │               │◄──Update──────┤◄─Feedback──┤◄─Score─────┤◄─Play────────┤
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

## GraphQL Error Handling Flow

```
Frontend      Apollo Client    GraphQL API    Error Handler    Sentry
  │               │                 │               │            │
  ├──Action───────►│                 │               │            │
  │               ├──mutation/query─►│               │            │
  │               │                 ├──Execute      │            │
  │               │                 ├──Error────────►│            │
  │               │                 │               ├──Classify  │
  │               │                 │               ├──Log──────►│
  │               │                 │               ├──Format    │
  │               │◄──GraphQL Error─┤◄──Formatted───┤            │
  │               ├──Parse Error    │               │            │
  │               ├──Retry?         │               │            │
  │◄──User Error──┤                 │               │            │
  ├──Show Toast   │                 │               │            │
  │               │                 │               │            │
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
