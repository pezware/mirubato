# Mirubato Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.8.0] - 2025-11-27 (Public Preview)

### Added

- **Practice Planning System** (PR #614-#650)
  - Create and manage practice plans with customizable schedules
  - Plan templates with gallery browsing and sharing
  - Custom recurrence scheduling (daily, weekly, custom intervals)
  - Plan check-in flow with reflection prompts
  - Planning analytics dashboard with KPIs and 7-day forecasts
  - Real-time sync for planning data across devices
  - Template adoption with customization options
  - Published badge for shared templates
  - Prefill manual log entries from practice plans

- **User Profile Page** (PR #657)
  - Username and display name management
  - Comprehensive data export/import for device migration
  - Settings and preferences management
  - Profile access from mobile navigation

- **Enhanced Piece Statistics** (PR #606, #653)
  - Practice statistics on piece detail page
  - Practice timeline with bar chart visualization for individual pieces

- **Period Navigation** (PR #652)
  - Enhanced period selector with clear navigation
  - Summary statistics for past time periods

- **Returning User Experience** (PR #655)
  - Automatic redirect to repertoire tab for returning users
  - Improved onboarding flow

- **Sync Worker Service** (PR #523)
  - New dedicated Cloudflare Worker for handling synchronization
  - Database persistence and sync recovery capabilities
  - Auto-sync implementation for improved reliability
  - Prevention of data loss during sync operations

- **Improved Logbook Entry Display** (PR #511, #507, #501)
  - Consolidated entry details directly into list view
  - Removed split view in favor of unified interface
  - Collapsible notes section (collapsed by default)
  - Mobile-optimized display with expandable details
  - Enhanced E2E test coverage with data-testid attributes

- **Composer Canonicalization System**
  - Standardized composer names across all services
  - Migration scripts for existing data
  - Mapping system for common composer name variations
  - Improved autocomplete with canonical composer names

- **Status Change Tracking** (PR #475)
  - Automatic tracking of repertoire piece status changes in personal notes
  - Timestamped entries with full internationalization support
  - Visual separation between user notes and status history
  - Localized display in edit modal with read-only status history section

- **Daily Practice Totals** (PR #474)
  - Display total practice time for each day in logbook date separators
  - Improved practice overview at a glance

- **Enhanced Practice Timer** (PR #455, #459)
  - Minimize functionality to continue practicing while using other features
  - Session persistence across page refreshes
  - Practice reminders at configurable intervals
  - Improved timer accuracy on mobile devices when backgrounded

- **WebSocket Real-time Sync** (PR #415)
  - Real-time synchronization with Cloudflare Durable Objects
  - Local Activity Wins conflict resolution strategy
  - Automatic D1 ↔ localStorage sync after authentication

- **GDPR Compliance** (PR #429)
  - Comprehensive privacy policy implementation
  - Data subject rights management
  - Cookie consent banner with multilingual support

- **Typography System** (PR #396)
  - Unified typography with semantic components
  - Noto Serif for music titles and composers
  - Inter for UI text, Lexend for headers
  - Consistent font sizing across the application

- **GitHub Version Display** (PR #410, #412)
  - Commit info and version display on About page
  - Environment detection for staging vs production

- **About Page** (PR #356)
  - Privacy-focused content
  - Application information and credits

### Changed

- **UI/UX Improvements**
  - Resolved multiple mobile UI issues for better experience (PR #525, #519-#524, #518, #512-#516)
  - Improved logbook entry display with consolidated UI components (PR #511)
  - Enhanced type safety for custom instruments support (PR #517)
  - Consolidated Data Table and Analytics tabs (PR #262, #369)
  - Optimized sidebar width for better screen utilization (PR #407, #411)
  - Enhanced mobile UI responsiveness across all components (PR #343, #436, #439)
  - Improved logbook entry display on mobile devices (PR #357, #283)
  - Batch UI improvements for better mobile experience (PR #375)
  - Reorganized logbook overview and repertoire statistics layout (PR #431)
  - Made metronome grid scrollbar responsive (PR #349)
  - Improved mobile dropdown width and status selects (PR #343)

- **Code Organization**
  - Eliminated redundant code and standardized utilities (PR #506)
  - Removed obsolete code and cleaned up frontend
  - Improved validation with i18n messages

- **Repertoire Enhancements**
  - Added sort functionality to repertoire view (PR #354)
  - Auto-expand default collection with scores (PR #434)
  - Comprehensive duplicate piece management system (PR #435)
  - Added piece name editing functionality (PR #266, #291)
  - Added delete functionality for items without practice history (PR #322)
  - Added composer search autocomplete to Add Custom Piece modal (PR #352)
  - Improved mobile repertoire UI and practice time display (PR #419, #428)

- **Circle of Fifths Improvements**
  - Increased keyboard size on mobile by 10% (PR #386, #433)
  - Fixed audio quality and minor chord playback (PR #321)
  - Corrected famous works assignments (PR #324)
  - Resolved various UI issues (PR #333, #344, #345, #350)

- **Internationalization**
  - Complete i18n implementation across all features (PR #418, #421)
  - Added translations for all new features including Practice Planning
  - Complete dictionary i18n coverage (PR #656)
  - Multi-language support for Wikipedia URLs
  - Improved privacy statement transparency with multilingual support (PR #422, #425)

### Fixed

- **Sync System Improvements**
  - Resolved logbook sync validation errors and data loss (PR #523)
  - Fixed proper handling of logbook entry deletions
  - Added sync-worker to pnpm workspace configuration
  - Updated sync-worker compatibility date for Cloudflare Workers
  - Prevented data loss and improved reliability
  - Implemented sequence-based sync tracking for multi-device sync (PR #611)
  - Resolved WebSocket sync issues caused by clock skew (PR #605)
  - Fixed score-id inconsistency issues (PR #601)
  - Fixed deletion sync gaps (PR #598, #599)

- **Metronome Fixes**
  - Fixed beat highlight synchronization issue (PR #612)
  - Fixed broken highlight with non-4/4 time signatures (PR #608)

- **UI Issues**
  - Resolved UI issues #526 and #527
  - Fixed multiple mobile experience issues (#519-#524)
  - Resolved unused mood parameter build error
  - Updated E2E tests for new UI components

- **Critical Fixes**
  - Resolved timer accuracy issues on mobile when backgrounded (PR #454)
  - Fixed login status not updating on navigation (PR #452, #457)
  - Resolved duplicate entry prevention system (PR #409)
  - Fixed scorebook TypeError with Date deserialization (PR #401)
  - Resolved mobile sync race condition (PR #385)
  - Fixed streak calculation to not reset at day boundaries (PR #384, #406)

- **Security**
  - Addressed Dependabot security vulnerabilities (#36, #38, #39, #40) (PR #617, #618)
  - Updated @eslint/plugin-kit to patch ReDoS vulnerability (PR #468)
  - Resolved critical security vulnerabilities (PR #360)
  - Removed magic link exposure in production (PR #358)

- **UI Fixes**
  - Fixed button nesting warnings and year display in dates (PR #467)
  - Corrected button text in Add to Repertoire modal (PR #466)
  - Allowed clearing time signature input field in metronome (PR #472)
  - Fixed edit notes button not responding in piece detail view (PR #339, #342)
  - Improved scrollbar behavior on mobile for Toolbox components (PR #328)
  - Fixed CSV export handling of line breaks in notes field (PR #327)
  - Corrected Wikipedia and YouTube link generation in Music Dictionary (PR #326)

- **Performance**
  - Fixed N+1 query problem in repertoire sync (PR #435)
  - Optimized sync frequency and removed annoying success toasts
  - Resolved memory leaks in authentication

### Removed

- **Code Cleanup**
  - Removed unused sample, test, and prototype files (PR #447)
  - Removed faint dotted circle from clock face UI (PR #430)
  - Removed instrument emojis to align with design guidelines
  - Removed "Read more" toggle in Music Dictionary (PR #323)
  - Simplified "Remove from pieces" text to just "Remove" (PR #451)

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
