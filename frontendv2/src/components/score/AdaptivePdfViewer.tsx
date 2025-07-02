import { useState, useEffect, useMemo } from 'react'
import PdfViewer, { type PdfError } from './PdfViewer'
import ImageBasedPdfViewer from './ImageBasedPdfViewer'
import ImageScoreViewer from './ImageScoreViewer'
import { scoreService } from '../../services/scoreService'
import { DeviceDetection } from '../../constants/deviceDetection'

interface AdaptivePdfViewerProps {
  scoreId: string
  currentPage?: number
  onPageChange?: (page: number) => void
  onLoad?: (info: { numPages: number }) => void
  onError?: (error: PdfError | { message: string; type: string }) => void
  className?: string
  forceImageViewer?: boolean // For testing or specific use cases
  forcePdfViewer?: boolean // For testing or specific use cases
}

export default function AdaptivePdfViewer({
  scoreId,
  currentPage = 1,
  onPageChange,
  onLoad,
  onError,
  className = '',
  forceImageViewer,
  forcePdfViewer,
}: AdaptivePdfViewerProps) {
  const [useImageViewer, setUseImageViewer] = useState(false)
  const [isImageBasedScore, setIsImageBasedScore] = useState(false)
  const [totalPages, setTotalPages] = useState<number | undefined>()
  const [errorCount, setErrorCount] = useState(0)
  const maxRetries = 3

  // Memoize PDF URL to prevent re-renders
  const pdfUrl = useMemo(() => {
    if (!useImageViewer && !isImageBasedScore) {
      return scoreService.getScorePdfUrl(scoreId)
    }
    return ''
  }, [scoreId, useImageViewer, isImageBasedScore])

  // Reset error count when scoreId changes
  useEffect(() => {
    setErrorCount(0)
  }, [scoreId])

  // Detect device and capabilities
  useEffect(() => {
    const detectViewerMode = async () => {
      // First, check if this is an image-based score
      try {
        const score = await scoreService.getScore(scoreId)
        if (
          score.source_type === 'image' ||
          score.source_type === 'multi-image'
        ) {
          setIsImageBasedScore(true)
          return // Always use ImageScoreViewer for image-based scores
        }
      } catch (error) {
        console.error('Failed to fetch score details:', error)
      }

      // Check for forced modes first
      if (forceImageViewer) {
        setUseImageViewer(true)
        return
      }
      if (forcePdfViewer) {
        setUseImageViewer(false)
        return
      }

      // Check if running in local development
      if (DeviceDetection.isLocalDevelopment()) {
        console.log('Local development detected - using PDF viewer')
        setUseImageViewer(false)
        return
      }

      // TEMPORARY: Disable image viewer due to browser rendering instability
      // TODO: Re-enable once browser rendering is more stable or implement pre-rendering
      console.log('Using PDF viewer - image rendering temporarily disabled')
      setUseImageViewer(false)
      return

      // Use device detection to determine viewer mode
      const deviceScore = DeviceDetection.getDeviceScore()
      const shouldUseImage = DeviceDetection.shouldUseImageViewer()

      console.log(
        `Device score: ${deviceScore}, using image viewer: ${shouldUseImage}`
      )

      // Check if the browser supports required APIs
      const hasRequiredAPIs = DeviceDetection.hasRequiredAPIs()

      // Decision logic
      if (shouldUseImage || !hasRequiredAPIs) {
        // Use image viewer for low-capability devices or browsers
        setUseImageViewer(true)

        // Try to get metadata for total pages
        try {
          const metadata = await scoreService.getScoreMetadata(scoreId)
          setTotalPages(metadata.numPages)
        } catch (error) {
          // If metadata fails, we'll let the image viewer handle it
          console.warn('Failed to fetch score metadata:', error)
        }
      } else {
        // Desktop with good resources - check user preference
        const preferImageViewer =
          localStorage.getItem('preferImageViewer') === 'true'

        if (preferImageViewer) {
          setUseImageViewer(true)
          try {
            const metadata = await scoreService.getScoreMetadata(scoreId)
            setTotalPages(metadata.numPages)
          } catch (error) {
            console.warn('Failed to fetch score metadata:', error)
          }
        } else {
          // Default to PDF viewer on desktop
          setUseImageViewer(false)
        }
      }
    }

    detectViewerMode()
  }, [scoreId, forceImageViewer, forcePdfViewer])

  // Common error handler that works with both viewer types
  const handleError = (error: PdfError | { message: string; type: string }) => {
    console.error('Viewer error:', error)

    // Increment error count
    setErrorCount(prev => prev + 1)

    // If we've exceeded max retries, stop trying
    if (errorCount >= maxRetries) {
      console.error(`Max retries (${maxRetries}) exceeded, stopping`)
      onError?.(error)
      return
    }

    // If image viewer fails, try PDF viewer as fallback
    if (useImageViewer && !forcePdfViewer) {
      console.log('Image viewer failed, falling back to PDF viewer')
      setUseImageViewer(false)
    }

    onError?.(error)
  }

  // Render appropriate viewer
  // For image-based scores (uploaded images), always use ImageScoreViewer
  if (isImageBasedScore) {
    return (
      <div className={`adaptive-pdf-viewer ${className}`}>
        <ImageScoreViewer
          scoreId={scoreId}
          currentPage={currentPage}
          onPageChange={onPageChange}
          onLoad={onLoad}
          onError={handleError}
          className="w-full"
        />
      </div>
    )
  }

  // For PDF scores, use the appropriate viewer based on device capabilities
  if (useImageViewer) {
    return (
      <div className={`adaptive-pdf-viewer ${className}`}>
        <ImageBasedPdfViewer
          scoreId={scoreId}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onLoad={onLoad}
          onError={handleError}
          className="w-full"
          enableTouchGestures={true}
          enablePreloading={true}
          preloadRange={2}
        />

        {/* Viewer toggle removed - image viewer disabled */}
      </div>
    )
  }

  // Show error if max retries exceeded
  if (errorCount >= maxRetries) {
    return (
      <div className={`adaptive-pdf-viewer ${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold mb-2">Unable to Load Score</h3>
            <p className="text-gray-600 mb-4">
              We're having trouble loading this score. Please try refreshing the
              page or contact support if the issue persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`adaptive-pdf-viewer ${className}`}>
      <PdfViewer
        url={pdfUrl}
        currentPage={currentPage}
        onLoad={onLoad}
        onError={handleError}
        onPageChange={onPageChange}
        className="w-full"
        scale={1.0}
        enableTextLayer={false}
        enableAnnotationLayer={false}
        mobileOptimized={true}
        enableTouchGestures={true}
      />

      {/* Viewer toggle removed - image viewer disabled due to API instability */}
    </div>
  )
}
