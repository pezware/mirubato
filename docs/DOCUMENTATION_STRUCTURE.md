# Documentation Structure

_Last Updated: December 2024_

## Core Documentation (in `/docs`)

1. **[README.md](./README.md)** - Project introduction and overview
2. **[DESIGN.md](./DESIGN.md)** - System architecture and design principles
3. **[ROADMAP.md](./ROADMAP.md)** - Development roadmap and milestones
4. **[CLAUDE.md](./CLAUDE.md)** - AI assistant instructions and development guide
5. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Deployment procedures and DevOps
6. **[DEBUG.md](./DEBUG.md)** - Debugging guide and common issues
7. **[LICENSE.md](./LICENSE.md)** - MIT License

## Current Focus

- **[SCOREBOOK.md](./SCOREBOOK.md)** - Scorebook feature overview
- **[SCOREBOOK_UNIFIED_PLAN.md](./SCOREBOOK_UNIFIED_PLAN.md)** - Active development plan for Phase 4

## Archived Documentation

All legacy and service-specific documentation has been moved to `/docs/archive/`:

- `/docs/archive/api/` - API-specific documentation
- `/docs/archive/scores/` - Scores service documentation
- `/docs/archive/` - Legacy plans and outdated guides

## Service Documentation

Service-specific documentation remains with the services:

- `/api/scripts/README.md` - API scripts documentation
- `/scores/scripts/README.md` - Scores scripts documentation
- `/scores/test-data/README.md` - Test data documentation

## Principles

1. **Single Source of Truth**: `wrangler.toml` files contain all configuration
2. **Core Docs in `/docs`**: Only maintain essential, up-to-date documentation
3. **Archive Legacy**: Move outdated docs to archive instead of deleting
4. **Service Proximity**: Keep service-specific docs near the code
