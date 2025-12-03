# Mirubato Architecture Design

## Overview

Mirubato is a comprehensive music education platform built on Cloudflare's edge infrastructure, designed to help musicians improve their sight-reading skills and track their practice journey. The platform combines sophisticated practice tracking, sheet music management, and advanced analytics with real-time synchronization across devices.

> **📚 Note**: This document provides a high-level navigation hub. For detailed technical specifications, see the [Technical Specifications](./specs/README.md).

## Quick Navigation

### 📖 Technical Specifications

- **[Architecture](./specs/01-architecture/)** - System design, Cloudflare services, microservices, deployment
- **[Database](./specs/02-database/)** - Schemas, migrations, sync strategy
- **[API](./specs/03-api/)** - REST endpoints, WebSocket protocol, authentication
- **[Frontend](./specs/04-frontend/)** - React architecture, state management, components
- **[Features](./specs/05-features/)** - Logbook, Scorebook, Repertoire, Analytics, Tools
- **[Integrations](./specs/06-integrations/)** - IMSLP, AI services, third-party
- **[Operations](./specs/07-operations/)** - Monitoring, debugging, performance
- **[Appendix](./specs/08-appendix/)** - Version history, roadmap, glossary

## Core Features

- **[Practice Logbook](./specs/05-features/logbook.md)** - Track practice sessions with timer, auto-logging, and real-time sync
- **[Advanced Analytics](./specs/05-features/analytics.md)** - Visualizations, custom metrics, and export capabilities
- **[Repertoire Management](./specs/05-features/repertoire.md)** - Track progress from planned to performance-ready
- **[Sheet Music Library](./specs/05-features/scorebook.md)** - PDF management with AI extraction and IMSLP integration
- **[Practice Tools](./specs/05-features/practice-tools.md)** - Metronome, Circle of Fifths, Practice Counter
- **[Music Dictionary](./specs/05-features/dictionary.md)** - AI-powered definitions in 6 languages

## Architecture & Technology

For comprehensive technical details:

- **[Architecture Overview](./specs/01-architecture/overview.md)** - System design, diagrams, and principles
- **[Cloudflare Services](./specs/01-architecture/cloudflare-services.md)** - Edge computing infrastructure
- **[Database Schema](./specs/02-database/schema.md)** - Data models and relationships
- **[REST API](./specs/03-api/rest-api.md)** - Complete endpoint documentation
- **[WebSocket Protocol](./specs/03-api/websocket.md)** - Real-time sync implementation

## UI Component Architecture (v1.8.0)

Mirubato uses a two-layer UI component architecture for maximum reusability:

### Package Structure

```
@mirubato/ui (packages/ui/)     # Shared, pure UI components
├── Components: Autocomplete, Button, Card, Modal, Input, Select, Toast,
│               Typography (MusicTitle, MusicComposer), Loading, Tabs, Tag
├── Hooks: useModal, useModals, useFormValidation, useClickOutside
└── Utilities: cn(), formatDuration(), formatTimerDisplay(), formatTimerCompact()

frontendv2/src/components/ui/   # App-specific components with business logic
├── EntryDetailPanel           # Logbook entry details (uses stores)
├── CompactEntryRow            # Compact entry display (uses stores)
├── ToastProvider              # Toast state management
├── ProtectedButton            # Click protection with hooks
└── index.ts                   # Barrel re-exporting @mirubato/ui
```

### Design Principles

1. **Pure Components in Package**: `@mirubato/ui` contains stateless, reusable UI components with no business logic.

2. **Shared Hooks & Utilities**: Generic hooks (`useModal`, `useFormValidation`) and utilities (`formatDuration`, `cn`) go in `@mirubato/ui`.

3. **Business Logic in App**: Components/hooks that depend on stores or app state stay in `frontendv2/`.

4. **Single Import Path**: All imports from `@/components/ui` which re-exports both package and local components.

5. **DRY Principle**: Any utility used in 2+ places must be in `@mirubato/ui`, not duplicated locally.

### Import Convention

```tsx
// All UI imports go through the barrel export
import { Button, Modal, MusicTitle, ProtectedButton } from '@/components/ui'
import type { ButtonProps, SelectOption } from '@/components/ui'
```

### Typography System

Music-specific typography uses Noto Serif for excellent multilingual support:

- `<MusicTitle>` - Piece titles
- `<MusicComposer>` - Composer names
- `<MusicMetadata>` - Opus numbers, catalog info

General UI uses Inter (body) and Lexend (headers).

## Getting Started

For development setup and commands:

- **[Developer Guide](../CLAUDE.md)** - Complete development workflow and commands
- **[Deployment Guide](./specs/01-architecture/deployment.md)** - Production deployment procedures

## Version & Roadmap

**Current Version**: 1.8.0 (Dec 2025)

- Shared UI Component Library (`@mirubato/ui`)
- Two-layer component architecture
- Real-time WebSocket synchronization
- Advanced analytics and reporting
- Unified typography system

For details:

- **[Version History](./specs/08-appendix/version-history.md)** - Complete changelog
- **[Product Roadmap](./specs/08-appendix/roadmap.md)** - Future plans and timeline

---

> **📚 Summary**: Mirubato is an edge-first music education platform with comprehensive practice tracking, sheet music management, and real-time sync. This document serves as a navigation hub to detailed technical specifications in the [specs](./specs/) folder.

_Last updated: Dec 2025 | Version 1.8.0_
