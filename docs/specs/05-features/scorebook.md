# Scorebook Feature Specification

## Overview

The Scorebook is Mirubato's comprehensive sheet music management system, providing PDF storage, AI-powered metadata extraction, collection organization, and seamless integration with practice tracking. It leverages Cloudflare R2 for storage and Workers AI for intelligent processing.

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

```typescript
interface ScoreUpload {
  // Supported formats
  formats: ['pdf', 'jpg', 'png', 'jpeg']
  maxFileSize: 50 * 1024 * 1024 // 50MB
  maxPages: 100

  // Upload methods
  methods: {
    direct: 'Drag & drop or file picker'
    url: 'Import from URL'
    imslp: 'IMSLP integration'
    scan: 'Mobile camera scan'
  }
}

// Upload workflow
async function uploadScore(file: File): Promise<Score> {
  // 1. Validate file
  validateFile(file)

  // 2. Generate unique ID
  const scoreId = crypto.randomUUID()

  // 3. Upload to R2
  const fileUrl = await uploadToR2(file, scoreId)

  // 4. Extract metadata
  const metadata = await extractMetadata(fileUrl)

  // 5. Generate preview
  const thumbnail = await generateThumbnail(fileUrl)

  // 6. Save to database
  return await saveScore({
    id: scoreId,
    title: metadata.title || file.name,
    composer: metadata.composer,
    fileUrl,
    thumbnailUrl: thumbnail,
    pages: metadata.pageCount,
  })
}
```

#### IMSLP Integration

```typescript
interface IMSLPImport {
  searchUrl: 'https://imslp.org/wiki/Special:Search'
  apiUrl: 'https://imslp.org/api.php'

  async search(query: string): Promise<IMSLPResult[]> {
    // Search IMSLP catalog
    const results = await fetch(`${this.apiUrl}?action=query&list=search&srsearch=${query}`)
    return parseIMSLPResults(results)
  }

  async import(imslpUrl: string): Promise<Score> {
    // 1. Fetch IMSLP page
    const pageData = await fetchIMSLPPage(imslpUrl)

    // 2. Extract PDF URL
    const pdfUrl = extractPDFUrl(pageData)

    // 3. Download PDF
    const pdfBuffer = await downloadPDF(pdfUrl)

    // 4. Process as regular upload
    return uploadScore(new File([pdfBuffer], 'score.pdf'))
  }
}
```

### 2. AI Metadata Extraction

#### Cloudflare AI Integration

```typescript
interface AIMetadataExtraction {
  model: '@cf/llava-hf/llava-1.5-7b-hf' // Vision model

  async extractFromImage(imageUrl: string): Promise<ScoreMetadata> {
    const response = await env.AI.run(model, {
      image: await fetch(imageUrl).then(r => r.arrayBuffer()),
      prompt: `Extract the following from this sheet music:
        - Title of the piece
        - Composer name
        - Opus number if visible
        - Key signature
        - Time signature
        - Tempo marking
        - Instrument(s)
        Return as JSON.`,
    })

    return parseAIResponse(response)
  }
}

interface ScoreMetadata {
  title?: string
  composer?: string
  opus?: string
  key?: string // 'C major', 'A minor', etc.
  timeSignature?: string // '4/4', '3/4', etc.
  tempo?: string // 'Allegro', 'Andante', etc.
  instruments?: string[]
  difficulty?: number // 1-10 scale
  period?: string // 'Baroque', 'Classical', 'Romantic', etc.
}
```

#### OCR for Text Extraction

```typescript
async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  // Use Cloudflare's Browser Rendering API
  const browser = await env.BROWSER.fetch(pdfUrl)

  // Extract text from each page
  const pages = await browser.pdf.getPages()
  const textContent = await Promise.all(pages.map(page => page.extractText()))

  return textContent.join('\n')
}
```

### 3. Collections Management

#### Collection Structure

```typescript
interface Collection {
  id: string
  name: string
  description?: string
  coverImageUrl?: string
  isPublic: boolean
  scoreIds: string[]
  tags: string[]
  createdBy: string
  sharedWith: string[] // User IDs
  createdAt: number
  updatedAt: number
}

// Collection operations
class CollectionManager {
  async createCollection(data: Partial<Collection>): Promise<Collection> {
    const collection = {
      id: crypto.randomUUID(),
      name: data.name!,
      description: data.description,
      isPublic: data.isPublic || false,
      scoreIds: [],
      tags: data.tags || [],
      createdBy: this.userId,
      sharedWith: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await db.collections.add(collection)
    return collection
  }

  async addToCollection(collectionId: string, scoreIds: string[]) {
    const collection = await db.collections.get(collectionId)
    collection.scoreIds = [...new Set([...collection.scoreIds, ...scoreIds])]
    collection.updatedAt = Date.now()
    await db.collections.update(collectionId, collection)
  }

  async shareCollection(collectionId: string, userIds: string[]) {
    const collection = await db.collections.get(collectionId)
    collection.sharedWith = [...new Set([...collection.sharedWith, ...userIds])]
    await db.collections.update(collectionId, collection)

    // Send notifications
    await notifyUsers(
      userIds,
      `Collection "${collection.name}" shared with you`
    )
  }
}
```

### 4. Score Viewer

#### PDF Rendering

```typescript
interface PDFViewer {
  // Using PDF.js or similar
  currentPage: number
  totalPages: number
  zoom: number
  rotation: 0 | 90 | 180 | 270

  // Navigation
  goToPage(page: number): void
  nextPage(): void
  previousPage(): void

  // View modes
  viewMode: 'single' | 'double' | 'continuous'
  fitMode: 'width' | 'height' | 'page'

  // Annotations
  annotations: Annotation[]
  addAnnotation(annotation: Annotation): void
  removeAnnotation(id: string): void
}

interface Annotation {
  id: string
  page: number
  type: 'highlight' | 'text' | 'drawing'
  position: { x: number; y: number }
  content: string | Path2D
  color: string
  createdAt: number
}
```

#### Mobile Optimization

```typescript
// Touch gestures for mobile
class MobilePDFViewer {
  // Pinch to zoom
  handlePinch(scale: number) {
    this.zoom = Math.max(0.5, Math.min(3, this.zoom * scale))
  }

  // Swipe to change pages
  handleSwipe(direction: 'left' | 'right') {
    if (direction === 'left') this.nextPage()
    if (direction === 'right') this.previousPage()
  }

  // Double tap to zoom
  handleDoubleTap(point: { x: number; y: number }) {
    if (this.zoom === 1) {
      this.zoomTo(2, point)
    } else {
      this.zoomTo(1, { x: 0.5, y: 0.5 })
    }
  }
}
```

### 5. Search & Discovery

#### Advanced Search

```typescript
interface ScoreSearch {
  // Search fields
  query?: string // Full-text search
  composer?: string
  period?: string
  instrument?: string
  difficulty?: { min: number; max: number }
  key?: string
  timeSignature?: string

  // Filters
  hasAudio?: boolean
  hasVideo?: boolean
  isPublic?: boolean
  inCollection?: string

  // Sorting
  sortBy: 'relevance' | 'title' | 'composer' | 'difficulty' | 'recent'
  order: 'asc' | 'desc'
}

async function searchScores(params: ScoreSearch): Promise<Score[]> {
  let query = db.scores.where('userId').equals(this.userId)

  if (params.composer) {
    query = query.and(score =>
      score.normalizedComposer?.includes(params.composer!.toLowerCase())
    )
  }

  if (params.difficulty) {
    query = query.and(
      score =>
        score.difficulty >= params.difficulty!.min &&
        score.difficulty <= params.difficulty!.max
    )
  }

  const results = await query.toArray()

  // Apply full-text search if needed
  if (params.query) {
    return searchWithFTS(results, params.query)
  }

  return sortResults(results, params.sortBy, params.order)
}
```

#### Composer Canonicalization

```typescript
// Standardize composer names
const COMPOSER_CANONICAL = {
  Bach: 'Johann Sebastian Bach',
  'J.S. Bach': 'Johann Sebastian Bach',
  Beethoven: 'Ludwig van Beethoven',
  'L. van Beethoven': 'Ludwig van Beethoven',
  Mozart: 'Wolfgang Amadeus Mozart',
  'W.A. Mozart': 'Wolfgang Amadeus Mozart',
  // ... extensive mapping
}

function normalizeComposer(input: string): string {
  // Check canonical mapping
  if (COMPOSER_CANONICAL[input]) {
    return COMPOSER_CANONICAL[input]
  }

  // Fuzzy matching for variations
  const normalized = input.trim().toLowerCase()
  for (const [key, value] of Object.entries(COMPOSER_CANONICAL)) {
    if (normalized.includes(key.toLowerCase())) {
      return value
    }
  }

  return input
}
```

### 6. Practice Integration

#### Link to Logbook

```typescript
interface ScorePractice {
  scoreId: string
  pages: number[] // Pages practiced
  duration: number
  notes?: string

  async logPractice(data: ScorePractice) {
    // Create logbook entry
    const entry = await logbookStore.addEntry({
      type: 'practice',
      duration: data.duration,
      scorePages: [{
        scoreId: data.scoreId,
        pages: data.pages,
      }],
      notes: data.notes,
    })

    // Update score stats
    await this.updateScoreStats(data.scoreId, {
      totalPracticeTime: increment(data.duration),
      lastPracticedAt: Date.now(),
      practiceCount: increment(1),
    })

    return entry
  }
}
```

#### Practice Mode

```typescript
interface PracticeMode {
  score: Score
  currentPage: number
  metronomeEnabled: boolean
  metronomeBPM: number
  timerRunning: boolean
  startTime: number

  // Auto-scroll
  autoScroll: boolean
  scrollSpeed: number // pixels per second

  // Annotations during practice
  practiceNotes: Map<number, string> // Page -> notes
  problemSpots: Array<{
    page: number
    measure: number
    description: string
  }>

  async finishPractice() {
    const duration = Date.now() - this.startTime

    // Log practice session
    await this.logPractice({
      scoreId: this.score.id,
      pages: Array.from(this.practiceNotes.keys()),
      duration,
      notes: Array.from(this.practiceNotes.values()).join('\n'),
    })

    // Save problem spots for next time
    await this.saveProblemSpots(this.score.id, this.problemSpots)
  }
}
```

## User Interface

### Desktop Layout

```
┌─────────────────────────────────────────────────┐
│ [Upload] [Import IMSLP] [Search] [Filter] [View] │
├─────────────────────────────────────────────────┤
│ Collections      │  Scores Grid/List              │
│ ┌─────────────┐  │  ┌──────┐ ┌──────┐ ┌──────┐ │
│ │ All Scores   │  │  │      │ │      │ │      │ │
│ │ Classical    │  │  │Score │ │Score │ │Score │ │
│ │ Romantic     │  │  │Thumb │ │Thumb │ │Thumb │ │
│ │ Modern       │  │  └──────┘ └──────┘ └──────┘ │
│ │ + Collection │  │  Title     Title     Title    │
│ └─────────────┘  │  Composer  Composer  Composer │
└─────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌─────────────────┐
│ Scorebook    [+] │
├─────────────────┤
│ [All] [Recent]   │
│ [Collections]    │
├─────────────────┤
│ ┌─────────────┐  │
│ │ Score Card  │  │
│ │ Thumbnail   │  │
│ │ Title       │  │
│ │ Composer    │  │
│ └─────────────┘  │
│ ┌─────────────┐  │
│ │ Score Card  │  │
│ └─────────────┘  │
└─────────────────┘
```

## Data Storage

### R2 Bucket Structure

```
mirubato-scores/
├── scores/
│   ├── {userId}/
│   │   ├── {scoreId}/
│   │   │   ├── original.pdf
│   │   │   ├── page-1.jpg
│   │   │   ├── page-2.jpg
│   │   │   └── thumbnail.jpg
├── temp/
│   └── uploads/
└── public/
    └── shared/
```

### Database Schema

```typescript
interface ScoreRecord {
  id: string
  userId: string
  title: string
  composer?: string
  normalizedComposer?: string
  opus?: string
  key?: string
  timeSignature?: string
  tempo?: string
  difficulty?: number
  pages: number
  duration?: number // estimated performance time
  instruments?: string[]
  tags?: string[]
  fileUrl: string // R2 URL
  thumbnailUrl?: string
  source: 'upload' | 'imslp' | 'import'
  sourceUrl?: string // Original source
  isPublic: boolean
  aiMetadata?: object // Raw AI extraction
  practiceStats?: {
    totalTime: number
    sessionCount: number
    lastPracticed: number
  }
  createdAt: number
  updatedAt: number
}
```

## Performance Optimization

### Lazy Loading

```typescript
// Load scores progressively
const PAGE_SIZE = 20

async function loadScores(page = 0) {
  const scores = await db.scores
    .orderBy('createdAt')
    .reverse()
    .offset(page * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .toArray()

  // Preload thumbnails
  scores.forEach(score => {
    if (score.thumbnailUrl) {
      new Image().src = score.thumbnailUrl
    }
  })

  return scores
}
```

### PDF Optimization

```typescript
// Stream large PDFs
async function streamPDF(url: string) {
  const response = await fetch(url)
  const reader = response.body!.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    chunks.push(value)

    // Start rendering after first chunk
    if (chunks.length === 1) {
      renderFirstPage(chunks[0])
    }
  }

  return new Blob(chunks, { type: 'application/pdf' })
}
```

## Related Documentation

- [Scores Service API](../03-api/service-apis.md#scores-service-api) - Backend implementation
- [AI Services](../06-integrations/ai-services.md) - AI metadata extraction
- [IMSLP Integration](../06-integrations/imslp.md) - Sheet music import
- [Repertoire](./repertoire.md) - Repertoire tracking

---

_Last updated: 2025-09-09 | Version 1.7.6_
