# Mirubato Development Roadmap

## Overview

This roadmap provides a comprehensive development plan for Mirubato with strict testing requirements. Every feature must include unit tests, integration tests, and documentation for all endpoints.

## Current Status: Phase 1 - Testing & Authentication UI 🚧

The project has completed Apollo Client integration and local-first architecture. Now focusing on comprehensive testing and building the authentication UI.

## Immediate Next Steps 🚀 (2025-06-01)

1. **Write Unit Tests**:

   - Test localStorage service methods
   - Test AuthContext with anonymous/authenticated flows
   - Test UserStatusIndicator component
   - Test SaveProgressPrompt component

2. **Write Integration Tests**:

   - Test anonymous user creation and persistence
   - Test migration from anonymous to authenticated
   - Test local storage data integrity
   - Test Apollo Client error handling

3. **Build Authentication UI**:

   - Create Login page with magic link form
   - Create Magic Link verification page
   - Add loading and error states
   - Ensure mobile responsiveness

4. **Run GraphQL Code Generation**:
   ```bash
   cd frontend && npm run codegen
   ```

## Completed Achievements ✅

### Phase 0: Testing Infrastructure (COMPLETE)

#### Testing Framework Implementation

- **Jest Configuration**: TypeScript with ESM support, unit/integration test separation, 80% coverage thresholds
- **React Testing Library**: Custom render with providers, MSW for API mocking, testing utilities
- **Integration Test Environment**: Supertest for API testing, test database setup structure, API test helpers
- **Pre-commit Hooks**: Husky and lint-staged configured, automated test runs before commits, commit message linting
- **Monorepo Scripts**: Organized workspace scripts for frontend/backend separation

### Infrastructure & Deployment (2025-06-01)

- **Cloudflare Workers Migration**: Both frontend and backend deployed as Workers
- **Build Configuration**: Fixed all build issues (husky, node_compat, database_id)
- **D1 Database**: Created and configured with proper migrations
- **Worker Names**: Aligned with Cloudflare CI expectations
- **Compatibility Date**: Updated to support Node.js built-in modules

### Backend Implementation (2025-05-31)

- **GraphQL Infrastructure**: Apollo Server on Cloudflare Workers
- **Database Schema**: 5 D1 migrations with proper relationships and indexes
- **Authentication System**: Magic link auth with JWT tokens
- **User Service**: Full CRUD operations with preferences and statistics
- **Testing**: 23 passing tests with unit and integration coverage
- **Type Safety**: GraphQL schema with TypeScript generation

### Frontend Core Features (2025-05-31)

- **Landing Page**: Interactive piano interface with nature-inspired theme
- **Practice Page**: MVP with sheet music display and audio playback
- **Audio System**: Real piano samples via Tone.js Sampler
- **Music Player**: Reusable controls with circular volume control
- **Mobile Optimizations**: Dynamic measures per page, responsive scaling
- **Bug Fixes**: Tempo speed-up issue resolved, page-based navigation

### Code Quality & Documentation

- **Testing Infrastructure**: Jest, React Testing Library, and Husky configured
- **Type Safety**: Fixed all TypeScript errors in test files
- **Mocking Framework**: Created mocks for Tone.js, VexFlow, and audioManager
- **Documentation Updates**: Updated critical deployment information
- **CSP Configuration**: Fixed for Cloudflare Workers deployment

### Phase 1: Apollo Client & Local-First Architecture (2025-06-01) ✅

#### Apollo Client Integration

- **Dependencies**: Installed @apollo/client and GraphQL packages
- **Client Configuration**: Created Apollo Client with auth links and error handling
- **Code Generation**: Set up GraphQL code generation with TypeScript support
- **Provider Setup**: Integrated ApolloProvider in main application
- **GraphQL Queries**: Created auth and user queries/mutations
- **Environment Variables**: Added support for GraphQL endpoint configuration

#### Local-First Architecture

- **Anonymous Users**: Automatic anonymous user creation on first visit
- **Local Storage Service**: Comprehensive service for practice data persistence
- **AuthContext Enhancement**: Support for both anonymous and authenticated users
- **Data Migration**: Seamless migration from anonymous to authenticated user
- **User Status Indicator**: Visual indicator for guest vs authenticated status
- **Save Progress Prompt**: Non-intrusive prompt to encourage sign-up
- **Full Offline Functionality**: Complete app features available without registration

#### Shared Types Package (2025-06-01)

- **@mirubato/shared Package**: Created unified type definitions for data consistency
- **Data Validation**: Comprehensive validation for all entity types
- **Migration Utilities**: Schema change handling with data migrations
- **Data Sync Service**: Batch processing with conflict detection
- **Type Consistency**: Ensured alignment between local storage and D1 database
- **Monorepo Structure**: Added shared package to npm workspaces

## Pending Development 🚧

### Phase 1: Testing & Authentication UI (Current Phase)

#### Week 1: Comprehensive Testing

- **Unit Tests for New Features**

  - localStorage service unit tests
  - AuthContext with anonymous user tests
  - UserStatusIndicator component tests
  - SaveProgressPrompt component tests

- **Integration Tests**

  - Anonymous user flow testing
  - Authentication flow testing
  - Local to cloud data migration testing
  - Practice session persistence testing

- **E2E Tests**
  - Complete user journey from anonymous to authenticated
  - Practice session with local storage
  - Data sync verification

#### Week 2: Authentication UI

- **Login Page Development**

  - Create login page component with magic link form
  - Add email validation and error handling
  - Implement success/error messaging
  - Mobile-responsive design

- **Magic Link Verification Page**
  - Create verification page for email links
  - Handle token validation
  - Show loading and success states
  - Auto-redirect after verification

#### Week 3: Cloud Sync Implementation

- **Practice Session Sync**

  - Implement GraphQL mutations for session sync
  - Create sync queue management
  - Handle conflict resolution
  - Add progress indicators

- **User Data Sync**

  - Sync preferences to cloud
  - Implement two-way sync
  - Handle offline changes
  - Add sync status indicators

- **User Profile Integration**
  - Create user profile queries
  - Implement preferences management
  - Add instrument selection UI

### Phase 2: Core Feature Implementation

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

#### Email Service

- **Production Implementation**
  - Integrate real email provider (Resend/SendGrid)
  - Create email templates
  - Implement rate limiting
  - Add email verification

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

### Testing & Quality

- Achieve 80% test coverage across all modules
- Add performance benchmarks
- Implement visual regression testing
- Create E2E test suite

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

1. All unit tests pass with >80% coverage
2. Integration tests validate the feature
3. Documentation is updated
4. Code passes linting and type-checking
5. Feature works across all supported browsers
6. Accessibility requirements are met
7. Performance benchmarks are satisfied
8. Code review is approved

## Testing Standards

### Unit Test Requirements

- Comprehensive unit tests for all business logic
- Mock external dependencies appropriately
- Test edge cases and error conditions
- Maintain clear test descriptions
- See `DEVELOPMENT_GUIDELINES.md` for testing patterns

### Integration Test Requirements

- Test complete API workflows end-to-end
- Verify database operations
- Test authentication flows
- Validate error handling
- See `DEVELOPMENT_GUIDELINES.md` for integration test examples

### OpenAPI Documentation Requirements

- Document all API endpoints
- Include request/response schemas
- Provide clear endpoint descriptions
- Add authentication requirements
- See `API_SPECIFICATION.md` for schema details

## CI/CD Pipeline

### GitHub Actions Workflow

- Automated test execution on push/PR
- Unit and integration test runs
- Code coverage reporting
- OpenAPI spec generation
- Automated coverage uploads
- See `.github/workflows` for implementation

## Definition of Done

A feature is considered complete when:

1. All unit tests pass with >80% coverage
2. Integration tests validate the feature
3. OpenAPI documentation is complete
4. Code passes linting and formatting
5. Feature works on all supported browsers
6. Accessibility requirements are met
7. Performance benchmarks are satisfied
8. Security review is complete
9. Documentation is updated
10. Code review is approved

## Success Metrics

### Code Quality Metrics

- **Test Coverage**: >80% for all modules
- **API Documentation**: 100% of endpoints documented
- **Build Time**: <2 minutes for full test suite
- **Bundle Size**: <500KB initial load

### Performance Metrics

- **API Response**: <100ms p95
- **Test Execution**: <30s for unit tests
- **Database Queries**: <50ms p95
- **Audio Latency**: <50ms

### Reliability Metrics

- **Test Flakiness**: <1% flaky tests
- **API Uptime**: >99.9%
- **Error Rate**: <0.1%
- **Rollback Time**: <5 minutes
