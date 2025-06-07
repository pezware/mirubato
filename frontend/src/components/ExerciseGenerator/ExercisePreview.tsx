import React, { useState, useRef, useEffect, useCallback } from 'react'
import { GeneratedExercise } from '../../modules/sheetMusic/types'
import { NotationRenderer } from '../../utils/notationRenderer'
import { useAudioManager } from '../../contexts/AudioContext'
import { logger } from '../../utils/logger'

export interface ExercisePreviewProps {
  /** The generated exercise to preview */
  exercise: GeneratedExercise
  /** Callback when user wants to save the exercise */
  onSave?: (exercise: GeneratedExercise) => void
  /** Callback when user wants to regenerate */
  onRegenerate?: () => void
  /** Whether the preview is in loading state */
  isLoading?: boolean
}

interface PreviewState {
  isPlaying: boolean
  currentMeasure: number
  zoom: number
  currentPage: number
  measuresPerPage: number
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 2
const ZOOM_STEP = 0.25

export const ExercisePreview: React.FC<ExercisePreviewProps> = ({
  exercise,
  onSave,
  onRegenerate,
  isLoading = false,
}) => {
  const [state, setState] = useState<PreviewState>({
    isPlaying: false,
    currentMeasure: 0,
    zoom: 1,
    currentPage: 0,
    measuresPerPage: 4,
  })

  const notationRef = useRef<HTMLDivElement>(null)
  const notationRendererRef = useRef<NotationRenderer | null>(null)
  const audioManager = useAudioManager()

  // Calculate pagination
  const totalPages = Math.ceil(exercise.measures.length / state.measuresPerPage)
  const startMeasure = state.currentPage * state.measuresPerPage
  const endMeasure = Math.min(
    startMeasure + state.measuresPerPage,
    exercise.measures.length
  )
  const currentPageMeasures = exercise.measures.slice(startMeasure, endMeasure)

  // Initialize notation renderer
  useEffect(() => {
    if (notationRef.current && !notationRendererRef.current) {
      notationRendererRef.current = new NotationRenderer(notationRef.current)
    }
  }, [])

  // Render notation when exercise or display parameters change
  useEffect(() => {
    if (notationRef.current && notationRendererRef.current && exercise) {
      // Calculate container width
      const containerWidth = notationRef.current.offsetWidth || 800

      try {
        // Measures are already in the correct format for the new SheetMusic type

        notationRendererRef.current.render(
          {
            id: exercise.id,
            title: exercise.metadata.title,
            composer: 'Generated Exercise',
            instrument: 'PIANO' as const,
            difficulty: 'INTERMEDIATE' as const,
            difficultyLevel: exercise.parameters.difficulty,
            durationSeconds: exercise.metadata.estimatedDuration,
            timeSignature: exercise.parameters.timeSignature,
            keySignature: exercise.parameters.keySignature,
            suggestedTempo: exercise.parameters.tempo,
            stylePeriod: 'CONTEMPORARY',
            tags: exercise.metadata.tags,
            measures: currentPageMeasures,
          },
          {
            width: containerWidth,
            scale: state.zoom,
            measuresPerLine: Math.min(2, state.measuresPerPage),
            startMeasureNumber: startMeasure,
          }
        )
      } catch (error) {
        logger.error('Failed to render notation', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          exercise: {
            id: exercise.id,
            measuresCount: exercise.measures.length,
            parameters: exercise.parameters,
          },
        })
      }
    }
  }, [
    exercise,
    currentPageMeasures,
    state.zoom,
    state.measuresPerPage,
    startMeasure,
  ])

  // Handle playback
  const handlePlayPause = useCallback(async () => {
    if (!audioManager) {
      logger.warn('Audio manager not available')
      return
    }

    if (state.isPlaying) {
      // For now, just update state since stop isn't available
      setState(prev => ({ ...prev, isPlaying: false }))
      // TODO: Implement proper stop functionality when audioManager is updated
    } else {
      try {
        await audioManager.initialize()

        // For now, play notes individually
        // TODO: Implement proper sequence playback when audioManager is updated
        setState(prev => ({ ...prev, isPlaying: true }))

        // Simple playback simulation
        let currentTime = 0
        for (const measure of currentPageMeasures) {
          for (const note of measure.notes) {
            // Convert VexFlow duration format to Tone.js format
            const toneDurationMap: Record<string, string> = {
              w: '1n', // whole note
              h: '2n', // half note
              q: '4n', // quarter note
              '8': '8n', // eighth note
              '16': '16n', // sixteenth note
            }

            await audioManager.playNoteAt(
              note.keys[0].replace('/', ''), // Convert notation format to note format
              currentTime,
              toneDurationMap[note.duration] || '4n', // Convert to Tone.js duration format
              0.8
            )
            // Approximate duration mapping for timing calculation
            const timingDurationMap: Record<string, number> = {
              w: 4,
              h: 2,
              q: 1,
              '8': 0.5,
              '16': 0.25,
            }
            currentTime +=
              (timingDurationMap[note.duration] || 1) *
              (60 / exercise.parameters.tempo)
          }
        }

        // Set timeout to reset playing state
        setTimeout(() => {
          setState(prev => ({ ...prev, isPlaying: false }))
        }, currentTime * 1000)
      } catch (error) {
        logger.error('Failed to start playback', { error })
        setState(prev => ({ ...prev, isPlaying: false }))
      }
    }
  }, [
    audioManager,
    state.isPlaying,
    currentPageMeasures,
    exercise.parameters.tempo,
  ])

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom + ZOOM_STEP, MAX_ZOOM),
    }))
  }, [])

  const handleZoomOut = useCallback(() => {
    setState(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom - ZOOM_STEP, MIN_ZOOM),
    }))
  }, [])

  const handleZoomReset = useCallback(() => {
    setState(prev => ({ ...prev, zoom: 1 }))
  }, [])

  // Handle pagination
  const handlePreviousPage = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentPage: Math.max(0, prev.currentPage - 1),
    }))
  }, [])

  const handleNextPage = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentPage: Math.min(totalPages - 1, prev.currentPage + 1),
    }))
  }, [totalPages])

  // Handle print
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(exercise)
    }
  }, [exercise, onSave])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating exercise...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {exercise.metadata.title}
            </h3>
            <p className="text-sm text-gray-600">
              {exercise.metadata.description}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Regenerate exercise"
              >
                Regenerate
              </button>
            )}
            {onSave && (
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Save exercise"
              >
                Save Exercise
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Playback Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePlayPause}
              className={`p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                state.isPlaying
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              aria-label={state.isPlaying ? 'Pause playback' : 'Start playback'}
            >
              {state.isPlaying ? (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
            <span className="text-sm text-gray-600">
              Tempo: {exercise.parameters.tempo} BPM
            </span>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Zoom out"
              disabled={state.zoom <= MIN_ZOOM}
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                />
              </svg>
            </button>
            <button
              onClick={handleZoomReset}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Reset zoom"
            >
              {Math.round(state.zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Zoom in"
              disabled={state.zoom >= MAX_ZOOM}
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                />
              </svg>
            </button>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Print exercise"
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
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Notation Display */}
      <div className="bg-white rounded-lg shadow-sm p-4 overflow-x-auto">
        <div
          ref={notationRef}
          className="min-h-[300px] notation-container"
          role="img"
          aria-label={`Sheet music for ${exercise.metadata.title}`}
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreviousPage}
              disabled={state.currentPage === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {state.currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={state.currentPage === totalPages - 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Exercise Details */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Exercise Details
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Type:</span>{' '}
            <span className="font-medium">{exercise.type}</span>
          </div>
          <div>
            <span className="text-gray-600">Difficulty:</span>{' '}
            <span className="font-medium">
              {exercise.parameters.difficulty}/10
            </span>
          </div>
          <div>
            <span className="text-gray-600">Measures:</span>{' '}
            <span className="font-medium">{exercise.measures.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Duration:</span>{' '}
            <span className="font-medium">
              {Math.floor(exercise.metadata.estimatedDuration / 60)}:
              {(exercise.metadata.estimatedDuration % 60)
                .toString()
                .padStart(2, '0')}
            </span>
          </div>
        </div>
        {exercise.metadata.focusAreas.length > 0 && (
          <div className="mt-3">
            <span className="text-gray-600 text-sm">Focus Areas:</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {exercise.metadata.focusAreas.map((area, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .notation-container {
                page-break-inside: avoid;
              }
              
              /* Hide everything except the notation and title */
              button,
              .controls,
              .pagination {
                display: none !important;
              }
            }
          `,
        }}
      />
    </div>
  )
}
