---
Spec-ID: SPEC-FEAT-002
Title: Scorebook - Sheet Music Management
Status: 🚧 Experimental
Owner: @pezware
Last-Reviewed: 2025-09-11
Version: 1.7.6
---

# Scorebook Feature Specification

Status: 🚧 Experimental

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

## User Stories

### As a Musician, I want to:

- Upload and organize my sheet music collection
- Quickly find scores by composer, title, or difficulty
- Import scores from IMSLP and other sources
- View and annotate PDFs during practice
- Share collections with other musicians

### As a Teacher, I want to:

- Create curated collections for students
- Track which pieces students are working on
- Share annotated scores with markings
- Organize repertoire by level and technique

## Core Features

### 1. Score Upload & Import

#### File Upload

- **Supported formats**: PDF, JPG, PNG, JPEG
- **Max file size**: 50MB
- **Max pages**: 100 per PDF
- **Upload methods**: Direct upload, URL import, IMSLP integration, mobile scan (planned)

**Upload Workflow**:

1. Validate file format and size
2. Generate unique score ID
3. Upload to R2 storage
4. Extract metadata via AI
5. Generate thumbnail preview
6. Save metadata to database

**Code**: `scores/src/api/handlers/upload.ts`, `scores/src/services/uploadService.ts`

#### IMSLP Integration

- **Search API**: MediaWiki API for catalog search
- **Import flow**: Scrape page → Extract PDF URL → Download → Process
- **Metadata extraction**: Title, composer, opus, key from page structure
- **Rate limiting**: 1 import per 10 minutes per user

**Code**: `scores/src/api/handlers/import.ts`, `scores/src/services/imslpScraper.ts`

### 2. AI Metadata Extraction

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

**Code**: `scores/src/services/hybridAiExtractor.ts`, `scores/src/services/ai/cloudflareAi.ts`

### 3. Collections & Organization

#### System Collections

- **Curated collections**: Platform-managed, featured collections
- **Categories**: Beginner, Classical, Romantic, Modern, Etudes, Seasonal
- **Metadata**: Name, description, cover image, featured flag
- **Management**: Admin-only creation and curation

**Code**: `scores/src/api/handlers/collections.ts`

#### User Collections

- **Personal libraries**: User-created collections
- **Visibility levels**: Private, public, shared
- **Sharing**: Generate shareable links
- **Collaboration**: Future support for shared editing

**Code**: `scores/src/api/handlers/user-collections.ts`

### 4. Score Viewer

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

### 5. Practice Integration

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

### 6. Repertoire Management

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

### Processing

- **Queue-based**: Async processing for imports and rendering
- **Workers AI**: Metadata extraction and OCR
- **Browser Rendering API**: PDF to image conversion

## Code References

### Frontend Components

- Score viewing: `frontendv2/src/components/score/ScoreViewer.tsx`
- PDF rendering: `frontendv2/src/components/score/PdfViewer.tsx`
- Mobile viewer: `frontendv2/src/components/score/ImageScoreViewer.tsx`
- Import modal: `frontendv2/src/components/score/ImportScoreModal.tsx`
- Collections: `frontendv2/src/components/score/CollectionsManager.tsx`

### Backend Services

- Upload handler: `scores/src/api/handlers/upload.ts`
- Import handler: `scores/src/api/handlers/import.ts`
- AI extraction: `scores/src/services/hybridAiExtractor.ts`
- IMSLP scraper: `scores/src/services/imslpScraper.ts`
- R2 storage: `scores/src/api/handlers/serveR2.ts`

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

## Failure Modes

- **Upload failures**: Network interruption → Retry with resume
- **AI extraction fails**: Low confidence → Fallback to filename parsing
- **IMSLP unavailable**: Scraping fails → Manual metadata entry
- **R2 unavailable**: Storage errors → Queue for retry
- **PDF corrupt**: Rendering fails → Show error, allow re-upload
- **Rate limit hit**: Too many imports → Show cooldown timer

## Performance Optimization

### Caching Strategy

- **KV cache**: Rendered pages cached for 7 days
- **Browser cache**: Static assets with long TTL
- **IndexedDB**: Offline score storage

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

## Non-Goals

- Music notation editing (view-only)
- MIDI/MusicXML playback (PDF focus)
- Copyright content detection (user responsibility)
- Optical music recognition (OMR)
- Real-time collaboration on scores

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

Last updated: 2025-09-11 | Version 1.7.6
