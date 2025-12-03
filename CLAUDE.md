# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Mirubato Developer Guide

## Table of Contents

1. [Quick Start (5 minutes)](#quick-start)
2. [What is Mirubato?](#what-is-mirubato)
3. [Development Workflow](#development-workflow)
4. [Testing Guidelines](#testing-guidelines)
5. [Core Features](#core-features)
6. [UI Components](#ui-components)
7. [Internationalization](#internationalization)
8. [Quick Decision Trees](#quick-decision-trees)
9. [Additional Resources](#additional-resources)

---

## 1. Quick Start (5 minutes) {#quick-start}

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Cloudflare account (for deployment)

### First Time Setup

```bash
# Clone and install
git clone https://github.com/pezware/mirubato.git
cd mirubato
pnpm install

# Access the app
# Frontend: http://www-mirubato.localhost:4000
# API: http://api-mirubato.localhost:9797
# Scores: http://scores-mirubato.localhost:9788
# Dictionary: http://dictionary-mirubato.localhost:9799
```

### Most Common Commands

```bash
# Development
pnpm install                  # Install dependencies
pnpm test                     # Run all tests across workspaces
pnpm run build                # Build all services for production

# Individual services (debugging)
cd frontendv2 && pnpm run dev  # Frontend only
cd api && pnpm run dev         # API only
cd scores && pnpm run dev      # Scores service only
cd dictionary && pnpm run dev  # Dictionary service only
cd sync-worker && pnpm run dev # Sync service (if needed)

# Testing
pnpm test                     # All tests
pnpm run test:unit            # Unit tests only
pnpm run test:integration     # Integration tests only
pnpm run test:coverage        # Tests with coverage report
pnpm test -- src/specific.test.ts  # Single test file

# Linting & Type Checking
pnpm run lint                 # Lint all workspaces
pnpm run type-check           # TypeScript type checking
pnpm run format               # Format with Prettier

# Internationalization
cd frontendv2 && pnpm run sync:i18n     # Sync translations
cd frontendv2 && pnpm run validate:i18n # Validate completeness
cd frontendv2 && pnpm run i18n:fix      # Fix and sort keys

# Deployment
cd [service] && wrangler deploy --env staging  # Deploy to staging
cd [service] && wrangler deploy                # Deploy to production
```

### Key Principles - MUST READ

1. **Test First**: Write tests before implementation
2. **Use Component Library**: Never use native HTML elements - always import from `@/components/ui`
3. **Check Branch**: Never edit on main branch - create feature branches
4. **Run Hooks**: Never skip pre-commit hooks with `--no-verify` - they run linting and tests
5. **Use ast-grep**: For syntax-aware code searches
6. **Monorepo Structure**: Use workspace commands (`pnpm -r`) for cross-workspace operations
7. **TypeScript Strict**: No `any` types, always use proper typing
8. **Pre-commit Quality**: Husky runs lint-staged which lints and tests only changed files

---

## 2. What is Mirubato? {#what-is-mirubato}

Mirubato is a comprehensive music education platform designed to help musicians improve their sight-reading skills through:

- **Practice Logging**: Track practice sessions with detailed analytics
- **Sheet Music Library**: Browse, import, and organize sheet music
- **Goal Setting**: Create and track musical goals
- **Practice Tools**: Metronome, Circle of Fifths, practice counter

Built on Cloudflare's edge infrastructure for global performance and offline-first functionality.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network               │
│                    (300+ Global Locations)               │
└─────────────────────┬───────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────┬────────────┬────────────┬────────────┐
    │                 │             │            │            │            │
┌───▼──────────┐  ┌──▼──────────┐  ┌▼──────────┐ ┌▼──────────┐ ┌▼──────────┐
│  Frontend     │  │   API       │  │  Scores   │ │Dictionary │ │Sync Worker│
│  Worker       │  │   Worker    │  │  Worker   │ │  Worker   │ │  Worker   │
│ (React SPA)   │  │ (REST API)  │  │(PDF + AI) │ │(AI Terms) │ │(WebSocket)│
└───┬──────────┘  └──┬──────────┘  └─┬─────────┘ └─┬─────────┘ └─┬─────────┘
    │                 │               │             │             │
┌───▼──────────┐  ┌──▼──────────┐  ┌─▼─────────┐ ┌─▼─────────┐ ┌─▼─────────┐
│ Static Assets │  │ D1 Database │  │D1 + R2    │ │D1 + AI    │ │  Durable  │
│     (CDN)     │  │  KV Cache   │  │KV + Queue │ │Embeddings │ │  Objects  │
└───────────────┘  └──────────────┘  └───────────┘ └───────────┘ └───────────┘
```

For detailed architecture documentation, see:

- **[Architecture Overview](docs/specs/01-architecture/overview.md)**
- **[Cloudflare Services](docs/specs/01-architecture/cloudflare-services.md)**
- **[Deployment Guide](docs/specs/01-architecture/deployment.md)**

---

## 3. Development Workflow {#development-workflow}

### Before Starting Work - Checklist

- [ ] Pull latest from main: `git pull origin main`
- [ ] Create feature branch: `git checkout -b feature/your-feature`
- [ ] Install dependencies: `pnpm install`
- [ ] Start services: `./start-scorebook.sh`
- [ ] Check health endpoints

### Development Flow

```
1. Write Tests First (TDD)
   └── Create test file
   └── Write failing tests
   └── Implement feature
   └── Make tests pass

2. Development
   └── Use component library
   └── Follow TypeScript types
   └── No console.log
   └── No 'any' types

3. Before Commit
   └── Run tests: pnpm test
   └── Check types: pnpm run type-check
   └── Let hooks run (no --no-verify)
   └── Update docs if needed
```

### Local Development URLs

| Service    | URL                                       | Port | Health Check |
| ---------- | ----------------------------------------- | ---- | ------------ |
| Frontend   | http://www-mirubato.localhost:4000        | 4000 | N/A (SPA)    |
| API        | http://api-mirubato.localhost:9797        | 9797 | /health      |
| Scores     | http://scores-mirubato.localhost:9788     | 9788 | /health      |
| Dictionary | http://dictionary-mirubato.localhost:9799 | 9799 | /health      |

**Note**: The `./start-scorebook.sh` script automatically starts API and Scores services first, seeds test data, then starts the frontend.

---

## 4. Testing Guidelines {#testing-guidelines}

### Test-Driven Development (TDD)

```bash
# 1. Create test file first
touch src/components/MyComponent.test.tsx

# 2. Write tests that define behavior
# 3. Run tests (should fail)
pnpm test

# 4. Implement feature
# 5. Make tests pass
# 6. Check coverage
pnpm test -- --coverage
```

### Coverage Requirements

- **Minimum**: 80% overall coverage
- **Critical paths**: 90% (auth, payments)
- **New features**: Must have tests before merge

### Running Tests

```bash
# All tests across all workspaces
pnpm test

# Unit tests only (faster)
pnpm run test:unit

# Integration tests
pnpm run test:integration

# With coverage report
pnpm run test:coverage

# Specific workspace
cd frontendv2 && pnpm test
cd api && pnpm test

# Specific test file
cd frontendv2 && pnpm test -- src/utils/audioManager.test.ts

# E2E tests (Playwright)
cd frontendv2 && pnpm run test:e2e

# Watch mode for development
cd frontendv2 && pnpm test -- --watch

# Related tests only (lint-staged integration)
cd frontendv2 && vitest related --run --no-coverage --passWithNoTests
```

---

## 5. Core Features {#core-features}

### Logbook - Practice Tracking

- Manual entry and timer modes
- Real-time WebSocket sync across devices
- Calendar heatmap visualization
- Advanced filtering and analytics
- CSV/JSON export

### Scorebook - Sheet Music Library

- PDF and image upload
- AI metadata extraction
- Collections and organization
- Practice integration

### Repertoire & Goals System

- Status tracking: Planned → Learning → Working → Polished → Performance Ready
- Goal integration with specific pieces
- Practice history per piece
- Composer canonicalization

### Toolbox - Practice Tools

- Metronome with multiple patterns
- Interactive Circle of Fifths
- Visual practice counter

For detailed feature specifications, see **[Feature Specs](docs/specs/05-features/)**.

---

## 6. UI Components {#ui-components}

### Package Architecture (Updated v1.8.0)

Mirubato uses a two-layer UI component architecture:

```
packages/ui/                    # @mirubato/ui - Shared reusable components
├── src/components/             # Pure UI components (no business logic)
│   ├── Autocomplete.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   ├── Typography.tsx          # MusicTitle, MusicComposer, etc.
│   └── ...
├── src/utils/
│   ├── cn.ts                   # Tailwind class merging utility
│   ├── dateUtils.ts            # formatDuration, formatTimerDisplay, etc.
│   └── hooks.ts                # useModal, useModals, useFormValidation, useClickOutside
└── src/index.ts                # Barrel export

frontendv2/src/components/ui/   # App-specific components
├── index.ts                    # Re-exports @mirubato/ui + local components
├── EntryDetailPanel.tsx        # Has logbook business logic
├── CompactEntryRow.tsx         # Has logbook business logic
├── ToastProvider.tsx           # Has toast state management
├── ProtectedButton.tsx         # Has click protection hook
└── ProtectedButtonFactory.ts   # Button factory functions
```

### Import Guidelines

```tsx
// ✅ PREFERRED: Import from barrel export (for all shared components)
import { Button, Modal, Card, MusicTitle, Input } from '@/components/ui'
import type { ButtonProps, SelectOption } from '@/components/ui'

// ✅ OK: Direct import from @mirubato/ui (for packages/ui components only)
import { Button } from '@mirubato/ui'

// ❌ NEVER: Direct imports to deleted files
import Button from '@/components/ui/Button'  // File doesn't exist!

// ❌ NEVER: Native HTML elements
<button>Click me</button>
<input type="text" />

// ✅ ALWAYS: Use component library
<Button>Click me</Button>
<Input type="text" />
```

### Component Ownership Rules

| Location         | Contains                | Business Logic | Example                           |
| ---------------- | ----------------------- | -------------- | --------------------------------- |
| `@mirubato/ui`   | Pure UI components      | ❌ None        | Button, Card, Modal, Typography   |
| `@mirubato/ui`   | Generic hooks           | ❌ None        | useModal, useFormValidation       |
| `@mirubato/ui`   | Formatting utilities    | ❌ None        | formatDuration, cn                |
| `frontendv2/ui/` | App-specific components | ✅ Yes         | EntryDetailPanel, ProtectedButton |

**When creating new code, add to `@mirubato/ui` if:**

- Pure UI component with no business logic
- Generic hook (no stores, no app-specific imports)
- Utility function used in 2+ places
- Formatting function (dates, durations, numbers)

**Keep in `frontendv2` if:**

- Depends on stores (useAuthStore, useLogbookStore)
- Depends on app-specific hooks or context
- Uses i18n translations with app-specific keys
- Contains business logic specific to Mirubato

### Available Components

| Component                     | Package      | Variants                                | Usage                    |
| ----------------------------- | ------------ | --------------------------------------- | ------------------------ |
| Button                        | @mirubato/ui | primary, secondary, ghost, danger, icon | Actions, forms           |
| Modal, ModalBody, ModalFooter | @mirubato/ui | sm, md, lg, xl                          | Dialogs, forms           |
| Card, CardHeader, CardContent | @mirubato/ui | default, bordered, elevated             | Content containers       |
| Input, Textarea               | @mirubato/ui | text, email, password, number           | Form fields              |
| Select, MultiSelect           | @mirubato/ui | single, multi                           | Dropdowns                |
| Toast, ToastContainer         | @mirubato/ui | success, error, warning, info           | Notifications            |
| Loading, LoadingSkeleton      | @mirubato/ui | spinner, dots, pulse, skeleton          | Loading states           |
| MusicTitle, MusicComposer     | @mirubato/ui | -                                       | Music content typography |
| Autocomplete                  | @mirubato/ui | -                                       | Search with suggestions  |
| ProtectedButton               | frontendv2   | -                                       | Prevents double-clicks   |
| EntryDetailPanel              | frontendv2   | -                                       | Logbook entry details    |
| CompactEntryRow               | frontendv2   | -                                       | Compact entry display    |

### Shared Hooks & Utilities

| Export               | Type    | Usage                                   |
| -------------------- | ------- | --------------------------------------- |
| `useModal`           | Hook    | Single modal open/close state           |
| `useModals<T>`       | Hook    | Multiple named modals management        |
| `useFormValidation`  | Hook    | Zod schema validation with field errors |
| `useClickOutside`    | Hook    | Detect clicks outside element refs      |
| `formatDuration`     | Utility | Minutes → "Xh Ym" (e.g., 90 → "1h 30m") |
| `formatTimerDisplay` | Utility | Seconds → "H:MM:SS" or "M:SS"           |
| `formatTimerCompact` | Utility | Seconds → "Xh Ym" or "Xm" or "Xs"       |
| `cn`                 | Utility | Tailwind class merging (clsx + twMerge) |

```tsx
// ✅ Import hooks and utilities from @/components/ui
import { useModal, useFormValidation, formatDuration, cn } from '@/components/ui'

// ✅ Use useModal for simple modal state
const confirmModal = useModal()
<Button onClick={confirmModal.open}>Delete</Button>
<Modal isOpen={confirmModal.isOpen} onClose={confirmModal.close}>...</Modal>

// ✅ Use useFormValidation with Zod schemas
const { validate, errors, getFieldError } = useFormValidation({ schema: mySchema })
```

### Typography Design System (Updated v1.7.6)

**✅ FULLY IMPLEMENTED**: Comprehensive typography unification completed in v1.7.6 with centralized component system and ESLint enforcement.

Based on extensive research using Gemini AI for multilingual font selection, Mirubato uses a three-font system:

**Font Families**:

- **Noto Serif** (`font-serif`): Music piece titles and composers (excellent multilingual support for Latin, CJK characters)
- **Inter** (`font-inter`): UI elements, metadata, body text
- **Lexend** (`font-lexend`): Headers and section titles

**Implementation Strategy**:

```tsx
// ✅ ALWAYS use Typography components for music content
import { MusicTitle, MusicComposer, MusicMetadata } from '@/components/ui'

// Music content
<MusicTitle>{score.title}</MusicTitle>
<MusicComposer>{score.composer}</MusicComposer>
<MusicMetadata>Opus 1</MusicMetadata>

// General typography with semantic variants
<Typography variant="h1">Page Title</Typography>
<Typography variant="body">UI content</Typography>
```

**Typography Hierarchy**:

1. **Music Titles**: Noto Serif, `text-lg sm:text-xl font-medium` - Use `<MusicTitle>` component
2. **Music Composers**: Noto Serif, `text-base font-normal` - Use `<MusicComposer>` component
3. **Section Headers**: Lexend, `text-xl font-light` - Use `<Typography variant="h2">`
4. **UI Text**: Inter, `text-sm text-gray-600` - Use `<Typography variant="body">`
5. **Metadata**: Inter, `text-xs text-gray-500` - Use `<MusicMetadata>` component

**ESLint Integration**:

```javascript
// Custom rules prevent typography inconsistencies
'no-restricted-syntax': [
  'error',
  {
    selector: 'JSXAttribute[name.name="className"] Literal[value=/font-(sans|mono)\\b/]',
    message: 'Use font-inter for UI text, font-lexend for headers, or font-serif for music content instead of generic font classes.'
  }
]
```

### Chart.js Integration

```typescript
// Proper typing pattern
const chartData = useMemo<ChartData<'line'>>(
  () => ({
    labels: dates,
    datasets: [
      {
        label: 'Practice Time',
        data: values,
        borderColor: 'rgb(75, 192, 192)',
      },
    ],
  }),
  [dates, values]
)

// Never use 'any'
// ❌ const chartData: any = {...}
// ✅ const chartData: ChartData<'line'> = {...}
```

---

## 7. Internationalization {#internationalization}

### Supported Languages

- 🇺🇸 English (en) - Reference
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)
- 🇹🇼 Traditional Chinese (zh-TW)
- 🇨🇳 Simplified Chinese (zh-CN)

### Translation Workflow

```bash
# 1. Add English key first
# Edit: src/locales/en/common.json

# 2. Sync to other languages
pnpm run sync:i18n

# 3. Validate completeness
pnpm run validate:i18n

# 4. Fix and sort
pnpm run i18n:fix
```

### Usage in Code

```tsx
import { useTranslation } from 'react-i18next'

function Component() {
  const { t } = useTranslation('common')

  return <Button>{t('button.save')}</Button>
}
```

---

## 8. Quick Decision Trees {#quick-decision-trees}

### "Which command should I use?"

```
Need to...
├── Start development → ./start-scorebook.sh
├── Run tests → pnpm test
├── Deploy to staging → wrangler deploy --env staging
├── Deploy to production → wrangler deploy
├── Add translations → pnpm run sync:i18n
└── Debug issues → Check /health endpoints first
```

### "Where is the code for...?"

```
Feature location...
├── UI Components → frontendv2/src/components/
├── API Routes → api/src/api/routes.ts
├── Practice Logging → frontendv2/src/components/logbook/
├── Sheet Music → scores/src/
├── Translations → frontendv2/src/locales/
└── Tests → [feature]/__tests__/ or [feature].test.ts
```

### "Which Cloudflare service for...?"

```
Need to store...
├── User data/metadata → D1 (SQL database)
├── Files (PDFs, images) → R2 (object storage)
├── Session/cache data → KV (key-value store)
├── Temporary data → TransformStream in memory
├── Configuration → Environment variables or KV
└── Logs/metrics → Analytics Engine

Need to process...
├── Async/background tasks → Queues
├── AI/ML operations → Workers AI
├── PDF rendering → Browser Rendering API
├── Real-time data → WebSockets (Durable Objects)
├── Scheduled tasks → Cron Triggers
└── Image manipulation → Image Resizing API
```

### "How to debug Cloudflare issues?"

```
Issue type...
├── 500 errors → wrangler tail --env production
├── Performance → Check CPU time in logs
├── Database → wrangler d1 execute --command "EXPLAIN QUERY PLAN..."
├── Cache issues → Check KV TTL and Cache-Control headers
├── Deploy failed → Check bundle size and script limits
└── Auth issues → Verify JWT secret in environment
```

---

## 9. Additional Resources {#additional-resources}

- **Technical Specs**: See `docs/specs/` folder for comprehensive documentation
- **Roadmap**: `docs/specs/08-appendix/roadmap.md`
- **Architecture**: `docs/specs/01-architecture/overview.md`
- **Debug Guide**: `docs/DEBUG.md`

## Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI:

```bash
# Analyze entire codebase
gemini -p "@./ Give me an overview of this project"

# Check implementation across specific workspaces
gemini -p "@frontendv2/src/ @api/src/ Has authentication been implemented?"

# Verify patterns in frontend
gemini -p "@frontendv2/src/ List all React hooks that handle WebSocket connections"

# Check Cloudflare Workers patterns
gemini -p "@api/src/ @scores/src/ @dictionary/src/ Show all Hono route handlers"

# Analyze test coverage
gemini -p "@frontendv2/src/ @*/src/**/*.test.* What components lack test coverage?"
```

## Workspace Structure

Mirubato uses pnpm workspaces with the following structure:

```
mirubato/
├── packages/
│   └── ui/              # @mirubato/ui - Shared UI Component Library
├── frontendv2/          # React SPA (Vite + TypeScript)
├── api/                 # Main API Worker (Hono + D1)
├── scores/              # Sheet Music Worker (PDF + AI)
├── dictionary/          # Music Terms Worker (AI + KV)
├── sync-worker/         # Real-time Sync Worker (WebSockets + D1)
└── package.json         # Root workspace configuration
```

**Workspace Commands**:

```bash
pnpm -r run build        # Run build in all workspaces
pnpm -r run test         # Run tests in all workspaces
pnpm --filter @mirubato/frontendv2 run dev  # Run specific workspace
pnpm --filter @mirubato/ui run build        # Build UI package only
```

## Debugging UI Component Issues

### Efficient Component Location Strategy

When trying to locate specific UI components (especially when multiple similar components exist):

#### 1. Start with the Route/Page Structure

```bash
# Find the page component for a specific route
grep -r "tab=repertoire" --include="*.tsx"
# Or check the routing configuration
grep -r "path.*logbook" frontendv2/src
```

#### 2. Follow the Component Hierarchy

```bash
# Trace from parent to child components
# Example: Logbook → EnhancedReports → RepertoireView → FocusedRepertoireItem
grep -r "EnhancedReports" --include="*.tsx"
grep -r "RepertoireView" --include="*.tsx"
```

#### 3. Identify View Modes

Many components have different display modes (list/grid/calendar). Check for:

```typescript
viewMode === 'list' ? <FocusedRepertoireItem /> : <RepertoireCard />
```

#### 4. Search for Visual Patterns

If you see specific text patterns in the UI (e.g., "Composer - Title"):

```bash
# Search for concatenation patterns
grep -r "scoreComposer.*-.*scoreTitle" --include="*.tsx"
grep -r '\${.*composer.*}.*-.*\${.*title' --include="*.tsx"
ast-grep --pattern '$COMPOSER - $TITLE' --lang typescript
```

#### 5. Use Component Names Effectively

When multiple components serve similar purposes:

- `RepertoireCard` - Grid view display
- `FocusedRepertoireItem` - List view display
- `PieceDetailView` - Detailed view
- `CompactEntryRow` - Compact display in entries

### Common Pitfalls to Avoid

1. **Don't assume based on URL parameters** - A URL with `pieceId` doesn't necessarily mean you're in detail view
2. **Check for responsive variations** - Same component might render differently on mobile vs desktop
3. **Verify component reuse** - Same component might be used in multiple places with different props
4. **Don't skip the parent component** - Always trace from the page component down

### Quick Debugging Commands

```bash
# Find all components rendering a specific prop
ast-grep --pattern 'scoreTitle' --lang typescript frontendv2/src

# Find component usage across codebase
grep -r "<FocusedRepertoireItem\|<RepertoireCard\|<PieceDetailView" --include="*.tsx"

# Check what renders based on conditions
grep -r "viewMode.*===.*list" --include="*.tsx" -A 5 -B 2

# Find Typography component usage
grep -r "MusicTitle\|MusicComposer" --include="*.tsx"
```

### Browser DevTools Integration

When available, ask to check:

- React DevTools to see component hierarchy
- Inspect element to see actual rendered HTML classes
- Network tab to verify which API endpoints are being called

### Systematic Approach Checklist

- [ ] Identify the route/URL pattern
- [ ] Find the page component
- [ ] Trace component hierarchy
- [ ] Check for view modes/conditions
- [ ] Search for visual text patterns
- [ ] Verify in browser DevTools if needed

**Remember**: When in doubt, check the production endpoints first. They're your debugging lifeline.

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.

      IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.
