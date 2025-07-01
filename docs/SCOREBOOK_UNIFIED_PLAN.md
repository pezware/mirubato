# SCOREBOOK_UNIFIED_PLAN.md

_Last Updated: June 2025_
_Status: Active Development - Phase 5_

## Executive Summary

The Mirubato Scorebook is a comprehensive digital sheet music platform for music education. We have completed Phase 4 (advanced PDF rendering) and are now in Phase 5, implementing an AI-powered content import system and building the music library.

**Current State**: Custom PDF.js rendering is complete and performant. Focus has shifted to content acquisition through an intelligent import API that leverages AI for metadata extraction.

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

### ✅ Completed (Phase 4: Advanced Rendering) - December 2024

#### Custom PDF.js Implementation (100% Complete)

- ✅ Created `PdfJsViewer.tsx` component
- ✅ Implemented `PdfRenderingService` with LRU cache
- ✅ OffscreenCanvas rendering for performance
- ✅ Adjacent page preloading with smart strategies
- ✅ **COMPLETED**: Full integration between viewer and service
- ✅ Memory management with configurable limits
- ✅ Performance monitoring and metrics collection
- ✅ Document caching to prevent redundant loads
- ✅ Mobile optimizations with reduced preload range

#### Image-Based Rendering (ABANDONED)

- ✅ Implemented Cloudflare Browser Rendering integration
- ✅ Created image-based PDF viewer component
- ✅ Added adaptive viewer selection logic
- ❌ **ABANDONED**: Browser Rendering API too unstable
- ❌ **DECISION**: Focus on client-side PDF.js rendering only
- ❌ **FUTURE**: Consider pre-rendering during upload instead

### ✅ Completed Phase: AI-Powered Content System

#### Phase 5: Smart Import API & Content Library (July 2025) - COMPLETE

##### ✅ Completed Features:

1. **PDF Import Endpoint** (`/api/scores/import`)
   - ✅ Accepts any PDF URL for import
   - ✅ Supports direct file upload via base64 data URLs
   - ✅ Validates PDF format and magic bytes
   - ✅ Stores PDFs in R2 with unique IDs
   - ✅ Creates database records with metadata

2. **AI Metadata Extraction**
   - ✅ Gemini 1.5 Pro integration for PDF analysis
   - ✅ Extracts: title, composer, instrument, difficulty, opus
   - ✅ Identifies: style period, tags, educational descriptions
   - ✅ Confidence scoring with graceful fallback
   - ✅ ~5-8 second processing time per PDF

3. **Enhanced Rate Limiting**
   - ✅ Progressive rate limiting with failure tracking
   - ✅ 1 request per 10 minutes for anonymous users
   - ✅ Unlimited with JWT authentication
   - ✅ Ban system for repeated failures (5 failures = 1 hour ban)
   - ✅ Doubles wait time for each failure

4. **Frontend Import UI**
   - ✅ React component at `/scorebook/import`
   - ✅ Support for URL import and file upload
   - ✅ Real-time validation and error messages
   - ✅ Shows AI extraction results and warnings
   - ✅ Progress indicators and success feedback

5. **Content Sources**
   - ✅ Switched from IMSLP to Mutopia Project
   - ✅ Direct PDF access without scraping
   - ✅ Tested with various instruments (piano, guitar)
   - ✅ Support for any public PDF URL

6. **Recent Improvements** (Dec 2024)
   - ✅ Fixed file upload functionality in ScoreManagement
   - ✅ Implemented drag & drop for PDF uploads
   - ✅ Fixed search API response handling
   - ✅ Added predictive search with debouncing
   - ✅ Fixed routing conflicts on staging
   - ✅ Implemented PDF serving from R2
   - ✅ Optimized R2 cache headers (1 year immutable)
   - ✅ Decision: Keep R2 private for licensing safety

### 🚧 Current Development: User Collections & Image Uploads

#### Phase 5.5: Personal Score Collections (January 2025) - IN PROGRESS

##### Features to Implement:

1. **Image Upload for Personal Scores**
   - Accept PNG, JPG, JPEG formats (photos of paper scores)
   - Support multiple images per score (for multi-page pieces)
   - Optional metadata: title, composer (with "Unknown" defaults)
   - Store in user-specific R2 paths (`user-uploads/{userId}/{scoreId}/`)

2. **AI Processing for Images**
   - Send images to Gemini for metadata extraction
   - Handle fragmented/partial scores gracefully
   - Lower confidence thresholds for handwritten music
   - Store AI confidence scores for future improvements

3. **User Collections**
   - "My Uploads" collection auto-created for each user
   - Custom collections for organization
   - Private by default (no public sharing initially)
   - Collection sharing in future phases

4. **Frontend Updates**
   - Add image upload to ScoreManagement component
   - Support drag & drop for multiple images
   - Image preview before upload
   - Reorder pages interface for multi-image scores

5. **Database Schema Updates**

   ```sql
   -- Add to scores table
   ALTER TABLE scores ADD COLUMN user_id TEXT;
   ALTER TABLE scores ADD COLUMN visibility TEXT DEFAULT 'private';
   ALTER TABLE scores ADD COLUMN source_type TEXT; -- 'pdf', 'image', 'multi-image'
   ALTER TABLE scores ADD COLUMN page_count INTEGER DEFAULT 1;

   -- User collections table
   CREATE TABLE user_collections (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     name TEXT NOT NULL,
     description TEXT,
     is_default BOOLEAN DEFAULT FALSE,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );

   -- Score pages for multi-image scores
   CREATE TABLE score_pages (
     id TEXT PRIMARY KEY,
     score_id TEXT NOT NULL,
     page_number INTEGER NOT NULL,
     image_url TEXT NOT NULL,
     r2_key TEXT NOT NULL,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (score_id) REFERENCES scores(id)
   );
   ```

##### Technical Considerations:

- **Privacy**: All user uploads stored in private R2 paths
- **Rate Limiting**: Same limits apply (1/10min anon, unlimited auth)
- **File Size**: Max 10MB per image, 50MB total per score
- **Processing**: Queue system for AI analysis of images
- **Storage**: Separate tracking of user storage quotas

##### 📋 Next Steps: Enhanced Features

1. **Two-Page View Implementation** (After Phase 5.5)
2. **Touch Gesture Support**
   - Pinch-to-zoom with gesture library
   - Pan/drag with boundary checking
   - Momentum scrolling
   - Double-tap zoom

3. **Zoom Controls UI**
   - Zoom buttons (+/-/fit)
   - Preset levels (50%, 75%, 100%, 125%, 150%)
   - Maintain zoom across pages
   - Mobile-optimized controls

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
- **PDF Rendering**: Custom pdf.js implementation with service architecture
- **State Management**: Zustand
- **Backend**: Cloudflare Workers + D1 + R2
- **Auth**: Magic links + JWT
- **AI Integration**: Gemini 1.5 Pro for metadata extraction (✅ IMPLEMENTED)
- **Rate Limiting**: Enhanced KV-based with failure tracking (✅ IMPLEMENTED)

### Completed PDF Rendering Architecture

```
PdfJsViewer.tsx (UI Component)
    ↓
usePdfRenderingService() hook
    ↓
PdfRenderingService.ts (Rendering Engine)
    ├── Document Management (caching, deduplication)
    ├── LRU Cache (memory-aware, configurable limits)
    ├── Render Pipeline (OffscreenCanvas → ImageData)
    └── Smart Preloading (device & mode aware)
```

**Key Features:**

- **Memory Management**: LRU cache with configurable limits (100MB desktop, 50MB mobile)
- **Performance**: OffscreenCanvas rendering, <100ms page renders
- **Smart Preloading**: Different strategies for single/double page views
- **Metrics**: Built-in performance monitoring and cache statistics
- **Mobile Optimized**: Reduced preload range and memory limits on mobile

### New Import API Architecture

```
Import Request → Rate Limiter → PDF Fetcher → Validator
                     ↓              ↓            ↓
                KV Storage    HTTP Client   Magic Bytes
                     ↓              ↓            ↓
                JWT Check      R2 Upload    AI Analysis
                                              ↓
                                        Gemini API
                                              ↓
                                    Metadata Extraction
                                              ↓
                                     Database Insert
```

**Import Features:**

- **Flexible Sources**: Any public PDF URL (Mutopia, IMSLP proxy, direct links)
- **Smart Validation**: PDF magic bytes verification
- **AI Metadata**: Gemini-powered extraction (title, composer, difficulty, etc.)
- **Rate Protection**: 1/10min anonymous, unlimited with JWT
- **Future Monetization**: Different JWT tiers for API access

### Key Architectural Decisions

1. **Decoupled rendering logic** into services ✅ COMPLETED
2. **Offline-first** with progressive enhancement
3. **Mobile-first** design approach
4. **Microservices** architecture (separate workers)
5. **Event-driven** state management

## Immediate Action Items (Next 2 Weeks)

### Week 1: AI Integration & Content Import

1. **Day 1-2**: Gemini API Integration
   - Add Gemini API key to environment variables
   - Implement PDF-to-image conversion for AI analysis
   - Create metadata extraction prompts
   - Test with various PDF types

2. **Day 3-4**: Import Workflow Enhancement
   - Build admin UI for bulk imports
   - Add import status tracking
   - Create validation rules for AI-extracted data
   - Implement confidence thresholds

3. **Day 5**: Initial Content Library
   - Import 20-30 pieces from Mutopia Project
   - Verify metadata accuracy
   - Create initial collections by difficulty/instrument
   - Test browsing interface

### Week 2: Two-Page View & Zoom

1. **Day 1-2**: Two-Page View
   - Add view mode toggle (single/double)
   - Side-by-side page rendering
   - Handle odd/even page alignment
   - Responsive breakpoints for tablets

2. **Day 3-4**: Zoom & Pan Features
   - Pinch-to-zoom gestures
   - Zoom controls UI (+/-/fit)
   - Pan with boundary checking
   - Maintain zoom across pages

3. **Day 5**: Testing & Deployment
   - Performance testing with real scores
   - Mobile device testing
   - Deploy to staging
   - Monitor import API usage

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

- **✅ Phase 4 Complete**: Advanced PDF rendering with custom pdf.js
- **✅ Phase 5 Complete**: AI-powered import API with Gemini integration
- **✅ Phase 5.5 Complete**: Data seeding refactor - unified approach
  - Created `seeds/` directory with environment-specific data
  - Removed PDFs from repo (use import API instead)
  - Single source of truth for all seed data
- **✅ Dec 2024 Improvements**:
  - Fixed upload/search functionality
  - Added predictive search
  - Optimized R2 caching
  - Decision: Keep R2 private for licensing
- **🚧 Current (Jan 2025)**: Phase 5.5 - User Collections & Image Uploads
  - Image upload for paper scores
  - AI metadata extraction for images
  - Personal collections system
  - Multi-page image support
- **Next - Week 1**: Complete image upload implementation
- **Week 2**: Two-page view and zoom features
- **Weeks 3-4**: Build initial content library (50+ scores)
- **Month 2**: Search, print, and offline support
- **Months 3-4**: Annotations system
- **Months 5-6**: Practice tools integration
- **Month 7+**: Advanced AI features (measure detection, practice recommendations)

## Next PR Checklist

Phase 5 Complete:

- [x] Import API endpoint implemented
- [x] Rate limiting with KV storage and failure tracking
- [x] Database migrations for import columns
- [x] Gemini 1.5 Pro API integration for metadata
- [x] Frontend import UI at `/scorebook/import`
- [x] Support for both URL and file upload
- [x] Graceful error handling and user feedback

Dec 2024 Improvements Complete:

- [x] Fixed file upload functionality
- [x] Implemented drag & drop
- [x] Fixed search API handling
- [x] Added predictive search
- [x] Optimized R2 caching (1 year immutable)
- [x] PDF serving from R2

Current Phase (5.5 - User Collections):

- [ ] Database schema updates for user collections
- [ ] Image upload endpoint (`/api/import/image`)
- [ ] Multi-image support for scores
- [ ] AI metadata extraction for images
- [ ] Frontend image upload UI
- [ ] User collections management UI
- [ ] Private storage paths for user uploads
- [ ] "My Uploads" default collection

Next Phase (Phase 6):

- [ ] Two-page view toggle
- [ ] Zoom controls implementation
- [ ] Touch gesture support
- [ ] Initial content library (50+ scores)
- [ ] Print optimization

---

_This unified plan supersedes all previous documents and represents the current state and forward direction of the Mirubato Scorebook project._
