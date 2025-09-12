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

## Getting Started

For development setup and commands:

- **[Developer Guide](../CLAUDE.md)** - Complete development workflow and commands
- **[Deployment Guide](./specs/01-architecture/deployment.md)** - Production deployment procedures

## Version & Roadmap

**Current Version**: 1.7.6 (Sept 2025)

- Real-time WebSocket synchronization
- Advanced analytics and reporting
- Unified typography system

For details:

- **[Version History](./specs/08-appendix/version-history.md)** - Complete changelog
- **[Product Roadmap](./specs/08-appendix/roadmap.md)** - Future plans and timeline

---

> **📚 Summary**: Mirubato is an edge-first music education platform with comprehensive practice tracking, sheet music management, and real-time sync. This document serves as a navigation hub to detailed technical specifications in the [specs](./specs/) folder.

_Last updated: Sept 2025 | Version 1.7.6_
