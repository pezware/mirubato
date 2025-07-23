# Mirubato Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2025-07-22

### Added

- **Focused UI Design System** (PR #261)
  - New layout architecture: Desktop sidebar + mobile bottom tabs
  - AppLayout, Sidebar, TopBar, BottomTabs components
  - Practice Timer feature with start/pause/stop functionality
  - Enhanced repertoire timeline visualization
  - Complete internationalization with 200+ translations fixed

### Changed

- Simplified navigation from 6 to 4 main sections
- Updated all services to version 1.7.0 for consistency
- Migrated from npm to pnpm for better performance

### Security

- Fixed critical vulnerabilities in tar-fs (high severity)
- Fixed DoS vulnerability in ws package (high severity)
- Fixed esbuild development server vulnerability (medium severity)
- Downgraded @cloudflare/puppeteer to 0.0.11 for security compliance

## [1.6.0] - 2025-07-15

### Added

- Dictionary service for music terminology
- Enhanced security posture across all microservices
- Comprehensive dependency updates

### Changed

- Dictionary service promoted from v1.0.0 to v1.6.0
- All services unified at version 1.6.0

## [1.4.1] - 2025-07-01

### Added

- **Component Architecture**: Modular component system with comprehensive refactoring
- **UI Component Library**: Complete custom component library with Morandi design system
- **Enhanced Practice Logging**: Time picker, multi-piece support, and intelligent time division
- **Advanced Reporting**: Fully modular reporting system with 4 specialized views
  - Overview View: Practice streaks, calendar heatmap, trend charts
  - Analytics View: Advanced filtering, grouping, sorting with visualizations
  - Data Table View: Grouped data with export capabilities
  - Pieces View: Piece and composer-specific analytics
- **Auto-Logging Module**: Seamless practice session tracking across features
- **Practice Counter**: New toolbox feature for visual practice tracking
- **Circle of Fifths Tool**: Interactive music theory visualization

### Changed

- Chart.js components properly typed without `any`
- Enhanced reports refactored from 1515 lines into 8+ focused components
- Improved code maintainability and testability

### Fixed

- Chart.js "controller not registered" errors in production builds
- Mobile responsive design improvements

## [1.3.0] - 2025-06-15

### Added

- Unified UI component library with 8+ reusable components
- Design system with consistent spacing, typography, and colors
- Mobile navigation improvements (PR #201)
- Accessibility improvements with @headlessui/react
- Component documentation and unified styling guide

### Changed

- Refactored 43+ components to use new Button component
- Deleted obsolete LogbookReports.tsx (11KB)

## [1.2.0] - 2025-06-01

### Added

- **Scorebook Phase 5.5**: Personal score collections with image upload support
- Image upload support for sheet music (PNG, JPG, JPEG)
- Multi-page image support for photographed scores
- AI-powered metadata extraction using Cloudflare AI (primary) and Gemini (fallback)
- Enhanced "My Scores" section for authenticated users

### Fixed

- PDF viewer infinite loops and performance issues

## [1.1.0] - 2025-05-15

### Added

- **Logbook & Practice Tracking**:
  - Practice logging with manual entry and timer modes
  - Enhanced practice reports with calendar visualization
  - Goal setting and tracking with progress visualization
  - Local-first sync with online backup
  - Google OAuth and magic link authentication
  - Multi-instrument support (Piano & Guitar)
  - Responsive design for mobile and desktop
  - Internationalization with 6 languages (en, es, fr, de, ja, zh)
  - Autocomplete for composers and pieces
  - Data export (CSV, JSON)
  - Comprehensive test coverage (290+ tests)

### Changed

- Migrated from GraphQL to REST API architecture
- Frontend fully migrated to REST API endpoints
- All data successfully migrated (80+ logbook entries, 3+ users)

### Security

- JWT authentication implemented
- Magic links for passwordless auth
- Google OAuth integration

## [1.0.0] - 2025-04-01

### Added

- Initial release
- Core sight-reading practice application
- Cloudflare Workers infrastructure
- Basic practice logging functionality

---

For more detailed information about specific features and technical implementation, please refer to:

- [ROADMAP.md](docs/ROADMAP.md) - Future plans and completed features
- [DESIGN.md](docs/DESIGN.md) - Architecture and technical design
- [DEBUG.md](docs/DEBUG.md) - Known issues and solutions
