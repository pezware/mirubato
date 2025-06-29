# PDF Rendering Module Improvement Plan

## Executive Summary

This plan outlines a comprehensive upgrade to the PDF rendering system in the Mirubato Scorebook, moving from the current iframe-based approach to a robust pdf.js implementation with proper error handling, caching, and performance optimizations.

## Current Issues

### 1. **Iframe Limitations**

- Limited control over rendering
- CORS/CSP issues (X-Frame-Options, frame-ancestors)
- No programmatic access to PDF content
- Poor mobile experience
- Browser-dependent PDF plugin behavior

### 2. **Missing Error Handling**

- No validation for PDF files before display
- No handling for corrupted/invalid PDFs
- No size limits or large file warnings
- No fallback for unsupported browsers

### 3. **Performance Issues**

- No caching strategy for PDFs
- Full file download before display
- No progressive loading
- No optimization for mobile devices

### 4. **Security Concerns**

- No file type validation beyond extension
- No content sanitization
- Potential for malicious PDFs
- CORS configuration complexity

## Proposed Solution: PDF.js Integration

### Phase 1: Core Implementation (Week 1)

#### 1.1 Replace Iframe with PDF.js

```typescript
// New PDF viewer using pdf.js
interface PdfViewerProps {
  url: string
  onLoad?: (info: PdfInfo) => void
  onError?: (error: PdfError) => void
  onPageChange?: (page: number) => void
}

interface PdfInfo {
  numPages: number
  fileSize: number
  metadata: PdfMetadata
  isEncrypted: boolean
  isLinearized: boolean // For fast web viewing
}
```

#### 1.2 Implement Robust Error Handling

```typescript
enum PdfErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_PDF = 'INVALID_PDF',
  CORRUPTED_FILE = 'CORRUPTED_FILE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  MISSING_FILE = 'MISSING_FILE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNSUPPORTED_FEATURE = 'UNSUPPORTED_FEATURE',
}

interface PdfError {
  type: PdfErrorType
  message: string
  details?: any
  recoverable: boolean
  fallbackUrl?: string
}
```

#### 1.3 Add File Validation

```typescript
interface FileValidation {
  maxSize: number // 50MB default
  allowedTypes: string[] // ['application/pdf']
  validateMagicBytes: boolean // Check PDF header %PDF-
  scanForMalware?: boolean // Optional integration
}

// Server-side validation
async function validatePdfUpload(file: File): Promise<ValidationResult> {
  // 1. Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new PdfError(
      PdfErrorType.FILE_TOO_LARGE,
      `File exceeds ${MAX_FILE_SIZE} limit`
    )
  }

  // 2. Check magic bytes (first 5 bytes should be %PDF-)
  const header = await file.slice(0, 5).text()
  if (header !== '%PDF-') {
    throw new PdfError(PdfErrorType.INVALID_PDF, 'Invalid PDF file format')
  }

  // 3. Parse PDF structure
  try {
    const pdfDoc = await pdfjsLib.getDocument(file).promise
    return {
      valid: true,
      pageCount: pdfDoc.numPages,
      fileSize: file.size,
      encrypted: pdfDoc.isEncrypted,
    }
  } catch (error) {
    throw new PdfError(PdfErrorType.CORRUPTED_FILE, 'PDF file is corrupted')
  }
}
```

### Phase 2: Caching Strategy (Week 2)

#### 2.1 Multi-Layer Caching

```typescript
interface CacheStrategy {
  // Browser Cache (Cache API)
  browserCache: {
    enabled: boolean
    maxAge: number // 7 days for PDFs
    maxSize: number // 100MB total
  }

  // IndexedDB for rendered pages
  indexedDB: {
    enabled: boolean
    maxPages: number // 50 pages
    compressionLevel: number
  }

  // Memory cache for active viewing
  memoryCache: {
    maxPages: number // 10 pages
    preloadNext: number // 2 pages
    preloadPrev: number // 1 page
  }

  // CDN cache headers
  cdnCache: {
    immutableContent: boolean
    staleWhileRevalidate: number
    edgeTTL: number
  }
}
```

#### 2.2 Progressive Loading

```typescript
interface ProgressiveLoader {
  // Load pages on demand
  loadPage(pageNum: number): Promise<PDFPageProxy>

  // Preload adjacent pages
  preloadRange(start: number, end: number): Promise<void>

  // Priority queue for page loading
  priorityQueue: PriorityQueue<PageLoadRequest>

  // Cancel unnecessary loads
  cancelPendingLoads(): void
}
```

#### 2.3 Offline Support

```typescript
interface OfflineStrategy {
  // Service worker for offline viewing
  enableServiceWorker: boolean

  // Which scores to cache offline
  offlineCacheStrategy: 'FAVORITES' | 'RECENT' | 'MANUAL'

  // Sync when online
  backgroundSync: boolean
}
```

### Phase 3: Performance Optimizations (Week 3)

#### 3.1 Rendering Optimizations

```typescript
interface RenderingOptions {
  // Canvas vs SVG rendering
  renderMode: 'canvas' | 'svg' | 'hybrid'

  // Resolution based on device
  scale: number // devicePixelRatio

  // Text layer for selection/search
  enableTextLayer: boolean

  // Annotations layer
  enableAnnotations: boolean

  // Virtual scrolling for long documents
  virtualScrolling: boolean

  // Web worker rendering
  useWebWorker: boolean
}
```

#### 3.2 Mobile Optimizations

```typescript
interface MobileOptimizations {
  // Reduced quality on mobile
  mobileScale: number // 0.75

  // Touch gestures
  pinchZoom: boolean
  swipeNavigation: boolean

  // Bandwidth detection
  adaptiveQuality: boolean

  // Simplified UI
  compactControls: boolean
}
```

#### 3.3 Memory Management

```typescript
interface MemoryManagement {
  // Cleanup unused pages
  pageEvictionPolicy: 'LRU' | 'LFU'

  // Memory threshold
  maxMemoryUsage: number // 50MB

  // Garbage collection
  gcInterval: number // 30s

  // Memory pressure handling
  onMemoryPressure: () => void
}
```

### Phase 4: Enhanced Features (Week 4)

#### 4.1 Advanced PDF Features

```typescript
interface AdvancedFeatures {
  // Full-text search
  textSearch: {
    enabled: boolean
    highlighting: boolean
    caseSensitive: boolean
  }

  // Annotations
  annotations: {
    enabled: boolean
    types: ['highlight', 'note', 'drawing']
    sync: boolean
  }

  // Bookmarks/Outlines
  outlineNavigation: boolean

  // Print optimization
  printSupport: {
    enabled: boolean
    quality: 'high' | 'medium' | 'low'
  }

  // Export options
  export: {
    formats: ['png', 'jpeg', 'svg']
    pages: 'current' | 'all' | 'range'
  }
}
```

#### 4.2 Accessibility

```typescript
interface AccessibilityFeatures {
  // Screen reader support
  ariaLabels: boolean

  // Keyboard navigation
  keyboardShortcuts: Map<string, Action>

  // High contrast mode
  highContrastMode: boolean

  // Text-to-speech
  textToSpeech: boolean
}
```

## Implementation Roadmap

### Week 1: Core PDF.js Integration

- [ ] Install and configure pdf.js
- [ ] Create PdfViewer component
- [ ] Implement basic error handling
- [ ] Add file validation
- [ ] Update CORS/CSP configuration

### Week 2: Caching Implementation

- [ ] Setup Cache API integration
- [ ] Implement IndexedDB storage
- [ ] Add progressive loading
- [ ] Configure CDN caching
- [ ] Implement offline support

### Week 3: Performance Optimization

- [ ] Add virtual scrolling
- [ ] Implement web worker rendering
- [ ] Add mobile optimizations
- [ ] Setup memory management
- [ ] Performance monitoring

### Week 4: Advanced Features

- [ ] Add text search
- [ ] Implement annotations
- [ ] Add print support
- [ ] Enhance accessibility
- [ ] Final testing and optimization

## Testing Strategy

### Unit Tests

```typescript
describe('PdfViewer', () => {
  it('should handle missing files gracefully')
  it('should validate PDF magic bytes')
  it('should reject files over size limit')
  it('should handle corrupted PDFs')
  it('should cache rendered pages')
  it('should cleanup memory on unmount')
})
```

### Integration Tests

- Test with various PDF types (single/multi-page, encrypted, forms)
- Test on different devices (desktop, tablet, mobile)
- Test offline functionality
- Test performance with large files

### Error Scenarios

1. **Network Errors**: Timeout, 404, 500, CORS
2. **File Errors**: Invalid PDF, corrupted, too large, wrong type
3. **Rendering Errors**: Memory limit, unsupported features
4. **Permission Errors**: Encrypted, restricted access

## Security Considerations

### 1. Input Validation

- Strict file type checking
- Magic byte validation
- File size limits
- Content sanitization

### 2. Sandboxing

- Render in isolated context
- Disable JavaScript in PDFs
- Restrict external references
- CSP headers for PDF viewer

### 3. Access Control

- Signed URLs for private scores
- Time-limited access tokens
- IP-based restrictions
- Rate limiting

## Performance Metrics

### Target Metrics

- Initial render: < 1s
- Page navigation: < 100ms
- Memory usage: < 50MB
- Cache hit rate: > 80%
- Offline availability: 100% for cached

### Monitoring

```typescript
interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  cacheHitRate: number
  errorRate: number
  userSatisfaction: number
}
```

## Migration Plan

### 1. Feature Flag Rollout

```typescript
const features = {
  usePdfJs: getFeatureFlag('pdf-js-viewer', false),
  enableCaching: getFeatureFlag('pdf-caching', false),
  enableOffline: getFeatureFlag('pdf-offline', false),
}
```

### 2. Gradual Migration

- 10% users: Week 1
- 50% users: Week 2
- 100% users: Week 3

### 3. Rollback Plan

- Keep iframe implementation
- Monitor error rates
- Quick rollback mechanism

## Cost Analysis

### Development Time

- Core implementation: 40 hours
- Caching system: 30 hours
- Performance optimization: 20 hours
- Testing & debugging: 20 hours
- Total: ~110 hours

### Infrastructure

- CDN bandwidth: +20% (caching offsets)
- Storage: +10MB per user (cached pages)
- Computing: Minimal increase

### ROI

- Improved user experience
- Reduced support tickets
- Better mobile adoption
- Competitive advantage

## Conclusion

This comprehensive plan addresses all current limitations while providing a robust, performant, and secure PDF viewing experience. The phased approach allows for iterative development and testing, ensuring a smooth migration from the current iframe-based solution.

## Why We Didn't Catch the iframe Issue Locally

The X-Frame-Options issue wasn't caught locally because:

1. **Same-origin in local dev**: When running locally, both frontend and scores service are on `localhost` (even with different ports), which browsers treat as same-origin for some security policies.

2. **Different domain in staging**: In staging, `staging.mirubato.com` and `scores-staging.mirubato.com` are different origins, triggering stricter cross-origin policies.

3. **Browser inconsistencies**: Different browsers handle localhost differently for security policies.

**Solution**: Our fix using CSP frame-ancestors is more explicit and will work consistently across all environments.
