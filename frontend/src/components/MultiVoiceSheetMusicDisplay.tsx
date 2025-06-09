/**
 * MultiVoiceSheetMusicDisplay Component
 *
 * React component for displaying multi-voice sheet music scores
 * using the MultiVoiceNotationRenderer.
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  MultiVoiceNotationRenderer,
  MultiVoiceRenderOptions,
} from '../utils/multiVoiceNotationRenderer'
import { Score } from '../modules/sheetMusic/multiVoiceTypes'
import { useViewport } from '../hooks/useViewport'
import { StaffDisplayOptions } from './StaffDisplayOptions'

interface MultiVoiceSheetMusicDisplayProps {
  /** The score to display */
  score: Score
  /** Optional fixed width */
  width?: number
  /** Optional fixed height */
  height?: number
  /** Current measure being played */
  currentMeasure?: number
  /** Voice to highlight */
  highlightedVoice?: string | null
  /** Display options for staff visibility */
  displayOptions?: StaffDisplayOptions
  /** Whether to enable performance tracking */
  enablePerformanceTracking?: boolean
  /** Optional rendering options */
  options?: Partial<MultiVoiceRenderOptions>
  /** Optional CSS class name */
  className?: string
  /** Callback when rendering is complete */
  onRenderComplete?: () => void
  /** Callback when rendering fails */
  onRenderError?: (error: Error) => void
}

/**
 * Component for displaying multi-voice sheet music
 */
export const MultiVoiceSheetMusicDisplay: React.FC<
  MultiVoiceSheetMusicDisplayProps
> = ({
  score,
  width: _fixedWidth,
  height: _fixedHeight,
  currentMeasure: _currentMeasure,
  highlightedVoice: _highlightedVoice,
  displayOptions: _displayOptions,
  enablePerformanceTracking: _enablePerformanceTracking,
  options = {},
  className = '',
  onRenderComplete,
  onRenderError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<MultiVoiceNotationRenderer | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { viewportWidth: width } = useViewport()

  // Calculate responsive width
  const getResponsiveWidth = () => {
    if (!containerRef.current) return 1200
    const containerWidth = containerRef.current.offsetWidth
    return Math.min(containerWidth, 1200) // Max width of 1200px
  }

  // Initialize renderer
  useEffect(() => {
    if (!containerRef.current) return

    try {
      // Clean up previous renderer
      if (rendererRef.current) {
        rendererRef.current.destroy()
      }

      // Create new renderer with responsive width
      const responsiveOptions: Partial<MultiVoiceRenderOptions> = {
        ...options,
        width: getResponsiveWidth(),
      }

      rendererRef.current = new MultiVoiceNotationRenderer(
        containerRef.current,
        responsiveOptions
      )
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to initialize renderer')
      setError(error)
      onRenderError?.(error)
    }

    // Cleanup on unmount
    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy()
        rendererRef.current = null
      }
    }
  }, [options, onRenderError]) // Include dependencies

  // Update options when they change
  useEffect(() => {
    if (!rendererRef.current || !options) return

    try {
      rendererRef.current.updateOptions({
        ...options,
        width: getResponsiveWidth(),
      })
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to update options')
      setError(error)
      onRenderError?.(error)
    }
  }, [options, onRenderError])

  // Render score when it changes
  useEffect(() => {
    if (!rendererRef.current || !score) return

    const renderScore = async () => {
      setIsRendering(true)
      setError(null)

      try {
        // Clear previous rendering
        rendererRef.current!.clear()

        // Render the score
        rendererRef.current!.renderScore(score)

        // Notify completion
        onRenderComplete?.()
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to render score')
        setError(error)
        onRenderError?.(error)
      } finally {
        setIsRendering(false)
      }
    }

    renderScore()
  }, [score, onRenderComplete, onRenderError])

  // Handle window resize
  useEffect(() => {
    if (!rendererRef.current) return

    const handleResize = () => {
      if (rendererRef.current && containerRef.current) {
        const newWidth = getResponsiveWidth()
        rendererRef.current.resize(newWidth, options.height || 800)

        // Re-render the score with new dimensions
        if (score) {
          try {
            rendererRef.current.renderScore(score)
          } catch (err) {
            const error =
              err instanceof Error
                ? err
                : new Error('Failed to render after resize')
            setError(error)
            onRenderError?.(error)
          }
        }
      }
    }

    // Debounce resize events
    let resizeTimeout: NodeJS.Timeout
    const debouncedResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(handleResize, 300)
    }

    window.addEventListener('resize', debouncedResize)
    return () => {
      window.removeEventListener('resize', debouncedResize)
      clearTimeout(resizeTimeout)
    }
  }, [score, options.height, width, onRenderError])

  return (
    <div className={`multi-voice-sheet-music-display ${className}`}>
      {/* Loading indicator */}
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="text-gray-600">Rendering score...</div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Error rendering score:</strong>
          <span className="block sm:inline"> {error.message}</span>
        </div>
      )}

      {/* Score container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-x-auto bg-white rounded-lg shadow-sm"
        style={{ minHeight: options.height || 800 }}
      />

      {/* Score information */}
      <div className="mt-4 text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <div>
            {score.parts.length} part{score.parts.length > 1 ? 's' : ''} •
            {score.measures.length} measure
            {score.measures.length > 1 ? 's' : ''}
          </div>
          {score.metadata.duration && (
            <div>Duration: ~{Math.round(score.metadata.duration / 60)} min</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MultiVoiceSheetMusicDisplay
