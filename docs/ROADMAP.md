# Mirubato Development Roadmap

## Current Status (January 2025)

✅ **REST API Migration Complete**: Full transition from GraphQL to REST API architecture completed

- GraphQL backend service completely removed
- Frontend fully migrated to REST API endpoints
- All data successfully migrated (80 logbook entries, 3 users)
- Production deployment active at mirubato.com
- 135 tests passing across all services (API: 32, Scores: 3, Frontend: 100)
- No GraphQL dependencies remain in the codebase

## Priority 1: Frontend Polish & UX (2-3 weeks)

### Goal: Improve user experience and visual design

**Auto-Collapse Cards & Better Mobile UX**

- [ ] Implement auto-collapsing cards for logbook entries
- [ ] Add swipe gestures for mobile interactions
- [ ] Improve touch targets and spacing on mobile
- [ ] Add loading states and skeleton screens
- [ ] Implement responsive design improvements

**Unified Button Design System**

- [ ] Create consistent button component library
- [ ] Standardize colors, sizes, and interactions
- [ ] Add hover/focus/active states
- [ ] Implement accessible button patterns
- [ ] Update all existing buttons to use new system

**Better Visual Hierarchy & Spacing**

- [ ] Review and improve typography scale
- [ ] Standardize spacing system (padding, margins)
- [ ] Improve color contrast for accessibility
- [ ] Add subtle animations and transitions
- [ ] Implement dark mode support

**Expected Outcome**: More polished, professional-looking application with better mobile experience.

## Priority 2: E2E Testing with Playwright (2-3 weeks)

### Goal: Comprehensive automated testing coverage

**Fix Current Timeout Issues**

- [ ] Investigate and fix current E2E test timeouts
- [ ] Optimize test performance and reliability
- [ ] Add proper wait conditions and assertions
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

**Scorebook: Sheet Music Library Management**

- [ ] Design scorebook data model and API
- [ ] Implement sheet music upload and storage
- [ ] Add metadata extraction (composer, difficulty, tags)
- [ ] Create browsing and search interface
- [ ] Integrate with practice sessions
- [ ] Add favorites and collections
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

- **Q1 2025**: Enhance Scores Worker for curated Scorebook
- **Q2 2025**: Build Goals & Practice Workers (core value proposition)
- **Q3 2025**: Add Grades Worker with LLM integration
- **Q4 2025**: Analytics Worker for comprehensive insights
- **2026**: Performance Worker for presentations and recitals

**Expected Outcome**: A modular, scalable platform that can evolve from simple score storage to a comprehensive AI-enhanced music education system.

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
- [ ] Implement proper caching strategies

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

---

**Next Review**: End of June 2025
**Last Updated**: June 2025
