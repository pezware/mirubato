# SCOREBOOK_UNIFIED_PLAN.md

_Last Updated: December 2024_
_Status: Active Development - Phase 4_

## Executive Summary

The Mirubato Scorebook is a comprehensive digital sheet music platform for music education. We are currently in Phase 4, focusing on advanced PDF rendering optimizations after successfully implementing basic PDF viewing, mobile support, and caching in Phases 1-3.

**Current State**: Core PDF rendering works with react-pdf, but we're transitioning to a custom pdf.js implementation for better performance and advanced features.

## Project Overview

### Mission

Build a world-class digital sheet music viewer optimized for music practice and education, with features specifically designed for sight-reading improvement.

### Key Differentiators

- Music education focus (not just PDF viewing)
- Instrument-specific features (guitar fingerings, piano hand positions)
- Practice tracking and progress analytics
- Teacher/student collaboration tools
- Offline-first architecture

## Implementation Status

### ✅ Completed Features (Phases 0-3)

#### Phase 0: Foundation (COMPLETE)

- ✅ Basic scorebook UI structure
- ✅ Score browsing interface
- ✅ Database schema for scores
- ✅ R2 storage integration

#### Phase 1: Core Viewing (COMPLETE)

- ✅ PDF.js integration via react-pdf
- ✅ Basic error handling
- ✅ File validation (magic bytes)
- ✅ CORS/CSP configuration

#### Phase 2: Mobile & Performance (COMPLETE)

- ✅ Mobile-optimized rendering (75% scale)
- ✅ Touch gestures for navigation
- ✅ Progressive page loading
- ✅ Basic memory management

#### Phase 3: Caching (COMPLETE)

- ✅ Browser Cache API integration
- ✅ CDN cache headers
- ✅ 7-day cache retention
- ✅ Cache statistics

### 🚧 In Progress (Phase 4: Advanced Rendering)

#### Custom PDF.js Implementation (40% Complete)

- ✅ Created `PdfJsViewer.tsx` component
- ✅ Implemented `PdfRenderingService` with LRU cache
- ✅ OffscreenCanvas rendering
- ✅ Adjacent page preloading logic
- ❌ **CRITICAL**: Integration between viewer and service
- ❌ Priority queue for render requests
- ❌ Viewer refactoring to use service

#### Image-Based Rendering (ABANDONED)

- ✅ Implemented Cloudflare Browser Rendering integration
- ✅ Created image-based PDF viewer component
- ✅ Added adaptive viewer selection logic
- ❌ **ABANDONED**: Browser Rendering API too unstable
- ❌ **DECISION**: Focus on client-side PDF.js rendering only
- ❌ **FUTURE**: Consider pre-rendering during upload instead

### 📋 Planned Features

#### Phase 4 Completion (4 weeks)

1. **Week 1: Integration Sprint**
   - Wire PdfJsViewer to use PdfRenderingService
   - Implement priority queue
   - Add preloading triggers
   - Create integration tests

2. **Week 2: Two-Page View**
   - Implement book/spread view
   - Handle odd/even page alignment
   - Update navigation logic
   - Responsive layout adjustments

3. **Week 3: Zoom & Pan**
   - Implement pinch-to-zoom
   - Add pan gestures
   - Boundary checking
   - Zoom presets (fit width/height)

4. **Week 4: Polish & Testing**
   - Mobile optimizations
   - Performance monitoring
   - Error recovery
   - Documentation

#### Phase 5: Search & Print (6 weeks)

- **Text Search** (2 weeks)
  - PDF.js text layer extraction
  - Search UI with highlighting
  - Navigation between results
  - Keyboard shortcuts (Ctrl+F)

- **Print Optimization** (1 week)
  - Print-specific CSS
  - Page range selection
  - Music-specific formatting
  - High-resolution output

- **IndexedDB Caching** (2 weeks)
  - Persistent page cache
  - Offline support
  - Background sync
  - Storage management

- **Performance Metrics** (1 week)
  - Analytics integration
  - Cache hit tracking
  - Render time monitoring
  - User behavior analysis

#### Phase 6: Annotations (8 weeks)

- **Basic Drawing** (3 weeks)
  - Pencil tool
  - Eraser
  - Color selection
  - Line width

- **Music Symbols** (2 weeks)
  - Fingering numbers
  - Dynamic markings
  - Musical symbols palette
  - Smart positioning

- **Storage & Sync** (3 weeks)
  - Local storage (IndexedDB)
  - Cloud sync
  - Conflict resolution
  - Export/import

#### Phase 7: Practice Tools (6 weeks)

- **Metronome Integration** (2 weeks)
  - Visual beat indicators
  - Sync with score
  - Tempo detection
  - Practice loops

- **Recording & Playback** (2 weeks)
  - Audio recording
  - Sync with score position
  - Playback with score following
  - Performance analysis

- **Progress Tracking** (2 weeks)
  - Practice time logging
  - Difficulty progression
  - Achievement system
  - Teacher dashboard

#### Phase 8: AI Features (8+ weeks)

- **Measure Detection**
  - Staff line detection
  - Measure boundaries
  - Repeat signs
  - Navigation aids

- **Practice Recommendations**
  - Difficulty analysis
  - Personalized practice plans
  - Weak spot identification
  - Progress predictions

## Technical Architecture

### Current Stack

- **Frontend**: React + TypeScript + Vite + Tailwind
- **PDF Rendering**: Transitioning from react-pdf to custom pdf.js
- **State Management**: Zustand
- **Backend**: Cloudflare Workers + D1 + R2
- **Auth**: Magic links + JWT

### Key Architectural Decisions

1. **Decouple rendering logic** into services (in progress)
2. **Offline-first** with progressive enhancement
3. **Mobile-first** design approach
4. **Microservices** architecture (separate workers)
5. **Event-driven** state management

## Immediate Action Items (Next 2 Weeks)

### Week 1: Complete Phase 4 Integration (Client-Side Focus)

1. **Day 1**: Remove image-based rendering code
   - Clean up ImageBasedPdfViewer component (keep for future reference)
   - Remove AdaptivePdfViewer image selection logic
   - Simplify to always use PDF.js viewer

2. **Day 2-3**: Refactor PdfJsViewer to use PdfRenderingService

   ```typescript
   // Replace direct rendering with:
   const imageData = await renderingService.getRenderedPage(
     pdfDoc,
     pageNum,
     scale
   )
   context.putImageData(imageData, 0, 0)
   ```

3. **Day 4**: Implement priority queue
   - High priority: Current page
   - Low priority: Preload pages
   - Cancel outdated requests

4. **Day 5**: Integration testing
   - Memory usage monitoring
   - Cache hit rate verification
   - Performance benchmarks

### Week 2: Two-Page View

1. **Day 1-2**: Layout implementation
   - Side-by-side canvas elements
   - Responsive breakpoints
   - Page alignment logic

2. **Day 3-4**: Navigation updates
   - Advance by 2 pages in book mode
   - Handle first/last page edge cases
   - Update UI controls

3. **Day 5**: Testing and polish
   - Cross-device testing
   - Performance optimization
   - Documentation

## Success Metrics

### Performance Targets

- Page render: < 100ms (p95)
- Page switch: < 50ms (p95)
- Memory usage: < 50MB mobile, < 100MB desktop
- Cache hit rate: > 80%
- Zero memory crashes

### User Experience Goals

- 4.5+ star app rating
- > 80% daily active users
- < 2% bounce rate
- > 30 min average session

### Business Metrics

- 10,000+ active users in Year 1
- 30% conversion to premium
- < $0.10 per user infrastructure cost
- 50+ educational institution partnerships

## Risk Mitigation

### Technical Risks

1. **Integration Complexity**: Start simple, add features incrementally
2. **Performance Issues**: Continuous monitoring, feature flags
3. **Browser Compatibility**: Progressive enhancement, polyfills
4. **Memory Constraints**: Aggressive caching limits, cleanup

### Business Risks

1. **Competition**: Focus on education-specific features
2. **User Adoption**: Free tier, teacher partnerships
3. **Content Licensing**: Public domain focus, user uploads
4. **Scaling Costs**: Efficient caching, CDN optimization

## Timeline Summary

- **Now - 2 weeks**: Complete Phase 4 integration
- **Weeks 3-4**: Two-page view and zoom
- **Months 2-3**: Search, print, and offline
- **Months 4-5**: Annotations system
- **Months 6-7**: Practice tools
- **Month 8+**: AI features

## Next PR Checklist

- [ ] PdfJsViewer uses PdfRenderingService
- [ ] Priority queue implemented
- [ ] Preloading functional
- [ ] Integration tests passing
- [ ] Performance metrics logged
- [ ] Documentation updated

---

_This unified plan supersedes all previous documents and represents the current state and forward direction of the Mirubato Scorebook project._
