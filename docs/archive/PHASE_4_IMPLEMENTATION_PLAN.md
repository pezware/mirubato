# Phase 4 Implementation Plan: PDF.js Integration

## Overview

This document outlines the concrete steps to complete Phase 4 of the Scorebook feature, focusing on integrating PdfJsViewer with PdfRenderingService.

## Current Architecture

```
PdfJsViewer.tsx (Direct Rendering)
    ↓
pdf.js library
    ↓
Canvas Element

SHOULD BE:

PdfJsViewer.tsx (UI Component)
    ↓
PdfRenderingService.ts (Rendering Engine)
    ↓
pdf.js library
    ↓
OffscreenCanvas → ImageData → Canvas Element
```

## Implementation Steps

### Step 1: Extend PdfRenderingService (Day 1)

#### 1.1 Add Document Management

```typescript
// Add to PdfRenderingService.ts

private documentCache = new Map<string, PDFDocumentProxy>()
private loadingDocuments = new Map<string, Promise<PDFDocumentProxy>>()

async loadDocument(url: string): Promise<PDFDocumentProxy> {
  // Check cache
  if (this.documentCache.has(url)) {
    return this.documentCache.get(url)!
  }

  // Check if already loading
  if (this.loadingDocuments.has(url)) {
    return this.loadingDocuments.get(url)!
  }

  // Start loading
  const loadingPromise = pdfjs.getDocument(url).promise
    .then(doc => {
      this.documentCache.set(url, doc)
      this.loadingDocuments.delete(url)
      return doc
    })
    .catch(error => {
      this.loadingDocuments.delete(url)
      throw error
    })

  this.loadingDocuments.set(url, loadingPromise)
  return loadingPromise
}
```

#### 1.2 Implement Render Queue

```typescript
interface RenderRequest {
  id: string
  url: string
  pageNumber: number
  scale: number
  priority: number // 0-10, 10 being highest
  timestamp: number
  resolve: (imageData: ImageData) => void
  reject: (error: Error) => void
}

private renderQueue: RenderRequest[] = []
private activeRenders = new Map<string, RenderTask>()
private maxConcurrentRenders = 2

async addToQueue(request: Omit<RenderRequest, 'id' | 'timestamp'>): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const fullRequest: RenderRequest = {
      ...request,
      id: `${request.url}-${request.pageNumber}-${request.scale}-${Date.now()}`,
      timestamp: Date.now(),
      resolve,
      reject
    }

    this.renderQueue.push(fullRequest)
    this.sortQueue()
    this.processQueue()
  })
}

private sortQueue(): void {
  this.renderQueue.sort((a, b) => {
    // First by priority (descending)
    if (a.priority !== b.priority) {
      return b.priority - a.priority
    }
    // Then by timestamp (ascending - FIFO)
    return a.timestamp - b.timestamp
  })
}
```

#### 1.3 Implement Queue Processing

```typescript
private async processQueue(): Promise<void> {
  if (this.activeRenders.size >= this.maxConcurrentRenders) {
    return
  }

  const request = this.renderQueue.shift()
  if (!request) return

  const cacheKey = `${request.url}-${request.pageNumber}-${request.scale}`

  // Check cache first
  const cached = this.pageCache.get(cacheKey)
  if (cached) {
    request.resolve(cached.value)
    this.processQueue() // Process next
    return
  }

  try {
    const doc = await this.loadDocument(request.url)
    const page = await doc.getPage(request.pageNumber)
    const viewport = page.getViewport({ scale: request.scale })

    const canvas = new OffscreenCanvas(viewport.width, viewport.height)
    const context = canvas.getContext('2d')!

    const renderTask = page.render({
      canvasContext: context,
      viewport
    })

    this.activeRenders.set(request.id, renderTask)

    await renderTask.promise

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    this.pageCache.set(cacheKey, imageData)

    request.resolve(imageData)
  } catch (error) {
    request.reject(error as Error)
  } finally {
    this.activeRenders.delete(request.id)
    this.processQueue() // Process next
  }
}
```

### Step 2: Create Service Provider (Day 1)

#### 2.1 Create Context Provider

```typescript
// New file: frontendv2/src/contexts/PdfRenderingContext.tsx

import React, { createContext, useContext } from 'react'
import { PdfRenderingService } from '../services/PdfRenderingService'

const PdfRenderingContext = createContext<PdfRenderingService | null>(null)

export const usePdfRenderingService = () => {
  const service = useContext(PdfRenderingContext)
  if (!service) {
    throw new Error('usePdfRenderingService must be used within PdfRenderingProvider')
  }
  return service
}

export const PdfRenderingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const service = React.useMemo(() => new PdfRenderingService({
    maxCachedPages: 50,
    maxMemoryMB: 100,
    preloadStrategy: 'adjacent',
    mobileOptimizations: window.innerWidth < 768
  }), [])

  return (
    <PdfRenderingContext.Provider value={service}>
      {children}
    </PdfRenderingContext.Provider>
  )
}
```

### Step 3: Refactor PdfJsViewer (Day 2)

#### 3.1 Update Component to Use Service

```typescript
// Update PdfJsViewer.tsx

import { usePdfRenderingService } from '../../contexts/PdfRenderingContext'

export default function PdfJsViewer({ ... }) {
  const renderingService = usePdfRenderingService()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [rendering, setRendering] = useState(false)

  // Render current page
  const renderPage = useCallback(async (pageNumber: number) => {
    if (!canvasRef.current) return

    setRendering(true)
    try {
      const imageData = await renderingService.renderPage(
        url,
        pageNumber,
        scale,
        10 // Highest priority for current page
      )

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx && imageData) {
        canvas.width = imageData.width
        canvas.height = imageData.height
        ctx.putImageData(imageData, 0, 0)
      }

      // Trigger preloading of adjacent pages
      if (pageNumber > 1) {
        renderingService.renderPage(url, pageNumber - 1, scale, 5) // Medium priority
      }
      if (pageNumber < numPages) {
        renderingService.renderPage(url, pageNumber + 1, scale, 5) // Medium priority
      }
    } catch (error) {
      handleError(error)
    } finally {
      setRendering(false)
    }
  }, [url, scale, numPages, renderingService])

  // Load document metadata
  useEffect(() => {
    let cancelled = false

    async function loadDocument() {
      try {
        const doc = await renderingService.loadDocument(url)
        if (!cancelled) {
          const info = await extractPdfInfo(doc)
          setNumPages(info.numPages)
          onLoad?.(info)
          setLoading(false)
        }
      } catch (error) {
        if (!cancelled) {
          handleError(error)
          setLoading(false)
        }
      }
    }

    loadDocument()

    return () => {
      cancelled = true
    }
  }, [url, renderingService])

  // Render when page changes
  useEffect(() => {
    if (!loading && currentPage > 0) {
      renderPage(currentPage)
    }
  }, [currentPage, loading, renderPage])

  // ... rest of component
}
```

### Step 4: Add Preloading Strategy (Day 2.5)

#### 4.1 Smart Preloading

```typescript
// Add to PdfRenderingService.ts

preloadPages(url: string, currentPage: number, totalPages: number, scale: number): void {
  // Cancel existing preloads for this document
  this.cancelPreloads(url)

  // Determine pages to preload based on strategy
  const pagesToPreload: number[] = []

  if (this.config.preloadStrategy === 'adjacent') {
    // Preload ±2 pages
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      if (i !== currentPage) {
        pagesToPreload.push(i)
      }
    }
  } else if (this.config.preloadStrategy === 'smart') {
    // Preload based on navigation patterns
    // For now, just do adjacent + common navigation points
    pagesToPreload.push(
      currentPage + 1,
      currentPage - 1,
      1, // First page
      totalPages, // Last page
      Math.ceil(totalPages / 2) // Middle page
    )
  }

  // Filter valid pages and sort by distance from current
  const validPages = pagesToPreload
    .filter(p => p >= 1 && p <= totalPages && p !== currentPage)
    .sort((a, b) => Math.abs(a - currentPage) - Math.abs(b - currentPage))

  // Queue preload requests with decreasing priority
  validPages.forEach((page, index) => {
    this.renderPage(url, page, scale, 5 - index) // Priority 5, 4, 3...
  })
}

private cancelPreloads(url: string): void {
  // Remove low-priority requests for this document
  this.renderQueue = this.renderQueue.filter(
    req => req.url !== url || req.priority >= 8
  )
}
```

### Step 5: Add Performance Monitoring (Day 3)

```typescript
// Add to PdfRenderingService.ts

private metrics = {
  renders: 0,
  cacheHits: 0,
  cacheMisses: 0,
  averageRenderTime: 0,
  queueLength: 0
}

getMetrics(): PerformanceMetrics {
  return {
    ...this.metrics,
    hitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses),
    memoryUsage: this.getMemoryStats()
  }
}
```

## Testing Plan

### Unit Tests

1. Test LRU cache eviction
2. Test priority queue ordering
3. Test concurrent render limits
4. Test error handling

### Integration Tests

1. Test page navigation with preloading
2. Test memory constraints
3. Test performance under load
4. Test error recovery

### Performance Tests

1. Measure render times
2. Measure memory usage
3. Measure cache hit rates
4. Compare with direct rendering

## Migration Strategy

1. **Phase 1**: Deploy service alongside existing viewer
2. **Phase 2**: Add feature flag to toggle between implementations
3. **Phase 3**: Gradually roll out to users
4. **Phase 4**: Remove old implementation

## Success Metrics

- Page render time < 100ms (p95)
- Cache hit rate > 80%
- Memory usage < 100MB desktop, < 50MB mobile
- Zero rendering errors in production
- Smooth navigation with no visible delays

## Risks and Mitigations

1. **Risk**: OffscreenCanvas not supported
   - **Mitigation**: Fallback to regular canvas

2. **Risk**: Memory leaks in long sessions
   - **Mitigation**: Periodic cache cleanup, memory monitoring

3. **Risk**: Race conditions in queue
   - **Mitigation**: Careful state management, request deduplication

4. **Risk**: Performance regression
   - **Mitigation**: A/B testing, gradual rollout
