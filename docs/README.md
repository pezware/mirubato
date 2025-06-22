# Mirubato Documentation

Welcome to the Mirubato documentation. This directory contains all technical and architectural documentation for the project.

## Documentation Structure

### Core Documentation

- **[DESIGN.md](./DESIGN.md)** - Current system architecture and design principles
- **[DEBUG.md](./DEBUG.md)** - Debugging guide and common issues

### Service Documentation

#### API Documentation

- **[API README](./api/README.md)** - API v2 service overview
- **[Google Auth Setup](./api/GOOGLE_AUTH_SETUP.md)** - Google OAuth configuration
- **[Domain Migration](./api/DOMAIN_MIGRATION.md)** - Domain migration guide
- **[Database Setup](./api/DATABASE_SETUP.md)** - Database configuration
- **[API TODO](./api/TODO.md)** - API v2 development tasks

#### Scores Service Documentation

- **[Scores README](./scores/README.md)** - Scores service overview
- **[Quick Start](./scores/QUICK_START.md)** - Getting started with scores service
- **[Implementation Status](./scores/IMPLEMENTATION_STATUS.md)** - Current implementation status
- **[API Documentation](./scores/api-documentation.md)** - Scores API reference
- **[Frontend Integration](./scores/frontend-integration.md)** - Integration guide
- **[Endpoints Summary](./scores/ENDPOINTS_SUMMARY.md)** - API endpoints reference
- **[Cloudflare Features](./scores/cloudflare-native-features.md)** - CF-specific features

#### Frontend Documentation

- **[MusicXML Converter](./frontend/musicxml-converter-README.md)** - MusicXML conversion tools

### Archived Documentation

Older documentation has been moved to the [archive](./archive/) directory for reference.

## Quick Links

### Development

- Main README: [../README.md](../README.md)
- Claude Instructions: [../CLAUDE.md](../CLAUDE.md)

### Services

- Frontend: `mirubato.com`
- Backend API: `api.mirubato.com`
- API v2: `apiv2.mirubato.com`
- Scores: `scores.mirubato.com`

## Architecture Overview

Mirubato uses a microservices architecture with:

- **Frontend**: React SPA served via Cloudflare Workers
- **Backend**: GraphQL API (being replaced by API v2)
- **API v2**: RESTful API with improved features
- **Scores**: Content management service

See [DESIGN.md](./DESIGN.md) for detailed architecture information.
