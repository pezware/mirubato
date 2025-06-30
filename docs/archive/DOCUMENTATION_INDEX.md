# Mirubato Documentation

Welcome to the Mirubato documentation. This directory contains all technical and architectural documentation for the project.

## Documentation Structure

### Core Documentation

- **[DESIGN.md](./DESIGN.md)** - Current system architecture and design principles
- **[DEBUG.md](./DEBUG.md)** - Debugging guide and common issues
- **[ROADMAP.md](./ROADMAP.md)** - Development roadmap and priorities

### Frontend Documentation

- **[FRONTEND.md](./FRONTEND.md)** - Frontend architecture and development guide
- **[FRONTEND_DEBUG.md](./FRONTEND_DEBUG.md)** - LocalStorage debugging guide
- **[SYNC_TYPES.md](./SYNC_TYPES.md)** - Data type differences between legacy and current

### API Service Documentation

- **[API README](./api/README.md)** - REST API service overview
- **[Google Auth Setup](./api/GOOGLE_AUTH_SETUP.md)** - Google OAuth configuration
- **[Domain Migration](./api/DOMAIN_MIGRATION.md)** - Domain migration guide
- **[Database Setup](./api/DATABASE_SETUP.md)** - Database configuration
- **[Email Setup](./api/EMAIL_SETUP.md)** - SendGrid email configuration
- **[API TODO](./api/TODO.md)** - Current development priorities

### Scores Service Documentation

- **[Scores README](./scores/README.md)** - Scores service overview
- **[Quick Start](./scores/QUICK_START.md)** - Getting started with scores service
- **[Implementation Status](./scores/IMPLEMENTATION_STATUS.md)** - Current implementation status
- **[API Documentation](./scores/api-documentation.md)** - Scores API reference
- **[Frontend Integration](./scores/frontend-integration.md)** - Integration guide
- **[Endpoints Summary](./scores/ENDPOINTS_SUMMARY.md)** - API endpoints reference
- **[Cloudflare Features](./scores/cloudflare-native-features.md)** - CF-specific features

### Content and Repertoire

- **[GUITAR_REPERTOIRE.md](./GUITAR_REPERTOIRE.md)** - Graded classical guitar repertoire (Grades 1-10)
- **[PIANO_REPERTOIRE.md](./PIANO_REPERTOIRE.md)** - Graded classical piano repertoire (Grades 1-10)

## Quick Links

### Development

- Main README: [../README.md](../README.md)
- Claude Instructions: [../CLAUDE.md](../CLAUDE.md)

### Live Services

- **Frontend**: `mirubato.com`
- **API**: `api.mirubato.com` ([docs](https://api.mirubato.com/docs))
- **Scores**: `scores.mirubato.com` ([docs](https://scores.mirubato.com/docs))

## Current Architecture

Mirubato uses a modern serverless architecture with:

- **Frontend**: React SPA with REST API, deployed via Cloudflare Workers
- **API**: RESTful API using Hono framework, deployed on Cloudflare Workers
- **Scores**: Content management service for sheet music and repertoire
- **Database**: Cloudflare D1 (SQLite) for all data persistence

### Migration Status

✅ **Migration Complete**: Successfully transitioned from GraphQL to REST API architecture

- Legacy frontend/backend removed
- All data migrated (80 logbook entries, 3 users)
- Production deployment active
- 135 tests passing across all services

See [DESIGN.md](./DESIGN.md) for detailed architecture information.
