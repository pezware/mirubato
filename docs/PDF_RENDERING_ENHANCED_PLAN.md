# Enhanced PDF Rendering Integration Plan

## Goal

Enable fast page turning for large PDFs (10+ pages) by preloading pages while user reads.

## Good News: Infrastructure Already Exists!

The `PdfRenderingService` already has:

- ✅ LRU cache for rendered pages
- ✅ Preloading logic with `requestIdleCallback`
- ✅ OffscreenCanvas rendering
- ✅ Memory management

## Enhanced Preloading Strategy for Large PDFs

### Current Behavior

- Preloads ±1 page (pages 2 and 3 when on page 1)

### Enhanced Behavior for 10+ Page PDFs

```typescript
// In PdfRenderingService.ts
async preloadPages(
  pdfDoc: PDFDocumentProxy,
  currentPage: number,
  viewMode: 'single' | 'double'
): Promise<void> {
  const pagesToPreload: number[] = []
  const isLargePdf = pdfDoc.numPages >= 10

  if (viewMode === 'single') {
    // For large PDFs, preload more aggressively
    const preloadRange = isLargePdf ? 3 : 1

    // Preload backwards
    for (let i = 1; i <= preloadRange; i++) {
      if (currentPage - i >= 1) {
        pagesToPreload.push(currentPage - i)
      }
    }

    // Preload forwards (prioritize forward navigation)
    for (let i = 1; i <= preloadRange * 2; i++) {
      if (currentPage + i <= pdfDoc.numPages) {
        pagesToPreload.push(currentPage + i)
      }
    }
  }

  // Use requestIdleCallback for non-blocking preload
  if ('requestIdleCallback' in window) {
    pagesToPreload.forEach((pageNum, index) => {
      // Stagger the preloading to avoid overwhelming the system
      const delay = index * 100 // 100ms between each preload

      setTimeout(() => {
        requestIdleCallback(() => {
          this.getRenderedPage(pdfDoc, pageNum, 1.0).catch(() => {
            // Ignore preload errors
          })
        }, { timeout: 5000 }) // 5 second max wait
      }, delay)
    })
  }
}
```

## Implementation Plan (2 Days)

### Day 1: Basic Integration

1. **Add document loading to PdfRenderingService**:

   ```typescript
   private documentCache = new Map<string, PDFDocumentProxy>()

   async loadDocument(url: string): Promise<PDFDocumentProxy> {
     if (this.documentCache.has(url)) {
       return this.documentCache.get(url)!
     }

     const loadingTask = pdfjs.getDocument(url)
     const pdfDoc = await loadingTask.promise
     this.documentCache.set(url, pdfDoc)
     return pdfDoc
   }
   ```

2. **Create React Context Provider**:

   ```typescript
   // contexts/PdfRenderingContext.tsx
   const PdfRenderingContext = createContext<PdfRenderingService | null>(null)

   export const usePdfRenderingService = () => {
     const service = useContext(PdfRenderingContext)
     if (!service) {
       throw new Error('usePdfRenderingService must be used within provider')
     }
     return service
   }
   ```

3. **Update PdfJsViewer to use service**:

   ```typescript
   const renderingService = usePdfRenderingService()

   // In renderPage function:
   const imageData = await renderingService.getRenderedPage(
     pdfDoc,
     pageNumber,
     scale
   )

   // Draw to canvas
   const ctx = canvasRef.current.getContext('2d')
   ctx.putImageData(imageData, 0, 0)

   // Trigger preloading
   renderingService.preloadPages(pdfDoc, pageNumber, viewMode)
   ```

### Day 2: Optimize for Large PDFs

1. **Enhance preloading strategy** (as shown above)
2. **Add memory monitoring**:

   ```typescript
   // Monitor memory usage and adjust preloading
   const stats = renderingService.getMemoryUsage()
   if (stats.usedMB > stats.maxMB * 0.8) {
     // Reduce preload range when memory is high
   }
   ```

3. **Add performance metrics**:

   ```typescript
   // Track render times and cache hits
   const startTime = performance.now()
   const imageData = await renderingService.getRenderedPage(...)
   const renderTime = performance.now() - startTime

   // Log metrics for analysis
   console.debug(`Page ${pageNumber} rendered in ${renderTime}ms`)
   ```

## Expected Performance

### For a 20-page PDF:

1. **Page 1 Load**: ~500ms (initial render)
2. **Pages 2-4**: Already preloading while user reads page 1
3. **Page 2 Turn**: <50ms (from cache)
4. **Pages 5-7**: Start preloading when user reaches page 2
5. **Continuous**: Always have next 3-6 pages ready

### Memory Usage:

- Each page ~2-4MB (depending on complexity)
- 6 preloaded pages = ~12-24MB
- LRU cache evicts oldest pages automatically

## No Complex Queue Needed!

The existing `requestIdleCallback` approach is perfect because:

1. **Non-blocking**: Doesn't interfere with user interaction
2. **Browser-optimized**: Browser decides when to run
3. **Automatic priority**: Current page renders immediately, preloads happen during idle time
4. **Simple**: No complex priority queue to manage

## Success Metrics

- Page turn time <100ms for cached pages
- 90%+ cache hit rate during normal reading
- Memory usage stays under 100MB
- No UI freezing during preloading
