# Mirubato Documentation

## Overview

Central documentation hub for the Mirubato music education platform. For detailed technical specifications, see the [specs](./specs/) directory.

## Documentation Structure

### 📚 Technical Specifications

Complete technical documentation organized by domain:

- **[specs/](./specs/)** - All technical specifications
  - [Architecture](./specs/01-architecture/) - System design, Cloudflare services
  - [Database](./specs/02-database/) - Schema, migrations, sync
  - [API](./specs/03-api/) - REST, WebSocket, authentication
  - [Frontend](./specs/04-frontend/) - React architecture, components
  - [Features](./specs/05-features/) - Logbook, Scorebook, Repertoire
  - [Integrations](./specs/06-integrations/) - IMSLP, AI services
  - [Operations](./specs/07-operations/) - Monitoring, performance
  - [Appendix](./specs/08-appendix/) - Version history, roadmap, glossary

### 🚀 Core Documents

- **[DESIGN.md](./DESIGN.md)** - Architecture overview and navigation hub
- **[DEBUG.md](./DEBUG.md)** - Debugging guide and troubleshooting
- **[LICENSE.md](./LICENSE.md)** - MIT License

### 🔧 Developer Guides

- **[../README.md](../README.md)** - Project overview and quick start
- **[../CLAUDE.md](../CLAUDE.md)** - AI development guide and commands

### 📁 Service Documentation

Service-specific docs remain with the code:

- `/api/scripts/` - API backup procedures
- `/frontendv2/src/components/ui/` - Component library
- `/scores/scripts/` - Scores utility scripts

### 🗄️ Archived Documentation

Historical documentation preserved in `/docs/archive/`

## Quick Links

| Need to...              | Go to...                                                                     |
| ----------------------- | ---------------------------------------------------------------------------- |
| Understand architecture | [specs/01-architecture/overview.md](./specs/01-architecture/overview.md)     |
| View API endpoints      | [specs/03-api/rest-api.md](./specs/03-api/rest-api.md)                       |
| Check database schema   | [specs/02-database/schema.md](./specs/02-database/schema.md)                 |
| Deploy to production    | [specs/01-architecture/deployment.md](./specs/01-architecture/deployment.md) |
| Debug issues            | [DEBUG.md](./DEBUG.md)                                                       |
| Start development       | [../CLAUDE.md](../CLAUDE.md)                                                 |
| Review roadmap          | [Product Roadmap](./specs/08-appendix/roadmap.md)                            |
| Find terminology        | [specs/08-appendix/glossary.md](./specs/08-appendix/glossary.md)             |

---

_Last Updated: Sept 2025 | Version 1.7.6_
