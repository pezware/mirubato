import { useEffect, useRef } from 'react'
import { useScoreStore } from '../../stores/scoreStore'
import { type Score } from '../../services/scoreService'
import AdaptivePdfViewer from './AdaptivePdfViewer'
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
  const handlePdfLoad = (info: { numPages: number }) => {
    setTotalPages(info.numPages)
  }

  // Handle PDF load error
  const handlePdfError = (
    error: PdfError | { message: string; type: string }
  ) => {
    console.error('PDF load error:', error)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

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

  // For now, we'll use an iframe to display PDFs
  // In production, we'd use a proper PDF viewer like pdf.js
  return (
    <div className="flex-1 relative bg-white" ref={containerRef}>
      <div className="h-full overflow-auto">
        <div className="max-w-5xl mx-auto sm:p-4 p-2">
          {/* Adaptive PDF Display - automatically chooses best viewer */}
          <div className="relative bg-morandi-stone-50 rounded-lg shadow-lg sm:p-4 p-2">
            <AdaptivePdfViewer
              scoreId={score.id}
              currentPage={currentPage}
              onLoad={handlePdfLoad}
              onError={handlePdfError}
              onPageChange={handlePageChange}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
