# Scorebook Feature Documentation

## Overview

The Scorebook feature provides a clean, focused interface for displaying sheet music with practice tracking capabilities. It is accessible to all users with enhanced features for authenticated users.

## Quick Start

### Using the All-in-One Script

```bash
./start-scorebook.sh
```

This script starts all services including test PDF seeding for local development.

### Manual Setup

Open two terminals:

**Terminal 1 - Scores Service:**

```bash
cd scores
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontendv2
npm run dev
```

### Test URLs

- **Score Browser**: http://www-mirubato.localhost:4000/scorebook
- **Test Score 1**: http://www-mirubato.localhost:4000/scorebook/test_aire_sureno
- **Test Score 2**: http://www-mirubato.localhost:4000/scorebook/test_romance_anonimo
- **API Health**: http://mirubato-api.localhost:9787/health
- **Test PDFs**:
  - http://mirubato-scores.localhost:9788/api/test-data/score_01.pdf
  - http://mirubato-scores.localhost:9788/api/test-data/score_02.pdf

## Architecture

### Key Design Decisions

1. **Deployment**: Initially deployed within frontendv2 worker (consider separate worker in future)
2. **Access Model**: Read-only for non-authenticated, full features for authenticated users
3. **UI Philosophy**: Clean, minimal interface with focus on score display
4. **Integration**: No navigation links initially - manual testing before integration

### Technical Stack

- **Frontend**: React + TypeScript + Vite + Tailwind + Zustand
- **API**: Cloudflare Workers + Hono + D1 (SQLite) + R2 (Object Storage)
- **PDF Viewing**: Client-side PDF.js rendering (image-based rendering abandoned)
- **AI Integration**: Cloudflare AI (primary) + Gemini (fallback) for metadata extraction
- **Audio**: Tone.js for metronome (not yet implemented)

### Component Structure

```
frontendv2/src/
├── pages/
│   ├── Scorebook.tsx              # Main viewer page
│   └── ScoreBrowser.tsx           # Browse/search page
├── components/score/
│   ├── ScoreViewer.tsx            # PDF display component
│   ├── PdfViewer.tsx              # React-pdf based viewer
│   ├── PdfJsViewer.tsx            # Custom PDF.js viewer (WIP)
│   ├── ImageBasedPdfViewer.tsx   # Image viewer (abandoned)
│   ├── AdaptivePdfViewer.tsx     # Viewer selector (simplified)
│   ├── ScoreControls.tsx          # Floating control bar
│   └── ScoreManagement.tsx        # Library management
├── services/
│   ├── scoreService.ts            # API client
│   └── PdfRenderingService.ts     # PDF rendering engine (WIP)
├── stores/
│   └── scoreStore.ts              # Zustand store
└── routes/
    └── scorebook.tsx              # Route definitions
```

### PDF Rendering Architecture Decision

After extensive testing, we've made the following architectural decisions:

1. **Client-Side Only**: All PDF rendering happens in the browser using PDF.js
2. **No Server Rendering**: Cloudflare Browser Rendering API proved too unstable
3. **Progressive Enhancement**: Start with basic react-pdf, migrate to custom PDF.js
4. **Future Consideration**: Pre-render PDFs during upload process if needed

## Local Development with R2/Miniflare

### Key Principle: Use Miniflare for Local Development

**DO NOT** use actual R2 buckets for local development. Instead, use Miniflare's built-in R2 simulation that comes with `wrangler dev`.

### How It Works

1. **Wrangler Configuration** (`wrangler.toml`):

   ```toml
   [[r2_buckets]]
   binding = "SCORES_BUCKET"
   bucket_name = "mirubato-scores-production"  # Ignored in local dev
   ```

2. **Run Development Server**:

   ```bash
   cd scores
   npm run dev  # This runs: wrangler dev --env local
   ```

3. **Miniflare Automatically**:
   - Creates a local R2 simulation
   - Stores data in `.wrangler/state/` (or in-memory)
   - Makes it available as `env.SCORES_BUCKET` in your code

### Seeding Test Data

The `seed-r2-miniflare.sh` script creates placeholder PDFs in local R2:

```bash
cd scores
./scripts/seed-r2-miniflare.sh
```

This calls the `/api/dev/seed` endpoint which creates test PDFs in Miniflare's R2 storage.

### Benefits

1. **Speed**: No network latency - everything is local
2. **Cost**: Free - no R2 API charges
3. **Offline**: Works without internet connection
4. **Isolation**: Each developer has their own storage
5. **Clean State**: Easy to reset by restarting wrangler

### Troubleshooting

**PDFs Not Loading?**

1. Make sure `wrangler dev` is running
2. Run the seed script to create test PDFs
3. Check browser console for CORS errors

**Reset Local R2?**

```bash
# Stop wrangler dev, then:
rm -rf .wrangler/state
# Start wrangler dev again
```

## Core Features

### 1. Score Display (All Users)

- PDF viewing with pagination
- Clean, focused interface
- Loading states and error handling
- Support for image-based scores

### 2. Score Browsing (All Users)

- Search by title, composer, instrument, difficulty
- Browse curated collections
- Filter and sort options
- Public scores only for anonymous users

### 3. Practice Tracking (Authenticated Users)

- Start/stop recording button
- Track time spent per session
- Auto-save to logbook on completion

### 4. Metronome Integration

- Adjustable tempo (40-240 BPM)
- Visual indicator
- Audio not yet implemented

### 5. Score Management (Authenticated Users)

- Upload PDFs via URL or file
- Upload images of paper scores (NEW)
- Organize in personal collections
- Private by default for user uploads

### 6. Enhanced Collections System (Authenticated Users) - NEW (July 2025)

- **Role-Based Access Control**:
  - **Admin** (@mirubato.com): Create featured collections, manage all content
  - **Teacher**: Share collections with students, request featuring
  - **User**: Personal collections only, private by default

- **Tag-Based Collections**:
  - Many-to-many relationship between scores and collections
  - User namespace isolation (multiple users can have "Practice" collection)
  - Collections act like tags for organizing scores
  - Scores can belong to multiple collections

- **Visibility Inheritance**:
  - Scores inherit visibility from their most permissive collection
  - Adding to public/featured collection makes score public
  - Removing from all public collections reverts to private
  - Automatic visibility updates tracked in log

- **Default Behavior**:
  - All new uploads go to user's "General" collection
  - Private by default for user uploads
  - Public by default for anonymous uploads
  - Teachers can share collections with specific users

- **Frontend Status**: Backend complete, UI implementation pending

## API Endpoints

### Public Endpoints

- `GET /api/scores` - List all public scores
- `GET /api/scores/:id` - Get specific score metadata
- `GET /api/collections` - List public collections
- `GET /api/collections/featured` - List featured collections (NEW)
- `GET /api/search` - Search public scores
- `GET /api/test-data/:filename` - Serve test PDFs (development only)

### Protected Endpoints (Authentication Required)

- `POST /api/import` - Import score from URL or file upload
  - Supports `aiProvider` parameter: `cloudflare` (default), `gemini`, or `hybrid`
  - Enhanced slug generation with opus information
  - Automatically adds to user's default collection
- `POST /api/import/image` - Upload score images (planned)
- `GET /api/user/scores` - List user's private scores
- `GET /api/user/collections` - List user's collections
- `GET /api/user/collections/:id` - Get collection with scores
- `POST /api/user/collections` - Create new collection
- `PUT /api/user/collections/:id` - Update collection
- `DELETE /api/user/collections/:id` - Delete collection
- `POST /api/user/collections/:id/scores` - Add score to collection
- `DELETE /api/user/collections/:id/scores/:scoreId` - Remove score from collection

### Teacher Endpoints (Teacher/Admin Only)

- `GET /api/collections/shared/with-me` - Collections shared with me
- `GET /api/collections/shared/by-me` - Collections I've shared
- `POST /api/collections/shared/:id/share` - Share collection with users
- `DELETE /api/collections/shared/:id/share` - Unshare collection

### Admin Endpoints (Admin Only)

- `POST /api/collections/featured/feature` - Feature a collection
- `DELETE /api/collections/featured/feature/:id` - Unfeature a collection
- `PUT /api/collections/featured/order` - Reorder featured collections

### Development Endpoints

- `POST /api/dev/seed` - Seed test data (local only)

## State Management

```typescript
interface ScoreStore {
  // Current score
  currentScore: Score | null
  currentPage: number
  totalPages: number

  // Collections
  collections: Collection[]
  filteredScores: Score[]

  // Practice session
  practiceSession: PracticeSession | null
  isRecording: boolean
  sessionDuration: number

  // Metronome
  metronomeSettings: MetronomeSettings
  isMetronomeActive: boolean

  // UI state
  showManagement: boolean
  autoScrollEnabled: boolean

  // Actions
  loadScore: (id: string) => Promise<void>
  setPage: (page: number) => void
  startPractice: () => void
  stopPractice: () => void
  // ... etc
}
```

## Test Data

### Sample Scores

1. **score_01.pdf** - "Aire Sureño" by Agustín Barrios Mangoré
   - Classical guitar, advanced (level 8)
   - Single page - perfect for basic display testing
   - ID: `test_aire_sureno`

2. **score_02.pdf** - "Romance" (Spanish Romance), arr. Eythor Thorlaksson
   - Classical guitar, intermediate (level 5)
   - 3 pages - essential for pagination testing
   - ID: `test_romance_anonimo`

### Database Seeding

```bash
cd scores
npm run seed:local  # Seeds test scores in D1 database
```

## Testing Checklist

### Score Display

- [ ] PDF loads correctly
- [ ] Page navigation works for multi-page score
- [ ] Loading spinner shows while PDF loads
- [ ] Error states display properly

### Floating Controls

- [ ] Practice recording button (authenticated users only)
- [ ] Metronome toggle and tempo adjustment
- [ ] Auto-scroll toggle
- [ ] Management menu opens/closes

### Score Browser

- [ ] All scores display in grid
- [ ] Filter by instrument works
- [ ] Filter by difficulty works
- [ ] Collections show correctly
- [ ] Clicking score navigates to viewer

### Management Panel

- [ ] Search functionality
- [ ] My Scores section (authenticated)
- [ ] Upload area shows (authenticated)
- [ ] Collections browsing

### Authentication Awareness

- [ ] Read-only mode for anonymous users
- [ ] Full access indicator for authenticated users
- [ ] Practice tracking only available when signed in

## Recent Improvements (July 2025)

1. **Enhanced Collections System**:
   - Role-based access control (admin, teacher, user)
   - Tag-based collections with many-to-many relationships
   - Visibility inheritance from collections to scores
   - Featured collections for platform curation
   - Teacher collection sharing functionality
   - Default "General" collection for all users

2. **Backend Architecture Updates**:
   - Enhanced auth utilities with role detection
   - Visibility service for automatic updates
   - Collection namespacing for user isolation
   - Comprehensive logging of visibility changes

3. **Previous Improvements** (Jan 2025):
   - Cloudflare AI integration (25x cheaper than Gemini)
   - Slug generation with opus information
   - Image upload support (backend ready)

## Known Issues & Next Steps

### Current Limitations

1. **PDF Display**:
   - Currently using react-pdf for basic rendering
   - Custom PDF.js implementation in progress (40% complete)
   - Image-based rendering abandoned due to Cloudflare Browser API instability

2. **Metronome**: Audio not yet implemented
   - Tone.js integration needed

3. **Practice Tracking**: Not yet saving to logbook
   - Integration with logbook store needed

4. **Hardcoded Values**:
   - `totalPages` in scoreStore should come from API
   - Test score URLs should be data-driven

### Future Enhancements

1. **Advanced Practice Features**
   - Loop sections
   - Slow practice mode
   - Recording and playback
   - Mistake detection

2. **Social Features**
   - Share practice progress
   - Teacher assignments
   - Group challenges

3. **AI Integration** (Partially Complete)
   - ✅ Metadata extraction with Cloudflare AI
   - ✅ Visual analysis of sheet music
   - ✅ Confidence scoring and validation
   - [ ] Difficulty analysis
   - [ ] Practice recommendations
   - [ ] Automated feedback

## Security & Access Control

1. **Read-Only Mode**
   - All users can view public scores
   - No upload/edit capabilities
   - Limited to browsing and viewing

2. **Authenticated Features**
   - Upload personal scores
   - Save to library
   - Practice tracking
   - Annotations and notes

3. **API Security**
   - JWT authentication for protected endpoints
   - Rate limiting
   - File upload validation
   - CORS configuration

## Performance Considerations

1. **Lazy Loading**
   - Load PDF viewer only when needed
   - Chunk score rendering libraries
   - Progressive image loading

2. **Caching Strategy**
   - Cache rendered scores in IndexedDB
   - Service worker for offline access
   - CDN for static score files

3. **Optimization**
   - Virtual scrolling for long scores
   - WebWorker for rendering
   - Debounced API calls

## Success Metrics

1. **User Engagement**
   - Daily active users
   - Average session duration
   - Scores viewed per session
   - Practice sessions completed

2. **Technical Performance**
   - Page load time < 2s
   - Render time < 1s
   - API response < 200ms
   - 99.9% uptime

3. **Feature Adoption**
   - % users using metronome
   - % users tracking practice
   - Upload conversion rate
   - Library size growth
