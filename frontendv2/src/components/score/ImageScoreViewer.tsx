import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { scoreService } from '../../services/scoreService'

interface ImageScoreViewerProps {
  scoreId: string
  currentPage: number
  onLoad?: (info: { numPages: number }) => void
  onError?: (error: { message: string; type: string }) => void
  onPageChange?: (page: number) => void
  className?: string
}

interface ScorePage {
  id: string
  pageNumber: number
  imageUrl: string
}

export default function ImageScoreViewer({
  scoreId,
  currentPage,
  onLoad,
  onError,
  onPageChange,
  className = '',
}: ImageScoreViewerProps) {
  const { t } = useTranslation('ui')
  const [pages, setPages] = useState<ScorePage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Reset image loading state when page changes
  // This effect must be before any conditional returns
  useEffect(() => {
    setImageLoading(true)
  }, [currentPage])

  // Fetch score pages from API
  useEffect(() => {
    const fetchPages = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch score details to get source_type and page_count
        const scoreResponse = await scoreService.getScore(scoreId)

        if (
          scoreResponse.source_type !== 'multi-image' &&
          scoreResponse.source_type !== 'image'
        ) {
          throw new Error('This score is not an image-based score')
        }

        // For multi-image scores, we need to fetch the page URLs
        // This would be a new API endpoint to get score pages
        const pagesData: ScorePage[] = []
        for (let i = 1; i <= (scoreResponse.page_count || 1); i++) {
          pagesData.push({
            id: `${scoreId}-page-${i}`,
            pageNumber: i,
            imageUrl: scoreService.getImagePageUrl(scoreId, i),
          })
        }

        setPages(pagesData)

        // Notify parent of total pages
        if (onLoad) {
          onLoad({ numPages: pagesData.length })
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load score pages'
        setError(errorMessage)
        if (onError) {
          onError({ message: errorMessage, type: 'load-error' })
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreId]) // Intentionally omit onLoad and onError to prevent re-fetching loops

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!onPageChange || pages.length === 0) return

      if (e.key === 'ArrowLeft' && currentPage > 1) {
        onPageChange(currentPage - 1)
      } else if (e.key === 'ArrowRight' && currentPage < pages.length) {
        onPageChange(currentPage + 1)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentPage, pages.length, onPageChange])

  // Handle image load events
  const handleImageLoad = () => {
    setImageLoading(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    const errorMessage = 'Failed to load score image'
    setError(errorMessage)
    if (onError) {
      onError({ message: errorMessage, type: 'image-error' })
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-morandi-sage-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-morandi-stone-600">Loading score...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <svg
            className="w-16 h-16 text-red-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-red-600 font-medium mb-2">Error loading score</p>
          <p className="text-sm text-morandi-stone-600">{error}</p>
        </div>
      </div>
    )
  }

  if (pages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <p className="text-morandi-stone-600">No pages found for this score</p>
      </div>
    )
  }

  const currentPageData =
    pages.find(p => p.pageNumber === currentPage) || pages[0]

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Navigation buttons for multi-page scores */}
      {pages.length > 1 && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label={t('components.scoreViewer.previousPage')}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="px-3 py-2 bg-white/90 backdrop-blur rounded-lg shadow-lg">
            <span className="text-sm font-medium">
              {currentPage} / {pages.length}
            </span>
          </div>
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= pages.length}
            className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label={t('components.scoreViewer.nextPage')}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Image display */}
      <div className="relative">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-morandi-stone-50">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-morandi-sage-500 border-t-transparent"></div>
          </div>
        )}
        <img
          key={currentPageData.id}
          ref={imageRef}
          src={currentPageData.imageUrl}
          alt={`Score page ${currentPage}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className="w-full h-auto max-w-none"
          style={{ minHeight: '400px' }}
        />
      </div>

      {/* Touch gesture hints for mobile */}
      {pages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-morandi-stone-500 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-md">
          Swipe or use arrows to navigate
        </div>
      )}
    </div>
  )
}
