import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

export interface PdfInfo {
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

export enum PdfErrorCode {
  NETWORK_TIMEOUT = 'E001',
  CORRUPTED_FILE = 'E002',
  PASSWORD_PROTECTED = 'E003',
  UNSUPPORTED_VERSION = 'E004',
  MEMORY_EXCEEDED = 'E005',
  UNKNOWN_ERROR = 'E999',
}

export interface PdfError {
  code: PdfErrorCode
  message: string
  details?: unknown
  recoverable: boolean
}

interface PdfJsViewerProps {
  url: string
  currentPage: number
  viewMode?: 'single' | 'double'
  scale?: number
  className?: string
  onPageChange?: (page: number) => void
  onLoad?: (info: PdfInfo) => void
  onError?: (error: PdfError) => void
}

export default function PdfJsViewer({
  url,
  currentPage,
  viewMode = 'single',
  scale = 1.0,
  className = '',
  onPageChange,
  onLoad,
  onError,
}: PdfJsViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const secondCanvasRef = useRef<HTMLCanvasElement>(null) // For double page view
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageNum, setPageNum] = useState(currentPage)
  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rendering, setRendering] = useState(false)
  const renderTaskRef = useRef<any>(null)

  // Load PDF document
  useEffect(() => {
    let cancelled = false
    const loadingTask = pdfjs.getDocument(url)

    loadingTask.promise
      .then(pdf => {
        if (cancelled) return

        setPdfDoc(pdf)
        setNumPages(pdf.numPages)
        setLoading(false)

        // Extract metadata
        pdf.getMetadata().then(metadata => {
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
        })
      })
      .catch(error => {
        if (cancelled) return

        setLoading(false)
        handleError(error)
      })

    return () => {
      cancelled = true
      loadingTask.destroy()
    }
  }, [url, onLoad])

  // Handle errors
  const handleError = useCallback(
    (error: unknown) => {
      let pdfError: PdfError

      const errorMessage =
        error instanceof Error ? error.message : String(error)

      if (
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError')
      ) {
        pdfError = {
          code: PdfErrorCode.NETWORK_TIMEOUT,
          message: 'Failed to load PDF. Please check your internet connection.',
          details: error,
          recoverable: true,
        }
      } else if (errorMessage.includes('Invalid PDF')) {
        pdfError = {
          code: PdfErrorCode.CORRUPTED_FILE,
          message: 'The PDF file appears to be corrupted.',
          details: error,
          recoverable: false,
        }
      } else if (errorMessage.includes('password')) {
        pdfError = {
          code: PdfErrorCode.PASSWORD_PROTECTED,
          message: 'This PDF is password protected.',
          details: error,
          recoverable: false,
        }
      } else {
        pdfError = {
          code: PdfErrorCode.UNKNOWN_ERROR,
          message: 'An unexpected error occurred while loading the PDF.',
          details: error,
          recoverable: false,
        }
      }

      onError?.(pdfError)
    },
    [onError]
  )

  // Render page
  const renderPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDoc || !canvasRef.current) return

      // Cancel any ongoing render
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }

      setRendering(true)

      try {
        const page = await pdfDoc.getPage(pageNumber)
        const viewport = page.getViewport({ scale })

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) return

        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        const renderTask = page.render(renderContext)
        renderTaskRef.current = renderTask

        await renderTask.promise

        // Render second page if in double mode
        if (
          viewMode === 'double' &&
          secondCanvasRef.current &&
          pageNumber < numPages
        ) {
          const secondPage = await pdfDoc.getPage(pageNumber + 1)
          const secondCanvas = secondCanvasRef.current
          const secondContext = secondCanvas.getContext('2d')
          if (!secondContext) return

          secondCanvas.height = viewport.height
          secondCanvas.width = viewport.width

          const secondRenderContext = {
            canvasContext: secondContext,
            viewport: viewport,
          }

          await secondPage.render(secondRenderContext).promise
        }
      } catch (error) {
        // Ignore cancelled renders
        if (
          error instanceof Error &&
          error.name !== 'RenderingCancelledException'
        ) {
          handleError(error)
        }
      } finally {
        setRendering(false)
        renderTaskRef.current = null
      }
    },
    [pdfDoc, scale, viewMode, numPages, handleError]
  )

  // Update page when props change
  useEffect(() => {
    if (
      pdfDoc &&
      currentPage !== pageNum &&
      currentPage >= 1 &&
      currentPage <= numPages
    ) {
      setPageNum(currentPage)
    }
  }, [currentPage, pdfDoc, numPages, pageNum])

  // Render when page changes
  useEffect(() => {
    if (pdfDoc && pageNum >= 1 && pageNum <= numPages) {
      renderPage(pageNum)
    }
  }, [pageNum, pdfDoc, numPages, renderPage])

  // Navigation
  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= numPages) {
        setPageNum(page)
        onPageChange?.(page)
      }
    },
    [numPages, onPageChange]
  )

  const nextPage = useCallback(() => {
    const increment = viewMode === 'double' ? 2 : 1
    goToPage(pageNum + increment)
  }, [pageNum, viewMode, goToPage])

  const prevPage = useCallback(() => {
    const decrement = viewMode === 'double' ? 2 : 1
    goToPage(pageNum - decrement)
  }, [pageNum, viewMode, goToPage])

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading PDF...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`pdf-js-viewer ${className}`}>
      <div
        className={`canvas-container flex ${viewMode === 'double' ? 'gap-4' : ''}`}
      >
        <canvas ref={canvasRef} className="shadow-lg" />
        {viewMode === 'double' && (
          <canvas ref={secondCanvasRef} className="shadow-lg" />
        )}
      </div>

      {/* Basic navigation for testing */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          onClick={prevPage}
          disabled={pageNum <= 1}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm">
          Page {pageNum} of {numPages}
        </span>
        <button
          onClick={nextPage}
          disabled={pageNum >= numPages}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
