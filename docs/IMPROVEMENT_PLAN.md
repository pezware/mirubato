# Mirubato Improvement Plan

_Generated: December 2025_

This document outlines critical improvements needed for the Mirubato codebase based on comprehensive analysis of performance, security, and code quality issues.

## Executive Summary

The codebase has a solid foundation with good architecture patterns, but several critical issues need immediate attention:

- **Critical security vulnerabilities** (XSS, exposed GraphQL introspection)
- **Performance bottlenecks** (memory leaks, N+1 queries, missing optimizations)
- **Code quality issues** (large modules, low test coverage, console logs in production)
- **Unused code** (CurriculumModule and related modules)
- **Storage sync bug** preventing localStorage → D1 migration

## 🔴 Critical Issues (Immediate Action Required)

### 1. Security Vulnerabilities

#### XSS Vulnerability in Docs Page

- **Location**: `frontend/src/pages/Docs.tsx:150`
- **Issue**: Using `dangerouslySetInnerHTML` without sanitization
- **Impact**: Allows malicious script injection
- **Fix**:
  ```typescript
  import DOMPurify from 'dompurify'
  const sanitizedHtml = DOMPurify.sanitize(markdownHtml)
  ```

#### GraphQL Introspection Enabled in Production

- **Location**: `backend/src/index.ts:98`
- **Issue**: `introspection: true` exposes entire API schema
- **Impact**: API enumeration vulnerability
- **Fix**:
  ```typescript
  introspection: env.ENVIRONMENT === 'development'
  ```

### 2. Logbook Storage Bug

#### Missing hasCloudStorage Field

- **Location**: `frontend/src/graphql/queries/user.ts`
- **Issue**: GET_CURRENT_USER query missing `hasCloudStorage` field
- **Impact**: localStorage data not syncing to D1 after login
- **Fix**: Add field to GraphQL query

#### Incorrect localStorage Keys

- **Location**: `frontend/src/modules/logbook/LogbookReportingModule.ts:236-247`
- **Issue**: Reading from wrong localStorage keys
- **Impact**: Reports show empty data
- **Fix**: Use correct keys: `mirubato_logbook_entries` and `mirubato_goals`

## 🟡 High Priority Issues

### 1. Performance Issues

#### Memory Leaks

- **VexFlow renderers** not properly disposed
- **Audio event listeners** accumulating
- **Module event subscriptions** not cleaned up
- **Fix**: Implement proper cleanup in useEffect hooks

#### N+1 Query Problems

- **Location**: `backend/src/resolvers/practice.ts:461-504`
- **Impact**: Excessive database queries
- **Fix**: Implement DataLoader for batch loading

#### Missing Optimizations

- No lazy loading for Tone.js (large audio library)
- No React.memo on expensive components
- Full score re-rendering on every update
- No virtualization for long scores

### 2. Security Gaps

#### Rate Limiting Not Implemented

- **Location**: `backend/src/utils/rateLimiter.ts:16`
- **Issue**: Always returns `true` (allows all requests)
- **Fix**: Implement actual rate limiting logic

#### No GraphQL Query Depth Limits

- **Issue**: Allows deeply nested queries (DoS vulnerability)
- **Fix**: Add `graphql-depth-limit` validation

#### Weak Client-Side Token Storage

- **Location**: `frontend/src/utils/secureStorage.ts:34-53`
- **Issue**: XOR encryption is easily reversible
- **Fix**: Use proper encryption library or secure storage API

### 3. Code Quality Issues

#### Massive Module Files

- **CurriculumModule.ts**: 1800 lines (unused - to be removed)
- **VisualizationModule.ts**: 1255 lines
- **LogbookReportingModule.ts**: 865 lines
- **Fix**: Split into smaller, focused modules

#### Console Statements in Production

- Found in 10 production files
- **Fix**: Remove all console.log statements

#### Test Coverage Below Target

- Frontend: 64.9% (Target: 80%)
- Backend: 43% (Target: 80%)
- **Fix**: Add missing tests, especially for critical paths

## 📋 Implementation Plan

### Phase 1: Critical Security & Bug Fixes (Week 1)

1. **Day 1-2**: Security Fixes

   - [ ] Fix XSS vulnerability in Docs page
   - [ ] Disable GraphQL introspection in production
   - [ ] Implement query depth limits

2. **Day 3-4**: Logbook Storage Bug

   - [ ] Add `hasCloudStorage` to GET_CURRENT_USER query
   - [ ] Fix localStorage key mismatch
   - [ ] Test sync flow from localStorage to D1

3. **Day 5**: Cleanup
   - [ ] Remove CurriculumModule (confirmed unused)
   - [ ] Remove console.log statements
   - [ ] Fix the one `any` type usage

### Phase 2: Performance Optimizations (Week 2)

1. **Day 1-2**: Memory Leak Fixes

   - [ ] Add proper cleanup for VexFlow renderers
   - [ ] Fix event listener cleanup
   - [ ] Implement proper module disposal

2. **Day 3-4**: Query Optimizations

   - [ ] Implement DataLoader for N+1 queries
   - [ ] Add missing database indexes
   - [ ] Enable GraphQL request batching

3. **Day 5**: React Optimizations
   - [ ] Add React.memo to expensive components
   - [ ] Implement lazy loading for heavy libraries
   - [ ] Add virtualization for long scores

### Phase 3: Code Quality Improvements (Week 3-4)

1. **Refactor Large Modules**

   - [ ] Split VisualizationModule into smaller services
   - [ ] Refactor LogbookReportingModule
   - [ ] Extract shared logic into utilities

2. **Improve Test Coverage**

   - [ ] Add tests for uncovered critical paths
   - [ ] Reach 80% coverage target
   - [ ] Add integration tests for sync flow

3. **Architecture Improvements**
   - [ ] Implement proper dependency injection
   - [ ] Add proper logging service
   - [ ] Complete type alignment project

## 📊 Success Metrics

### Performance Targets

- Initial load time: 30-50% reduction
- Re-renders: 40% reduction
- Database queries: 60% reduction
- Memory usage: 25% reduction

### Security Targets

- Zero critical vulnerabilities
- All auth tokens properly secured
- Rate limiting preventing abuse
- No sensitive data in logs

### Code Quality Targets

- 80% test coverage achieved
- No modules > 500 lines
- Zero console.log statements
- Zero `any` types

## 🔧 Tooling Recommendations

### Immediate Additions

1. **DOMPurify** for HTML sanitization
2. **graphql-depth-limit** for query protection
3. **DataLoader** for query batching

### Future Considerations

1. **Sentry** for error monitoring
2. **Web Vitals** for performance monitoring
3. **Playwright** for E2E testing
4. **Storybook** for component documentation

## 📚 Related Documentation

- [DESIGN.md](./DESIGN.md) - System architecture
- [DEBUG.md](./DEBUG.md) - Debugging guide
- [ROADMAP.md](./ROADMAP.md) - Product roadmap
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guide

## 🎯 Next Steps

1. **Immediate**: Fix critical security vulnerabilities
2. **This Week**: Fix logbook storage bug and remove unused code
3. **Next Week**: Implement performance optimizations
4. **This Month**: Achieve 80% test coverage

---

_This plan should be reviewed and updated monthly as improvements are completed and new issues are discovered._
