import { useEffect, useRef, useState } from 'react'
import { useScoreStore } from '../../stores/scoreStore'
import { scoreService, type Score } from '../../services/scoreService'

interface ScoreViewerProps {
  score: Score
}

export default function ScoreViewer({ score }: ScoreViewerProps) {
  const {
    currentPage,
    totalPages,
    autoScrollEnabled,
    scrollSpeed,
    previousPage,
    nextPage,
  } = useScoreStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [isLoadingPdf, setIsLoadingPdf] = useState(true)
  const [pdfError, setPdfError] = useState<string | null>(null)

  // Get PDF URL for the score
  useEffect(() => {
    setIsLoadingPdf(true)
    setPdfError(null)
    const url = scoreService.getScorePdfUrl(score.id)
    setPdfUrl(url)

    // Set a timeout to handle loading state
    const timeout = setTimeout(() => {
      setIsLoadingPdf(false)
    }, 3000)

    return () => clearTimeout(timeout)
  }, [score.id])

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
        <div className="max-w-5xl mx-auto p-4">
          {/* PDF Display */}
          {pdfUrl && (
            <div className="relative bg-morandi-stone-50 rounded-lg shadow-lg">
              {isLoadingPdf && !pdfError && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-morandi-sage-500 mx-auto mb-2"></div>
                    <p className="text-sm text-morandi-stone-600">
                      Loading PDF...
                    </p>
                  </div>
                </div>
              )}

              {/* Error display */}
              {pdfError && (
                <div className="absolute inset-0 flex items-center justify-center bg-morandi-stone-50 rounded-lg">
                  <div className="text-center p-8">
                    <div className="text-5xl mb-4">📄</div>
                    <h3 className="text-xl font-medium text-morandi-stone-800 mb-2">
                      {score.title}
                    </h3>
                    <p className="text-morandi-stone-600 mb-4">
                      {score.composer}
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto">
                      <p className="text-sm text-amber-800 mb-2">{pdfError}</p>
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-morandi-sage-500 text-white rounded-lg hover:bg-morandi-sage-600 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        Open PDF in new tab
                      </a>
                    </div>
                    <div className="mt-4 text-sm text-morandi-stone-500">
                      {score.instrument} • {score.difficulty} • {totalPages}{' '}
                      page{totalPages !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              )}

              {/* PDF display using embed element */}
              <embed
                src={pdfUrl}
                type="application/pdf"
                className={`w-full h-[800px] rounded-lg ${pdfError ? 'hidden' : ''}`}
                onLoad={() => {
                  setIsLoadingPdf(false)
                  setPdfError(null)
                }}
              />

              {/* Page indicator overlay */}
              {totalPages > 1 && !pdfError && (
                <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                  Page {currentPage} of {totalPages}
                </div>
              )}
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

      {/* Page Navigation for multi-page scores */}
      {totalPages > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur-sm rounded-full shadow-lg px-4 py-2">
          <button
            onClick={previousPage}
            disabled={currentPage === 1}
            className="p-2 text-morandi-stone-600 hover:text-morandi-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

          <span className="text-sm text-morandi-stone-700 min-w-[100px] text-center">
            Page {currentPage} / {totalPages}
          </span>

          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className="p-2 text-morandi-stone-600 hover:text-morandi-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    </div>
  )
}
