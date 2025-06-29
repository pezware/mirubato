# PDF Rendering Phase 4: Revised Implementation Plan

Based on Gemini's review, here's the revised plan focusing on practical implementation for a music education app.

## Immediate Priority: Decouple from react-pdf

### Step 1: Create Custom PDF.js Viewer (Sprint 1-2)

**File**: `src/components/score/PdfJsViewer.tsx`

```typescript
interface PdfJsViewerProps {
  url: string
  currentPage: number
  viewMode: 'single' | 'double'
  zoomLevel: number
  panOffset: { x: number; y: number }
  onPageChange: (page: number) => void
  onLoad: (info: PdfInfo) => void
  onError: (error: PdfError) => void
}

// Core responsibilities:
// 1. Direct pdf.js integration
// 2. Canvas rendering management
// 3. Event handling
// 4. Performance optimization hooks
```

### Step 2: Create Rendering Service (Sprint 1)

**File**: `src/services/pdfRenderingService.ts`

```typescript
class PdfRenderingService {
  private lruCache: LRUCache<string, ImageData>
  private renderQueue: RenderQueue
  private memoryMonitor: MemoryMonitor

  constructor(config: {
    maxCachedPages: number // 5-7 for mobile, 10-15 for desktop
    maxMemoryMB: number // 50MB mobile, 100MB desktop
    preloadStrategy: 'adjacent' | 'smart'
  })

  async getRenderedPage(
    pdfDoc: PDFDocumentProxy,
    pageNumber: number,
    scale: number,
    rotation: number
  ): Promise<ImageData>

  async preloadPages(
    pdfDoc: PDFDocumentProxy,
    currentPage: number,
    viewMode: 'single' | 'double'
  ): Promise<void>

  clearCache(): void
  getMemoryUsage(): MemoryStats
}
```

## Phase 1: Core Performance & Stability (3-4 Sprints)

### 1.1 Advanced Caching with IndexedDB

```typescript
interface PageCacheEntry {
  pageNumber: number
  scale: number
  imageData: ImageData
  timestamp: number
  scoreId: string
}

class IndexedDBPageCache {
  private dbName = 'mirubato-pdf-cache'
  private version = 1

  async cachePage(entry: PageCacheEntry): Promise<void>
  async getCachedPage(
    scoreId: string,
    pageNumber: number,
    scale: number
  ): Promise<ImageData | null>
  async clearOldEntries(maxAgeDays: number): Promise<void>
  async getUsageStats(): Promise<CacheStats>
}
```

### 1.2 LRU Memory Management

```typescript
class LRUPageCache {
  private cache: Map<string, CacheNode>
  private head: CacheNode | null
  private tail: CacheNode | null
  private currentSize: number
  private maxSize: number

  get(key: string): ImageData | null
  put(key: string, value: ImageData): void
  evictLRU(): void
  clear(): void
}
```

### 1.3 Improved Error Handling

```typescript
enum PdfErrorCode {
  NETWORK_TIMEOUT = 'E001',
  CORRUPTED_FILE = 'E002',
  PASSWORD_PROTECTED = 'E003',
  UNSUPPORTED_VERSION = 'E004',
  MEMORY_EXCEEDED = 'E005',
}

interface ErrorRecoveryStrategy {
  code: PdfErrorCode
  userMessage: string
  technicalDetails: string
  recoveryAction: () => Promise<void>
  canRetry: boolean
  retryDelay: number
}
```

## Phase 2: Essential Sheet Music Features (2 Sprints)

### 2.1 Two-Page Book View

```typescript
// Update scoreStore.ts
interface ScoreViewState {
  viewMode: 'single' | 'double'
  currentPage: number // In single mode
  currentPagePair: [number, number] // In double mode
  zoomLevel: number
  panOffset: { x: number; y: number }
}

// Page navigation logic
function navigatePages(
  direction: 'next' | 'prev',
  viewMode: 'single' | 'double'
): void {
  const step = viewMode === 'double' ? 2 : 1
  // Handle odd/even page alignment
  // First page always shows alone
  // Last page may show alone
}
```

### 2.2 High-Fidelity Zoom & Pan

```typescript
interface ZoomPanController {
  // Zoom constraints
  minZoom: 0.5
  maxZoom: 4.0
  zoomStep: 0.1

  // Pan constraints
  enableBoundaryCheck: boolean
  elasticBoundary: boolean

  // Gesture handlers
  handleWheel(event: WheelEvent): void
  handlePinch(event: TouchEvent): void
  handlePan(event: MouseEvent | TouchEvent): void

  // Zoom presets
  fitToWidth(): void
  fitToHeight(): void
  fitToPage(): void
  actualSize(): void
}
```

## Phase 3: Music-Specific Features (2-3 Sprints)

### 3.1 Basic Annotation System

```typescript
interface AnnotationData {
  version: '1.0'
  scoreId: string
  pageNumber: number
  strokes: Stroke[]
  timestamp: number
  userId: string
}

interface Stroke {
  id: string
  tool: 'pencil' | 'highlighter'
  color: string
  width: number
  opacity: number
  points: Point[]
  pressure?: number[] // For pressure-sensitive devices
}

interface Point {
  x: number // Normalized 0-1
  y: number // Normalized 0-1
  timestamp: number
}

// Storage strategy
class AnnotationService {
  // Local storage for offline
  private localDB: IDBDatabase

  // Cloud sync when online
  async syncAnnotations(scoreId: string): Promise<void>

  // Conflict resolution
  async mergeAnnotations(
    local: AnnotationData,
    remote: AnnotationData
  ): Promise<AnnotationData>
}
```

### 3.2 Music-Specific Optimizations

```typescript
interface MusicSheetOptimizations {
  // Rendering hints
  renderMode: 'sharp' | 'smooth' // Sharp for text, smooth for images
  contrastEnhancement: boolean // Better for faded scores
  staffLineDetection: boolean // For future AI features

  // Layout optimizations
  marginCropping: 'auto' | 'manual' | 'none'
  pageBreakOptimization: boolean

  // Practice features
  measureHighlighting: boolean
  repeatSignDetection: boolean
}
```

## Revised Timeline

### Sprint 1-2: Foundation (4 weeks)

- Create PdfJsViewer component
- Implement rendering service
- Basic LRU cache
- Migration from react-pdf

### Sprint 3-4: Performance (4 weeks)

- IndexedDB caching
- Advanced memory management
- Error handling improvements
- Performance monitoring

### Sprint 5: Core Features (2 weeks)

- Two-page view
- Basic zoom/pan

### Sprint 6: Polish (2 weeks)

- Zoom/pan refinements
- UI/UX improvements
- Mobile optimizations

### Sprint 7-8: Annotations MVP (4 weeks)

- Basic pencil tool
- Local storage
- Annotation rendering

**Total: 16 weeks (4 months)** - More realistic than original estimate

## Implementation Order

1. **Week 1-2**: Create `PdfJsViewer.tsx` with basic functionality
2. **Week 3**: Implement `pdfRenderingService.ts` with LRU cache
3. **Week 4**: Migrate existing code to use new viewer
4. **Week 5-6**: Add IndexedDB caching layer
5. **Week 7-8**: Implement two-page view
6. **Week 9-10**: Add zoom/pan functionality
7. **Week 11-12**: Performance optimizations and testing
8. **Week 13-16**: Annotation system MVP

## Key Architecture Decisions

1. **Decouple First**: Moving away from react-pdf is the critical first step
2. **Service Layer**: Separate rendering logic from UI components
3. **Progressive Enhancement**: Each feature works independently
4. **Mobile First**: Design for constraints, enhance for desktop
5. **Offline First**: Local storage with cloud sync, not cloud-dependent

## Success Metrics

### Performance

- Page render time: < 100ms (p95)
- Page switch time: < 50ms (p95)
- Memory usage: < 50MB mobile, < 100MB desktop
- Cache hit rate: > 80%

### User Experience

- Zero crashes from memory issues
- Smooth 60fps scrolling/zooming
- Instant page turns (perceived)
- Works offline after first load

### Adoption

- Two-page view usage: > 60% on tablets
- Zoom feature usage: > 40% of sessions
- Annotation adoption: > 30% of regular users

## Next Steps

1. Create branch and setup
2. Start with `PdfJsViewer.tsx` skeleton
3. Implement basic pdf.js integration
4. Add rendering service
5. Begin migration from react-pdf
