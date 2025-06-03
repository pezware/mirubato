# Mirubato Development Roadmap

## Overview

This roadmap outlines the phased development plan for Mirubato, organized around the modular architecture defined in SYSTEM_DESIGN.md. Each phase builds upon the previous, with a focus on local-first functionality and progressive enhancement through authentication.

## Current Status: Phase 1 - Core Infrastructure & Quality ✅

### Completed Modules

- ✅ **Testing Infrastructure**: Jest, React Testing Library, MSW
- ✅ **Basic User Management**: Anonymous user creation, magic link auth
- ✅ **Storage Module**: LocalStorage and IndexedDB services
- ✅ **Initial Audio Engine**: Tone.js integration with piano samples
- ✅ **Basic Sheet Music Display**: VexFlow rendering

### Test Coverage Progress

- **Frontend**: ~65% (Target: 80%)
- **Backend**: ~74% (Target: 80%) ✅ Significant improvement!

## Phase 2: Core Module Implementation ✅ (Completed) → Quality Improvements 🚧 (Current)

### Completed Core Modules

- ✅ **EventBus Module**: Singleton publish/subscribe system with pattern matching, priorities, and event history (>95% test coverage)
- ✅ **Enhanced Storage Module**: LocalStorage abstraction with TTL support, metadata tracking, and namespace isolation (>88% test coverage)
- ✅ **Sync Module**: Queue-based synchronization with retry logic, conflict resolution strategies, and batch processing (>92% test coverage)
- ✅ **Practice Session Module**: Complete session management with persistence, analytics, and templates
- ✅ **Performance Tracking Module**: Real-time feedback, analysis, and recommendation system

### Current Quality Improvement Tasks

#### High Priority ✅ (Completed)

1. **Backend Infrastructure Testing** ✅
   - ✅ Add tests for `index.ts` (main server file) - now 100% coverage
   - ✅ Add tests for `cors.ts` (security configuration) - maintained 100% coverage
   - ✅ Add tests for `rateLimiter.ts` (rate limiting) - maintained 100% coverage
   - ✅ Target achieved: Backend coverage improved from 45.69% → 74.13%

#### High Priority ✅ (Completed)

2. **Frontend Test Quality** ✅
   - ✅ Fix Apollo Client mock warnings in all test files
   - ✅ Improve test setup with proper GraphQL mock provider
   - ✅ Eliminate test noise and improve debugging experience
   - ✅ Add comprehensive test documentation

#### Medium Priority (Next Phase)

3. **Storage Module Enhancement**

   - [ ] Implement IndexedDB adapter (architecture already prepared)
   - [ ] Add performance benchmarks for large datasets
   - [ ] Implement data compression for practice logs

4. **Module Integration Testing**

   - [ ] Add integration tests between EventBus ↔ Storage ↔ Sync
   - [ ] Test module lifecycle dependencies
   - [ ] Validate event flow across module boundaries

5. **Performance & Monitoring**
   - [ ] Add EventBus performance testing under high load
   - [ ] Implement metrics collection for all modules
   - [ ] Add health check endpoints for module status

### Risk Assessment

#### Technical Risks

- **Storage Quota Limits**: Mobile browsers have strict storage limits
  - _Mitigation_: Implement data compression and rotation policies
- **Audio Context Restrictions**: Autoplay policies on mobile
  - _Mitigation_: User interaction required before audio initialization
- **IndexedDB Reliability**: Browser inconsistencies
  - _Mitigation_: Fallback to LocalStorage for critical data

#### Dependencies

- **External Libraries**: Tone.js, VexFlow stability
  - _Mitigation_: Pin versions, maintain fallback rendering
- **Browser APIs**: Web Audio, IndexedDB support
  - _Mitigation_: Feature detection and graceful degradation

### MVP Definitions

#### 2.1 Storage & Sync Modules MVP ✅

**Minimum Viable Features**:

- ✅ Basic local storage interface (LocalStorage + IndexedDB)
- ✅ Simple save/load operations
- ✅ Basic conflict detection (last-write-wins)
- ✅ Manual sync trigger
- ✅ Basic quota management (warning at 80%)

**Full Implementation** (Phase 2 completion):

- ✅ Unified storage interface for local/cloud operations
- ✅ Add compression for IndexedDB practice logs
- ✅ Create data retention policies
- ✅ Implement storage quota management
- ✅ Add export/import functionality
- ✅ Automatic sync with conflict resolution
- ✅ Incremental sync protocols

#### 2.2 Practice Session Module MVP

**Minimum Viable Features**:

- ✓ Start/stop session functionality
- ✓ Basic session data structure
- [ ] Session persistence across refresh
- [ ] Basic session history (last 10)

**Full Implementation**:

- [ ] Complete state machine (start/pause/resume/end)
- [ ] Full session history with search
- [ ] Session analytics and insights
- [ ] Session templates
- [ ] Batch operations

#### 2.3 Performance Tracking Module MVP

**Minimum Viable Features**:

- [ ] Basic accuracy calculation (correct/total notes)
- [ ] Simple timing detection (early/on-time/late)
- [ ] Basic visual feedback (color coding)

**Full Implementation**:

- [ ] Advanced accuracy algorithms
- [ ] Precise timing measurement
- [ ] Detailed performance analytics
- [ ] ML-based pattern detection
- [ ] Personalized feedback generation

## Phase 3: Advanced Features & Professional Tools

### Risk Assessment

#### Phase 3 Risks

- **Data Volume**: Large practice logs may overwhelm storage
  - _Mitigation_: Implement data archival and summarization
- **Complex Analytics**: Performance impact of calculations
  - _Mitigation_: Web Worker for heavy computations
- **User Adoption**: Professional features may intimidate beginners
  - _Mitigation_: Progressive disclosure, guided tutorials

### MVP Definitions

#### 3.1 Progress Analytics Module MVP

**Minimum Viable Features**:

- [ ] Basic progress tracking (sessions completed, time practiced)
- [ ] Simple achievement badges (10 sessions, 1 hour, etc.)
- [ ] Basic streak counter
- [ ] Weekly summary view

**Full Implementation**:

- [ ] Advanced analytics engine
- [ ] Custom achievement system
- [ ] Detailed progression metrics
- [ ] Exportable reports (PDF/CSV)
- [ ] Comparative analytics

#### 3.2 Practice Logger Module MVP

**Minimum Viable Features**:

- [ ] Simple start/stop timer
- [ ] Basic activity categories
- [ ] Quick notes field
- [ ] Daily log view

**Full Implementation**:

- [ ] Detailed entry forms
- [ ] Practice templates
- [ ] Time analytics dashboard
- [ ] Journal export
- [ ] Integration with calendar apps

#### 3.3 Curriculum Module MVP

**Minimum Viable Features**:

- [ ] Basic level system (1-10)
- [ ] Simple exercise progression
- [ ] Manual level advancement

**Full Implementation**:

- [ ] Automated assessment
- [ ] AI-powered recommendations
- [ ] Personalized study plans
- [ ] Spaced repetition
- [ ] Multi-path curricula

## Phase 4: Enhanced Musical Features

### 4.1 Advanced Sheet Music Module

**Purpose**: Comprehensive music library and generation

- [ ] Implement algorithmic exercise generation
- [ ] Add music search and filtering
- [ ] Create difficulty assessment algorithm
- [ ] Build music recommendation system
- [ ] Add MusicXML import support

### 4.2 Enhanced Audio Engine Module

**Purpose**: Professional audio capabilities

- [ ] Add metronome with visual sync
- [ ] Implement tempo ramping
- [ ] Add A-B loop functionality
- [ ] Create multi-instrument support
- [ ] Build MIDI input integration

### 4.3 Multi-Instrument Support

**Purpose**: Expand beyond piano to guitar and other instruments

#### Guitar Features

- [ ] Implement tablature rendering
- [ ] Add fretboard position markers
- [ ] Create fingering notation (p,i,m,a)
- [ ] Build chord diagram support

#### Additional Instruments

- [ ] Add instrument-specific notation
- [ ] Create custom audio samples
- [ ] Implement transposition support
- [ ] Build instrument-specific exercises

## Phase 5: Infrastructure & Middleware

### 5.1 Middleware Layer Implementation

**Purpose**: Cross-cutting concerns and optimization

#### Cache Middleware

- [ ] Implement intelligent prefetching
- [ ] Add Apollo cache persistence
- [ ] Create cache invalidation strategies
- [ ] Build offline cache management

#### Analytics Middleware

- [ ] Implement privacy-focused tracking
- [ ] Add educational effectiveness metrics
- [ ] Create usage pattern analysis
- [ ] Build A/B testing framework

#### Error Handling Middleware

- [ ] Implement comprehensive error recovery
- [ ] Add user-friendly error messages
- [ ] Create error reporting system
- [ ] Build graceful degradation

### 5.2 Performance Optimizations

**Purpose**: Ensure smooth experience across all devices

- [ ] Implement code splitting by route
- [ ] Add service worker for offline mode
- [ ] Optimize bundle size (<500KB initial)
- [ ] Implement virtual scrolling
- [ ] Add progressive image loading

## Phase 6: Future Modules & Extensions

### 6.1 Social & Collaboration Modules

- [ ] **Social Module**: Friends, challenges, leaderboards
- [ ] **Teacher Module**: Assignment creation and tracking
- [ ] **Collaboration Module**: Real-time duets/ensembles

### 6.2 Advanced Technology Integration

- [ ] **AI Module**: Machine learning for adaptive difficulty
- [ ] **MIDI Module**: Direct hardware integration
- [ ] **WebAssembly Module**: Performance-critical operations

## Code Quality Requirements

### Testing Standards

- **Unit Tests**: 80% coverage minimum (90% for critical paths)
- **Integration Tests**: All API endpoints and user flows
- **E2E Tests**: Critical user journeys
- **Performance Tests**: Audio latency, render performance

### Development Standards

- **TypeScript**: No `any` types allowed
- **Documentation**: All modules fully documented
- **Accessibility**: WCAG 2.1 AA compliance
- **Security**: OWASP compliance

## Module Implementation Guidelines

### For Each Module

1. **Design First**: Define clear interfaces before implementation
2. **Test First**: Write tests before code (TDD)
3. **Local First**: Ensure offline functionality
4. **Document**: Complete API documentation
5. **Review**: Architecture and code review

### Integration Points

- Modules communicate only through defined interfaces
- Events published to central event bus
- State managed by Apollo Client
- Middleware handles cross-cutting concerns

## Success Metrics

### Technical Metrics

- Test Coverage: >80% overall, >90% critical paths
- Bundle Size: <500KB initial load
- API Response: <100ms p95
- Audio Latency: <50ms

### User Experience Metrics

- Page Load: <3 seconds
- Error Rate: <0.1%
- Mobile Performance: >90 Lighthouse
- Accessibility: WCAG 2.1 AA

### Educational Metrics

- User Engagement: Daily active usage
- Progress Tracking: Measurable improvement
- Retention: 30-day retention >60%
- Learning Outcomes: Skill progression data

## Definition of Done

A module is complete when:

1. **Interface Defined**: Clear API documentation
2. **Tests Written**: >80% coverage with TDD
3. **Implementation Complete**: All interfaces implemented
4. **Integration Tested**: Works with other modules
5. **Documentation Updated**: User and developer docs
6. **Performance Validated**: Meets benchmarks
7. **Accessibility Verified**: WCAG compliance
8. **Security Reviewed**: No vulnerabilities
9. **Code Reviewed**: Approved by team
10. **Deployed**: Available in production

## Technical Debt Management

### Debt Tracking System

#### Categories

1. **Code Quality Debt**

   - TypeScript `any` types
   - Missing tests
   - Console.log statements
   - Duplicated code

2. **Architecture Debt**

   - Module boundary violations
   - Direct dependencies instead of interfaces
   - Missing abstraction layers
   - Tight coupling

3. **Performance Debt**

   - Unoptimized queries
   - Large bundle sizes
   - Memory leaks
   - Inefficient algorithms

4. **Security Debt**
   - Unvalidated inputs
   - Missing rate limiting
   - Weak authentication
   - Data exposure risks

### Management Strategy

#### Debt Budget

- **Per Sprint**: 20% capacity for debt reduction
- **Quarterly**: Full debt audit and prioritization
- **Emergency**: Stop-the-line for critical security debt

#### Refactoring Triggers

1. **Immediate**: Security vulnerabilities
2. **Next Sprint**: Performance below SLA
3. **Next Phase**: Architecture impediments
4. **Backlog**: Code quality improvements

#### Quality Gates

- **Phase Transitions**: Debt must be below threshold
- **Major Features**: No new debt introduction
- **Releases**: Security debt must be zero

## User Validation Milestones

### Phase 2 Validation

- **Week 4**: Alpha testing with 5 musicians
- **Week 8**: Beta testing with 20 users
- **Week 12**: Public beta launch

### Phase 3 Validation

- **Professional Musicians**: 10 user interviews
- **Music Teachers**: 5 classroom trials
- **Students**: 50 user feedback survey

### Success Criteria

- **Engagement**: 70% weekly active users
- **Retention**: 60% 30-day retention
- **Satisfaction**: 4.5/5 average rating
- **Performance**: <100ms interaction latency

## Parallel Development Tracks

### Track Organization

#### Track 1: Core Infrastructure (Backend Team)

- **Independent Modules**:
  - Storage Module enhancement
  - Sync Module implementation
  - GraphQL API extensions
  - Database optimizations

#### Track 2: User Experience (Frontend Team)

- **Independent Modules**:
  - UI component library
  - Responsive design system
  - Animation framework
  - Accessibility features

#### Track 3: Musical Features (Domain Team)

- **Independent Modules**:
  - Sheet music algorithms
  - Audio processing
  - Music theory engine
  - Notation rendering

### Synchronization Points

#### Weekly

- Cross-track standup
- Dependency review
- Integration planning

#### Bi-weekly

- Module integration testing
- Performance benchmarking
- User testing sessions

#### Monthly

- Architecture review
- Tech debt assessment
- Roadmap adjustment

### Dependency Management

#### Blocking Dependencies

- **Phase 2**: Storage must complete before Sync
- **Phase 3**: Performance Tracking required for Analytics
- **Phase 4**: Audio Engine needed for advanced features

#### Parallel Opportunities

1. **Phase 2**: Storage and Session modules in parallel
2. **Phase 3**: All three modules can start simultaneously
3. **Phase 4**: Sheet Music and Audio enhancements in parallel

## Timeline Estimates

### Adjusted for Parallel Tracks

- **Phase 2**: 2 months (with 3 parallel tracks)
- **Phase 3**: 2 months (with parallel development)
- **Phase 4**: 3 months (musical complexity)
- **Phase 5**: 1.5 months (infrastructure sprint)
- **Phase 6**: Ongoing (quarterly releases)

### Critical Path

1. Storage Module → Sync Module → Cloud Features
2. Session Module → Performance Tracking → Analytics
3. Audio Engine → Advanced Playback → MIDI Support

### Buffer Time

- **Per Phase**: 2-week buffer for unexpected issues
- **Integration**: 1 week between phases
- **User Testing**: 2 weeks per major release

**Note**: All timelines assume full team capacity and no major technical blockers. Regular reassessment based on velocity and user feedback.
