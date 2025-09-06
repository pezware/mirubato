# Mirubato Architecture Design

## Overview

Mirubato is a comprehensive music education platform built on Cloudflare's edge infrastructure, designed to help musicians improve their sight-reading skills and track their practice journey. The platform combines sophisticated practice tracking, sheet music management, and advanced analytics with real-time synchronization across devices.

> **📚 Note**: This document provides a high-level overview. For detailed specifications, see the [Technical Specifications](./specs/README.md).

## Quick Navigation

### 📖 Detailed Specifications

- **[Architecture Specs](./specs/01-architecture/)** - System design, Cloudflare services, microservices, deployment
- **[Database Specs](./specs/02-database/)** - Schemas, migrations, sync strategy
- **[API Specs](./specs/03-api/)** - REST endpoints, WebSocket protocol, authentication
- **[Frontend Specs](./specs/04-frontend/)** - React architecture, state management, components
- **[Feature Specs](./specs/05-features/)** - Logbook, Scorebook, Repertoire, Analytics, Tools
- **[Integration Specs](./specs/06-integrations/)** - IMSLP, AI services, third-party
- **[Operations Specs](./specs/07-operations/)** - Monitoring, debugging, performance
- **[Appendix](./specs/08-appendix/)** - Version history, roadmap, glossary

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Core Features](#core-features)
3. [Technology Stack](#technology-stack)
4. [Quick Start](#quick-start)
5. [Version History](#version-history)

## Current Architecture

### Version 1.7.6 - Production (December 2024)

Mirubato is a sophisticated microservices-based platform running entirely on Cloudflare's edge infrastructure:

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

### Technology Stack

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

### Infrastructure

All services run as Cloudflare Workers with the following domains:

| Service    | Production              | Staging                         | Local Development                  |
| ---------- | ----------------------- | ------------------------------- | ---------------------------------- |
| Frontend   | mirubato.com            | staging.mirubato.com            | www-mirubato.localhost:4000        |
| API        | api.mirubato.com        | api-staging.mirubato.com        | api-mirubato.localhost:9797        |
| Scores     | scores.mirubato.com     | scores-staging.mirubato.com     | scores-mirubato.localhost:9788     |
| Dictionary | dictionary.mirubato.com | dictionary-staging.mirubato.com | dictionary-mirubato.localhost:9799 |
| Sync       | sync.mirubato.com       | sync-staging.mirubato.com       | sync-mirubato.localhost:9800       |

## Core Features

Mirubato offers six major feature areas, each with comprehensive functionality:

### 1. **[Practice Logbook](./specs/05-features/logbook.md)**

Core practice tracking with manual entry, timer mode, auto-logging, and real-time sync.

### 2. **[Advanced Analytics](./specs/05-features/analytics.md)**

Sophisticated reporting with visualizations, custom metrics, and export capabilities.

### 3. **[Repertoire Management](./specs/05-features/repertoire.md)**

Track piece progress from planned to performance-ready with practice history.

### 4. **[Sheet Music Library](./specs/05-features/scorebook.md)**

PDF management with AI metadata extraction, IMSLP integration, and annotations.

### 5. **[Practice Tools](./specs/05-features/practice-tools.md)**

Metronome, Circle of Fifths, and Practice Counter with auto-logging.

### 6. **[Music Dictionary](./specs/05-features/dictionary.md)**

AI-powered definitions in 6 languages with semantic search.

## Technology Stack

For detailed technology specifications, see:

- **[Architecture Overview](./specs/01-architecture/overview.md)** - System design and principles
- **[Cloudflare Services](./specs/01-architecture/cloudflare-services.md)** - Edge computing infrastructure
- **[Microservices](./specs/01-architecture/microservices.md)** - Service architecture

## Quick Start

### Local Development

```bash
# Clone and install
git clone https://github.com/pezware/mirubato.git
cd mirubato
pnpm install

# Start all services
./start-scorebook.sh

# Access at:
# Frontend: http://www-mirubato.localhost:4000
# API: http://api-mirubato.localhost:9797
```

### Key Commands

```bash
pnpm test                  # Run all tests
pnpm run build            # Build for production
pnpm run lint             # Lint code
pnpm run type-check       # TypeScript checking
```

For detailed setup and deployment instructions, see:

- **[Deployment Guide](./specs/01-architecture/deployment.md)**
- **[Development Workflow](../CLAUDE.md#development-workflow)**

## Services & Databases

### Microservices Architecture

Mirubato consists of 5 independent services:

- **Frontend** - React SPA served via Worker
- **API** - Core business logic and user data
- **Scores** - PDF processing and sheet music
- **Dictionary** - AI-powered music terms
- **Sync Worker** - Real-time WebSocket sync

For detailed specifications:

- **[Microservices Architecture](./specs/01-architecture/microservices.md)**
- **[Database Schemas](./specs/02-database/schema.md)**
- **[API Documentation](./specs/03-api/rest-api.md)**

## Real-time Synchronization

Mirubato uses WebSockets via Cloudflare Durable Objects for instant synchronization across devices:

- **Protocol**: WebSocket with JWT authentication
- **Latency**: < 50ms globally
- **Conflict Resolution**: Last-write-wins with timestamps
- **Offline Support**: Queue with automatic retry

For implementation details:

- **[WebSocket Protocol](./specs/03-api/websocket.md)**
- **[Sync Strategy](./specs/02-database/sync-strategy.md)**

## Version History

### Current: v1.7.6 (December 2024)

- Real-time WebSocket synchronization
- Advanced analytics and reporting
- Unified typography system
- Enhanced practice tracking

For complete version history and roadmap:

- **[Version History](./specs/08-appendix/version-history.md)**
- **[Future Roadmap](./specs/08-appendix/roadmap.md)**

## Additional Resources

### Developer Documentation

- **[CLAUDE.md](../CLAUDE.md)** - Development guidelines and commands
- **[Contributing Guide](../../CONTRIBUTING.md)** - How to contribute
- **[API Reference](./API.md)** - Quick API reference

### Operations

- **[Monitoring](./specs/07-operations/monitoring.md)** - Health checks and metrics
- **[Debugging](./specs/07-operations/debugging.md)** - Debug strategies
- **[Performance](./specs/07-operations/performance.md)** - Optimization techniques

---

> **📚 Summary**: This document provides a high-level overview of Mirubato's architecture. For detailed technical specifications, implementation details, and comprehensive documentation, please refer to the [Technical Specifications](./specs/README.md) folder.

_Last updated: Sept 2025 | Version 1.7.6_
