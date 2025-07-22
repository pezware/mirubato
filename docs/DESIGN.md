# Mirubato Architecture Design

## Overview

Mirubato is a sight-reading practice application for musicians, built on Cloudflare's edge infrastructure. The application helps users improve their music reading skills through interactive practice sessions with real-time feedback.

## Current Architecture - Version 1.7.0 (July 2025)

### Version 1.7.0 Highlights - Focused UI Design (PR #261)

- **New Layout System**: Desktop sidebar navigation + mobile bottom tabs
- **Simplified Navigation**: Reduced from 6 to 4 main sections
- **Practice Timer**: New timer feature integrated with logbook
- **Enhanced Repertoire**: Timeline visualization and practice history
- **Complete Localization**: All 200+ missing translations fixed

### Version 1.7.0 Highlights

- **Security Hardening**: Comprehensive vulnerability remediation across all services
- **Unified Versioning**: All services now at v1.7.0 for consistency
- **Dependency Updates**: Latest secure versions of all critical dependencies
- **Puppeteer Downgrade**: @cloudflare/puppeteer to 0.0.11 for security compliance

### Version 1.4.1 Highlights

- **Component Architecture**: Modular component system with comprehensive refactoring
- **UI Component Library**: Complete custom component library with Morandi design system
- **Enhanced Practice Logging**: Time picker, multi-piece support, and intelligent time division
- **Advanced Reporting**: Fully modular reporting system with 4 specialized views
  - Overview View: Practice streaks, calendar heatmap, trend charts
  - Analytics View: Advanced filtering, grouping, sorting with visualizations
  - Data Table View: Grouped data with export capabilities
  - Pieces View: Piece and composer-specific analytics
- **Export Capabilities**: Robust CSV/JSON export functionality
- **Mobile Optimization**: Responsive design improvements and touch interactions
- **Test Coverage**: 297 unit tests plus 65 E2E tests (all passing, including smoke tests)
- **Code Quality**: Eliminated technical debt and improved maintainability
- **Scorebook Collections**: Simplified collections system with lightweight tag-based approach
- **Practice Counter**: New toolbox feature for visual practice tracking
- **Auto-Logging Module**: Seamless practice session tracking across features
- **Chart.js Global Registration**: Fixed production build issues with centralized chart component registration

### Infrastructure

All services run as Cloudflare Workers with the following domains:

| Service        | Production                     | Staging                                        |
| -------------- | ------------------------------ | ---------------------------------------------- |
| Frontend       | mirubato.com, www.mirubato.com | staging.mirubato.com, www-staging.mirubato.com |
| API            | api.mirubato.com               | api-staging.mirubato.com                       |
| Scores Service | scores.mirubato.com            | scores-staging.mirubato.com                    |
| Dictionary     | dictionary.mirubato.com        | dictionary-staging.mirubato.com                |

### Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                   (React + TypeScript)                       │
│                  mirubato / mirubato-staging                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┬────────────┬────────────┐
        │             │             │            │            │
┌───────▼────────┐ ┌──▼──────────┐ ┌▼──────────┐ ┌──────────▼────────┐
│     API        │ │Scores Service│ │Future Svc │ │ Future Service    │
│    (REST)      │ │   (REST)    │ │  (REST)   │ │    (REST)         │
│ mirubato-api   │ │mirubato-    │ │mirubato-  │ │ mirubato-*        │
│                │ │scores       │ │*          │ │                   │
└───────┬────────┘ └──────┬──────┘ └─────┬─────┘ └────────┬──────────┘
        │                 │               │                │
┌───────▼────────┐ ┌──────▼──────┐ ┌─────▼─────┐ ┌────────▼──────────┐
│  D1 Database   │ │D1 Database  │ │D1 Database│ │  D1 Database      │
│(mirubato-prod) │ │(scores-prod)│ │(*-prod)   │ │  (*-prod)         │
└────────────────┘ └─────────────┘ └───────────┘ └───────────────────┘

Note: All services follow the same architecture patterns defined in service-template/
```

### Service Details

#### 1. Frontend Service

- **Technology**: React 18, TypeScript, Vite, Tailwind CSS, Zustand
- **Worker**: Serves static assets via Cloudflare Workers
- **State Management**: Zustand stores for auth and logbook data
- **Key Features**:
  - Practice logging with manual entry and timer
  - Enhanced reporting with calendar visualization
  - Goal setting and tracking
  - Offline-first with local storage sync
  - Optimized bundle with code splitting
  - Comprehensive caching headers for static assets
  - Internationalization (i18n) with 6 languages (en, es, fr, de, zh-TW, zh-CN)

**Note**: The documented module-based architecture with EventBus is not currently implemented. The actual implementation uses a simpler, more pragmatic approach with React components and Zustand stores.

#### 2. API (REST)

- **Technology**: Hono framework, TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **Purpose**: Core application logic, user management, practice sessions
- **Authentication**: Magic links + JWT tokens + Google OAuth
- **Features**:
  - RESTful design
  - Sync capabilities for offline-first architecture
  - Rate limiting
  - Google OAuth integration
  - Comprehensive health monitoring (/health, /livez, /readyz)
  - JWT validation in health checks
  - Prometheus-compatible metrics endpoint
  - Cloudflare KV caching for improved performance

#### 3. Scores Service

- **Technology**: Hono framework, TypeScript
- **Database**: Separate D1 instance
- **Storage**: Cloudflare R2 for sheet music files
- **Purpose**: Music content management and delivery
- **Features**:
  - Score metadata management
  - Difficulty level tracking
  - Content categorization
  - CDN integration for fast delivery
  - JWT authentication for protected endpoints
  - Edge caching with conditional requests (ETags)
  - Health monitoring with smoke tests
  - Metrics endpoint for observability

### Database Architecture

#### Current Implementation vs Intended Design (July 2025)

**Important Discovery**: The system currently uses a different database architecture than originally intended:

**Current State (Production/Staging)**:

- All logbook entries stored in `sync_data` table as JSON blobs
- `logbook_entries` table exists but is empty (0 records)
- Frontend and localStorage use same JSON format as sync_data
- **UPDATE (2025-07-11)**: Successfully migrated to lowercase enum values
  - Staging: 43 entries converted to lowercase
  - Production: 164 entries ready for migration

**Enum Values (Post-Migration)**:

- **Practice Types**: `practice`, `performance`, `lesson`, `rehearsal`, `technique`
- **Instruments**: `piano`, `guitar`
- **Moods**: `frustrated`, `neutral`, `satisfied`, `excited`

**Intended Design**:

- Structured `logbook_entries` table with proper columns including `techniques TEXT`
- Better query performance with indexed columns
- Database-level validation and constraints

**Migration Status**:

1. ✅ CHECK constraints updated to accept lowercase values (migration 0006)
2. ✅ Data migration script includes CASCADE delete protection (migration 0007)
3. ✅ Staging deployment successful with data integrity preserved
4. 🔄 Production deployment pending

See [Database Architecture Analysis](#database-architecture-analysis) section below for detailed findings.

#### Main Database (API)

The API uses `mirubato-prod` / `mirubato-dev` databases with the following schema:

```sql
-- Users table
users (
  id, email, display_name,
  primary_instrument,
  auth_provider,
  google_id,
  created_at, updated_at
)

-- Practice data tables (exist but currently unused)
practice_sessions, practice_logs, sheet_music,
logbook_entries, goals, user_preferences

-- Sync tables (currently stores all data)
sync_data, sync_metadata
```

#### Scores Database

Separate database for content management:

```sql
-- Content tables
scores, composers, genres, difficulty_levels,
score_metadata, user_scores
```

### Authentication Flow

1. **Magic Link (Primary)**:
   - User enters email
   - System sends magic link via email
   - Link contains short-lived token
   - Token exchanged for JWT

2. **Google OAuth**:
   - OAuth2 flow with Google
   - Profile data stored in users table
   - Same JWT token system

### JWT Token Architecture

JWT tokens are used for authentication across services with a shared secret approach:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │   API Service   │    │ Scores Service  │
│   (React SPA)   │    │                 │    │                 │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Receives JWT  │◄──►│ • Creates JWT   │    │ • Verifies JWT  │
│ • Stores JWT    │    │ • Verifies JWT  │    │ • Uses same     │
│ • Sends JWT     │    │ • Uses SECRET   │    │   SECRET as API │
│ • NO SECRET     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### JWT Secret Management

- **API Service**: Creates and signs JWT tokens during authentication
- **Scores Service**: Validates JWT tokens from authenticated requests
- **Frontend**: Receives, stores, and sends tokens (no secret access)

**Critical**: The `JWT_SECRET` must be identical between API and Scores services for token validation to work. Secrets are managed via Cloudflare Workers secrets (not environment variables).

```bash
# Set the same JWT_SECRET in both services
cd api && wrangler secret put JWT_SECRET --env staging
cd scores && wrangler secret put JWT_SECRET --env staging
# Use identical values for both
```

#### Security Principles

1. **Client-Side Isolation**: JWT_SECRET never exposed to frontend code
2. **Shared Validation**: All backend services use the same secret for consistency
3. **Secret Rotation**: Secrets can be rotated by updating all services simultaneously
4. **Environment Separation**: Different secrets per environment (staging, production)

### Deployment Architecture

- **CI/CD**: GitHub Actions for validation, Cloudflare automatic deployments on push
- **Environments**: Production (default), Staging, Development
- **Worker Names**:
  - Production: `mirubato`, `mirubato-api`, `mirubato-scores`
  - Staging: `*-staging` suffix for each worker
- **Build Process**: Each service built independently from its own directory

### Architecture Status

✅ **Migration Complete**: The system has successfully transitioned to a REST-only architecture:

- GraphQL backend service has been completely removed
- Frontend exclusively uses REST API endpoints
- Database schema unified for REST architecture
- All legacy GraphQL code and dependencies removed

## Core Design Principles

### 1. Local-First Architecture

- **Offline by default**: All core features work without internet connection
- **Progressive enhancement**: Online features enhance the experience
- **Data ownership**: Users control their practice data
- **Instant responsiveness**: No network latency for core interactions

### 2. Component-Based Architecture (Actual Implementation)

- **Separation of concerns**: Each React component handles specific functionality
- **Props and hooks**: Components communicate via props and shared hooks
- **Zustand stores**: Centralized state management for auth and logbook data
- **Testable**: Components tested with React Testing Library

### 3. Minimalist UI Philosophy

- **Ghost controls**: 5% opacity when not in use
- **Progressive disclosure**: Show only what's needed
- **Focus on content**: Sheet music is the primary visual element
- **Responsive design**: Adapts to device and orientation

## Frontend Architecture

### Current Implementation (Pragmatic MVP)

The frontend uses a straightforward React architecture without the complex module system described in the original design:

#### State Management

- **Zustand Stores**: Simple, lightweight state management
  - `authStore`: User authentication and session management
  - `logbookStore`: Practice entries and local data sync
  - `scoreStore`: Sheet music browsing and collections
  - `practiceStore`: Active practice session tracking
  - `reportingStore`: Analytics filters and view preferences
  - Direct API calls via Axios clients

#### Key Components

**Pages**

- **Home**: Landing page with feature overview
- **Logbook**: Practice session tracking and reporting
- **Toolbox**: Practice tools including metronome with patterns, practice counter, and Circle of Fifths
- **Scorebook**: Sheet music browser with collections support (July 2025 update)
- **Auth**: Authentication pages (verify, callback)

**Core Components**

- **LogbookEntryList**: Main entry management component
- **EnhancedReports**: Modular reporting system with specialized views (July 2025)
  - **View Components**:
    - **OverviewView**: Dashboard with practice streaks, calendar heatmap, and trend charts
    - **AnalyticsView**: Advanced analytics with filtering, grouping, and sorting
    - **DataTableView**: Grouped data table with export capabilities
    - **PiecesView**: Piece and composer-specific analytics and visualizations
  - **Advanced Components**:
    - **FilterBuilder**: Complex filter creation with presets and logic operators
    - **GroupingPanel**: Multi-level data grouping configuration
    - **SortingPanel**: Multi-field sorting with direction control
  - **Visualization Charts**:
    - **HeatmapCalendar**: GitHub-style practice calendar visualization
    - **PracticeTrendChart**: Time series charts with period aggregation
    - **DistributionPie**: Pie/donut charts for categorical data
    - **ComparativeChart**: Period-over-period comparison charts
    - **ProgressBar**: Goal tracking progress indicators
    - **ChartContainer**: Reusable wrapper with export functionality
  - **Supporting Components**:
    - **ReportsTabs**: Tab navigation for different report views
    - **SummaryStats**: Practice statistics cards
    - **PiecesStatistics**: Detailed piece practice table
    - **PieceComposerStats**: Composer and piece metrics
- **ManualEntryForm**: Practice entry creation with custom time picker and multi-piece support
- **InteractivePiano**: Simple piano widget (lazy loaded)
- **usePracticeAnalytics**: Shared hook for practice data analytics and calculations

**Chart.js Integration**

- **Global Registration**: All Chart.js components are registered globally in `src/utils/chartSetup.ts`
  - Imported in `main.tsx` before any components load
  - Prevents "controller not registered" errors in production
  - Registers: CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler, RadialLinearScale, TimeScale
- **Type Safety**: All chart components use proper TypeScript generics
  - `ChartData<'line'>`, `ChartDataset<'bar', number[]>`, `TooltipItem<'pie'>`
  - No `any` types in chart implementations
- **Lazy Loading**: Chart components are lazy loaded with React.lazy() for performance

**Auto-Logging Module (July 2025)**

- **AutoLoggingProvider**: Context provider for global practice session management
  - Manages active practice sessions across features
  - Handles automatic session creation in logbook
  - Persists configuration to localStorage
  - Provides session lifecycle management
- **usePracticeTracking**: Reusable hook for integrating practice tracking
  - Start/stop/pause/resume session tracking
  - Real-time duration updates
  - Metadata management for different practice types
  - Automatic session completion handling
- **PracticeSummaryModal**: Session review modal before saving
  - Shows practice duration and metadata
  - Allows user to review before creating logbook entry
  - Option to discard session
  - Consistent UI with component library

**Scorebook Components (July 2025)**

- **ScoreBrowser**: Main scorebook page with tabs for Scores, Public Collections, My Collections
- **CollectionsManager**: Simplified collection creation and management
- **CollectionBadges**: Lightweight collection display as clickable badges
- **ImportScoreModal**: Unified import flow for PDF/Images/URL with collection selection
- **AddToCollectionModal**: Quick add scores to collections
- **ScoreManagement**: Simplified score upload without collection elements

**Toolbox Components (July 2025)**

- **Circle of Fifths Components**:
  - **CircleOfFifths**: Main component orchestrating the tool
  - **CircleVisualization**: Interactive SVG circle with key segments
  - **PianoKeyboard**: Synchronized piano keyboard with color-coded keys
  - **KeyDetailsPanel**: Elegant card-based information panel
  - **CircleOfFifthsControls**: Audio playback and interaction controls
  - **keyData**: Comprehensive music theory data structure
  - **musicalAudioService**: Web Audio API integration for sound generation

**Layout Components**

- **UnifiedHeader**: Consistent navigation header across all pages
  - Handles authentication state display
  - Provides navigation between main sections
  - Triggers sign-in modal when needed
  - Mobile-responsive with hamburger menu (PR #201)

**Auth Components**

- **SignInModal**: Shared authentication modal used across all pages
  - Google OAuth integration via One Tap
  - Magic link email authentication
  - Consistent user experience across the app
  - Refactored to use new UI component library (Modal, Button, Input)
- **GoogleSignInButton**: Google OAuth button component
- **ProtectedRoute**: Route guard for authenticated pages

**UI Component Library (v1.4.0 - July 2025)**

A comprehensive set of reusable components following consistent design patterns with Morandi color scheme:

- **Button**: Enhanced component with variants (primary, secondary, ghost, danger, icon)
- **Modal**: Accessible modal using @headlessui/react
- **Card**: Flexible container with multiple variants
- **Loading**: Multiple loading states (spinner, dots, pulse, skeleton)
- **Input/Textarea**: Form components with consistent styling
- **Select/MultiSelect**: Accessible dropdowns
- **TimePicker**: Custom time picker with Morandi colors (desktop) and native fallback (mobile)
- **Toast**: Notification system with auto-dismiss
- **Design System**: Constants for spacing, typography, shadows, animations

All components follow accessibility standards (WCAG 2.1 AA) and support dark mode preparation. The component library has been extensively refactored to eliminate native HTML usage in favor of consistent, branded components.

**Theme Management (July 2025)**

Currently, the application is forced to light theme to ensure consistency across all user systems:

```css
/* Force light theme throughout the app */
:root {
  color-scheme: light;
}

/* Tailwind configuration */
module.exports = {
  darkmode:
    'class',
    // Manual control instead of 'media'
    ; // ... rest of config

}
```

This prevents the browser from automatically applying dark mode based on system preferences. A proper theme switcher (light/dark/system) is planned for future implementation (see ROADMAP.md Priority 1.5).

#### Data Flow

```
React Components → Zustand Stores → API Clients → REST API
                 ↓
            Local Storage (offline sync)
```

**Store Responsibilities**:

- **authStore**: JWT tokens, user profile, authentication state
- **logbookStore**: Practice entries (Map-based for O(1) access), goals, sync management
- **scoreStore**: Sheet music metadata, collections, search/filter state
- **practiceStore**: Active practice sessions, timers, auto-logging state
- **reportingStore**: Report filters, view preferences, cached analytics data

### Planned Module Architecture (Not Implemented)

The original design envisioned a complex module system with EventBus for loose coupling. This architecture remains in the documentation for potential future implementation but was deferred in favor of shipping a working MVP.

**Recommendation**: The current simpler architecture is more appropriate for the MVP stage. The module system could be reconsidered when the application grows significantly in complexity.

## Key Technologies

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand, Axios
- **Data Visualization**: Chart.js v4.4.9 with react-chartjs-2 v5.3.0
- **UI Components**: Custom component library with @headlessui/react for accessibility
- **Music Libraries**: VexFlow.js and Tone.js (present but minimally used)
- **Backend**: Cloudflare Workers, D1 (SQLite), KV (caching)
- **API Framework**: Hono with Zod validation
- **Auth**: JWT tokens, magic links, Google OAuth
- **i18n**: react-i18next (6 languages: en, es, fr, de, zh-TW, zh-CN)
- **Testing**: Vitest, Playwright

## Performance Considerations

1. **Edge Computing**: All logic runs at Cloudflare edge locations
2. **Database**: D1 provides low-latency SQLite at the edge
3. **Assets**: Static files served via Workers with comprehensive caching:
   - Immutable assets cached for 1 year
   - Images cached for 1 day in browser, 1 year at edge
   - API responses cached for 1 minute at edge
4. **API Response**: Sub-100ms response times globally
5. **Bundle Optimization**:
   - Code splitting reduces initial load by 43%
   - Lazy loading for heavy libraries (Tone.js)
   - Vendor chunks for better caching

## Security

1. **Authentication**: JWT tokens with short expiration
2. **CORS**: Configured per environment
3. **Rate Limiting**: Built into Workers platform
4. **Data Isolation**: User data segregated by user_id foreign keys
5. **Health Check Security**: JWT validation in health endpoints
6. **Auth Middleware**: Consistent authentication across all services

### Secret Management

Sensitive configuration is handled via Cloudflare Workers secrets:

**Required Secrets by Service:**

| Service | Secrets                | Purpose                         |
| ------- | ---------------------- | ------------------------------- |
| API     | `JWT_SECRET`           | Sign/verify JWT tokens          |
|         | `MAGIC_LINK_SECRET`    | Sign magic link tokens          |
|         | `RESEND_API_KEY`       | Email service integration       |
|         | `GOOGLE_CLIENT_SECRET` | OAuth integration               |
| Scores  | `JWT_SECRET`           | Verify JWT tokens (same as API) |

**Secret Rotation Process:**

1. Generate new secret: `openssl rand -base64 32`
2. Update all services simultaneously
3. Monitor health endpoints for validation
4. Test cross-service authentication

**Debug Tools:**

- `/debug/jwt-test` endpoints in staging for secret verification
- Health checks validate secret functionality
- Metrics track authentication success rates

## Health Monitoring

### Endpoints

All services expose comprehensive health monitoring:

- `/health` - Comprehensive health check with all service dependencies
- `/livez` - Liveness probe (simple check that service is running)
- `/readyz` - Readiness probe (check if service can handle requests)
- `/metrics` - Prometheus-compatible metrics endpoint

### Health Check Features

1. **Database connectivity** - Verifies D1 database is accessible
2. **JWT validation** - Tests token creation and verification
3. **Storage access** - Checks R2 bucket connectivity (Scores service)
4. **Cache operations** - Validates KV namespace read/write
5. **Smoke tests** - Runs critical operations to ensure functionality

### Monitoring URLs

- API Health: https://api.mirubato.com/health
- Scores Health: https://scores.mirubato.com/health
- Frontend: Served via static assets, monitored through edge analytics

## Development Workflow

```bash
# Local Development with proper domains
./start-scorebook.sh     # Start all services with proper domains

# Individual services (for debugging)
cd api && wrangler dev --port 9797 --env local --local-protocol http     # http://api-mirubato.localhost:9797
cd scores && wrangler dev --port 9788 --env local --local-protocol http  # http://scores-mirubato.localhost:9788
cd frontendv2 && npm run dev                                             # http://www-mirubato.localhost:4000

# Deployment (from respective directories)
cd [service] && wrangler deploy               # Production
cd [service] && wrangler deploy --env staging # Staging

# Database migrations (from api directory)
cd api && npm run db:migrate:production   # Production
cd api && npm run db:migrate:staging      # Staging
```

## Internationalization (i18n) Architecture

### Overview

Mirubato supports 6 languages with a comprehensive i18n system built on react-i18next:

- **English (en)** - Reference language
- **Spanish (es)**
- **French (fr)**
- **German (de)**
- **Traditional Chinese (zh-TW)**
- **Simplified Chinese (zh-CN)**

### Implementation

1. **Structure**: Translation files organized by namespace and language

   ```
   src/locales/
   ├── en/          # Reference language
   │   ├── auth.json      # Authentication strings
   │   ├── common.json    # Shared UI elements
   │   ├── errors.json    # Error messages
   │   ├── logbook.json   # Practice log features
   │   ├── reports.json   # Analytics and reporting
   │   ├── scorebook.json # Score/sheet music features
   │   └── toolbox.json   # Practice tools
   └── [es|fr|de|zh-TW|zh-CN]/  # Same structure for each language
   ```

2. **Key Features**:
   - Namespace-based organization for code splitting
   - Lazy loading of translation files
   - Automatic language detection
   - Fallback to English for missing translations
   - Interpolation support for dynamic values
   - Pluralization rules for each language

3. **Translation Management**:
   - Validation scripts ensure 100% translation coverage
   - Sync tools maintain consistency across languages
   - English serves as the reference for all translations
   - `[NEEDS TRANSLATION]` markers for new keys

### Development Workflow

```bash
# Check translation completeness
npm run validate:i18n

# Sync missing keys from English
npm run sync:i18n

# Fix and sort keys
npm run i18n:fix
```

### Best Practices

1. **Always use translation keys** - Never hardcode UI text
2. **Namespace appropriately** - Use `common` for shared strings
3. **Maintain consistency** - Use the same terminology across namespaces
4. **Consider context** - Musical terms may vary by language/culture
5. **Test with different languages** - Ensure UI handles varying text lengths

See `frontendv2/docs/I18N_VALIDATION.md` for detailed documentation.

## Caching Architecture

### Edge Caching Strategy

Mirubato implements a multi-layer caching strategy leveraging Cloudflare's edge infrastructure:

#### 1. Frontend Asset Caching

```
Static Assets (JS, CSS with hashing): 1 year (immutable)
Images (JPG, PNG, SVG): 1 day browser, 1 year edge
Fonts (WOFF2, TTF): 1 month browser, 1 year edge
HTML: No cache (always fresh)
```

#### 2. API Response Caching

- **Public endpoints**: Cached at edge for 1 minute
- **Authenticated requests**: Never cached
- **Conditional requests**: Support for ETags and 304 responses

#### 3. Scores Service Caching

- **PDFs**: Immutable caching (1 year)
- **Metadata**: 5 minutes at edge
- **KV fallback**: When edge cache misses

### Bundle Optimization

The frontend implements aggressive code splitting:

- **Initial bundle**: Reduced from 631KB to smaller chunks
- **Lazy loading**: Heavy libraries loaded on demand
- **Vendor chunks**: Separate chunks for better caching
  - react-vendor: React ecosystem
  - music-vendor: VexFlow + Tone.js
  - utils-vendor: Utilities and helpers
  - i18n-vendor: Internationalization

## Testing Strategy

### Coverage Requirements

- **Unit Tests**: >80% coverage per module
- **Integration Tests**: Critical user flows
- **E2E Tests**: Key user journeys
- **Performance Tests**: <100ms response times

### Performance Targets

| Metric              | Target | Critical |
| ------------------- | ------ | -------- |
| Initial Load        | <2s    | <3s      |
| Time to Interactive | <3s    | <5s      |
| API Response        | <100ms | <200ms   |
| Frame Rate          | 60fps  | 30fps    |
| Memory Usage        | <100MB | <200MB   |

## Architecture Phases

### Phase 1: MVP - Logbook Focus (✅ COMPLETE - v1.4.1)

- ✅ Core functionality: Practice logging and reporting
- ✅ Manual practice entry with timer and precise time selection
- ✅ Enhanced reporting with calendar visualization
- ✅ Data export (CSV, JSON) with proper filename patterns
- ✅ Works for both anonymous and authenticated users
- ✅ Goal setting and tracking
- ✅ Multi-instrument support (Piano & Guitar)
- ✅ Multi-piece practice sessions with intelligent time division
- ✅ Internationalization (6 languages)
- ✅ Autocomplete for composers and pieces
- ✅ Comprehensive UI component library with Morandi design system
- ✅ Mobile-optimized responsive design
- ✅ Production deployment at mirubato.com

**Recent Enhancements (July 2025):**

- **Enhanced Reporting UI** (Latest): Added comprehensive data visualization and filtering
  - Advanced filtering system with date ranges, duration, pieces, composers, instruments
  - Multiple chart types using Chart.js with proper TypeScript types
  - Calendar heatmap visualization for daily practice patterns
  - Grouping and aggregation capabilities for data analysis
  - Export functionality for all visualizations
  - Properly typed Chart.js components without any type assertions

- **Auto-Logging Module**: Added reusable auto-logging system for practice tracking
  - AutoLoggingProvider for global practice session management
  - usePracticeTracking hook for easy integration
  - PracticeSummaryModal for session review before saving
  - Integrated into Metronome and Scorebook features
  - Automatic session tracking with configurable options
  - Seamless integration with existing logbook functionality

- **Practice Counter**: Added new practice counter feature to toolbox
  - Visual counter for practice sessions
  - Integrated with scorebook and logbook
  - Full i18n support across all 6 languages

- **Circle of Fifths Tool**: Interactive music theory visualization (July 2025)
  - Complete Circle of Fifths showing all 12 major and minor keys
  - Interactive piano keyboard synchronized with circle selection
  - Morandi-inspired color palette with elegant card-based UI
  - Shows key relationships, scales, chords, and common progressions
  - Audio playback integration for chords and scales
  - Responsive design for desktop, tablet, and mobile
  - Educational features including theory information and characteristics

- **Component Refactoring**: Split large components into maintainable modules
  - EnhancedPracticeReports refactored from 1515 lines into 8+ focused components
  - Introduced shared analytics logic via usePracticeAnalytics hook
  - Improved code maintainability and testability
- **Time Management**: Added custom time picker with brand-consistent styling
- **Multi-Piece Support**: Practice time intelligently divided among multiple pieces
- **Export Functionality**: Robust CSV/JSON export with comprehensive data
- **UI Polish**: Complete migration to custom component library
- **Mobile UX**: Improved responsive design and touch interactions
- **Calendar Navigation**: Enhanced practice calendar with monthly/yearly navigation controls
- **Monthly Summaries**: Added historical practice data access by month
- **Performance**: Lazy loading implemented for report components to improve initial load time
- **E2E Testing**: Comprehensive test coverage with 65 tests passing (including all smoke tests)

**Scorebook Collections Simplification (July 2025):**

- **Collections as Lightweight Tags**: Simplified from complex sharing system to organizational badges
- **UI Streamlining**: Removed collections from score upload, added dedicated management modal
- **Import Flow**: New ImportScoreModal with PDF/Images/URL support and collection selection
- **Visual Design**: Collection badges with color coding (public: sage, private: stone, featured: sand)
- **Search Fix**: Score search now properly queries by title and composer
- **UI Consistency**: Fixed modal theming issues for consistent light theme
- **My Collections Page**: Added collection creation button and management capabilities

### Phase 2: Practice Mode (Future)

- Sheet music display and playback (VexFlow.js ready)
- Real-time performance tracking
- Audio recording and playback (Tone.js ready)
- Progress analytics
- Integration with scores service

**Note**: While the module system is not implemented, the music libraries (VexFlow.js, Tone.js) are included and ready for future use.

### Phase 3: Advanced Features (Future)

- Multi-voice support
- MIDI integration
- AI coaching
- Social features

## Architecture Decision Analysis

### Planned vs Implemented

| Aspect             | Planned Architecture                | Current Implementation        | Recommendation                                                      |
| ------------------ | ----------------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| **Frontend State** | Complex module system with EventBus | Simple Zustand stores         | ✅ Current approach is better for MVP - simpler, easier to maintain |
| **Music Features** | Full VexFlow/Tone.js integration    | Libraries included but unused | ⏳ Good to have libraries ready for Phase 2                         |
| **API Design**     | Started with GraphQL                | Migrated to REST              | ✅ REST is simpler and sufficient for current needs                 |
| **Authentication** | JWT + Magic Links                   | Fully implemented as planned  | ✅ Working well                                                     |
| **Database**       | D1 with sync capabilities           | Fully implemented with fixes  | ✅ Good choice for edge deployment                                  |
| **i18n**           | Not in original design              | Added with 6 languages        | ✅ Great addition for global reach                                  |

### Key Insights

1. **Pragmatism Wins**: The team chose to ship a working MVP rather than build the complex module system. This was the right decision.

2. **Technical Debt**: The module system documentation should be moved to a "future architecture" section to avoid confusion.

3. **Music Features**: Having VexFlow.js and Tone.js ready positions the app well for Phase 2, but they add bundle size without current value.

4. **REST over GraphQL**: The migration from GraphQL to REST simplified the architecture significantly without losing functionality.

## Database Architecture Analysis

### Discovery: JSON Storage vs Structured Tables (July 2025)

During investigation of the 'TECHNIQUE' practice type implementation, we discovered a significant architectural deviation:

#### Current Implementation

- **sync_data table**: Stores all logbook entries as JSON blobs
  - Staging: 43 entries (lowercase)
  - Production: 164 entries (mixed case, awaiting migration)
- **logbook_entries table**: Empty (0 entries) despite having proper schema
- **Data flow**: Frontend → API → sync_data (JSON) → Frontend

#### Schema Updates (2025-07-11)

**Post-Migration Schema** (lowercase enums):

```sql
CREATE TABLE logbook_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('practice', 'performance', 'lesson', 'rehearsal', 'technique')),
  instrument TEXT NOT NULL CHECK (instrument IN ('piano', 'guitar')),
  pieces TEXT NOT NULL DEFAULT '[]',
  techniques TEXT NOT NULL DEFAULT '[]',
  goal_ids TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  mood TEXT CHECK (mood IN ('frustrated', 'neutral', 'satisfied', 'excited')),
  tags TEXT NOT NULL DEFAULT '[]',
  -- ... other columns
)
```

#### Key Findings

1. ✅ **TECHNIQUE type now included** in CHECK constraint
2. ✅ **All enums converted to lowercase** for consistency
3. **techniques column exists** in schema but unused
4. **All queries use JSON extraction** which is inefficient
5. **Frontend decoupled** - doesn't know about backend storage method
6. **Critical fix applied**: Migration scripts now use `PRAGMA foreign_keys = OFF/ON` to prevent CASCADE deletes

#### Performance Implications

- **Current (JSON)**: `json_extract(data, '$.techniques')` requires full table scan
- **Structured**: Indexed columns would provide 100x+ performance improvement

#### Migration Benefits

- Database-enforced data integrity
- Efficient querying and aggregation
- Proper indexing for performance
- Enables advanced analytics features

The API abstraction layer makes migration straightforward - frontend code remains unchanged.

## Microservices Template

### Service Template Architecture

Mirubato provides a standardized service template (`service-template/`) for creating new microservices that align with the platform's architecture. This template encapsulates all the patterns and best practices learned from building the API and Scores services.

#### Template Features

1. **Complete Cloudflare Workers Setup**
   - Multi-environment configuration (local, development, staging, production)
   - Pre-configured `wrangler.toml` with all necessary bindings
   - D1 database, KV namespace, R2 bucket, Queue support

2. **Standardized Middleware Stack**
   - JWT authentication with shared secret
   - Rate limiting (sliding window algorithm using KV)
   - CORS handling with environment-specific origins
   - Request/response logging
   - Global error handling
   - Input validation with Zod schemas

3. **Health Monitoring**
   - `/livez` - Simple liveness check
   - `/readyz` - Database connectivity check
   - `/health` - Comprehensive health with all dependencies
   - `/metrics` - Prometheus-compatible metrics

4. **API Documentation**
   - OpenAPI specification at `/docs`
   - Swagger UI support
   - Type-safe route definitions

5. **Database Layer**
   - Drizzle ORM for type-safe queries
   - Migration system with versioning
   - Example schemas following best practices

6. **Testing Infrastructure**
   - Vitest configuration for Workers
   - Example tests for all middleware
   - Mock environment setup
   - Coverage reporting

#### Creating a New Service

```bash
# 1. Copy the template
cp -r service-template my-new-service
cd my-new-service

# 2. Run the automated setup
./scripts/setup.sh

# 3. Configure resources
# The script will provide commands to:
# - Create KV namespaces
# - Create D1 databases
# - Set JWT secret (must match other services)

# 4. Start developing
npm install
npm run dev
```

#### Service Integration

New services integrate seamlessly with the existing architecture:

1. **Authentication**: Same JWT secret ensures token portability
2. **Monitoring**: Consistent health endpoints for platform-wide observability
3. **Deployment**: Same CI/CD patterns via Cloudflare GitHub integration
4. **Development**: Consistent localhost domain pattern (service-name-mirubato.localhost)

## Future Considerations

1. **Mobile Apps**: React Native using same REST API
2. **Advanced Features**: AI-powered difficulty adjustment
3. **Scaling**: Multi-region database replication
4. **Performance**: Edge caching optimization
5. **Module System**: Reconsider when app complexity justifies it
6. **Database Migration**: Move from JSON blobs to structured tables for better performance
7. **New Services**: Use the service template for consistency across all microservices

---

This design document represents the current state of Mirubato's architecture and will continue to evolve as the application grows.
