import { useState, useEffect, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

// Configure pdf.js worker - must be set before any PDF operations
// Using the exact version that react-pdf bundles
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

// Note: Custom fetch with caching is implemented in pdfCache utility

export const PdfErrorType = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_PDF: 'INVALID_PDF',
  CORRUPTED_FILE: 'CORRUPTED_FILE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  MISSING_FILE: 'MISSING_FILE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UNSUPPORTED_FEATURE: 'UNSUPPORTED_FEATURE',
} as const

export type PdfErrorType = (typeof PdfErrorType)[keyof typeof PdfErrorType]

export interface PdfError {
  type: PdfErrorType
  message: string
  details?: Error | unknown
  recoverable: boolean
}

interface PdfInfo {
  numPages: number
  title?: string
  author?: string
  subject?: string
  keywords?: string
  creator?: string
  producer?: string
  creationDate?: Date
  modificationDate?: Date
}

interface PdfViewerProps {
  url: string
  currentPage?: number
  onLoad?: (info: PdfInfo) => void
  onError?: (error: PdfError) => void
  onPageChange?: (page: number) => void
  className?: string
  scale?: number
  enableTextLayer?: boolean
  enableAnnotationLayer?: boolean
  mobileOptimized?: boolean
  enableTouchGestures?: boolean
}

export default function PdfViewer({
  url,
  currentPage = 1,
  onLoad,
  onError,
  onPageChange,
  className = '',
  scale = 1.0,
  enableTextLayer = false,
  enableAnnotationLayer = false,
  mobileOptimized = true,
  enableTouchGestures = true,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(currentPage)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<PdfError | null>(null)
  const [pageWidth, setPageWidth] = useState<number>(0)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [effectiveScale, setEffectiveScale] = useState<number>(scale)
  const [touchStartX, setTouchStartX] = useState<number>(0)
  const [touchStartY, setTouchStartY] = useState<number>(0)
  const [preloadedPages, setPreloadedPages] = useState<Set<number>>(new Set())
  const [, setMemoryUsage] = useState<number>(0)

  // Detect mobile device and set appropriate scale
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice =
        window.innerWidth <= 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      setIsMobile(isMobileDevice)

      if (mobileOptimized && isMobileDevice) {
        // Use lower scale for mobile to improve performance
        setEffectiveScale(Math.min(scale * 0.75, 1.0))
      } else {
        setEffectiveScale(scale)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [scale, mobileOptimized])

  // Update page when prop changes
  useEffect(() => {
    if (
      currentPage !== pageNumber &&
      currentPage >= 1 &&
      currentPage <= numPages
    ) {
      setPageNumber(currentPage)
    }
  }, [currentPage, numPages, pageNumber])

  // Calculate page width based on container and device
  useEffect(() => {
    const calculateWidth = () => {
      const container = document.querySelector('.pdf-viewer-container')
      if (container) {
        const containerWidth = container.clientWidth
        let targetWidth: number

        if (isMobile) {
          // Mobile: Use almost full width for better readability
          const padding = 8 // Minimal padding on mobile
          targetWidth = containerWidth - padding
        } else {
          // Desktop: Leave space for floating controls on the right
          const padding = 120 // Space for right-side controls
          targetWidth = Math.min(containerWidth - padding, 800) // Max width for readability
        }

        setPageWidth(targetWidth * effectiveScale)
      }
    }

    calculateWidth()
    window.addEventListener('resize', calculateWidth)
    return () => window.removeEventListener('resize', calculateWidth)
  }, [effectiveScale, isMobile])

  const handleDocumentLoadSuccess = useCallback(
    async (pdf: {
      numPages: number
      getMetadata: () => Promise<{
        info?: {
          Title?: unknown
          Author?: unknown
          Subject?: unknown
          Keywords?: unknown
          Creator?: unknown
          Producer?: unknown
          CreationDate?: unknown
          ModDate?: unknown
        }
      }>
    }) => {
      setNumPages(pdf.numPages)
      setLoading(false)
      setError(null)

      // Extract metadata
      const metadata = await pdf.getMetadata()
      const info: PdfInfo = {
        numPages: pdf.numPages,
        title: metadata.info?.Title as string | undefined,
        author: metadata.info?.Author as string | undefined,
        subject: metadata.info?.Subject as string | undefined,
        keywords: metadata.info?.Keywords as string | undefined,
        creator: metadata.info?.Creator as string | undefined,
        producer: metadata.info?.Producer as string | undefined,
        creationDate: metadata.info?.CreationDate
          ? new Date(metadata.info.CreationDate as string)
          : undefined,
        modificationDate: metadata.info?.ModDate
          ? new Date(metadata.info.ModDate as string)
          : undefined,
      }

      onLoad?.(info)
    },
    [onLoad]
  )

  const handleDocumentLoadError = useCallback(
    (error: Error) => {
      setLoading(false)

      let pdfError: PdfError

      if (
        error.message.includes('Failed to fetch') ||
        error.message.includes('CORS')
      ) {
        pdfError = {
          type: PdfErrorType.NETWORK_ERROR,
          message: 'Failed to load PDF. Please check your internet connection.',
          details: error,
          recoverable: true,
        }
      } else if (error.message.includes('Invalid PDF')) {
        pdfError = {
          type: PdfErrorType.INVALID_PDF,
          message: 'The file is not a valid PDF document.',
          details: error,
          recoverable: false,
        }
      } else if (
        error.message.includes('404') ||
        error.message.includes('Not found')
      ) {
        pdfError = {
          type: PdfErrorType.MISSING_FILE,
          message: 'PDF file not found.',
          details: error,
          recoverable: false,
        }
      } else if (
        error.message.includes('403') ||
        error.message.includes('Forbidden') ||
        error.message.includes('Access denied')
      ) {
        pdfError = {
          type: PdfErrorType.PERMISSION_DENIED,
          message:
            'Access denied. Please ensure you are logged in to view this score.',
          details: error,
          recoverable: true,
        }
      } else if (error.message.includes('encrypt')) {
        pdfError = {
          type: PdfErrorType.PERMISSION_DENIED,
          message: 'This PDF is encrypted and cannot be displayed.',
          details: error,
          recoverable: false,
        }
      } else if (error.message.includes('worker')) {
        pdfError = {
          type: PdfErrorType.UNSUPPORTED_FEATURE,
          message: 'PDF viewer failed to initialize. Try refreshing the page.',
          details: error,
          recoverable: true,
        }
      } else {
        pdfError = {
          type: PdfErrorType.CORRUPTED_FILE,
          message: 'Failed to load PDF. The file may be corrupted.',
          details: error,
          recoverable: false,
        }
      }

      setError(pdfError)
      onError?.(pdfError)
    },
    [onError]
  )

  const changePage = useCallback(
    (offset: number) => {
      const newPage = pageNumber + offset
      if (newPage >= 1 && newPage <= numPages) {
        setPageNumber(newPage)
        onPageChange?.(newPage)
      }
    },
    [pageNumber, numPages, onPageChange]
  )

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= numPages) {
        setPageNumber(page)
        onPageChange?.(page)
      }
    },
    [numPages, onPageChange]
  )

  // Touch gesture handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enableTouchGestures || !isMobile) return

      const touch = e.touches[0]
      setTouchStartX(touch.clientX)
      setTouchStartY(touch.clientY)
    },
    [enableTouchGestures, isMobile]
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enableTouchGestures || !isMobile) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartX
      const deltaY = touch.clientY - touchStartY

      // Determine if this is a horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          // Swipe right - previous page
          changePage(-1)
        } else {
          // Swipe left - next page
          changePage(1)
        }
      }
    },
    [enableTouchGestures, isMobile, touchStartX, touchStartY, changePage]
  )

  // Progressive page preloading
  useEffect(() => {
    if (!numPages || loading) return

    const preloadPage = (pageNum: number) => {
      if (pageNum >= 1 && pageNum <= numPages && !preloadedPages.has(pageNum)) {
        // Simulate page preloading by adding to set
        // In a full implementation, this would actually load the page in background
        setPreloadedPages(prev => new Set(prev).add(pageNum))
      }
    }

    // Preload current page and adjacent pages
    const pagesToPreload = [
      pageNumber, // current page
      ...(pageNumber > 1 ? [pageNumber - 1] : []), // previous page
      ...(pageNumber < numPages ? [pageNumber + 1] : []), // next page
    ]

    // On mobile, limit preloading to save memory
    const preloadLimit = isMobile ? 2 : 3
    pagesToPreload.slice(0, preloadLimit).forEach(preloadPage)
  }, [pageNumber, numPages, loading, isMobile, preloadedPages])

  // Memory cleanup for preloaded pages
  useEffect(() => {
    if (preloadedPages.size > (isMobile ? 5 : 10)) {
      // Keep only recent pages
      const recentPages = new Set<number>()
      const range = isMobile ? 2 : 3

      for (
        let i = Math.max(1, pageNumber - range);
        i <= Math.min(numPages, pageNumber + range);
        i++
      ) {
        recentPages.add(i)
      }

      setPreloadedPages(recentPages)
    }
  }, [pageNumber, numPages, isMobile, preloadedPages.size])

  // Memory monitoring and cleanup
  useEffect(() => {
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as { memory?: { usedJSHeapSize: number } })
          .memory
        if (!memory) return
        const usedMB = memory.usedJSHeapSize / 1024 / 1024
        setMemoryUsage(usedMB)

        // Force cleanup if memory usage is high
        const memoryLimit = isMobile ? 50 : 100 // MB
        if (usedMB > memoryLimit) {
          // More aggressive cleanup
          const minPages = isMobile ? 1 : 2
          const range = Math.max(minPages, Math.floor((memoryLimit * 0.8) / 10))

          const essentialPages = new Set<number>()
          for (
            let i = Math.max(1, pageNumber - range);
            i <= Math.min(numPages, pageNumber + range);
            i++
          ) {
            essentialPages.add(i)
          }

          setPreloadedPages(essentialPages)

          // Suggest garbage collection if available
          if ('gc' in window) {
            ;(window as { gc?: () => void }).gc?.()
          }
        }
      }
    }

    const interval = setInterval(monitorMemory, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [pageNumber, numPages, isMobile])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setPreloadedPages(new Set())
      setMemoryUsage(0)
    }
  }, [])

  if (error) {
    return (
      <div
        className={`pdf-viewer-error flex items-center justify-center p-8 ${className}`}
      >
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold mb-2">PDF Loading Error</h3>
          <p className="text-gray-600 mb-4">{error.message}</p>
          {error.recoverable && (
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`pdf-viewer-container ${className} ${isMobile ? 'px-1' : 'px-4'}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Document
        file={url}
        onLoadSuccess={handleDocumentLoadSuccess}
        onLoadError={handleDocumentLoadError}
        options={{
          httpHeaders: {
            Authorization: localStorage.getItem('auth-token')
              ? `Bearer ${localStorage.getItem('auth-token')}`
              : undefined,
          },
        }}
        loading={
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading PDF...</p>
            </div>
          </div>
        }
        error={
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="text-5xl mb-4">📄</div>
              <p className="text-gray-600">Failed to load PDF</p>
            </div>
          </div>
        }
      >
        <Page
          pageNumber={pageNumber}
          width={pageWidth || undefined}
          renderTextLayer={enableTextLayer}
          renderAnnotationLayer={enableAnnotationLayer}
          className="mx-auto shadow-lg"
          loading={
            <div className="flex items-center justify-center p-8">
              <div
                className="animate-pulse bg-gray-200 rounded"
                style={{ width: pageWidth || 600, height: 800 }}
              />
            </div>
          }
        />
      </Document>

      {/* Page Navigation - Responsive positioning */}
      {numPages > 1 && !loading && (
        <>
          {/* Mobile Navigation - Bottom centered */}
          {isMobile && (
            <div className="pdf-viewer-controls mt-4 flex items-center justify-center gap-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
              <button
                onClick={() => changePage(-1)}
                disabled={pageNumber <= 1}
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Previous
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm">Page</span>
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={pageNumber}
                  onChange={e => goToPage(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 border rounded text-center text-sm"
                />
                <span className="text-sm">of {numPages}</span>
              </div>

              <button
                onClick={() => changePage(1)}
                disabled={pageNumber >= numPages}
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Next
              </button>
            </div>
          )}

          {/* Desktop Navigation - Now integrated with ScoreControls */}
        </>
      )}
    </div>
  )
}
