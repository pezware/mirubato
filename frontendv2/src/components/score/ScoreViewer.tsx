import { useEffect, useRef, useState } from 'react'
import { useScoreStore } from '../../stores/scoreStore'
import { scoreService, type Score } from '../../services/scoreService'
import PdfViewer, { type PdfError } from './PdfViewer'

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
  const [pdfUrl, setPdfUrl] = useState<string>('')

  // Get PDF URL for the score
  useEffect(() => {
    const url = scoreService.getScorePdfUrl(score.id)
    setPdfUrl(url)
  }, [score.id])

  // Handle PDF load success
  const handlePdfLoad = (info: { numPages: number }) => {
    setTotalPages(info.numPages)
  }

  // Handle PDF load error
  const handlePdfError = (error: PdfError) => {
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
          {/* PDF Display using pdf.js */}
          {pdfUrl && (
            <div className="relative bg-morandi-stone-50 rounded-lg shadow-lg sm:p-4 p-2">
              <PdfViewer
                url={pdfUrl}
                currentPage={currentPage}
                onLoad={handlePdfLoad}
                onError={handlePdfError}
                onPageChange={handlePageChange}
                className="w-full"
                scale={1.0}
                enableTextLayer={false}
                enableAnnotationLayer={false}
                mobileOptimized={true}
                enableTouchGestures={true}
              />
            </div>
          )}

          {/* Fallback for development - show score info */}
          {!pdfUrl && (
            <div className="bg-morandi-stone-50 rounded-lg p-8 min-h-[600px] flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🎼</div>
                <h3 className="text-xl font-medium text-morandi-stone-800 mb-2">
                  {score.title}
                </h3>
                <p className="text-morandi-stone-600 mb-1">{score.composer}</p>
                <p className="text-sm text-morandi-stone-500">
                  {score.instrument} • {score.difficulty}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
