import { useState, useEffect } from 'react'
import PdfViewer, { type PdfError } from './PdfViewer'
import ImageBasedPdfViewer from './ImageBasedPdfViewer'
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
  const [pdfUrl, setPdfUrl] = useState('')
  const [totalPages, setTotalPages] = useState<number | undefined>()

  // Detect device and capabilities
  useEffect(() => {
    const detectViewerMode = async () => {
      // Check for forced modes first
      if (forceImageViewer) {
        setUseImageViewer(true)
        return
      }
      if (forcePdfViewer) {
        setUseImageViewer(false)
        setPdfUrl(scoreService.getScorePdfUrl(scoreId))
        return
      }

      // Check if running in local development
      if (DeviceDetection.isLocalDevelopment()) {
        console.log('Local development detected - using PDF viewer')
        setUseImageViewer(false)
        setPdfUrl(scoreService.getScorePdfUrl(scoreId))
        return
      }

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
          setPdfUrl(scoreService.getScorePdfUrl(scoreId))
        }
      }
    }

    detectViewerMode()
  }, [scoreId, forceImageViewer, forcePdfViewer])

  // Common error handler that works with both viewer types
  const handleError = (error: PdfError | { message: string; type: string }) => {
    console.error('Viewer error:', error)

    // If image viewer fails, try PDF viewer as fallback
    if (useImageViewer && !forcePdfViewer) {
      console.log('Image viewer failed, falling back to PDF viewer')
      setUseImageViewer(false)
      setPdfUrl(scoreService.getScorePdfUrl(scoreId))
    }

    onError?.(error)
  }

  // Render appropriate viewer
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

        {/* Viewer toggle for desktop users */}
        {window.innerWidth > 768 && (
          <div className="mt-2 text-center">
            <button
              onClick={() => {
                localStorage.setItem('preferImageViewer', 'false')
                setUseImageViewer(false)
                setPdfUrl(scoreService.getScorePdfUrl(scoreId))
              }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Switch to PDF viewer
            </button>
          </div>
        )}
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

      {/* Viewer toggle for desktop users (not shown in local dev) */}
      {window.innerWidth > 768 &&
        !window.location.hostname.includes('localhost') && (
          <div className="mt-2 text-center">
            <button
              onClick={async () => {
                localStorage.setItem('preferImageViewer', 'true')
                setUseImageViewer(true)
                try {
                  const metadata = await scoreService.getScoreMetadata(scoreId)
                  setTotalPages(metadata.numPages)
                } catch (error) {
                  console.warn('Failed to fetch score metadata:', error)
                }
              }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Switch to image viewer (better for mobile)
            </button>
          </div>
        )}
    </div>
  )
}
