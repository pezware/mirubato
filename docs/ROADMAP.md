# Mirubato Development Roadmap

## Current Status - Version 1.3.0 (July 2025)

### 🎉 Frontend Polish & Component Library Complete

✅ **Version 1.3.0 Released**: Comprehensive UI component library and design system

- Unified UI component library with 8+ reusable components
- Design system with consistent spacing, typography, and colors
- Refactored 43+ components to use new Button component
- Mobile navigation improvements (preserved from PR #201)
- Accessibility improvements with @headlessui/react
- Component documentation and unified styling guide
- Deleted obsolete LogbookReports.tsx (11KB)

### 🎉 Scorebook Phase 5.5 Complete - Image Upload Support

✅ **Version 1.2.0 Released**: Personal score collections with image upload support

- Image upload support for sheet music (PNG, JPG, JPEG) complete
- Multi-page image support for photographed scores
- AI-powered metadata extraction using Cloudflare AI (primary) and Gemini (fallback)
- Fixed PDF viewer infinite loops and performance issues
- Enhanced "My Scores" section for authenticated users
- All MVP features from v1.1.0 maintained and stable
- Production deployment at mirubato.com with new scorebook features

✅ **REST API Migration Complete**: Full transition from GraphQL to REST API architecture

- GraphQL backend service completely removed
- Frontend fully migrated to REST API endpoints
- All data successfully migrated (80+ logbook entries, 3+ users)
- API documentation available at api.mirubato.com/docs
- No GraphQL dependencies remain in the codebase

✅ **Cloudflare Edge Infrastructure Complete**: Comprehensive caching and monitoring implementation

- Edge caching strategy implemented across all services
- Health monitoring endpoints with JWT validation and smoke tests
- Frontend bundle optimized with code splitting (43% initial load reduction)
- Prometheus-compatible metrics endpoints for observability
- E2E tests fixed for new autocomplete components

✅ **Core Features Implemented**:

**Logbook & Practice Tracking (v1.1.0)**:

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

**Scorebook Features (v1.2.0)**:

- PDF viewing with custom PDF.js implementation
- AI-powered import API with metadata extraction
- Cloudflare AI integration (25x cheaper than Gemini)
- Image upload support for paper scores
- Multi-page image handling
- "My Scores" section for personal library
- Enhanced slug generation preventing duplicates
- Rate limiting with progressive failure tracking

## Latest Updates: Scorebook-Logbook Integration (July 2025)

### 🎉 Integration Phase Complete

✅ **Scorebook and Logbook Integration**: Seamless practice tracking across features

- Click-to-score navigation from logbook entries
- Unified search across logs and scores
- Automatic practice tracking with start/stop controls in score viewer
- Practice state protection when closing scores
- Missing score handling for external/manual scores
- Support for non-authenticated users using local storage

**Technical Implementation**:

- Created practiceStore for managing active sessions
- Added score fields to LogbookEntry interface
- Implemented UnifiedSearch component with keyboard navigation
- Created MissingScorePrompt for scores without files
- All features work offline with local storage

## Immediate Priority: E2E Test Fixes & Localization (1-2 days)

### Goal: Fix failing smoke tests and complete internationalization

**Test Fixes**

- [ ] Fix logbook search test waiting for composer filter
- [ ] Update test selectors for new unified search
- [ ] Ensure all smoke tests pass consistently

**Localization**

- [ ] Complete translations for all 6 languages (de, es, fr, zh-CN, zh-TW)
- [ ] Add new keys: searchScoresAndLogs, viewScore, linkedScore, autoTracked
- [ ] Add missing score and upload translations
- [ ] Verify all languages have complete coverage

## Next Phase: Analytics Dashboard (2 weeks)

### Goal: Provide insights into practice patterns and progress

**Practice Analytics**

- [ ] Practice history per score
- [ ] Progress visualization over time
- [ ] Practice streaks and consistency tracking
- [ ] Time distribution by piece/composer
- [ ] Export analytics data

**Smart Collections**

- [ ] Auto-create "Recently Practiced" collection
- [ ] "Most Practiced" collection
- [ ] Time-based collections (This Week, This Month)
- [ ] Practice goal collections

## Priority 1: Frontend Polish & UX ✅ PARTIALLY COMPLETE (PR #206)

### Goal: Improve user experience and visual design

**Auto-Collapse Cards & Better Mobile UX**

- [ ] Implement auto-collapsing cards for logbook entries
- [ ] Add swipe gestures for mobile interactions
- [ ] Improve touch targets and spacing on mobile
- [x] Add loading states and skeleton screens (LoadingSkeleton component)
- [x] Implement responsive design improvements (mobile navigation from PR #201)

**Unified Button Design System** ✅ COMPLETE

- [x] Create consistent button component library
- [x] Standardize colors, sizes, and interactions
- [x] Add hover/focus/active states
- [x] Implement accessible button patterns
- [x] Update all existing buttons to use new system (43 components updated)

**Better Visual Hierarchy & Spacing** ✅ MOSTLY COMPLETE

- [x] Review and improve typography scale (design-system.ts)
- [x] Standardize spacing system (padding, margins)
- [x] Improve color contrast for accessibility
- [x] Add subtle animations and transitions
- [ ] Implement dark mode support (prepared but not implemented)

**UI Component Library** ✅ COMPLETE

- [x] Button component with 5 variants and icon support
- [x] Modal component with @headlessui/react
- [x] Card component with multiple variants
- [x] Loading components (spinner, dots, pulse, skeleton)
- [x] Input and Textarea with consistent styling
- [x] Select and MultiSelect components
- [x] Toast notification system
- [x] Design system constants file
- [x] Component library documentation

**Expected Outcome**: More polished, professional-looking application with better mobile experience. ✅ ACHIEVED

## Priority 1.5: Theme System Implementation (1 week)

### Goal: Implement proper dark/light/system theme switcher

**Current Status**

- App currently forced to light theme via CSS override
- UI components have dark mode classes but no control mechanism
- System preference detection causes inconsistent behavior

**Implementation Plan**

- [ ] Configure Tailwind for manual dark mode control (`darkMode: 'class'`)
- [ ] Create theme store using Zustand with persistence
- [ ] Add theme switcher UI component in header
- [ ] Support three modes: Light, Dark, System (auto)
- [ ] Remove CSS override forcing light theme
- [ ] Ensure all UI components respect theme preference
- [ ] Add smooth theme transition animations
- [ ] Test across all pages and modals

**Technical Details**

```typescript
// Theme store structure
interface ThemeStore {
  theme: 'light' | 'dark' | 'system'
  effectiveTheme: 'light' | 'dark' // Computed based on system preference
  setTheme: (theme: Theme) => void
}
```

**Expected Outcome**: Users can choose their preferred theme, improving accessibility and user satisfaction.

## Priority 2: E2E Testing with Playwright (2-3 weeks)

### Goal: Comprehensive automated testing coverage

**Fix Current Timeout Issues**

- [x] Investigate and fix current E2E test timeouts
- [x] Optimize test performance and reliability
- [x] Add proper wait conditions and assertions
- [ ] Implement test data setup/teardown

**Comprehensive User Journey Testing**

- [ ] Auth flow: Google login, logout, session persistence
- [ ] Logbook: Create, edit, delete, search entries
- [ ] Goals: Create, link to entries, track progress
- [ ] Sync: Online/offline scenarios, conflict resolution
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

**Visual Regression Testing**

- [ ] Set up Playwright visual comparisons
- [ ] Create baseline screenshots for key pages
- [ ] Add visual regression tests to CI/CD
- [ ] Test responsive layouts across devices

**Automated Deployment Testing**

- [ ] Test staging deployments automatically
- [ ] Verify production health after deployments
- [ ] Add rollback procedures for failed deployments

**Expected Outcome**: Robust testing suite preventing regressions and ensuring quality.

## Priority 3: Code Quality & Documentation (2-3 weeks)

### Goal: Improve maintainability and developer experience

**Clean Up Test Structure**

- [ ] Organize test files into logical groups
- [ ] Remove duplicated test setup code
- [ ] Add missing test coverage for edge cases
- [ ] Improve test descriptions and readability
- [ ] Add performance testing for critical paths

**Add TSDoc Comments for API Documentation**

- [ ] Document all public API functions with TSDoc
- [ ] Add parameter descriptions and examples
- [ ] Document return types and error conditions
- [ ] Generate API docs from code comments

**Improve https://api.mirubato.com/docs Coverage**

- [ ] Add comprehensive endpoint examples
- [ ] Document authentication flows
- [ ] Add error response documentation
- [ ] Include rate limiting information
- [ ] Add postman/curl examples

**Improve https://scores.mirubato.com/docs Coverage**

- [ ] Document sheet music data formats
- [ ] Add content management guides
- [ ] Document integration patterns
- [ ] Add filtering and search examples

**Expected Outcome**: Well-documented, maintainable codebase with excellent developer experience.

## Priority 4: New Features (6-8 weeks)

### Goal: Expand platform capabilities with new core features

**Scorebook: Sheet Music Library Management** ✅ PARTIALLY COMPLETE

- [x] Design scorebook data model and API
- [x] Implement sheet music upload and storage (PDF and images)
- [x] Add metadata extraction (AI-powered with Cloudflare/Gemini)
- [x] Create browsing and search interface
- [ ] Integrate with practice sessions (in progress)
- [ ] Add favorites and collections (user collections in development)
- [ ] Implement sharing and collaboration features

**Gradebook: Progress Tracking and Assessments**

- [ ] Design progress tracking system
- [ ] Add skill assessment framework
- [ ] Create progress visualization charts
- [ ] Implement milestone tracking
- [ ] Add teacher/student role management
- [ ] Create progress reports and exports
- [ ] Integrate with logbook data

**Goalbook: Practice Goal Setting and Tracking**

- [ ] Enhanced goal creation interface
- [ ] Add SMART goal templates
- [ ] Implement goal progress tracking
- [ ] Create goal achievement rewards
- [ ] Add goal sharing and accountability
- [ ] Implement goal analytics and insights
- [ ] Add goal deadline notifications

**Expected Outcome**: Comprehensive music education platform with integrated practice, progress, and content management.

## Microservices Architecture (Foundation for Future Features)

### Goal: Build a scalable, decoupled architecture to support the platform's evolution

**Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React)                             │
├─────────────────┬─────────────────┬─────────────────┬──────────────────┤
│   Scorebook UI  │   Goalbook UI   │  Gradebook UI  │ Presentation UI   │
└────────┬────────┴────────┬────────┴────────┬────────┴────────┬─────────┘
         │                 │                 │                 │
         ▼                 ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌────────────┐
│  Scores Worker  │ │  Goals Worker   │ │  Grades Worker  │ │Performance │
│  (Existing)     │ │  (New)          │ │  (New)          │ │  Worker    │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘ └─────┬──────┘
         │                   │                   │                   │
         └───────────────────┴───────────────────┴───────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          │ Shared Services   │
                          ├─────────────────┬─┴────────────────┐
                          │ Practice Worker │ Analytics Worker  │
                          └─────────────────┴──────────────────┘
```

**Phase 1: Enhance Scores Worker (Existing)**

- [ ] Add curated collections by instrument/level
- [ ] Implement teacher-approved content flagging
- [ ] Add difficulty analysis & auto-tagging
- [ ] Support reading position tracking (measures/sections)
- [ ] Enable PDF annotation support for teacher notes

**Phase 2: Goals Worker (New - Core Value)**

- [ ] Design personalized learning path system
- [ ] Support both human teacher and LLM-created goals
- [ ] Implement adaptive difficulty progression
- [ ] Create practice material sequencing
- [ ] Add milestone tracking and adjustments

Key Features:

- Goal creation by teachers or AI
- Automatic material selection from scores
- Progress-based difficulty adjustment
- Integration with practice sessions

**Phase 3: Practice Worker (New - Shared Service)**

- [ ] Build real-time practice session tracking
- [ ] Implement performance metrics collection
- [ ] Add audio recording capabilities
- [ ] Create auto-detection for trouble spots
- [ ] Support practice loops and metronome

Key Features:

- Session recording and playback
- Real-time performance analysis
- Integration with goals for progress tracking
- Detailed practice analytics

**Phase 4: Grades Worker (New)**

- [ ] Design assessment & feedback system
- [ ] Support human teacher grading
- [ ] Implement LLM-based auto-grading
- [ ] Create feedback generation system
- [ ] Add goal adjustment triggers

Key Features:

- Multi-criteria assessment (rhythm, pitch, dynamics)
- Automated performance analysis
- Constructive feedback generation
- Integration with goals for adaptive learning

**Phase 5: Analytics Worker (New - Shared Service)**

- [ ] Build cross-service analytics engine
- [ ] Track practice patterns and trends
- [ ] Measure skill improvement over time
- [ ] Optimize difficulty curves
- [ ] Generate insights for teachers and students

Key Features:

- Student progress dashboards
- Teacher effectiveness metrics
- LLM teaching performance analysis
- Predictive analytics for goal setting

**Phase 6: Performance Worker (Future)**

- [ ] Create performance recording system
- [ ] Build public/private sharing features
- [ ] Implement performance portfolios
- [ ] Add peer feedback mechanisms
- [ ] Design virtual recital rooms

**Key Design Principles**

1. **Loose Coupling**: Each worker operates independently with clear APIs
2. **Event-Driven**: Workers communicate through events (e.g., practice completed → trigger grading)
3. **LLM-Ready**: Clear interfaces supporting both human and AI teachers/graders
4. **Progressive Enhancement**: Start with Scorebook, incrementally add features
5. **Student-Centric**: All data models focus on student progress and learning
6. **Performance First**: Analytics and optimization built in from the start

**Data Flow Examples**

Teacher Creates Goal:

```
Teacher → Goals Worker → Creates goal with specific scores/sections
        → Analytics Worker → Suggests difficulty based on student history
        → Scores Worker → Links curated materials
```

Student Practice Session:

```
Student → Practice Worker → Records session data
        → Analytics Worker → Real-time performance analysis
        → Goals Worker → Checks progress against milestones
```

Automated Grading:

```
Practice Complete → Grades Worker → LLM analyzes performance
                  → Goals Worker → Adjusts difficulty/materials
                  → Student → Receives new practice plan
```

**Implementation Timeline**

- **Q1-Q2 2025**: ✅ Enhanced Scores Worker with AI metadata extraction
- **Q3 2025**: Complete user collections and practice integration
- **Q4 2025**: Build Goals & Practice Workers (core value proposition)
- **Q1 2026**: Add Grades Worker with LLM integration
- **Q2 2026**: Analytics Worker for comprehensive insights
- **2026+**: Performance Worker for presentations and recitals

**Expected Outcome**: A modular, scalable platform that can evolve from simple score storage to a comprehensive AI-enhanced music education system.

## Internationalization (i18n) & Localization (l10n) ✅ COMPLETE

### Status: Fully implemented with 6 languages

**Supported Languages**

- 🇺🇸 English (en) - Base language ✅
- 🇪🇸 Spanish (es) - Large music education market ✅
- 🇫🇷 French (fr) - Strong classical music tradition ✅
- 🇩🇪 German (de) - Classical music heritage ✅
- 🇯🇵 Japanese (ja) - Growing market ✅
- 🇨🇳 Chinese (zh) - Large user base ✅

**Implementation Details**

- ✅ **react-i18next** configured with lazy loading
- ✅ **Translation structure** organized by feature namespaces
- ✅ **Language detection** from browser preferences
- ✅ **Language switcher** in UI header
- ✅ **Date/time formatting** with locale support
- ✅ **Number formatting** for durations and statistics

**Current Status**

The i18n implementation is complete and working in production. All UI strings have been extracted and translated into the 6 supported languages. The system handles text expansion gracefully and supports RTL languages for future expansion.

**Future Enhancements**

- [ ] Add more languages based on user demand
- [ ] Implement backend localization for emails
- [ ] Create music terminology glossary per language
- [ ] Add professional translation review process

**Expected Outcome**: A truly global platform that respects linguistic and cultural differences while maintaining a consistent user experience across all supported languages.

## Long-term Vision (6+ months)

### Basic Features

- [ ] Logbook - comprehensive logbook to track everyday practices
- [ ] Scorebook - curated score for each grade and level
- [ ] Gradebook - for teachers to grade the practices, or self evaluation
- [ ] Goalbook - specified goal with comprehensive steps of practices.

### Advanced Features

- [ ] AI-powered practice recommendations
- [ ] Social features and community challenges
- [ ] Video integration for lessons and tutorials
- [ ] Multi-user practice sessions
- [ ] Integration with external music services

### Platform Expansion

- [ ] Mobile app development (React Native)
- [ ] Desktop application (Electron)
- [ ] Plugin system for extensibility
- [ ] Third-party integrations (Spotify, YouTube, etc.)

## Technical Debt Management

### Ongoing Maintenance

- [ ] Regular dependency updates
- [ ] Security audit and fixes
- [ ] Performance optimization
- [ ] Database optimization and indexing
- [ ] Monitoring and alerting improvements

### Code Quality

- [ ] Refactor large components (>500 lines)
- [ ] Remove remaining `any` types
- [ ] Improve error handling consistency
- [ ] Add more comprehensive logging
- [x] Implement proper caching strategies

## Success Metrics

### User Experience

- [ ] Page load times < 2 seconds
- [ ] Mobile-first responsive design
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] User satisfaction scores > 4.5/5

### Technical Quality

- [ ] Test coverage > 80% across all services
- [ ] Zero critical security vulnerabilities
- [ ] 99.9% uptime SLA
- [ ] API response times < 200ms

### Feature Adoption

- [ ] Active user growth month-over-month
- [ ] Feature usage analytics and optimization
- [ ] User retention rates > 70% (30-day)
- [ ] Community engagement and feedback

## Architectural Philosophy Going Forward

### Pragmatic Over Perfect

Based on the success of the MVP, Mirubato will continue to prioritize:

1. **Working Features > Complex Architecture**
   - Simple, maintainable code that ships
   - Avoid over-engineering until complexity demands it
   - Module system deferred until actually needed

2. **User Value > Technical Elegance**
   - Focus on features users actually use
   - Measure adoption before building complex systems
   - Iterate based on real usage data

3. **Progressive Enhancement**
   - Start simple, enhance incrementally
   - Keep music libraries ready but don't force usage
   - Add complexity only when justified by user needs

4. **Clear Documentation**
   - Keep docs aligned with actual implementation
   - Document both current state and future vision
   - Be transparent about technical decisions

### Lessons Learned

- ✅ REST API is simpler and sufficient (vs GraphQL)
- ✅ Zustand provides adequate state management (vs complex modules)
- ✅ Shipping MVP matters more than perfect architecture
- ✅ i18n from the start was a great decision
- ⏳ Music features can wait until core is solid

---

**Next Review**: October 2025
**Last Updated**: July 4, 2025 (v1.3.0)
