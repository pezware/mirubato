import React, { useState, useEffect } from 'react'
import { useAudioManager } from '../contexts/AudioContext'
import { useAuth } from '../hooks/useAuth'
import {
  SaveProgressPrompt,
  PracticeHeader,
  PracticeNotation,
} from '../components'
import { useViewport } from '../hooks/useViewport'
import { EventBus } from '../modules/core/EventBus'
import { StorageModule } from '../modules/infrastructure/StorageModule'
import { SheetMusicLibraryModule } from '../modules/sheetMusic/SheetMusicLibraryModule'
import { EventDrivenStorage } from '../modules/core/eventDrivenStorage'
import type { GeneratedExercise, SheetMusic } from '../modules/sheetMusic/types'
import { logger } from '../utils/logger'

// Helper functions
function convertExerciseToSheetMusic(exercise: GeneratedExercise): SheetMusic {
  return {
    id: exercise.id,
    title: exercise.metadata.title,
    composer: 'Generated',
    opus: undefined,
    movement: undefined,
    instrument: 'PIANO',
    difficulty: 'BEGINNER',
    difficultyLevel: 3,
    gradeLevel: undefined,
    durationSeconds: exercise.metadata.estimatedDuration,
    timeSignature: '4/4',
    keySignature: 'C',
    tempoMarking: undefined,
    suggestedTempo: 120,
    stylePeriod: 'CONTEMPORARY',
    tags: exercise.metadata.tags,
    measures: exercise.measures,
    metadata: undefined,
    thumbnail: undefined,
  }
}

const PracticeSimplified: React.FC = () => {
  const audioManager = useAudioManager()
  const { isMobile } = useViewport()
  const { user } = useAuth()

  // Control states
  const [volume, setVolume] = useState(75) // 0-100
  const [tempo, setTempo] = useState(90)
  const [selectedContent, setSelectedContent] = useState<
    'curated' | 'exercise' | 'workout'
  >('curated')
  const [selectedPiece, setSelectedPiece] = useState<SheetMusic | null>(null)
  const [selectedExercise, setSelectedExercise] =
    useState<GeneratedExercise | null>(null)
  const [currentPlayingMeasure, _setCurrentPlayingMeasure] = useState<
    number | undefined
  >()

  // Module states
  const [exercises, setExercises] = useState<GeneratedExercise[]>([])
  const [curatedPieces, setCuratedPieces] = useState<SheetMusic[]>([])
  const [presetWorkouts, setPresetWorkouts] = useState<SheetMusic[]>([])
  const [_sheetMusicModule, setSheetMusicModule] =
    useState<SheetMusicLibraryModule | null>(null)

  // Get the current piece data
  const currentPiece =
    selectedContent === 'exercise' && selectedExercise
      ? convertExerciseToSheetMusic(selectedExercise)
      : selectedPiece

  // Set instrument to piano
  useEffect(() => {
    audioManager.setInstrument('piano')
  }, [audioManager])

  // Initialize modules
  useEffect(() => {
    let mounted = true
    let storageModule: StorageModule | null = null
    let sheetMusicModule: SheetMusicLibraryModule | null = null

    const initializeModules = async () => {
      if (!user) return

      try {
        // Initialize storage module first
        storageModule = new StorageModule()
        await storageModule.initialize()

        // Create event-driven storage and sheet music module
        const eventBus = EventBus.getInstance()
        const eventStorage = new EventDrivenStorage()
        sheetMusicModule = new SheetMusicLibraryModule(eventBus, eventStorage)
        await sheetMusicModule.initialize()

        if (mounted) {
          // Load user's exercises
          const userExercises = await sheetMusicModule.listUserExercises(
            user.id
          )
          setExercises(userExercises)

          // Load curated pieces and workouts
          const pieces = sheetMusicModule.getCuratedPieces()
          const workouts = sheetMusicModule.getPresetWorkouts()
          setCuratedPieces(pieces)
          setPresetWorkouts(workouts)
          setSheetMusicModule(sheetMusicModule)

          // Set default selected piece
          if (pieces.length > 0 && !selectedPiece) {
            setSelectedPiece(pieces[0])
          }
        }
      } catch (error) {
        logger.error('Failed to initialize modules', { error })
      }
    }

    initializeModules()

    return () => {
      mounted = false
      sheetMusicModule?.destroy()
      storageModule?.shutdown()
    }
  }, [user])

  const handleSelectWorkout = (workout: SheetMusic) => {
    setSelectedContent('workout')
    setSelectedPiece(workout)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-mirubato-wood-50 to-white">
      <PracticeHeader isMobile={isMobile} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Practice Selector */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-medium text-mirubato-wood-800 mb-4">
            Choose Your Practice
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Featured Pieces */}
            <div>
              <h3 className="text-lg font-medium text-mirubato-wood-700 mb-3">
                Featured Pieces
              </h3>
              <div className="space-y-2">
                {curatedPieces.map(piece => (
                  <button
                    key={piece.id}
                    onClick={() => {
                      setSelectedContent('curated')
                      setSelectedPiece(piece)
                    }}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedContent === 'curated' &&
                      selectedPiece?.id === piece.id
                        ? 'border-mirubato-leaf-500 bg-mirubato-leaf-50'
                        : 'border-mirubato-wood-200 hover:border-mirubato-wood-300'
                    }`}
                  >
                    <h4 className="font-medium text-mirubato-wood-800">
                      {piece.title}
                    </h4>
                    <p className="text-sm text-mirubato-wood-600">
                      {piece.composer} • Difficulty {piece.difficultyLevel}/10
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Practice Workouts */}
            <div>
              <h3 className="text-lg font-medium text-mirubato-wood-700 mb-3">
                Practice Workouts
              </h3>
              <div className="space-y-2">
                {presetWorkouts.map(workout => (
                  <button
                    key={workout.id}
                    onClick={() => handleSelectWorkout(workout)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedContent === 'workout' &&
                      selectedPiece?.id === workout.id
                        ? 'border-mirubato-leaf-500 bg-mirubato-leaf-50'
                        : 'border-mirubato-wood-200 hover:border-mirubato-wood-300'
                    }`}
                  >
                    <h4 className="font-medium text-mirubato-wood-800">
                      {workout.title}
                    </h4>
                    <p className="text-sm text-mirubato-wood-600">
                      {workout.composer} •{' '}
                      {workout.metadata?.musicalForm || 'Exercise'}
                    </p>
                  </button>
                ))}
              </div>

              {/* User's exercises if any */}
              {exercises.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-mirubato-wood-700 mb-2">
                    Your Exercises
                  </h4>
                  <div className="space-y-2">
                    {exercises.map(exercise => (
                      <button
                        key={exercise.id}
                        onClick={() => {
                          setSelectedContent('exercise')
                          setSelectedExercise(exercise)
                        }}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedContent === 'exercise' &&
                          selectedExercise?.id === exercise.id
                            ? 'border-mirubato-leaf-500 bg-mirubato-leaf-50'
                            : 'border-mirubato-wood-200 hover:border-mirubato-wood-300'
                        }`}
                      >
                        <h4 className="font-medium text-mirubato-wood-800">
                          {exercise.metadata.title}
                        </h4>
                        <p className="text-sm text-mirubato-wood-600">
                          {exercise.metadata.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sheet Music Display */}
        {currentPiece && (
          <PracticeNotation
            sheetMusic={currentPiece}
            currentPlayingMeasure={currentPlayingMeasure}
          />
        )}

        {/* Simple Controls */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-center gap-6">
            {/* Play/Pause Button */}
            <button className="p-3 bg-mirubato-leaf-500 text-white rounded-full hover:bg-mirubato-leaf-600 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Tempo Slider */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-mirubato-wood-600">Tempo:</span>
              <input
                type="range"
                min="40"
                max="200"
                value={tempo}
                onChange={e => setTempo(Number(e.target.value))}
                className="w-32"
              />
              <span className="text-sm font-medium text-mirubato-wood-800 w-12">
                {tempo}
              </span>
            </div>

            {/* Metronome Toggle */}
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-mirubato-wood-700 hover:text-mirubato-wood-900 transition-colors">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Metronome
            </button>

            {/* Volume Control */}
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
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                className="w-24"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Save Progress Prompt */}
      <SaveProgressPrompt />
    </div>
  )
}

export default PracticeSimplified
