import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAudioManager } from '../contexts/AudioContext'
import { useAuth } from '../hooks/useAuth'
import {
  moonlightSonata3rdMovement,
  getMoonlightNotes,
} from '../data/sheetMusic'
import {
  SaveProgressPrompt,
  PracticeHeader,
  PracticeControls,
  PracticeNotation,
} from '../components'
import type { PracticeMode } from '../components'
import { useViewport } from '../hooks/useViewport'
import { EventBus } from '../modules/core/EventBus'
import { StorageModule } from '../modules/infrastructure/StorageModule'
import { SheetMusicLibraryModule } from '../modules/sheetMusic/SheetMusicLibraryModule'
import { EventDrivenStorage } from '../modules/core/eventDrivenStorage'
import type { GeneratedExercise, SheetMusic } from '../modules/sheetMusic/types'
import { logger } from '../utils/logger'

const Practice: React.FC = () => {
  const audioManager = useAudioManager()
  const { isMobile, isTablet } = useViewport()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Control states
  const [mode, setMode] = useState<PracticeMode>('practice')
  const [volume, setVolume] = useState(75) // 0-100
  const [showGhostControls] = useState(true)
  const [currentPlayingMeasure, setCurrentPlayingMeasure] = useState<
    number | undefined
  >()

  // Exercise mode states
  const [showExerciseSettings, setShowExerciseSettings] = useState(false)
  const [exercises, setExercises] = useState<GeneratedExercise[]>([])
  const [selectedExercise, setSelectedExercise] =
    useState<GeneratedExercise | null>(null)
  const [sheetMusicModule, setSheetMusicModule] =
    useState<SheetMusicLibraryModule | null>(null)
  const [storageModule, setStorageModule] = useState<StorageModule | null>(null)
  const [loading, setLoading] = useState(false)

  // Get the current piece data based on mode
  const currentPiece =
    mode === 'exercise' && selectedExercise
      ? convertExerciseToSheetMusic(selectedExercise)
      : moonlightSonata3rdMovement
  const playableNotes =
    mode === 'exercise' && selectedExercise
      ? getExerciseNotes(selectedExercise)
      : getMoonlightNotes()

  // Set instrument to piano (but don't initialize audio yet)
  useEffect(() => {
    audioManager.setInstrument('piano')
  }, [audioManager])

  // Initialize modules for exercise mode
  useEffect(() => {
    if (mode === 'exercise' && !sheetMusicModule && user) {
      initializeModules()
    }

    return () => {
      if (sheetMusicModule) {
        sheetMusicModule.destroy()
      }
      if (storageModule) {
        storageModule.shutdown()
      }
    }
  }, [mode, user, sheetMusicModule, storageModule])

  // Load exercises when module is ready
  useEffect(() => {
    const loadExercises = async () => {
      if (!sheetMusicModule || !user) return

      try {
        const userExercises = await sheetMusicModule.listUserExercises(user.id)
        setExercises(userExercises)
      } catch (error) {
        logger.error('Failed to load exercises', { error })
      }
    }

    if (sheetMusicModule && user) {
      loadExercises()
    }
  }, [sheetMusicModule, user])

  // Check if we came from exercise library with a selected exercise or startInExerciseMode
  useEffect(() => {
    if (location.state?.exercise) {
      setMode('exercise')
      setSelectedExercise(location.state.exercise)
      setShowExerciseSettings(false)
    } else if (location.state?.startInExerciseMode) {
      setMode('exercise')
      setShowExerciseSettings(true)
    }
  }, [location.state])

  const initializeModules = async () => {
    try {
      setLoading(true)

      // Initialize storage module first
      const storage = new StorageModule()
      await storage.initialize()
      setStorageModule(storage)

      // Create event-driven storage and sheet music module
      const eventBus = EventBus.getInstance()
      const eventStorage = new EventDrivenStorage()
      const module = new SheetMusicLibraryModule(eventBus, eventStorage)
      await module.initialize()

      setSheetMusicModule(module)
    } catch (error) {
      logger.error('Failed to initialize modules', { error })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!storageModule) return

    try {
      // Delete from storage directly
      const key = `exercise:${user?.id}:${exerciseId}`
      await storageModule.deleteLocal(key)

      // Update local state
      setExercises(exercises.filter(e => e.id !== exerciseId))
      if (selectedExercise?.id === exerciseId) {
        setSelectedExercise(null)
      }
    } catch (error) {
      logger.error('Failed to delete exercise', { error })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-mirubato-wood-50 to-white">
      <PracticeHeader mode={mode} onModeChange={setMode} isMobile={isMobile} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Exercise Settings Panel - Only in exercise mode */}
        {mode === 'exercise' && (
          <div className="mb-4">
            <button
              onClick={() => setShowExerciseSettings(!showExerciseSettings)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-mirubato-wood-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                <span className="font-medium text-mirubato-wood-800">
                  Exercise Settings
                </span>
                {selectedExercise && (
                  <span className="text-sm text-mirubato-wood-600">
                    - {selectedExercise.metadata.title}
                  </span>
                )}
              </div>
              <svg
                className={`w-5 h-5 text-mirubato-wood-400 transform transition-transform ${
                  showExerciseSettings ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showExerciseSettings && (
              <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mirubato-wood-600 mx-auto mb-2"></div>
                    <p className="text-sm text-mirubato-wood-600">
                      Loading exercises...
                    </p>
                  </div>
                ) : exercises.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-mirubato-wood-600 mb-4">
                      No exercises yet.
                    </p>
                    <button
                      onClick={() => navigate('/exercises')}
                      className="px-4 py-2 bg-mirubato-leaf-500 text-white rounded-lg hover:bg-mirubato-leaf-600 transition-colors"
                    >
                      Go to Exercise Library
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h3 className="font-medium text-mirubato-wood-800 mb-3">
                      Select an Exercise:
                    </h3>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {exercises.map(exercise => (
                        <div
                          key={exercise.id}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedExercise?.id === exercise.id
                              ? 'border-mirubato-leaf-500 bg-mirubato-leaf-50'
                              : 'border-mirubato-wood-200 hover:border-mirubato-wood-300'
                          }`}
                          onClick={() => setSelectedExercise(exercise)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-mirubato-wood-800">
                                {exercise.metadata.title}
                              </h4>
                              <p className="text-sm text-mirubato-wood-600">
                                {exercise.metadata.description}
                              </p>
                            </div>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                if (confirm('Delete this exercise?')) {
                                  handleDeleteExercise(exercise.id)
                                }
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-mirubato-wood-200">
                      <button
                        onClick={() => navigate('/exercises')}
                        className="w-full px-4 py-2 bg-mirubato-wood-600 text-white rounded-lg hover:bg-mirubato-wood-700 transition-colors"
                      >
                        Create New Exercise
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <PracticeNotation
          sheetMusic={currentPiece}
          currentPlayingMeasure={currentPlayingMeasure}
        />

        <PracticeControls
          mode={mode}
          volume={volume}
          onVolumeChange={setVolume}
          showGhostControls={showGhostControls}
          playableNotes={playableNotes as Array<{ note: string; time: number }>}
          totalMeasures={currentPiece.measures.length}
          currentPlayingMeasure={currentPlayingMeasure}
          onMeasureChange={setCurrentPlayingMeasure}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      </main>

      {/* Save Progress Prompt for Anonymous Users */}
      <SaveProgressPrompt triggerAfterSessions={3} triggerAfterMinutes={30} />
    </div>
  )
}

// Helper function to convert GeneratedExercise to SheetMusic format
function convertExerciseToSheetMusic(exercise: GeneratedExercise): SheetMusic {
  return {
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
    measures: exercise.measures,
  }
}

// Helper function to get playable notes from exercise
function getExerciseNotes(
  exercise: GeneratedExercise
): Array<{ note: string | string[]; time: number; duration: string }> {
  const notes: Array<{
    note: string | string[]
    time: number
    duration: string
  }> = []
  let currentTime = 0

  for (const measure of exercise.measures) {
    for (const note of measure.notes) {
      if (!note.rest && note.keys[0] !== 'r') {
        // Convert VexFlow notation (e.g., "c/4") to Tone.js format (e.g., "C4")
        const vexNote = note.keys[0]
        const playableNote = vexNote
          .replace('/', '')
          .replace(/^([a-g])/, match => match.toUpperCase())

        notes.push({
          note: playableNote,
          time: currentTime + note.time,
          duration: note.duration,
        })
      }
    }
    // Assume 4/4 time for now - each measure is 4 beats
    currentTime += 4
  }

  return notes
}

export default Practice
