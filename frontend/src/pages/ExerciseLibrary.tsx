/**
 * Exercise Library Page
 *
 * Main page for exercise generation and library management.
 * Allows users to generate new exercises and view their saved exercises.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { EventBus } from '../modules/core/EventBus'
import { EventDrivenStorage } from '../modules/core/eventDrivenStorage'
import { StorageModule } from '../modules/infrastructure/StorageModule'
import { SheetMusicLibraryModule } from '../modules/sheetMusic/SheetMusicLibraryModule'
import { ExerciseParameterForm } from '../components/ExerciseGenerator/ExerciseParameterForm'
import { ExercisePreview } from '../components/ExerciseGenerator/ExercisePreview'
import { useAuth } from '../hooks/useAuth'
import {
  GeneratedExercise,
  ExerciseType,
  ExerciseParameters,
  SightReadingExerciseParameters,
} from '../modules/sheetMusic/types'
import { TechnicalExerciseParameters } from '../modules/sheetMusic/generators/TechnicalExerciseGenerator'
import { logger } from '../utils/logger'

const ExerciseLibrary: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [exercises, setExercises] = useState<GeneratedExercise[]>([])
  const [selectedExercise, setSelectedExercise] =
    useState<GeneratedExercise | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sheetMusicModule, setSheetMusicModule] =
    useState<SheetMusicLibraryModule | null>(null)
  const [activeTab, setActiveTab] = useState<'generate' | 'library'>('generate')

  // Initialize the sheet music module
  useEffect(() => {
    let module: SheetMusicLibraryModule | null = null
    let storageModule: StorageModule | null = null

    const initModule = async () => {
      try {
        const eventBus = EventBus.getInstance()

        // Initialize StorageModule first to handle storage events
        storageModule = new StorageModule()
        await storageModule.initialize()

        const storage = new EventDrivenStorage()
        module = new SheetMusicLibraryModule(eventBus, storage)
        await module.initialize()
        setSheetMusicModule(module)

        // Load user's exercises (works for both authenticated and anonymous users)
        if (user?.id) {
          const userExercises = await module.listUserExercises(user.id)
          setExercises(userExercises)
        }
      } catch (error) {
        logger.error('Failed to initialize sheet music module', error)
        setError('Failed to initialize exercise library')
      }
    }

    initModule()

    return () => {
      // Cleanup on unmount
      module?.destroy()
      storageModule?.shutdown()
    }
  }, [user?.id])

  // Handle exercise generation
  const handleGenerateExercise = useCallback(
    async (
      params:
        | ExerciseParameters
        | SightReadingExerciseParameters
        | TechnicalExerciseParameters
    ) => {
      if (!sheetMusicModule) {
        setError('Exercise library not ready. Please try again.')
        return
      }

      if (!user?.id) {
        setError('Please wait for user session to initialize.')
        return
      }

      setIsGenerating(true)
      setError(null)

      try {
        // Determine exercise type based on the parameters structure
        let exerciseType: ExerciseType = ExerciseType.SIGHT_READING
        if ('technicalType' in params) {
          exerciseType = ExerciseType.TECHNICAL
        } else if ('includeAccidentals' in params) {
          exerciseType = ExerciseType.SIGHT_READING
        }

        const exercise = await sheetMusicModule.generateExercise({
          ...params,
          type: exerciseType,
          userId: user.id,
        })

        // Add to local state
        setExercises(prev => [exercise, ...prev])
        setSelectedExercise(exercise)
        setActiveTab('library')

        logger.info('Exercise generated successfully', {
          exerciseId: exercise.id,
        })
      } catch (error) {
        logger.error('Failed to generate exercise', error)
        setError('Failed to generate exercise. Please try again.')
      } finally {
        setIsGenerating(false)
      }
    },
    [sheetMusicModule, user?.id]
  )

  // Handle exercise deletion
  const handleDeleteExercise = useCallback(
    async (exerciseId: string) => {
      if (!sheetMusicModule) return

      try {
        // For now, we just remove from local state
        // In the future, we'll add a delete method to the module
        setExercises(prev => prev.filter(e => e.id !== exerciseId))
        if (selectedExercise?.id === exerciseId) {
          setSelectedExercise(null)
        }
      } catch (error) {
        logger.error('Failed to delete exercise', error)
        setError('Failed to delete exercise')
      }
    },
    [sheetMusicModule, selectedExercise]
  )

  // Handle starting practice with an exercise
  const handlePracticeExercise = useCallback(
    (exercise: GeneratedExercise) => {
      // Navigate to practice page with exercise data
      navigate('/practice', { state: { exercise } })
    },
    [navigate]
  )

  // Export exercise as MusicXML (future feature)
  const handleExportExercise = useCallback(
    async (_exercise: GeneratedExercise) => {
      // This will be implemented in Phase 4
      setError('Export feature coming soon!')
    },
    []
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Exercise Library
          </h1>
          <p className="text-gray-600">
            Generate and manage your practice exercises
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('generate')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'generate'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Generate New Exercise
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'library'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Exercises ({exercises.length})
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel */}
          <div>
            {activeTab === 'generate' ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold mb-4">
                  Exercise Parameters
                </h2>
                <ExerciseParameterForm
                  onGenerate={handleGenerateExercise}
                  isLoading={isGenerating}
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold mb-4">Saved Exercises</h2>
                {exercises.length === 0 ? (
                  <p className="text-gray-500">
                    No exercises yet. Generate your first exercise!
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {exercises.map(exercise => (
                      <div
                        key={exercise.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedExercise?.id === exercise.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedExercise(exercise)}
                      >
                        <h3 className="font-medium text-gray-800">
                          {exercise.metadata.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {exercise.metadata.description}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {exercise.metadata.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Exercise Preview */}
          <div>
            {selectedExercise ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-semibold">Exercise Preview</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePracticeExercise(selectedExercise)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Practice
                    </button>
                    <button
                      onClick={() => handleExportExercise(selectedExercise)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Export
                    </button>
                    <button
                      onClick={() => handleDeleteExercise(selectedExercise.id)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <ExercisePreview exercise={selectedExercise} />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-6 flex items-center justify-center h-96">
                <p className="text-gray-500">
                  {activeTab === 'generate'
                    ? 'Generate an exercise to see the preview'
                    : 'Select an exercise to preview'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExerciseLibrary
