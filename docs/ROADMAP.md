# Mirubato Development Roadmap

## Overview

This roadmap provides a comprehensive development plan for Mirubato with strict testing requirements. Every feature must include unit tests, integration tests, and documentation for all endpoints.

## Current Status: Phase 1 - Code Quality & Testing 🚧

The project has completed magic link authentication flow implementation. Now focusing on critical code quality improvements before proceeding with additional features.

## Immediate Priority: Code Quality Improvements 🔧 (Critical)

### 1. **TypeScript Type Safety** (High Priority)

- [ ] Replace all `any` types with proper TypeScript interfaces
  - `/shared/types/validation.ts` - Fix validation function types
  - `/backend/src/test-utils/*.ts` - Type test utilities properly
  - All resolver return types should be strictly typed
- [ ] Create missing interfaces for component props
- [ ] Add strict null checks across the codebase

### 2. **Production Code Cleanup** (High Priority)

- [ ] Remove all console.log statements and implement proper logging service
  - Backend: Use structured logging with log levels
  - Frontend: Use debug-only logging that's stripped in production
- [ ] Extract hardcoded values to configuration
  - Localhost URLs → environment variables
  - Magic numbers (timeouts, durations) → named constants
  - API endpoints → centralized config

### 3. **Test Coverage** (Critical) - IN PROGRESS 🚧

Current Status: Frontend ~29% | Backend ~43% (Target: 80%)

#### Completed Tests ✅

- **Frontend:**
  - [x] AuthContext.tsx (100% coverage)
  - [x] notationRenderer.ts (100% coverage)
  - [x] audioManager.ts (91.54% coverage)
  - [x] Practice.tsx page (91.66% coverage)
  - [x] localStorage.ts (72.72% coverage - needs improvement)
- **Backend:**
  - [x] practice.ts resolver (100% coverage)
  - [x] sheetMusic.ts resolver (100% coverage)
  - [x] auth.ts service (100% coverage)
  - [x] user.ts service (76.81% coverage - needs improvement)

#### Remaining Tests ❌

- **Backend Services Tests:**
  - [ ] EmailService tests with mocked email provider (currently 50%)
  - [ ] RateLimiter service tests (0% coverage)
  - [ ] Scalars resolver tests (8% coverage)
  - [ ] Middleware tests (logging, error handling - 0% coverage)
  - [ ] Main index.ts tests (0% coverage)
- **Frontend Component Tests:**
  - [ ] MusicPlayer component with audio mocking (0% coverage)
  - [ ] PianoKey and PianoChord interaction tests (0% coverage)
  - [ ] ProtectedRoute authentication flow tests (0% coverage)
  - [ ] SaveProgressPrompt behavior tests (0% coverage)
  - [ ] UserStatusIndicator state tests (0% coverage)
- **Frontend Page Tests:**
  - [ ] AuthVerify page with various token states (0% coverage)
  - [ ] Fix failing integration tests
- **Frontend Service/Utils Tests:**
  - [ ] dataSync service with conflict resolution (0% coverage)
  - [ ] Apollo client configuration tests (0% coverage)
  - [ ] Complete localStorage.ts tests (improve from 72.72% to 80%+)

### 4. **Security Enhancements** (Critical)

- [ ] Implement Content Security Policy properly
- [ ] Add rate limiting to all public endpoints
- [ ] Implement proper JWT refresh token rotation
- [ ] Add request validation middleware
- [ ] Implement row-level security in D1 queries
- [ ] Add CSRF protection for state-changing operations

### 5. **Error Handling & Resilience** (High Priority)

- [ ] Add error boundaries to all React components
- [ ] Implement retry logic for failed API calls
- [ ] Add graceful degradation for offline mode
- [ ] Improve error messages for user-facing errors
- [ ] Add request timeout handling
- [ ] Implement circuit breaker pattern for external services

### 6. **Accessibility Improvements** (Required)

- [ ] Add missing ARIA labels to all interactive elements
- [ ] Implement keyboard navigation for piano interface
- [ ] Add screen reader support for music notation
- [ ] Ensure proper focus management in modals
- [ ] Add skip navigation links
- [ ] Test with screen readers (NVDA, JAWS, VoiceOver)

### 7. **Performance Optimizations** (Medium Priority)

- [ ] Implement code splitting for routes
- [ ] Lazy load heavy dependencies (Tone.js, VexFlow)
- [ ] Add service worker for offline support
- [ ] Optimize bundle size (currently 1.8MB)
- [ ] Implement virtual scrolling for long lists
- [ ] Add image optimization for music assets

### 8. **Development Workflow** (Medium Priority)

- [ ] Set up proper logging infrastructure
- [ ] Add performance monitoring (Web Vitals)
- [ ] Implement feature flags for gradual rollout
- [ ] Add database migration validation
- [ ] Create development seed data scripts
- [ ] Add API versioning strategy

### 9. **Configuration & Code Organization** (High Priority)

- [ ] **Unify Configuration Management**:
  - [ ] Consolidate all environment configurations into a centralized system
  - [ ] Create a single source of truth for domain names, API endpoints, and service URLs
  - [ ] Implement environment-specific overrides without code duplication
  - [ ] Support for build-time and runtime configuration
  - [ ] Simplify deployment to different domains/environments
- [ ] **Code Cleanup & Redundancy Removal**:
  - [ ] Audit and remove duplicate code across frontend/backend
  - [ ] Identify and consolidate repeated utility functions
  - [ ] Remove unused dependencies and dead code
  - [ ] Standardize file organization and naming conventions
  - [ ] Eliminate redundant configuration files
  - [ ] Merge similar test utilities and mocks

### 10. **Documentation Updates** (Low Priority)

- [ ] Document all API endpoints with OpenAPI
- [ ] Add JSDoc comments to all functions
- [ ] Create component storybook
- [ ] Write deployment runbook
- [ ] Add troubleshooting guide
- [ ] Create contributor guidelines

### 11. **Address TODO Comments** (Ongoing)

- [ ] Backend TODOs:
  - Load user data in JWT verification (`index.ts`)
  - Implement all sheet music resolvers
  - Implement all practice session resolvers
  - Complete user preferences in UserService
  - Add token blacklisting for logout
- [ ] Frontend TODOs:
  - Implement cloud sync trigger after auth
  - Complete ProtectedRoute implementation
  - Add save progress functionality
  - Implement data sync queue management

## Immediate Next Steps 🚀 (After Quality Improvements)

1. **Complete Authentication Flow Testing**:

   - Test magic link email delivery
   - Test token verification edge cases
   - Test auth state persistence
   - Test logout functionality

2. **Write Integration Tests**:

   - Test anonymous user creation and persistence
   - Test migration from anonymous to authenticated
   - Test local storage data integrity
   - Test Apollo Client error handling

3. **Cloud Sync Implementation**:
   - Implement GraphQL mutations for session sync
   - Create sync queue management
   - Handle conflict resolution
   - Add progress indicators

## Completed Achievements ✅

### Phase 0: Testing Infrastructure (COMPLETE) ✅

#### Testing Framework Implementation

- ✅ **Jest Configuration**: TypeScript with ESM support, unit/integration test separation, 80% coverage thresholds
- ✅ **React Testing Library**: Custom render with providers, MSW for API mocking, testing utilities
- ✅ **Integration Test Environment**: Supertest for API testing, test database setup structure, API test helpers
- ✅ **Pre-commit Hooks**: Husky and lint-staged configured, automated test runs before commits, commit message linting
- ✅ **Monorepo Scripts**: Organized workspace scripts for frontend/backend separation

### Infrastructure & Deployment (COMPLETE) ✅

- ✅ **Cloudflare Workers Migration**: Both frontend and backend deployed as Workers
- ✅ **Build Configuration**: Fixed all build issues (husky, node_compat, database_id)
- ✅ **D1 Database**: Created and configured with proper migrations
- ✅ **Worker Names**: Aligned with Cloudflare CI expectations
- ✅ **Compatibility Date**: Updated to support Node.js built-in modules
- ✅ **Email Templates**: External templates with build-time compilation

### Backend Implementation (COMPLETE) ✅

- ✅ **GraphQL Infrastructure**: Apollo Server on Cloudflare Workers
- ✅ **Database Schema**: 5 D1 migrations with proper relationships and indexes
- ✅ **Authentication System**: Magic link auth with JWT tokens
- ✅ **User Service**: Full CRUD operations with preferences and statistics
- ✅ **Testing**: 23 passing tests with unit and integration coverage
- ✅ **Type Safety**: GraphQL schema with TypeScript generation
- ✅ **Email Service**: Magic link email sending with external templates

### Frontend Core Features (COMPLETE) ✅

- ✅ **Landing Page**: Interactive piano interface with nature-inspired theme
- ✅ **Practice Page**: MVP with sheet music display and audio playback
- ✅ **Audio System**: Real piano samples via Tone.js Sampler
- ✅ **Music Player**: Reusable controls with circular volume control
- ✅ **Mobile Optimizations**: Dynamic measures per page, responsive scaling
- ✅ **Bug Fixes**: Tempo speed-up issue resolved, page-based navigation

### Phase 1: Authentication UI (COMPLETE) ✅

#### Authentication Flow Implementation

- ✅ **Auth Modal**: Responsive popup with email validation
- ✅ **Magic Link Request**: Frontend integration with backend
- ✅ **Email Templates**: Professional HTML/text templates
- ✅ **Auth Verification Page**: `/auth/verify` route with token handling
- ✅ **Error Handling**: User-friendly error messages
- ✅ **Loading States**: Proper loading indicators
- ✅ **Mobile Responsive**: Works on laptop, tablet, and phone
- ✅ **CORS Configuration**: Fixed for local and production
- ✅ **Environment Setup**: Production environment files

### Code Quality & Documentation (PARTIAL) ⚠️

- ✅ **Testing Infrastructure**: Jest, React Testing Library, and Husky configured
- ✅ **Type Safety**: Fixed initial TypeScript errors in test files
- ✅ **Mocking Framework**: Created mocks for Tone.js, VexFlow, and audioManager
- ✅ **Documentation Updates**: Updated critical deployment information
- ✅ **CSP Configuration**: Fixed for Cloudflare Workers deployment
- ⚠️ **Test Coverage**: Need to improve from current state
- ⚠️ **Type Safety**: Still have `any` types to replace
- ⚠️ **Production Readiness**: console.log statements to remove

### Apollo Client & Local-First Architecture (COMPLETE) ✅

#### Apollo Client Integration

- ✅ **Dependencies**: Installed @apollo/client and GraphQL packages
- ✅ **Client Configuration**: Created Apollo Client with auth links and error handling
- ✅ **Code Generation**: Set up GraphQL code generation with TypeScript support
- ✅ **Provider Setup**: Integrated ApolloProvider in main application
- ✅ **GraphQL Queries**: Created auth and user queries/mutations
- ✅ **Environment Variables**: Added support for GraphQL endpoint configuration

#### Local-First Architecture

- ✅ **Anonymous Users**: Automatic anonymous user creation on first visit
- ✅ **Local Storage Service**: Comprehensive service for practice data persistence
- ✅ **AuthContext Enhancement**: Support for both anonymous and authenticated users
- ✅ **Data Migration**: Seamless migration from anonymous to authenticated user
- ✅ **User Status Indicator**: Visual indicator for guest vs authenticated status
- ✅ **Save Progress Prompt**: Non-intrusive prompt to encourage sign-up
- ✅ **Full Offline Functionality**: Complete app features available without registration

#### Shared Types Package

- ✅ **@mirubato/shared Package**: Created unified type definitions for data consistency
- ✅ **Data Validation**: Comprehensive validation for all entity types
- ✅ **Migration Utilities**: Schema change handling with data migrations
- ✅ **Data Sync Service**: Batch processing with conflict detection
- ✅ **Type Consistency**: Ensured alignment between local storage and D1 database
- ✅ **Monorepo Structure**: Added shared package to npm workspaces

## Pending Development 🚧

### Phase 2: Core Feature Implementation (After Quality Improvements)

#### Sheet Music Service

- **Backend Implementation**

  - Complete sheet music service with CRUD operations
  - Implement filtering and search functionality
  - Add recommendation engine
  - Create data import scripts

- **Frontend Integration**
  - Build sheet music browser component
  - Implement filter controls
  - Add notation preview
  - Create recommendation display

#### Practice Session Management

- **Backend Services**

  - Implement session lifecycle (start/pause/complete)
  - Create practice logging system
  - Add progress tracking queries
  - Build statistics aggregation

- **Frontend Features**
  - Integrate session tracking in MusicPlayer
  - Add practice timer component
  - Implement offline queue for sync
  - Create progress visualization

### Phase 3: Advanced Features

#### Progress & Analytics

- **Progress Tracking**

  - Create progress calculation engine
  - Implement achievement system
  - Add streak tracking
  - Build level progression

- **Analytics Dashboard**
  - Create analytics aggregation service
  - Build report generation
  - Add export functionality
  - Implement data visualizations

#### Professional Features

- **Quick Practice Timer**

  - Create timer service
  - Implement quick-log processing
  - Add template management
  - Build activity categorization

- **Offline Sync**
  - Create offline storage service
  - Implement sync algorithm
  - Add conflict resolution
  - Build retry mechanism

#### Enhanced Player

- **Advanced Controls**
  - A-B loop for practice sections
  - Playback speed ramping
  - Bookmark positions
  - Tempo adjustment while paused

### Phase 4: Multi-Instrument Support

#### Guitar-Specific Features

- **Notation Support**
  - Implement tablature rendering
  - Add position markers (I-XIX)
  - String indication system
  - Classical fingering notation (p,i,m,a)

#### Piano-Specific Features

- **Grand Staff Support**
  - Proper treble/bass clef coordination
  - Hand independence tracking
  - Pedaling notation
  - Piano fingering numbers (1-5)

## Technical Debt & Improvements

### Frontend Architecture

- Reorganize components into atomic design structure
- Implement custom hooks for business logic
- Add comprehensive TypeScript types
- Create service layer for API communication

### Backend Enhancements

- Add missing database tables (progress_tracking, practice_templates)
- Implement caching layer for performance
- Add request batching for optimization
- Complete OpenAPI documentation

## Success Metrics

### Development Metrics

- Test Coverage: >80% for all modules
- Build Time: <2 minutes for full test suite
- Bundle Size: <500KB initial load
- API Response: <100ms p95

### User Experience Metrics

- Audio Latency: <50ms
- Page Load: <3 seconds
- Error Rate: <0.1%
- Mobile Performance: >90 Lighthouse score

## Definition of Done

A feature is considered complete when:

1. **Tests are written FIRST** - Test-driven development approach
2. All unit tests pass with >80% coverage (90% for critical paths)
3. Integration tests validate the feature
4. Documentation is updated
5. Code passes linting and type-checking
6. Feature works across all supported browsers
7. Accessibility requirements are met (WCAG 2.1 AA)
8. Performance benchmarks are satisfied
9. Security review is complete
10. No `any` types remain
11. No console.log statements in production code
12. All TODO comments are resolved or tracked
13. Code review is approved

**IMPORTANT**: No function or feature is considered complete without comprehensive test coverage. Tests are not an afterthought - they are the primary metric of completeness.

## Testing Standards

### Unit Test Requirements

- Comprehensive unit tests for all business logic
- Mock external dependencies appropriately
- Test edge cases and error conditions
- Maintain clear test descriptions
- Minimum 80% coverage, 90% for critical paths

### Integration Test Requirements

- Test complete API workflows end-to-end
- Verify database operations
- Test authentication flows
- Validate error handling
- Test data sync and conflict resolution

### Code Quality Requirements

- No TypeScript `any` types
- Proper error boundaries and handling
- Structured logging (no console.log)
- Configuration externalized
- Comprehensive JSDoc comments
- ARIA labels on all interactive elements

## CI/CD Pipeline

### GitHub Actions Workflow

- Automated test execution on push/PR
- Unit and integration test runs
- Code coverage reporting
- Bundle size analysis
- Accessibility testing
- Security scanning
- Type checking enforcement
