import { useEffect, useRef, useCallback } from 'react'
import { useScoreStore } from '../../stores/scoreStore'
import { usePracticeStore } from '../../stores/practiceStore'
import { type Score } from '../../services/scoreService'
import AdaptivePdfViewer from './AdaptivePdfViewer'
import ImageScoreViewer from './ImageScoreViewer'
import { type PdfError } from './PdfViewer'

interface ScoreViewerProps {
  score: Score
}

export default function ScoreViewer({ score }: ScoreViewerProps) {
  const {
    currentPage,
    autoScrollEnabled,
    scrollSpeed,
    setCurrentPage,
    setTotalPages,
  } = useScoreStore()
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle PDF load success
  const handlePdfLoad = useCallback(
    (info: { numPages: number }) => {
      setTotalPages(info.numPages)
    },
    [setTotalPages]
  )

  // Handle PDF load error
  const handlePdfError = useCallback(
    (error: PdfError | { message: string; type: string }) => {
      console.error('PDF load error:', error)
    },
    []
  )

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page)
      // Track page view in practice session if active
      usePracticeStore.getState().updatePageView(page)
    },
    [setCurrentPage]
  )

  // Auto-scroll functionality
  useEffect(() => {
    if (!autoScrollEnabled || !containerRef.current) return

    const scrollInterval = setInterval(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop += scrollSpeed
      }
    }, 50) // Smooth scroll every 50ms

    return () => clearInterval(scrollInterval)
  }, [autoScrollEnabled, scrollSpeed])

  // Determine which viewer to use based on source_type
  const isImageScore =
    score.source_type === 'image' || score.source_type === 'multi-image'

  return (
    <div className="flex-1 relative bg-white" ref={containerRef}>
      <div className="h-full overflow-auto">
        <div className="max-w-5xl mx-auto sm:p-4 p-2">
          <div className="relative bg-morandi-stone-50 rounded-lg shadow-lg sm:p-4 p-2">
            {isImageScore ? (
              <ImageScoreViewer
                scoreId={score.id}
                currentPage={currentPage}
                onLoad={handlePdfLoad}
                onError={handlePdfError}
                onPageChange={handlePageChange}
                className="w-full"
              />
            ) : (
              <AdaptivePdfViewer
                scoreId={score.id}
                currentPage={currentPage}
                onLoad={handlePdfLoad}
                onError={handlePdfError}
                onPageChange={handlePageChange}
                className="w-full"
                // Force PDF viewer to prevent the adaptive logic from running
                forcePdfViewer={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
