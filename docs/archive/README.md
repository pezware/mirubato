# Mirubato Documentation

_Last Updated: July 2025_

## Core Documentation

### System Documentation

- **[DESIGN.md](./DESIGN.md)** - System architecture, UI/UX design, and technical decisions
- **[ROADMAP.md](./ROADMAP.md)** - Development roadmap, implementation planning, and milestones
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Complete deployment procedures and configuration
- **[DEBUG.md](./DEBUG.md)** - Debugging guide, common issues, and troubleshooting

### Legal

- **[LICENSE.md](./LICENSE.md)** - MIT License

### Active Development

- **[SCOREBOOK_UNIFIED_PLAN.md](./SCOREBOOK_UNIFIED_PLAN.md)** - Phase 5.5 active development plan for scorebook feature

## Documentation Structure

### Root Directory

- **[README.md](../README.md)** - Project overview and quick start guide
- **[CLAUDE.md](../CLAUDE.md)** - AI development guide and quick reference

### Service-Specific Documentation

Service-specific documentation remains with the code for easier maintenance:

- **API Service**
  - `/api/scripts/BACKUP_README.md` - Database backup procedures
- **Frontend Service**
  - `/frontendv2/src/components/ui/README.md` - UI component library documentation
- **Scores Service**
  - `/scores/scripts/README.md` - Scripts documentation
  - `/scores/seeds/README.md` - Seed data documentation
  - `/scores/test-data/README.md` - Test data documentation

### Archived Documentation

Historical and legacy documentation has been organized in `/docs/archive/`:

- `/docs/archive/` - Legacy plans, outdated guides, and historical documentation
- `/docs/archive/api/` - API-specific legacy documentation
- `/docs/archive/scores/` - Scores service legacy documentation
- `/docs/archive/frontendv2/` - Frontend legacy documentation
- `/docs/archive/tmp/` - Temporary documentation and notes

## Maintenance Principles

1. **Single Source of Truth**: Configuration lives in `wrangler.toml` files
2. **Core Docs in `/docs`**: Only maintain essential, up-to-date documentation
3. **Archive Don't Delete**: Move outdated docs to archive for historical reference
4. **Service Proximity**: Keep service-specific docs near the code
5. **Regular Reviews**: Periodically review DESIGN.md to remove redundancies

---

For project overview, see the main [README.md](../README.md) in the repository root.  
For AI development guide, see [CLAUDE.md](../CLAUDE.md) in the repository root.

## Currently Maintained Documentation

### Summary of All Maintained Documents

| Document                        | Location                         | Purpose                                                                                            |
| ------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| **README.md**                   | `/`                              | Project overview, features, quick start guide, and links to key resources                          |
| **CLAUDE.md**                   | `/`                              | AI development guide with architecture overview, essential commands, and development checklist     |
| **docs/README.md**              | `/docs/`                         | Documentation index with comprehensive links to all maintained docs                                |
| **DESIGN.md**                   | `/docs/`                         | System architecture, technical design decisions, UI/UX planning, and current implementation status |
| **ROADMAP.md**                  | `/docs/`                         | Development roadmap, implementation planning, feature milestones, and progress tracking            |
| **DEPLOYMENT_GUIDE.md**         | `/docs/`                         | Complete deployment procedures, configuration settings, and troubleshooting for all services       |
| **DEBUG.md**                    | `/docs/`                         | Debugging guide with common issues, known problems, and troubleshooting procedures                 |
| **LICENSE.md**                  | `/docs/`                         | MIT License for the project                                                                        |
| **SCOREBOOK_UNIFIED_PLAN.md**   | `/docs/`                         | Active Phase 5.5 development plan for the scorebook feature implementation                         |
| **BACKUP_README.md**            | `/api/scripts/`                  | Database backup and restore procedures for the API service                                         |
| **Component Library README.md** | `/frontendv2/src/components/ui/` | UI component library documentation with usage examples                                             |
| **Scripts README.md**           | `/scores/scripts/`               | Documentation for scores service utility scripts                                                   |
| **Seeds README.md**             | `/scores/seeds/`                 | Seed data documentation for the scores service                                                     |
| **Test Data README.md**         | `/scores/test-data/`             | Test data setup and usage documentation                                                            |

### Documentation Categories

#### Core Project Documentation (Root)

- Main entry points for developers and contributors
- High-level project information and AI development guide

#### System Documentation (/docs/)

- Architecture and design decisions
- Development planning and roadmaps
- Deployment and operational guides
- Active feature development plans

#### Service-Specific Documentation

- Kept with their respective services for proximity to code
- Focused on service-specific operations and utilities

#### Archived Documentation (/docs/archive/)

- Historical documentation preserved for reference
- Legacy implementation details
- Outdated guides and plans
