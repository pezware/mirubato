# System Architecture Overview

## Executive Summary

Mirubato is a comprehensive music education platform built on Cloudflare's edge infrastructure, designed to help musicians improve their sight-reading skills and track their practice journey. The platform combines sophisticated practice tracking, sheet music management, and advanced analytics with real-time synchronization across devices.

## Architecture Principles

### 1. Edge-First Design

- All services run as Cloudflare Workers at the edge
- Data and compute colocated near users (300+ locations)
- Zero cold starts with V8 isolates
- Automatic global distribution

### 2. Microservices Architecture

- Independent, loosely coupled services
- Service-specific databases and storage
- Clear API boundaries
- Independent deployment and scaling

### 3. Offline-First Frontend

- Local-first data storage with IndexedDB
- Optimistic UI updates
- Background sync queue
- Progressive Web App capabilities

### 4. Real-Time Synchronization

- WebSocket-based real-time sync
- Conflict resolution with timestamps
- Automatic reconnection
- Offline queue management

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network                       │
│                    (300+ Global Locations)                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────┬────────────┬────────────┬────────────┐
    │                 │             │            │            │            │
┌───▼──────────┐  ┌──▼──────────┐  ┌▼──────────┐ ┌▼──────────┐ ┌▼──────────┐
│  Frontend     │  │   API       │  │  Scores   │ │Dictionary │ │Sync Worker│
│  Worker       │  │   Worker    │  │  Worker   │ │  Worker   │ │  Worker   │
│ (React SPA)   │  │ (REST API)  │  │(PDF + AI) │ │(AI Terms) │ │(WebSocket)│
└───┬──────────┘  └──┬──────────┘  └─┬─────────┘ └─┬─────────┘ └─┬─────────┘
    │                 │               │             │             │
┌───▼──────────┐  ┌──▼──────────┐  ┌─▼─────────┐ ┌─▼─────────┐ ┌─▼─────────┐
│ Static Assets │  │ D1 Database │  │D1 + R2    │ │D1 + AI    │ │  Durable  │
│     (CDN)     │  │  KV Cache   │  │KV + Queue │ │Embeddings │ │  Objects  │
└───────────────┘  └──────────────┘  └───────────┘ └───────────┘ └───────────┘
```

## Core Services

### 1. Frontend Service (`frontendv2`)

- **Purpose**: Serve the React single-page application
- **Technology**: React 18, TypeScript, Vite, Tailwind CSS
- **Deployment**: Static assets served via Cloudflare Worker
- **Key Features**:
  - Client-side routing
  - Offline-first with IndexedDB
  - PWA capabilities
  - Real-time WebSocket client

### 2. API Service (`api`)

- **Purpose**: Core business logic and data management
- **Technology**: Hono framework, TypeScript, D1 database
- **Responsibilities**:
  - User authentication and sessions
  - Logbook entries management
  - Repertoire and goals tracking
  - Data synchronization

### 3. Scores Service (`scores`)

- **Purpose**: Sheet music management and processing
- **Technology**: Hono, R2 storage, Cloudflare AI
- **Responsibilities**:
  - PDF upload and storage
  - AI metadata extraction
  - Collections management
  - IMSLP integration

### 4. Dictionary Service (`dictionary`)

- **Purpose**: Music terminology and definitions
- **Technology**: Hono, D1, Cloudflare AI
- **Responsibilities**:
  - AI-powered definitions
  - Semantic search with embeddings
  - Multi-language support
  - Quality scoring

### 5. Sync Worker Service (`sync-worker`)

- **Purpose**: Real-time data synchronization
- **Technology**: Durable Objects, WebSockets
- **Responsibilities**:
  - WebSocket connection management
  - Real-time event broadcasting
  - Conflict resolution
  - Device presence tracking

## Technology Stack

| Layer                 | Technology                               | Purpose                            |
| --------------------- | ---------------------------------------- | ---------------------------------- |
| **Frontend**          | React 18, TypeScript, Vite, Tailwind CSS | Single-page application            |
| **State Management**  | Zustand, React Query                     | Client state and server cache      |
| **UI Components**     | Custom component library, Headless UI    | Consistent design system           |
| **Backend Framework** | Hono                                     | Lightweight edge-optimized routing |
| **Database**          | Cloudflare D1 (SQLite)                   | Edge SQL database                  |
| **Object Storage**    | Cloudflare R2                            | PDF and image storage              |
| **Cache**             | Cloudflare KV                            | Session and API response caching   |
| **Queue**             | Cloudflare Queues                        | Async processing                   |
| **WebSocket**         | Durable Objects                          | Real-time synchronization          |
| **AI**                | Cloudflare Workers AI                    | Content analysis and generation    |
| **Analytics**         | Custom implementation                    | Advanced practice analytics        |

## Data Flow

### 1. User Request Flow

```
User → CDN → Edge Worker → Business Logic → Database/Storage → Response
```

### 2. Real-Time Sync Flow

```
Client Action → WebSocket → Durable Object → Broadcast → All Clients
                    ↓                ↓                        ↓
              Offline Queue    State Update            UI Update
```

### 3. Async Processing Flow

```
Upload → Queue → Worker → AI Processing → Storage → Index
           ↓        ↓           ↓            ↓        ↓
      Validation  Convert   Extract Meta    R2    Search
```

## Security Architecture

### Authentication

- JWT-based authentication
- Magic link email authentication
- Google OAuth integration
- Secure session management

### Data Protection

- Row-level security in database
- User data isolation
- Input validation with Zod
- SQL injection prevention

### Network Security

- HTTPS everywhere
- CORS configuration
- Rate limiting
- DDoS protection via Cloudflare

## Performance Characteristics

### Edge Performance

- **Response Time**: < 100ms globally
- **Zero Cold Starts**: V8 isolates always warm
- **Auto-Scaling**: Handles millions of requests
- **Global CDN**: Static assets cached at edge

### Client Performance

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.0s
- **Bundle Size**: < 200KB gzipped
- **Offline Support**: Full functionality offline

### Database Performance

- **Query Time**: < 10ms at edge
- **Write Performance**: Async with queue
- **Sync Latency**: < 50ms WebSocket
- **Cache Hit Rate**: > 90% for hot data

## Scalability Considerations

### Horizontal Scaling

- Services scale independently
- No shared state between workers
- Queue-based async processing
- Database sharding ready

### Vertical Scaling

- Cloudflare handles infrastructure
- Automatic resource allocation
- No manual scaling required
- Pay-per-use pricing model

## Deployment Architecture

### Environments

- **Local**: Development with Wrangler
- **Staging**: Pre-production testing
- **Production**: Live user traffic

### CI/CD Pipeline

```
GitHub Push → GitHub Actions → Build/Test → Wrangler Deploy → Edge
```

### Zero-Downtime Deployment

- Gradual rollout to subset of traffic
- Instant rollback capability
- No cold starts during deployment
- Atomic updates

## Monitoring & Observability

### Health Checks

- `/health` - Comprehensive health status
- `/livez` - Liveness probe
- `/readyz` - Readiness probe
- `/metrics` - Prometheus metrics

### Logging

- Structured JSON logging
- Distributed tracing
- Error tracking
- Performance metrics

### Analytics

- Custom analytics engine
- Real-time dashboards
- Usage patterns
- Performance monitoring

## Related Documentation

- [Cloudflare Services](./cloudflare-services.md) - Detailed Cloudflare service usage
- [Microservices](./microservices.md) - Service-specific architecture
- [Deployment](./deployment.md) - Deployment and CI/CD details
- [Database Schema](../02-database/schema.md) - Complete database design

---

_Last updated: December 2024 | Version 1.7.6_
