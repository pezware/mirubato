import { useState, useEffect, useMemo, useCallback } from 'react'
import PdfViewer, { type PdfError } from './PdfViewer'
import ImageBasedPdfViewer from './ImageBasedPdfViewer'
import ImageScoreViewer from './ImageScoreViewer'
import { scoreService } from '../../services/scoreService'
import { DeviceDetection } from '../../constants/deviceDetection'
import { Button } from '../ui'

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

interface RenderStatus {
  preRenderedPages: number[]
  preRenderedCount: number
  browserAvailable: boolean
  renderingEnabled: boolean
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
  const [renderStatus, setRenderStatus] = useState<RenderStatus | null>(null)
  const [viewerReady, setViewerReady] = useState(false)
  const maxRetries = 3

  // Memoize PDF URL to prevent re-renders
  const pdfUrl = useMemo(() => {
    if (!useImageViewer && !isImageBasedScore) {
      return scoreService.getScorePdfUrl(scoreId)
    }
    return ''
  }, [scoreId, useImageViewer, isImageBasedScore])

  // Reset state when scoreId changes
  useEffect(() => {
    setErrorCount(0)
    setViewerReady(false)
    setRenderStatus(null)
  }, [scoreId])

  // Check render status to determine best viewer strategy
  const checkRenderStatus = useCallback(async () => {
    try {
      const status = await scoreService.getRenderStatus(scoreId)
      setRenderStatus(status)
      return status
    } catch (error) {
      console.warn('Failed to fetch render status:', error)
      return null
    }
  }, [scoreId])

  // Detect device and capabilities with improved logic
  useEffect(() => {
    const detectViewerMode = async () => {
      // When forcePdfViewer is true, we know it's a PDF - skip everything
      if (forcePdfViewer) {
        setUseImageViewer(false)
        setIsImageBasedScore(false)
        setViewerReady(true)
        return
      }

      // Check for forced image viewer
      if (forceImageViewer) {
        setUseImageViewer(true)
        setViewerReady(true)
        return
      }

      // Only check score type when NOT forced
      try {
        const score = await scoreService.getScore(scoreId)
        if (
          score.source_type === 'image' ||
          score.source_type === 'multi-image'
        ) {
          setIsImageBasedScore(true)
          setViewerReady(true)
          return // Always use ImageScoreViewer for image-based scores
        }
      } catch (error) {
        console.error('Failed to fetch score details:', error)
      }

      // Check if running in local development
      if (DeviceDetection.isLocalDevelopment()) {
        console.log('Local development detected - using PDF viewer')
        setUseImageViewer(false)
        setViewerReady(true)
        return
      }

      // Check render status to see if pre-rendered pages are available
      const status = await checkRenderStatus()

      // If we have pre-rendered pages available, prefer image viewer for performance
      if (status && status.preRenderedCount > 0) {
        console.log(
          `Pre-rendered pages available (${status.preRenderedCount}), using image viewer`
        )
        setUseImageViewer(true)
        setTotalPages(status.preRenderedCount)
        setViewerReady(true)
        return
      }

      // If browser rendering is available and healthy, use image viewer on mobile
      if (status?.browserAvailable && status?.renderingEnabled) {
        const shouldUseImage = DeviceDetection.shouldUseImageViewer()
        const hasRequiredAPIs = DeviceDetection.hasRequiredAPIs()
        const deviceScore = DeviceDetection.getDeviceScore()

        console.log(
          `Device score: ${deviceScore}, should use image: ${shouldUseImage}, has APIs: ${hasRequiredAPIs}`
        )

        if (shouldUseImage || !hasRequiredAPIs) {
          // Use image viewer for mobile/low-capability devices
          setUseImageViewer(true)
          try {
            const metadata = await scoreService.getScoreMetadata(scoreId)
            setTotalPages(metadata.numPages)
          } catch (error) {
            console.warn('Failed to fetch score metadata:', error)
          }
          setViewerReady(true)
          return
        }
      }

      // Check user preference for image viewer
      const preferImageViewer =
        localStorage.getItem('preferImageViewer') === 'true'

      if (preferImageViewer && status?.browserAvailable) {
        setUseImageViewer(true)
        try {
          const metadata = await scoreService.getScoreMetadata(scoreId)
          setTotalPages(metadata.numPages)
        } catch (error) {
          console.warn('Failed to fetch score metadata:', error)
        }
      } else {
        // Default to PDF viewer (client-side rendering)
        setUseImageViewer(false)
      }

      setViewerReady(true)
    }

    detectViewerMode()
  }, [scoreId, forceImageViewer, forcePdfViewer, checkRenderStatus])

  // Common error handler with improved fallback logic
  const handleError = useCallback(
    (error: PdfError | { message: string; type: string }) => {
      console.error('Viewer error:', error)

      // Increment error count
      const newErrorCount = errorCount + 1
      setErrorCount(newErrorCount)

      // If we've exceeded max retries, stop trying
      if (newErrorCount >= maxRetries) {
        console.error(`Max retries (${maxRetries}) exceeded, stopping`)
        onError?.(error)
        return
      }

      // If image viewer fails, try PDF viewer as fallback
      if (useImageViewer && !forcePdfViewer) {
        console.log('Image viewer failed, falling back to PDF viewer')
        setUseImageViewer(false)
        return // Don't propagate error yet, we're trying fallback
      }

      // If PDF viewer fails and browser rendering is available, try image viewer
      if (
        !useImageViewer &&
        renderStatus?.browserAvailable &&
        !forceImageViewer
      ) {
        console.log('PDF viewer failed, trying image viewer as fallback')
        setUseImageViewer(true)
        return // Don't propagate error yet, we're trying fallback
      }

      onError?.(error)
    },
    [
      errorCount,
      maxRetries,
      useImageViewer,
      forcePdfViewer,
      forceImageViewer,
      renderStatus,
      onError,
    ]
  )

  // Show loading state while detecting viewer mode
  if (!viewerReady) {
    return (
      <div className={`adaptive-pdf-viewer ${className}`}>
        <div className="flex items-center justify-center p-8 min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading viewer...</p>
          </div>
        </div>
      </div>
    )
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
            <Button variant="primary" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
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
