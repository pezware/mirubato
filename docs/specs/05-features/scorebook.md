---
Spec-ID: SPEC-FEAT-002
Title: Scorebook - Sheet Music Management
Status: 🚧 Experimental
Owner: @pezware
Last-Reviewed: 2025-11-27
Version: 1.8.3
---

# Scorebook Feature Specification

Status: 🚧 Experimental

> **Beta Feature**: Scorebook is currently behind a feature flag. To enable:
>
> - Add `?beta=on` to any URL (e.g., `https://mirubato.com/?beta=on`)
> - The setting persists in sessionStorage until browser/tab is closed
> - To disable: `?beta=off`
>
> Implementation: `frontendv2/src/hooks/useBetaFeatures.ts`

## What

Comprehensive sheet music management system with PDF storage, AI metadata extraction, collection organization, and practice integration.

## Why

- Musicians need organized digital sheet music libraries
- Manual metadata entry is time-consuming and error-prone
- IMSLP integration enables access to public domain scores
- Practice tracking requires tight score integration

## How

- Upload PDFs to Cloudflare R2 storage
- Extract metadata using Workers AI
- Organize into collections and repertoire
- Integrate with practice logging
- Enable IMSLP import for public domain scores

## Recent Changes (v1.8.3)

### New Features

1. **Thumbnail Optimization** - Pre-generated thumbnails for faster grid view
   - Thumbnails are generated during PDF import (400px width, webp format)
   - Stored separately in R2 at `thumbnails/{scoreId}/thumb.webp`
   - Falls back to on-demand generation for existing scores
   - 75% quality for smaller file sizes and faster loading
   - Admin endpoint for bulk thumbnail generation: `POST /api/admin/generate-thumbnails`
   - New API endpoint: `GET /api/pdf/v2/thumbnail/:scoreId`

2. **Batch Operations** - Multi-select for bulk add to collection/delete
   - Selection mode toggle in toolbar
   - Select all / deselect all functionality
   - Checkbox on each score in list and grid view
   - Batch add selected scores to a collection
   - Batch delete selected scores with confirmation
   - New API endpoints:
     - `POST /api/scores/batch/delete` - Delete multiple scores (max 100)
     - `POST /api/user/collections/:id/scores/batch` - Add multiple scores to collection (max 100)

### Technical Improvements

- Dedicated thumbnail storage path separate from full-resolution pages
- Aggressive caching with 1-year immutable headers
- On-demand fallback with async storage for cache misses
- Lower resolution (400px vs 1200px) reduces bandwidth by ~70%
- Batch operations clean up R2 files (PDFs, rendered pages, thumbnails)
- Batch operations automatically update user collections

## Recent Changes (v1.8.2)

### New Features

1. **Pagination UI** - Load More button for large score libraries
   - Uses existing backend pagination (limit/offset)
   - Shows remaining count in button
   - Graceful loading state with spinner
   - Loads 20 scores per page

2. **Favorites System** - Star/favorite scores for quick access
   - New database table: `user_score_favorites`
   - Full API with batch support: `/api/user/favorites/*`
   - Star button in both list and grid views
   - Persistent favorite indicator on grid cards
   - Batch API eliminates N+1 queries when loading favorites
   - Graceful degradation when scores service is offline

### Technical Improvements

- All favorites service methods return safe defaults (empty arrays/objects) on error
- Favorites status loaded alongside score collections for efficiency
- Toggle favorite is optimistic and atomic

## Recent Changes (v1.8.1)

### Performance Improvements

1. **Batch Score Collections API** - New endpoint eliminates N+1 query problem
   - Reduced API calls from 60+ to 1 when loading score browser
   - `POST /api/user/collections/batch/score-collections` accepts array of score IDs
   - Returns collection memberships for all scores in a single response
2. **Frontend Optimization** - ScoreBrowser now uses batch endpoint instead of individual calls

## Recent Changes (v1.8.0)

### New Features

1. **Search & Sort** - Full-text search with debounced queries, 9 sort options
2. **View Mode Toggle** - List and grid views with persistent preferences
3. **Enhanced Import Flow** - 4-step wizard with AI processing feedback
4. **Metadata Preview** - Review/edit AI-extracted metadata before save
5. **Confidence Indicators** - Visual feedback on AI extraction reliability
6. **Grid View Component** - Thumbnail-based card layout for scores

### UI/UX Improvements

- Better empty states with contextual CTAs
- Results count and search feedback
- Responsive filter/sort/view controls
- Improved mobile layout

## User Stories

### As a Musician, I want to:

- Upload and organize my sheet music collection
- Quickly find scores by composer, title, or difficulty
- Import scores from IMSLP and other sources
- View and annotate PDFs during practice
- Share collections with other musicians
- **Search my library by title, composer, or opus** ✅ (v1.8.0)
- **Sort scores by date, title, composer, difficulty, or popularity** ✅ (v1.8.0)
- **Preview AI-extracted metadata before saving** ✅ (v1.8.0)
- **Star/favorite scores for quick access** ✅ (v1.8.2)
- **Load more scores on demand with pagination** ✅ (v1.8.2)

### As a Teacher, I want to:

- Create curated collections for students
- Track which pieces students are working on
- Share annotated scores with markings
- Organize repertoire by level and technique

## Core Features

### 1. Score Browser (Enhanced v1.8.0)

#### Search Functionality

- **Full-text search**: Title, composer, opus matching
- **Debounced queries**: 300ms delay to reduce API calls
- **Clear button**: Quick search reset
- **Results count**: Shows total matches

**Code**: `frontendv2/src/pages/ScoreBrowser.tsx`

#### Sort Options

- **Recently Added** (default): Sort by creation date descending
- **Oldest First**: Sort by creation date ascending
- **Title (A-Z/Z-A)**: Alphabetical by title
- **Composer (A-Z/Z-A)**: Alphabetical by composer
- **Difficulty**: Easy to hard or hard to easy
- **Most Popular**: By view/download count

**Persistence**: User preferences stored in localStorage

#### View Modes

- **List View**: Detailed rows with metadata, collections, quick actions
- **Grid View**: Thumbnail cards with difficulty badges and page counts

**Components**:

- `frontendv2/src/components/score/ScoreListItem.tsx` - List view item
- `frontendv2/src/components/score/ScoreGridItem.tsx` - Grid view card (NEW v1.8.0)

### 2. Score Upload & Import (Enhanced v1.8.0)

#### Import Wizard

4-step wizard flow for better UX:

1. **Upload Step**: Choose import method (PDF, images, URL)
2. **Processing Step**: Visual progress with status messages
3. **Review Step**: Preview AI-extracted metadata, edit if needed
4. **Organize Step**: Select collections for the score

**Code**: `frontendv2/src/components/score/ImportScoreModal.tsx` (rewritten v1.8.0)

#### File Upload

- **Supported formats**: PDF, JPG, PNG, JPEG
- **Max file size**: 50MB
- **Max pages**: 100 per PDF
- **Upload methods**: Direct upload, URL import, IMSLP integration, multi-image composition

**Upload Workflow**:

1. Select import method and file(s)
2. Show processing progress (uploading → analyzing → complete)
3. Display AI-extracted metadata with confidence indicators
4. Allow metadata editing before final save
5. Select target collections
6. Save and add to collections

**Code**: `scores/src/api/handlers/upload.ts`, `scores/src/services/uploadService.ts`

#### AI Metadata Preview (NEW v1.8.0)

- **Confidence indicators**: High (green), Medium (amber), Low (red)
- **Editable fields**: Title, composer, opus, instrument, difficulty
- **Additional metadata**: Key signature, time signature, style period
- **Thumbnail preview**: First page rendered as preview image

#### IMSLP Integration

- **Search API**: MediaWiki API for catalog search
- **Import flow**: Scrape page → Extract PDF URL → Download → Process
- **Metadata extraction**: Title, composer, opus, key from page structure
- **Rate limiting**: 1 import per 10 minutes per user

**Code**: `scores/src/api/handlers/import.ts`, `scores/src/services/imslpScraper.ts`

### 3. AI Metadata Extraction

#### Hybrid AI Approach

- **Primary**: Cloudflare Workers AI for text extraction
- **Fallback**: OpenAI GPT-3.5 for complex scores
- **Extraction targets**: Title, composer, opus, key, tempo, difficulty
- **Confidence scoring**: Weights AI responses by reliability

**Processing Pipeline**:

1. Convert first page to image
2. Run OCR and pattern matching
3. Extract structured metadata
4. Normalize composer names
5. Assign confidence scores
6. Return to frontend for preview/edit (NEW v1.8.0)

**Code**: `scores/src/services/hybridAiExtractor.ts`, `scores/src/services/ai/cloudflareAi.ts`

### 4. Collections & Organization

#### System Collections

- **Curated collections**: Platform-managed, featured collections
- **Categories**: Beginner, Classical, Romantic, Modern, Etudes, Seasonal
- **Metadata**: Name, description, cover image, featured flag
- **Management**: Admin-only creation and curation

**Code**: `scores/src/api/handlers/collections.ts`

#### User Collections

- **Personal libraries**: User-created collections
- **Visibility levels**: Private, public, shared
- **Default collection**: Auto-created "General" collection
- **Sharing**: Generate shareable links
- **Auto-selection**: Default collection pre-selected in import flow (NEW v1.8.0)

**Code**: `scores/src/api/handlers/userCollections.ts`

#### Favorites (NEW v1.8.2)

- **Quick access**: Star/unstar scores for quick access
- **Persistent indicator**: Favorited scores show star badge
- **Batch API**: Efficient loading with batch endpoint
- **Graceful degradation**: Works offline with cached state

**Endpoints**:

```
GET    /api/user/favorites          - List user's favorites with score details
GET    /api/user/favorites/ids      - Get favorite score IDs only (lightweight)
GET    /api/user/favorites/check/:id - Check if score is favorited
POST   /api/user/favorites/:id      - Add to favorites
DELETE /api/user/favorites/:id      - Remove from favorites
POST   /api/user/favorites/:id/toggle - Toggle favorite status
POST   /api/user/favorites/batch/check - Batch check multiple scores
```

**Database**: `user_score_favorites` table with `(user_id, score_id)` unique constraint

**Code**: `scores/src/api/handlers/favorites.ts`

### 5. Score Viewer

#### PDF Rendering

- **Adaptive rendering**: PDF.js for desktop, images for mobile
- **Page navigation**: Thumbnails, page numbers, keyboard shortcuts
- **Zoom controls**: Fit width, fit page, custom zoom
- **Full-screen mode**: Distraction-free viewing

**Code**: `frontendv2/src/components/score/PdfViewer.tsx`, `frontendv2/src/components/score/AdaptivePdfViewer.tsx`

#### Mobile Optimization

- **Image-based rendering**: Pre-rendered pages as images
- **Progressive loading**: Load pages as needed
- **Touch gestures**: Pinch to zoom, swipe to navigate
- **Offline caching**: IndexedDB storage for offline viewing

**Code**: `frontendv2/src/components/score/ImageScoreViewer.tsx`

### 6. Practice Integration

#### Score-Based Practice Logging

- **Quick log**: One-click practice session creation
- **Auto-fill metadata**: Score title, composer pre-populated
- **Page tracking**: Record which pages were practiced
- **Duration tracking**: Automatic or manual timer

**Code**: `frontendv2/src/components/score/ScoreListItem.tsx`

#### Practice Mode (Planned)

- **Metronome integration**: Sync with practice timer
- **Auto-scroll**: Configurable scroll speed
- **Annotation overlay**: Mark problem spots
- **Session recording**: Audio/video capture

### 7. Repertoire Management

#### Status Tracking

- **Status levels**: Planned → Learning → Working → Polished → Performance Ready
- **Difficulty rating**: Personal assessment 1-10
- **Personal notes**: Free-form text per piece
- **Progress history**: Timeline of status changes

**Code**: `api/src/api/handlers/repertoire.ts`

#### Analytics

- **Practice metrics**: Total time, session count, last practiced
- **Progress tracking**: Status change frequency
- **Difficulty progression**: Track skill development
- **Goal integration**: Link pieces to practice goals

## Architecture

### Storage

- **R2 Buckets**: PDF files and generated images
- **D1 Database**: Metadata, collections, user data
- **KV Cache**: Rendered pages, search results
- **localStorage**: User preferences (view mode, sort) (NEW v1.8.0)

### Processing

- **Queue-based**: Async processing for imports and rendering
- **Workers AI**: Metadata extraction and OCR
- **Browser Rendering API**: PDF to image conversion

## Code References

### Frontend Components

- Score browser: `frontendv2/src/pages/ScoreBrowser.tsx` (enhanced v1.8.0)
- Score viewing: `frontendv2/src/components/score/ScoreViewer.tsx`
- PDF rendering: `frontendv2/src/components/score/PdfViewer.tsx`
- Mobile viewer: `frontendv2/src/components/score/ImageScoreViewer.tsx`
- Import modal: `frontendv2/src/components/score/ImportScoreModal.tsx` (rewritten v1.8.0)
- List item: `frontendv2/src/components/score/ScoreListItem.tsx`
- Grid item: `frontendv2/src/components/score/ScoreGridItem.tsx` (NEW v1.8.0)
- Collections: `frontendv2/src/components/score/CollectionsManager.tsx`

### Backend Services

- Upload handler: `scores/src/api/handlers/upload.ts`
- Import handler: `scores/src/api/handlers/import.ts`
- AI extraction: `scores/src/services/hybridAiExtractor.ts`
- IMSLP scraper: `scores/src/services/imslpScraper.ts`
- R2 storage: `scores/src/api/handlers/serveR2.ts`

### Service Layer

- Score service: `frontendv2/src/services/scoreService.ts` (enhanced v1.8.0)
  - Added `sortBy` and `sortOrder` parameters to search

### Database

- Scores table: `scores/migrations/0001_initial_schema.sql`
- Collections: `scores/migrations/0011_create_user_collections_table.sql`
- Analytics: `scores/migrations/0001_initial_schema.sql`

## Operational Limits

- **File size**: 50MB maximum per PDF
- **Page count**: 100 pages maximum per PDF
- **Import rate**: 1 IMSLP import per 10 minutes
- **Collection size**: 1000 scores per collection
- **Render timeout**: 30 seconds for PDF processing
- **AI extraction**: 10 seconds timeout
- **Search debounce**: 300ms delay (NEW v1.8.0)

## Failure Modes

- **Upload failures**: Network interruption → Retry with resume
- **AI extraction fails**: Low confidence → Show warning, allow manual edit (IMPROVED v1.8.0)
- **IMSLP unavailable**: Scraping fails → Manual metadata entry
- **R2 unavailable**: Storage errors → Queue for retry
- **PDF corrupt**: Rendering fails → Show error, allow re-upload
- **Rate limit hit**: Too many imports → Show cooldown timer
- **Search fails**: API error → Show error message, allow retry

## Performance Optimization

### Caching Strategy

- **KV cache**: Rendered pages cached for 7 days
- **Browser cache**: Static assets with long TTL
- **IndexedDB**: Offline score storage
- **localStorage**: User preferences for instant load (NEW v1.8.0)

### Search Optimization

- **Debounced queries**: 300ms delay reduces API calls
- **Persistent sort**: Remembered between sessions
- **Lazy rendering**: Grid thumbnails load on scroll

### Rendering Optimization

- **Lazy loading**: Render pages on demand
- **Progressive enhancement**: Low-res preview → High-res on zoom
- **Streaming**: Start rendering before full download

## Decisions

- **R2 over D1 for files** (2024-03): Binary storage optimized for large files
- **Hybrid AI approach** (2024-06): Cloudflare AI primary, OpenAI fallback
- **Image rendering for mobile** (2024-07): Better performance than PDF.js
- **Queue-based processing** (2024-08): Prevents timeout on large files
- **Composer canonicalization** (2024-09): Consistent naming across system
- **Step wizard for import** (2024-11): Better UX than single-form approach (NEW v1.8.0)
- **localStorage for preferences** (2024-11): Instant load without API call (NEW v1.8.0)

## Non-Goals

- Music notation editing (view-only)
- MIDI/MusicXML playback (PDF focus)
- Copyright content detection (user responsibility)
- Optical music recognition (OMR)
- Real-time collaboration on scores

## TODO / Roadmap

### High Priority

- [x] **Pagination**: Add infinite scroll or pagination for large libraries (v1.8.2)
- [x] **Thumbnail optimization**: Pre-generate thumbnails for faster grid view (v1.8.3)
- [x] **Metadata update API**: Allow updating score metadata after import (backend existed, v1.7.x)
- [x] **Batch operations**: Multi-select for bulk add to collection/delete (v1.8.3)

### Medium Priority

- [ ] **Advanced search**: Filter by key, time signature, style period
- [ ] **Recent scores**: Quick access section for recently viewed
- [x] **Favorites**: Star/favorite scores for quick access (v1.8.2)
- [ ] **Practice history**: Show practice sessions for each score
- [ ] **Score recommendations**: Suggest similar pieces

### Low Priority

- [ ] **Keyboard shortcuts**: Navigate grid/list with arrow keys
- [ ] **Drag-and-drop**: Reorder scores in collections
- [ ] **Export**: Download scores as ZIP with metadata
- [ ] **Annotation persistence**: Save markings to database

## Open Questions

- Should we support ABC notation or LilyPond formats?
- How to handle very large scores (>100 pages)?
- When to implement annotation persistence?
- Should we add score recommendation engine?
- How to monetize premium features?

## Security & Privacy Considerations

- **File validation**: Check MIME types and magic bytes
- **Virus scanning**: Consider ClamAV integration
- **Access control**: User can only access own scores
- **Sharing permissions**: Explicit consent for public scores
- **CORS policies**: Restrict R2 access to app domain
- **Rate limiting**: Prevent abuse of AI and import features

## Related Documentation

- [Scores Service API](../03-api/service-apis.md#scores-service-api)
- [AI Services](../06-integrations/ai-services.md)
- [IMSLP Integration](../06-integrations/imslp.md)
- [Repertoire](./repertoire.md)

---

Last updated: 2025-11-27 | Version 1.8.3
