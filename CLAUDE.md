# CLAUDE.md - AI Agent Quick Reference

## 📦 Version 1.7.0 Release (July 2025)

### Security Updates

- Fixed critical vulnerabilities in tar-fs (high severity)
- Fixed DoS vulnerability in ws package (high severity)
- Fixed esbuild development server vulnerability (medium severity)
- Updated all dependencies to latest secure versions

### Architecture Changes

- All services unified at version 1.7.0
- Dictionary service promoted from v1.0.0 to v1.7.0
- Enhanced security posture across all microservices
- @cloudflare/puppeteer downgraded to 0.0.11 for security fix

### Package Manager Migration

- **Migrated from npm to pnpm** for better performance and disk space efficiency
- All build commands updated in `wrangler.toml` files to use `pnpm run build`
- CI/CD workflows updated to use pnpm with proper caching
- Developers must install pnpm globally: `npm install -g pnpm`

## 🚨 CRITICAL: Start Here

### Deployment Architecture (2025)

- See @docs/ROADMAP.md for general roadmap.
- See @docs/DESIGN.md for general design and spcs.
- See @docs/DEBUG.md for known issues and how did we resolved them.
- See @docs/USER_FLOWS.md for comprehensive user journey documentation.
- **Frontend & API**: Both are Cloudflare Workers (NOT Pages)
- **Configuration**: Environment-based `wrangler.toml` files (no manual generation)
- **Deployment**:
  - **PR/Branch pushes**: Automatically deploy to staging environment
  - **Main branch**: Automatically deploy to production
  - Cloudflare handles deployments via GitHub integration
- **Key Files**: `frontendv2/wrangler.toml`, `api/wrangler.toml`, `scores/wrangler.toml`, `dictionary/wrangler.toml`

### Essential Commands

```bash
# Local Development
pnpm install                    # Install all dependencies
./start-scorebook.sh           # Start all services with proper domains

# Individual services (for debugging)
cd api && wrangler dev --port 9797 --env local --local-protocol http        # http://api-mirubato.localhost:9797
cd scores && wrangler dev --port 9788 --env local --local-protocol http     # http://scores-mirubato.localhost:9788
cd dictionary && wrangler dev --port 9799 --env local --local-protocol http # http://dictionary-mirubato.localhost:9799
cd frontendv2 && pnpm run dev                                                # http://www-mirubato.localhost:4000

# API Development
cd api && pnpm run dev          # Full dev workflow (build + server)
cd api && pnpm run build        # Production build

# Deployment (from respective directories)
# Frontend (now frontendv2)
cd frontendv2 && wrangler deploy             # Deploy to production (default)
cd frontendv2 && wrangler deploy --env staging # Deploy to staging

# API
cd api && wrangler deploy                  # Deploy to production (default)
cd api && wrangler deploy --env staging    # Deploy to staging

# Scores
./start-scorebook.sh
cd scores && wrangler deploy               # Deploy to production (default)
cd scores && wrangler deploy --env staging # Deploy to staging

# Dictionary
cd dictionary && wrangler deploy               # Deploy to production (default)
cd dictionary && wrangler deploy --env staging # Deploy to staging
```

- You run in an environment where `ast-grep` is available; whenever a search requires syntax-aware or structural matching, default to `ast-grep --lang typescript -p '<pattern>'` (or set `--lang` appropriately) and avoid falling back to text-only tools like `rg` or `grep` unless I explicitly request a plain-text search.

### Project Structure

```
mirubato/
├── frontendv2/        # React app → Cloudflare Worker
│   └── wrangler.toml  # All environments defined here
├── api/               # REST API → Cloudflare Worker
│   └── wrangler.toml  # All environments defined here
├── scores/            # Scores service → Cloudflare Worker
│   └── wrangler.toml  # All environments defined here
├── dictionary/        # Dictionary service → Cloudflare Worker
│   └── wrangler.toml  # All environments defined here
├── service-template/  # Template for new microservices
│   ├── README.md      # Quick start guide
│   ├── scripts/       # Setup automation
│   └── src/           # Pre-configured service code
```

### Local Development Architecture

We use explicit localhost domains with ports to properly simulate production environment and catch CORS issues:

- **Frontend**: `http://www-mirubato.localhost:4000` (Vite dev server)
- **API**: `http://api-mirubato.localhost:9797` (Wrangler dev)
- **Scores**: `http://scores-mirubato.localhost:9788` (Wrangler dev)
- **Dictionary**: `http://dictionary-mirubato.localhost:9799` (Wrangler dev)

This approach:

- ✅ Catches CORS issues during development
- ✅ Maintains service isolation
- ✅ Uses consistent URLs across environments
- ✅ Avoids mixing temporary Cloudflare URLs
- ✅ Works without root privileges (no port 80)

**Note**: The `.localhost` domains automatically resolve to 127.0.0.1 on most systems.

## 🛠 Quick Debugging Reference

For comprehensive debugging information, see **[docs/DEBUG.md](./docs/DEBUG.md)**

### Quick Links

- **Production Frontend**: `https://mirubato.com`
- **Production API Health Check**: `https://api.mirubato.com/health`
- **API Documentation**: `https://api.mirubato.com/docs`
- **Dictionary Health Check**: `https://dictionary.mirubato.com/health`
- **Dictionary Documentation**: `https://dictionary.mirubato.com/docs`

### Common Issues

| Problem                              | See DEBUG.md Section                         |
| ------------------------------------ | -------------------------------------------- |
| VexFlow "Too Many Ticks"             | Known Issues #1                              |
| API 500 errors                       | Known Issues #2                              |
| Mobile audio issues                  | Known Issues #6                              |
| Type misalignment                    | Common Development Issues #1                 |
| Memory leaks                         | Common Development Issues #4                 |
| Chart.js "controller not registered" | Ensure chartSetup.ts is imported in main.tsx |

## 📋 Development Checklist

### Before Starting Work

- [ ] Pull latest from main
- [ ] Run `pnpm install` if package.json changed
- [ ] Generate configs for your environment
- [ ] Check `/health` endpoint if working with production

### When Writing New Code

- [ ] **Write tests FIRST** - Follow Test-Driven Development (TDD)
- [ ] Ensure >80% test coverage (90% for critical paths)
- [ ] No function is complete without tests
- [ ] Tests are the primary metric of feature completeness

### Before Committing

- [ ] All tests pass with proper coverage
- [ ] Let pre-commit hooks run (NEVER use `--no-verify`)
- [ ] No `console.log` statements in code
- [ ] No `any` types in TypeScript
- [ ] **Use UI component library** - No native HTML buttons/inputs/modals
- [ ] Update CLAUDE.md if you discover new patterns

### Key Principles

1. **Test First**: Write tests before implementation - tests define the spec
2. **Education First**: Features must enhance sight-reading learning
3. **Instrument Specific**: Guitar ≠ Piano (positions, fingerings, notation)
4. **Mobile First**: Test on actual devices
5. **Open Source**: Keep endpoints public for debugging
6. **PATH** always use pwd to check what is current path
7. **BRANCH** always check what is current branch, if at main branch, must create a new branch before editing.

## 🎨 UI Component Usage (IMPORTANT)

### Always Use the Component Library

When creating or updating UI components:

1. **Never use native HTML elements**:
   - ❌ `<button>Click me</button>`
   - ✅ `<Button>Click me</Button>`
2. **Import from the UI library**:

   ```tsx
   import { Button, Modal, Card, Input, Select } from '@/components/ui'
   ```

3. **Available Components**:
   - **Button**: 5 variants (primary, secondary, ghost, danger, icon)
   - **Modal**: Accessible modals with multiple sizes
   - **Card**: Container with borders, elevation, or ghost styles
   - **Input/Textarea**: Form inputs with error states
   - **Select/MultiSelect**: Dropdown components
   - **Loading**: Spinner, dots, pulse, skeleton
   - **Toast**: Notification system

4. **Documentation**: See `frontendv2/docs/COMPONENT-LIBRARY.md`

### Repertoire & Goals System (July 2025)

The repertoire system transforms the Pieces tab into a comprehensive musical progress tracking system integrated with goals.

**Key Features:**

- **Repertoire Management**: Track piece status (Planned, Learning, Working, Polished, Performance Ready)
- **Goals Integration**: Create and track goals linked to specific pieces
- **Auto-Prompt**: After logging practice, prompts to add pieces to repertoire
- **Practice History**: View all practice sessions linked to repertoire items
- **Score ID Normalization**: Prevents duplicates with normalized IDs (title-composer format)

**Components:**

```typescript
// Main repertoire components
import RepertoireView from '@/components/repertoire/RepertoireView'
import { RepertoireCard } from '@/components/repertoire/RepertoireCard'
import { AddToRepertoirePrompt } from '@/components/repertoire/AddToRepertoirePrompt'
import { CreateGoalModal } from '@/components/repertoire/CreateGoalModal'
import { EditGoalModal } from '@/components/repertoire/EditGoalModal'

// Store
import { useRepertoireStore } from '@/stores/repertoireStore'
```

**Database Tables** (Migrations 0008, 0009, 0010):

- `user_repertoire`: Tracks piece status and personal notes
- `goals`: Extended with score_id, measures, practice_plan fields
- `goal_progress`: Historical progress tracking
- `score_annotations`: Future PDF annotation support

**API Endpoints:**

- `/api/repertoire` - CRUD operations for repertoire items
- `/api/goals` - Goal creation and progress tracking
- Auto-adds pieces to repertoire when creating repertoire goals

## 🎯 Current Focus Areas

### Immediate Priority: MVP Simplification (2 Weeks)

1. **Week 1**: Stabilization & Bug Fixes
   - Fix VexFlow rendering bugs
   - Fix audio playback issues
   - Ensure mobile compatibility
   - Disable complex modules temporarily

2. **Week 2**: Content & Polish
   - Add 10 curated pieces (5 piano, 5 guitar)
   - Implement preset practice workouts
   - Simplify UI to single "Practice" mode

### Technical Debt (Ongoing)

1. **Type Alignment** (COMPLETED)
   - ✅ Chart.js components properly typed without `any`
   - ✅ Using ChartData<T>, ChartDataset<T>, TooltipItem<ChartType>
   - ✅ Extended ChartOptions interface for all features
   - Remove duplicate type definitions

2. **Code Quality**
   - Remove console.log statements
   - ✅ EnhancedReports.tsx - New modular reporting system with 4 view components
   - ✅ Auto-logging module added for reusable practice tracking across features
   - ✅ Chart.js visualization components properly typed
   - Continue refactoring ~150 files still using native buttons

### Core Technologies

- **Frontend**: React + TypeScript + Vite + Tailwind + Zustand
- **UI Components**: Custom component library in `frontendv2/src/components/ui/`
  - Always use Button, Modal, Card, Input, Select, Toast components
  - Import from `@/components/ui`
  - See `frontendv2/docs/COMPONENT-LIBRARY.md` for usage
- **Data Visualization**: Chart.js v4.4.9 + react-chartjs-2 v5.3.0
  - Properly typed with ChartData<T>, ChartDataset<T>, TooltipItem<ChartType>
  - Custom chart components in `src/components/practice-reports/visualizations/charts/`
  - No `any` types - use proper Chart.js generics
- **API**: Cloudflare Workers + Hono + D1 (SQLite) + REST
- **Auth**: Magic links + Google OAuth + JWT
- **Music**: VexFlow.js (notation) + Tone.js (audio)

### Module Implementation Guidelines

When implementing any new module, **ALWAYS** follow these steps:

1. **Write Tests First (TDD)**
   - Create comprehensive test suite BEFORE implementation
   - Aim for >80% coverage (90% for critical modules)
   - Tests define the specification

2. **Add TypeDoc Documentation**
   - Document all public interfaces with JSDoc comments
   - Include examples in documentation
   - Run `pnpm run docs:generate` to verify

3. **Verify Test Coverage**
   - Run `pnpm test -- --coverage` for the module
   - Ensure coverage meets requirements
   - No module is complete without proper tests

Example workflow:

```bash
# 1. Create test file first
touch src/modules/newModule/NewModule.test.ts

# 2. Write tests that define behavior
# 3. Implement module to make tests pass
# 4. Add JSDoc comments
# 5. Generate and verify documentation
pnpm run docs:generate

# 6. Check coverage
pnpm test -- src/modules/newModule --coverage
```

### Auto-Logging Module (July 2025)

The auto-logging module provides automatic practice session tracking across features:

**Usage Example:**

```typescript
import { usePracticeTracking, PracticeSummaryModal } from '@/modules/auto-logging'

function MyPracticeComponent() {
  const {
    isTracking,
    formattedTime,
    showSummary,
    pendingSession,
    start,
    stop,
    confirmSave,
    dismissSummary,
  } = usePracticeTracking({
    type: 'metronome', // or 'score', 'counter', 'custom'
    metadata: {
      title: 'Practice Session',
      instrument: 'PIANO',
      // ... other metadata
    },
  })

  return (
    <>
      <Button onClick={isTracking ? stop : start}>
        {isTracking ? `Stop (${formattedTime})` : 'Start Practice'}
      </Button>

      <PracticeSummaryModal
        isOpen={showSummary}
        onClose={dismissSummary}
        onSave={confirmSave}
        onDiscard={dismissSummary}
        duration={pendingSession?.duration || 0}
        metadata={pendingSession?.metadata || {}}
      />
    </>
  )
}
```

**Key Features:**

- Automatic session tracking with start/stop/pause/resume
- Real-time duration display
- Summary modal before saving to logbook
- Configurable auto-logging preferences
- TypeScript support with comprehensive types
- Integrated with Metronome and Scorebook features

### Enhanced Reporting UI (July 2025 - Updated)

The enhanced reporting UI provides comprehensive data visualization and filtering for practice data with a modular architecture.

**Latest Updates:**

- **Technique Practice Type**: Added 'TECHNIQUE' as a new practice type with tag selection (scale, arpeggio, octave, rhythm)
- **Reorganized Overview Tab**: Recent entries moved to top with new card design
- **Calendar Improvements**: Removed redundant labels, fixed month alignment
- **Analytics Tab Enhancement**: Consolidated all distribution charts in Analytics tab
- **Consistent Entry Cards**: Unified entry display across all views

**IMPORTANT - Chart.js Setup:**

Chart.js controllers must be registered globally before any chart components are rendered. This is handled automatically in `src/utils/chartSetup.ts` which is imported in `main.tsx`:

```typescript
// src/utils/chartSetup.ts - Registers all Chart.js components globally
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale,
  TimeScale,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)
```

This prevents "controller not registered" errors in production builds. The setup must happen before any components load.

**Key Components:**

```typescript
// Main orchestrator component
import EnhancedReports from '@/components/practice-reports/EnhancedReports'

// View components
import OverviewView from '@/components/practice-reports/views/OverviewView'
import AnalyticsView from '@/components/practice-reports/views/AnalyticsView'
import DataTableView from '@/components/practice-reports/views/DataTableView'
import PiecesView from '@/components/practice-reports/views/PiecesView'

// Chart components with proper TypeScript types
import { HeatmapCalendar } from '@/components/practice-reports/visualizations/charts/HeatmapCalendar'
import { PracticeTrendChart } from '@/components/practice-reports/visualizations/charts/PracticeTrendChart'
import { DistributionPie } from '@/components/practice-reports/visualizations/charts/DistributionPie'
import { ComparativeChart } from '@/components/practice-reports/visualizations/charts/ComparativeChart'
import { ProgressBar } from '@/components/practice-reports/visualizations/charts/ProgressBar'

// Advanced features
import { FilterBuilder } from '@/components/practice-reports/advanced/FilterBuilder'
import { GroupingPanel } from '@/components/practice-reports/advanced/GroupingPanel'
import { SortingPanel } from '@/components/practice-reports/advanced/SortingPanel'
```

**Proper Chart.js Typing Pattern:**

```typescript
// Always use proper generics, never 'any'
const chartData = useMemo<ChartData<'line'>>(() => { ... })
const datasets: ChartDataset<'bar', number[]>[] = [...]

// Tooltip callbacks with proper types
tooltip: {
  callbacks: {
    label: (context: TooltipItem<'pie'>) => {
      // Type-safe access to context properties
    }
  }
}

// For borderDash and other extended properties
datasets.push({
  ...datasetConfig,
  borderDash: [5, 5],
} as ChartDataset<'line', number[]>)
```

**Features:**

- **Modular Views**:
  - Overview: Practice streaks, calendar heatmap, trend charts, distributions
  - Analytics: Advanced filtering, grouping, sorting with trend analysis
  - Data Table: Grouped data view with export capabilities
  - Pieces: Piece and composer-specific analytics
- **Advanced Filtering**: FilterBuilder with complex criteria and presets
- **Data Visualization**: Line, bar, pie, donut charts, calendar heatmap
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Export Options**: CSV and JSON export for all data
- **Performance**: Caching system with `reportsCacheManager`
- **Type Safety**: Fully typed without any `any` assertions
- **State Management**: Centralized `reportingStore` using Zustand

### Repertoire & Goals System (July 2025)

The repertoire system transforms the Pieces tab into a comprehensive musical progress tracking system integrated with goals.

**Key Features:**

- **Repertoire Management**: Track piece status (Planned, Learning, Working, Polished, Performance Ready)
- **Goals Integration**: Create and track goals linked to specific pieces
- **Auto-Prompt**: After logging practice, prompts to add pieces to repertoire
- **Practice History**: View all practice sessions linked to repertoire items
- **Score ID Normalization**: Prevents duplicates with normalized IDs (title-composer format)

**Components:**

```typescript
// Main repertoire components
import RepertoireView from '@/components/repertoire/RepertoireView'
import { RepertoireCard } from '@/components/repertoire/RepertoireCard'
import { AddToRepertoirePrompt } from '@/components/repertoire/AddToRepertoirePrompt'
import { CreateGoalModal } from '@/components/repertoire/CreateGoalModal'
import { EditGoalModal } from '@/components/repertoire/EditGoalModal'

// Store
import { useRepertoireStore } from '@/stores/repertoireStore'
```

**Database Tables** (Migrations 0008, 0009, 0010):

- `user_repertoire`: Tracks piece status and personal notes
- `goals`: Extended with score_id, measures, practice_plan fields
- `goal_progress`: Historical progress tracking
- `score_annotations`: Future PDF annotation support

**API Endpoints:**

- `/api/repertoire` - CRUD operations for repertoire items
- `/api/goals` - Goal creation and progress tracking
- Auto-adds pieces to repertoire when creating repertoire goals

### API Development Workflow

**IMPORTANT**: The API uses REST endpoints with TypeScript interfaces for type safety.

```bash
# API Development:
cd api && pnpm run dev          # Start local API server
cd api && pnpm run test         # Run API tests
cd api && pnpm run type-check   # Verify TypeScript types

# Frontend API Integration:
# Types are defined directly in frontendv2/src/api/ files
# No code generation needed - just TypeScript interfaces
```

**API Structure**: `api/src/api/routes.ts` defines all endpoints

### Musical Implementation

```typescript
// Guitar: positions (I-XIX), strings, fingerings (p,i,m,a)
// Piano: grand staff, hand independence, fingerings (1-5)

// Always handle audio context for mobile
await Tone.start() // Required for mobile browsers
```

### Database Pattern

```sql
-- D1 uses SQLite syntax
-- Always include proper indexes
CREATE INDEX idx_sessions_user ON practice_sessions(user_id);
```

## 🏗️ Creating New Services

### Using the Service Template

When creating a new microservice for Mirubato, use the standardized service template:

```bash
# 1. Copy the template
cp -r service-template my-new-service
cd my-new-service

# 2. Run the setup script
./scripts/setup.sh

# 3. Follow the prompts to configure your service
```

The template provides:

- ✅ **Complete Cloudflare Workers setup** with multi-environment config
- ✅ **JWT authentication** matching other Mirubato services
- ✅ **Rate limiting** and CORS middleware
- ✅ **Health check endpoints** (/health, /livez, /readyz, /metrics)
- ✅ **OpenAPI documentation** at /docs
- ✅ **Drizzle ORM** for type-safe database queries
- ✅ **Testing setup** with Vitest
- ✅ **TypeScript** with strict mode
- ✅ **Error handling** and logging
- ✅ **Caching strategies** (Edge, KV)

### Service Architecture Principles

All Mirubato services follow these patterns:

1. **Edge-first**: Run on Cloudflare Workers globally
2. **JWT auth**: Shared secret across services
3. **Health monitoring**: Standard endpoints for observability
4. **Type safety**: TypeScript with Zod validation
5. **Test coverage**: Minimum 80% for all code

See `service-template/README.md` and `service-template/ARCHITECTURE.md` for detailed documentation.

## 🚀 Deployment Workflow

### Configuration System

1. **Environment-based**: All environments defined in `wrangler.toml`
2. **Production default**: Top-level config is production (no --env flag needed)
3. **Local development**: Uses `--env local` for placeholder values
4. **Automatic deployments**:
   - Push to PR → Cloudflare deploys to staging automatically
   - Merge to main → Cloudflare deploys to production automatically
   - No manual `wrangler deploy` needed for staging/production

### Environment Detection

- Local: `localhost:3000`
- Staging: `mirubato.pezware.workers.dev`
- Production: `mirubato.com`, `api.mirubato.com`

### Database Configuration

**Local Development**: Backend and API share the same D1 database locally

- Run `api/scripts/setup-shared-database.sh` after initial setup
- This creates a symlink so API uses backend's database
- Ensures data consistency during development
- See `api/scripts/MIGRATION_README.md` for details

### Database Migrations

**IMPORTANT**: Always use the safe migration script that includes automatic backups:

```bash
cd api/scripts

# Safe migration with automatic backup (recommended)
./safe-migrate.sh                  # Staging (default)
./safe-migrate.sh --env production  # Production (requires confirmation)

# Direct migrations (only for development)
cd backend
pnpm run db:migrate                  # Local only
pnpm run db:migrate:dev              # Development environment
pnpm run db:migrate:staging          # Staging environment
pnpm run db:migrate:production       # Production environment
```

**Backup Procedures**: See `api/scripts/BACKUP_README.md` for detailed backup and restore instructions.

**Lowercase Migration Status (2025-07-11)**:

- ✅ Staging: Complete (43 entries migrated)
- 🔄 Production: Ready (164 entries to migrate)
- **Critical Fix**: Migration 0007 includes `PRAGMA foreign_keys = OFF/ON` to prevent CASCADE deletes
- See `docs/LOWERCASE_MIGRATION.md` for details

## 🌐 Internationalization (i18n) & Localization (l10n)

### Supported Languages

- **English (en)** - Reference language
- **Spanish (es)**
- **French (fr)**
- **German (de)**
- **Traditional Chinese (zh-TW)**
- **Simplified Chinese (zh-CN)**

### i18n Commands

```bash
# Check translation completeness
pnpm run validate:i18n

# Sync missing keys from English reference
pnpm run sync:i18n

# Sync with alphabetical sorting
pnpm run i18n:fix

# Advanced options
pnpm run sync:i18n -- --dry-run         # Preview changes
pnpm run sync:i18n -- --remove-extra    # Remove non-reference keys
pnpm run sync:i18n -- --namespace auth  # Target specific namespace
```

### Translation Workflow

1. **Before adding new UI text**: Always use translation keys

   ```tsx
   // ❌ Bad
   <Button>Click me</Button>

   // ✅ Good
   <Button>{t('common:button.click')}</Button>
   ```

2. **After adding new keys**:

   ```bash
   # Add to English file first
   # Then sync to other languages
   pnpm run sync:i18n

   # Check completeness
   pnpm run validate:i18n
   ```

3. **Translation Structure**:
   ```
   src/locales/
   ├── en/          # Reference language
   │   ├── auth.json
   │   ├── common.json
   │   ├── errors.json
   │   ├── logbook.json
   │   ├── reports.json
   │   ├── scorebook.json
   │   └── toolbox.json
   ├── es/          # Spanish
   ├── fr/          # French
   ├── de/          # German
   ├── zh-TW/       # Traditional Chinese
   └── zh-CN/       # Simplified Chinese
   ```

### Key Guidelines

- **Namespace Usage**:
  - `common`: Shared UI elements, buttons, labels
  - `auth`: Authentication related
  - `errors`: Error messages
  - `logbook`: Practice log features
  - `reports`: Analytics and reporting
  - `scorebook`: Score/sheet music features
  - `toolbox`: Practice tools (metronome, etc.)

- **Key Naming**:

  ```json
  {
    "section": {
      "title": "Section Title",
      "button": {
        "save": "Save",
        "cancel": "Cancel"
      }
    }
  }
  ```

- **Interpolation**:
  ```json
  {
    "welcome": "Welcome, {{name}}!",
    "items_count": "{{count}} items"
  }
  ```

### Common Issues

1. **Missing keys in English**: Run `fix-english-reference.cjs` to identify and add
2. **Incomplete translations**: Look for `[NEEDS TRANSLATION]` markers
3. **Consistency**: Use validation tool to ensure all languages have same keys

### i18n Scripts

- `validate-translations.cjs`: Check completeness across all languages
- `sync-translations.cjs`: Synchronize missing keys
- `translate-missing.cjs`: Helper for bulk translations
- `fix-english-reference.cjs`: Fix incomplete English reference

See `frontendv2/docs/I18N_VALIDATION.md` for detailed documentation.

## 🧪 Testing Guidelines

### Test-Driven Development (TDD)

1. **Write the test first** - The test defines the expected behavior
2. **Run the test** - It should fail (red)
3. **Write minimal code** - Just enough to make the test pass (green)
4. **Refactor** - Improve the code while keeping tests passing

### Coverage Requirements

- **Overall**: Minimum 80% coverage
- **Critical Paths**: Minimum 90% coverage (auth, payments, core features)
- **New Code**: Must have tests before merging

### Running Tests

```bash
# Run all tests with coverage
pnpm run test:coverage

# Run specific workspace tests
pnpm test -w @mirubato/frontend
pnpm test -w @mirubato/backend

# Run specific test file
pnpm test -- src/utils/audioManager.test.ts

# Watch mode for development
pnpm test -- --watch
```

### Current Test Status (as of July 2025)

- **Frontend Coverage**: ~29% (Target: 80%)
  - ✅ AuthContext: 100%
  - ✅ notationRenderer: 100%
  - ✅ audioManager: 91.54%
  - ✅ Practice page: 91.66%
  - ✅ Auto-logging module: 100%
  - ✅ Repertoire components: Tests added and passing
  - ✅ All tests passing: 270+ unit tests, 65 E2E tests (including smoke tests)
- **Backend Coverage**: ~43% (Target: 80%)
  - ✅ practice resolver: 100%
  - ✅ sheetMusic resolver: 100%
  - ✅ auth service: 100%
  - ✅ repertoire endpoints: Full test coverage
  - ✅ goals endpoints: Full test coverage

## 📚 Key Documentation

- **Development**: `docs/DEVELOPMENT.md` (setup, development, deployment)
- **Infrastructure**: `docs/DESIGN.md`
- **Roadmap**: `docs/ROADMAP.md` (includes detailed test coverage status)
- **User Flows**: `docs/USER_FLOWS.md` (comprehensive user journey documentation)
- **Repertoire**: `docs/REPERTOIRE_GOALS_PLAN.md` (feature implementation details)

## 🎓 Educational Context

### Sight-Reading Method

- **Keep Going**: Don't stop for mistakes
- **Progressive**: Gradual difficulty increase
- **Instrument-Specific**: Respect guitar vs piano differences

### Content Licensing

- Educational content: CC BY 4.0 (attribute properly)
- Code: MIT License
- Music: Public domain from IMSLP

---

**Remember**: When in doubt, check the production endpoints first. They're your debugging lifeline.

# Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive
context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

## File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the
gemini command:

### Examples:

**Single file analysis:**
gemini -p "@src/main.py Explain this file's purpose and structure"

Multiple files:
gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"

Entire directory:
gemini -p "@src/ Summarize the architecture of this codebase"

Multiple directories:
gemini -p "@src/ @tests/ Analyze test coverage for the source code"

Current directory and subdirectories:
gemini -p "@./ Give me an overview of this entire project"

# Or use --all_files flag:

gemini --all_files -p "Analyze the project structure and dependencies"

Implementation Verification Examples

Check if a feature is implemented:
gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"

Verify authentication implementation:
gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"

Check for specific patterns:
gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"

Verify error handling:
gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"

Check for rate limiting:
gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"

Verify caching strategy:
gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"

Check for specific security measures:
gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"

Verify test coverage for features:
gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"

When to Use Gemini CLI

Use gemini -p when:

- Analyzing entire codebases or large directories
- Comparing multiple large files
- Need to understand project-wide patterns or architecture
- Current context window is insufficient for the task
- Working with files totaling more than 100KB
- Verifying if specific features, patterns, or security measures are implemented
- Checking for the presence of certain coding patterns across the entire codebase

Important Notes

- Paths in @ syntax are relative to your current working directory when invoking gemini
- The CLI will include file contents directly in the context
- No need for --yolo flag for read-only analysis
- Gemini's context window can handle entire codebases that would overflow Claude's context
- When checking implementations, be specific about what you're looking for to get accurate results
