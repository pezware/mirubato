import { useState, useEffect, useCallback, useRef } from 'react'
import { scoreService } from '../../services/scoreService'
import { ProgressiveImage } from '../ui'
import { ProgressiveImageLoader } from '../../utils/imageUtils'

interface ImageBasedPdfViewerProps {
  scoreId: string
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onLoad?: (info: { numPages: number }) => void
  onError?: (error: { message: string; type: string }) => void
  className?: string
  enableTouchGestures?: boolean
  enablePreloading?: boolean
  preloadRange?: number
}

export default function ImageBasedPdfViewer({
  scoreId,
  currentPage = 1,
  totalPages,
  onPageChange,
  onLoad,
  onError,
  className = '',
  enableTouchGestures = true,
  enablePreloading = true,
  preloadRange = 2,
}: ImageBasedPdfViewerProps) {
  const [pageNumber, setPageNumber] = useState(currentPage)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchStartY, setTouchStartY] = useState(0)
  const [preloadedImages, setPreloadedImages] = useState<Map<number, string>>(
    new Map()
  )
  const preloadedImagesRef = useRef<Map<number, string>>(new Map())
  const imageLoader = useRef(new ProgressiveImageLoader())
  const [numPages, setNumPages] = useState(totalPages || 0)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Get the URL for a specific page
  const getPageUrl = useCallback(
    (page: number) => {
      return scoreService.getScorePageUrl(scoreId, page)
    },
    [scoreId]
  )

  // Preload images for adjacent pages
  useEffect(() => {
    if (!enablePreloading || !numPages) return

    const imagesToPreload: number[] = []

    // Add current page
    imagesToPreload.push(pageNumber)

    // Add pages within preload range
    for (let i = 1; i <= preloadRange; i++) {
      if (pageNumber - i >= 1) imagesToPreload.push(pageNumber - i)
      if (pageNumber + i <= numPages) imagesToPreload.push(pageNumber + i)
    }

    // Preload images using progressive loader
    imagesToPreload.forEach(async page => {
      if (!preloadedImagesRef.current.has(page)) {
        const url = getPageUrl(page)
        try {
          await imageLoader.current.load(url, {
            generateLQIP: false, // Server-rendered images don't need LQIP
            onFullImageReady: loadedUrl => {
              preloadedImagesRef.current.set(page, loadedUrl)
              setPreloadedImages(new Map(preloadedImagesRef.current))
            },
          })
        } catch (error) {
          console.warn(`Failed to preload page ${page}:`, error)
        }
      }
    })

    // Cleanup old preloaded images to save memory
    const keepPages = new Set(imagesToPreload)
    const newMap = new Map<number, string>()
    preloadedImagesRef.current.forEach((src, page) => {
      if (keepPages.has(page)) {
        newMap.set(page, src)
      }
    })
    preloadedImagesRef.current = newMap
    setPreloadedImages(newMap)
  }, [pageNumber, numPages, enablePreloading, preloadRange, getPageUrl])

  // Handle page navigation
  const changePage = useCallback(
    (offset: number) => {
      const newPage = pageNumber + offset
      if (newPage >= 1 && newPage <= numPages) {
        setPageNumber(newPage)
        onPageChange?.(newPage)
        setImageError(false)
        setLoading(true)
      }
    },
    [pageNumber, numPages, onPageChange]
  )

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= numPages) {
        setPageNumber(page)
        onPageChange?.(page)
        setImageError(false)
        setLoading(true)
      }
    },
    [numPages, onPageChange]
  )

  // Touch gesture handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enableTouchGestures) return
      const touch = e.touches[0]
      setTouchStartX(touch.clientX)
      setTouchStartY(touch.clientY)
    },
    [enableTouchGestures]
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enableTouchGestures) return
      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartX
      const deltaY = touch.clientY - touchStartY

      // Horizontal swipe detection
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          changePage(-1) // Swipe right - previous page
        } else {
          changePage(1) // Swipe left - next page
        }
      }
    },
    [enableTouchGestures, touchStartX, touchStartY, changePage]
  )

  // Handle image load success
  const handleImageLoad = useCallback(() => {
    setLoading(false)
    setImageError(false)

    // If this is the first page load and we don't know total pages yet,
    // we can make a request to get the PDF info
    if (!numPages && pageNumber === 1) {
      // For now, we'll assume the backend will tell us via headers or we'll need to add an endpoint
      // This is a placeholder - you might need to add a proper endpoint to get PDF info
      onLoad?.({ numPages: totalPages || 10 })
      setNumPages(totalPages || 10)
    }
  }, [numPages, pageNumber, totalPages, onLoad])

  // Handle image load error
  const handleImageError = useCallback(() => {
    setLoading(false)
    setImageError(true)
    onError?.({
      message: `Failed to load page ${pageNumber}`,
      type: 'IMAGE_LOAD_ERROR',
    })
  }, [pageNumber, onError])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        changePage(-1)
      } else if (e.key === 'ArrowRight') {
        changePage(1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [changePage])

  return (
    <div
      ref={containerRef}
      className={`image-pdf-viewer ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main Image Display */}
      <div className="relative bg-gray-100 rounded-lg shadow-lg overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">
                Loading page {pageNumber}...
              </p>
            </div>
          </div>
        )}

        {imageError ? (
          <div className="flex items-center justify-center p-8 min-h-[600px]">
            <div className="text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold mb-2">
                Failed to load page
              </h3>
              <p className="text-gray-600 mb-4">
                Unable to display page {pageNumber}
              </p>
              <button
                onClick={() => {
                  setImageError(false)
                  setLoading(true)
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <ProgressiveImage
            src={preloadedImages.get(pageNumber) || getPageUrl(pageNumber)}
            alt={`Page ${pageNumber}`}
            className="w-full h-auto mx-auto"
            onLoad={handleImageLoad}
            onError={error => {
              console.error('Image load error:', error)
              handleImageError()
            }}
            blurAmount={10}
            transitionDuration={200}
          />
        )}
      </div>

      {/* Navigation Controls */}
      {numPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
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
            <span className="text-sm">of {numPages || '?'}</span>
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

      {/* Preload Status (dev only) */}
      {process.env.NODE_ENV === 'development' && enablePreloading && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Preloaded:{' '}
          {Array.from(preloadedImages.keys())
            .sort((a, b) => a - b)
            .join(', ')}
        </div>
      )}
    </div>
  )
}
