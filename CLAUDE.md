# Mirubato Developer Guide

## Table of Contents

1. [Quick Start (5 minutes)](#quick-start)
2. [What is Mirubato?](#what-is-mirubato)
3. [Architecture Overview](#architecture-overview)
4. [Development Workflow](#development-workflow)
5. [Testing Guidelines](#testing-guidelines)
6. [Deployment](#deployment)
7. [Core Features](#core-features)
8. [UI Components](#ui-components)
9. [API Reference](#api-reference)
10. [Internationalization](#internationalization)
11. [Troubleshooting](#troubleshooting)
12. [Educational Context](#educational-context)
13. [Version History](#version-history)

---

## 1. Quick Start (5 minutes) {#quick-start}

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Cloudflare account (for deployment)

### First Time Setup

```bash
# Clone and install
git clone https://github.com/mirubato/mirubato.git
cd mirubato
pnpm install

# Start all services
./start-scorebook.sh

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
./start-scorebook.sh          # Start all services
pnpm test                     # Run tests
pnpm run build                # Build for production

# Individual services (debugging)
cd frontendv2 && pnpm run dev # Frontend only
cd api && pnpm run dev        # API only

# Deployment
cd [service] && wrangler deploy --env staging  # Deploy to staging
cd [service] && wrangler deploy                # Deploy to production
```

### Key Principles - MUST READ

1. **Test First**: Write tests before implementation
2. **Use Component Library**: Never use native HTML elements
3. **Check Branch**: Never edit on main branch
4. **Run Hooks**: Never skip pre-commit hooks with `--no-verify`
5. **Use ast-grep**: For syntax-aware code searches

---

## 2. What is Mirubato? {#what-is-mirubato}

Mirubato is a comprehensive music education platform designed to help musicians improve their sight-reading skills through:

- **Practice Logging**: Track practice sessions with detailed analytics
- **Sheet Music Library**: Browse, import, and organize sheet music
- **Goal Setting**: Create and track musical goals
- **Practice Tools**: Metronome, Circle of Fifths, practice counter

Built on Cloudflare's edge infrastructure for global performance and offline-first functionality.

---

## 3. Architecture Overview {#architecture-overview}

### Service Architecture

```
┌─────────────────────────────────────────────────┐
│              Frontend (React + TypeScript)       │
│                 mirubato.com                     │
└─────────────────┬───────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬────────────┐
    │             │             │            │
┌───▼──────┐  ┌──▼──────┐  ┌──▼──────┐  ┌──▼──────┐
│   API     │  │ Scores  │  │Dictionary│  │ Future  │
│  Service  │  │ Service │  │ Service  │  │Services │
└───┬──────┘  └──┬──────┘  └──┬──────┘  └──┬──────┘
    │            │            │            │
┌───▼──────┐  ┌──▼──────┐  ┌──▼──────┐  ┌──▼──────┐
│ D1 (SQL)  │  │D1 + R2  │  │   D1    │  │   D1    │
└───────────┘  └─────────┘  └─────────┘  └─────────┘
```

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand
- **Backend**: Cloudflare Workers, Hono, D1 (SQLite), R2 (storage)
- **Auth**: JWT + Magic Links + Google OAuth
- **Music**: VexFlow.js (notation), Tone.js (audio)
- **Testing**: Vitest, Playwright

### Project Structure

```
mirubato/
├── frontendv2/        # React app → Cloudflare Worker
├── api/               # REST API → Cloudflare Worker
├── scores/            # Scores service → Cloudflare Worker
├── dictionary/        # Dictionary service → Cloudflare Worker
├── service-template/  # Template for new microservices
└── docs/              # Documentation
```

---

## 4. Development Workflow {#development-workflow}

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

| Service    | URL                                       | Port |
| ---------- | ----------------------------------------- | ---- |
| Frontend   | http://www-mirubato.localhost:4000        | 4000 |
| API        | http://api-mirubato.localhost:9797        | 9797 |
| Scores     | http://scores-mirubato.localhost:9788     | 9788 |
| Dictionary | http://dictionary-mirubato.localhost:9799 | 9799 |

---

## 5. Testing Guidelines {#testing-guidelines}

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
# All tests
pnpm test

# With coverage
pnpm run test:coverage

# Specific file
pnpm test -- src/utils/audioManager.test.ts

# E2E tests
pnpm run test:e2e

# Watch mode
pnpm test -- --watch
```

---

## 6. Deployment {#deployment}

### Deployment Flow

```
Feature Branch → PR → Staging → Production
     │            │        │          │
     └── Dev      └── Auto └── Auto   └── Auto
                     Deploy    Deploy     Deploy
```

### Deployment Commands

```bash
# Staging deployment (automatic on PR)
cd [service] && wrangler deploy --env staging

# Production deployment (automatic on merge to main)
cd [service] && wrangler deploy

# Manual deployment example
cd frontendv2 && wrangler deploy --env staging
cd api && wrangler deploy --env staging
```

### Database Migrations

```bash
# Safe migration with backup (recommended)
cd api/scripts
./safe-migrate.sh                   # Staging
./safe-migrate.sh --env production  # Production

# Direct migration (dev only)
cd api
pnpm run db:migrate:staging
pnpm run db:migrate:production
```

### Environment URLs

| Environment | Frontend URL                       | API URL                            |
| ----------- | ---------------------------------- | ---------------------------------- |
| Local       | http://www-mirubato.localhost:4000 | http://api-mirubato.localhost:9797 |
| Staging     | https://staging.mirubato.com       | https://api-staging.mirubato.com   |
| Production  | https://mirubato.com               | https://api.mirubato.com           |

---

## 7. Core Features {#core-features}

### Logbook - Practice Tracking

- Manual entry and timer modes
- Calendar heatmap visualization
- Advanced filtering and analytics
- CSV/JSON export
- Auto-logging integration

### Scorebook - Sheet Music Library

- PDF and image upload
- AI metadata extraction
- Collections and organization
- Practice integration
- Public/private libraries

### Repertoire & Goals System

Track musical progress with:

- **Status tracking**: Planned → Learning → Working → Polished → Performance Ready
- **Goal integration**: Link goals to specific pieces
- **Practice history**: View all sessions per piece
- **Auto-prompt**: Add pieces after practice

### Toolbox - Practice Tools

- **Metronome**: Multiple patterns, auto-logging
- **Circle of Fifths**: Interactive theory tool
- **Practice Counter**: Visual repetition tracking

---

## 8. UI Components {#ui-components}

### Component Library Usage

```tsx
// ❌ NEVER do this
;<button>Click me</button>

// ✅ ALWAYS do this
import { Button } from '@/components/ui'
;<Button>Click me</Button>
```

### Available Components

| Component | Variants                                | Usage              |
| --------- | --------------------------------------- | ------------------ |
| Button    | primary, secondary, ghost, danger, icon | Actions, forms     |
| Modal     | sm, md, lg, xl                          | Dialogs, forms     |
| Card      | default, bordered, elevated, ghost      | Content containers |
| Input     | text, email, password, number           | Form fields        |
| Select    | single, multi                           | Dropdowns          |
| Toast     | success, error, warning, info           | Notifications      |
| Loading   | spinner, dots, pulse, skeleton          | Loading states     |

### Typography Design System

Based on extensive research using Gemini AI for multilingual font selection, Mirubato uses:

**Font Families**:

- **Noto Serif**: Music piece titles and composers (excellent multilingual support for Latin, CJK characters)
- **Inter**: UI elements, metadata, body text
- **Lexend**: Headers and section titles

**Typography Hierarchy**:

1. **Title**: Noto Serif, 18-20px, font-medium to font-semibold
2. **Composer**: Noto Serif, 16px, font-normal, slightly muted color
3. **Metadata**: Inter, 12-14px, text-gray-600
4. **Actions**: Inter, 14px

**Design Rationale**:

- Noto Serif provides academic/classical feel appropriate for music education
- Creates visual contrast between content (serif) and UI (sans-serif)
- Aligns with Morandi aesthetic - sophisticated without being flashy
- Ensures readability across all supported languages

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

## 9. API Reference {#api-reference}

### REST Endpoints

```typescript
// Authentication
POST   /api/auth/google      // Google OAuth
POST   /api/auth/magic-link  // Send magic link
GET    /api/auth/verify      // Verify magic link

// Logbook
GET    /api/logbook          // Get entries
POST   /api/logbook          // Create entry
PUT    /api/logbook/:id      // Update entry
DELETE /api/logbook/:id      // Delete entry

// Repertoire
GET    /api/repertoire       // Get repertoire
POST   /api/repertoire       // Add to repertoire
PUT    /api/repertoire/:id   // Update status

// Goals
GET    /api/goals            // Get goals
POST   /api/goals            // Create goal
PUT    /api/goals/:id        // Update progress
```

### Health Endpoints

- `/health` - Comprehensive health check
- `/livez` - Liveness probe
- `/readyz` - Readiness probe
- `/metrics` - Prometheus metrics

---

## 10. Internationalization {#internationalization}

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

## 11. Troubleshooting {#troubleshooting}

### Quick Debug Checklist

1. Check health endpoints
2. Verify authentication
3. Check browser console
4. Review network tab
5. Check service logs

### Common Issues & Solutions

| Problem                              | Solution                            | Reference            |
| ------------------------------------ | ----------------------------------- | -------------------- |
| VexFlow "Too Many Ticks"             | Simplify to melody-only             | DEBUG.md #1          |
| API 500 errors                       | Check auth token                    | DEBUG.md #2          |
| Chart.js "controller not registered" | Import chartSetup.ts in main.tsx    | See Chart.js section |
| Mobile audio not working             | Call `Tone.start()` on user gesture | DEBUG.md #6          |
| Type misalignment                    | Run `pnpm run type-check`           | DEBUG.md #1          |

### Useful Debug Commands

```bash
# Check TypeScript errors
pnpm run type-check

# Find console.log statements
grep -r "console.log" src/

# Check bundle size
cd frontendv2 && pnpm run build -- --analyze

# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Production URLs for Debugging

- Frontend: https://mirubato.com
- API Health: https://api.mirubato.com/health
- API Docs: https://api.mirubato.com/docs
- Scores Health: https://scores.mirubato.com/health

---

## 12. Educational Context {#educational-context}

### Sight-Reading Method

- **Keep Going**: Don't stop for mistakes
- **Progressive**: Gradual difficulty increase
- **Instrument-Specific**: Respect guitar vs piano differences

### Content Licensing

- Educational content: CC BY 4.0 (attribute properly)
- Code: MIT License
- Music: Public domain from IMSLP

---

## 13. Version History {#version-history}

### Current Version: 1.7.0 (July 2025)

#### Focused UI Design System (PR #261)

- New layout: Desktop sidebar + mobile bottom tabs
- Simplified navigation: 6 → 4 sections
- Practice timer feature
- Enhanced repertoire timeline
- Complete i18n (200+ translations fixed)

#### Mobile UI Improvements (PR #357)

- **Typography Enhancement**: Added Noto Serif font for better multilingual support
- **Vertical Layout**: Optimized for small screens (iPhone SE and up)
- **Expandable Details**: View-only mode with Eye icon for full entry details
- **Day Separators**: Clear visual distinction between practice days
- **Icon Consistency**: Replaced emojis with Tabler Icons throughout
- **Touch Targets**: Improved to 44x44px for better accessibility

#### Security & Infrastructure

- Fixed tar-fs, ws, esbuild vulnerabilities
- All services unified at v1.7.0
- Migrated from npm to pnpm
- @cloudflare/puppeteer downgraded to 0.0.11

[Previous versions moved to CHANGELOG.md]

---

## Quick Decision Trees

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
├── UI Components → frontendv2/src/components/ui/
├── API Routes → api/src/api/routes.ts
├── Practice Logging → frontendv2/src/components/logbook/
├── Sheet Music → scores/src/
├── Translations → frontendv2/src/locales/
└── Tests → [feature]/__tests__/ or [feature].test.ts
```

---

## Additional Resources

- **Detailed Docs**: See `/docs` folder
- **Roadmap**: `docs/ROADMAP.md`
- **Architecture**: `docs/DESIGN.md`
- **Debug Guide**: `docs/DEBUG.md`
- **User Flows**: `docs/USER_FLOWS.md`

## Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI:

```bash
# Analyze entire codebase
gemini -p "@./ Give me an overview of this project"

# Check implementation
gemini -p "@src/ @lib/ Has dark mode been implemented?"

# Verify patterns
gemini -p "@src/ List all React hooks that handle WebSocket connections"
```

**Remember**: When in doubt, check the production endpoints first. They're your debugging lifeline.
