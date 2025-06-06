import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext'
import { useAuth } from '../hooks/useAuth'
import ExerciseLibrary from './ExerciseLibrary'
import { EventBus } from '../modules/core/EventBus'
import { SheetMusicLibraryModule } from '../modules/sheetMusic/SheetMusicLibraryModule'
import {
  ExerciseType,
  KeySignature,
  TimeSignature,
  Clef,
  GeneratedExercise,
} from '../modules/sheetMusic/types'

// Mock the modules
jest.mock('../modules/core/EventBus')
jest.mock('../modules/core/eventDrivenStorage')
jest.mock('../modules/sheetMusic/SheetMusicLibraryModule')
jest.mock('../utils/logger')

// Mock useAuth hook
jest.mock('../hooks/useAuth')

// Mock components
jest.mock('../components/ExerciseGenerator/ExerciseParameterForm', () => ({
  ExerciseParameterForm: ({
    onGenerate,
    isGenerating,
  }: {
    onGenerate: (params: any) => void
    isGenerating: boolean
  }) => (
    <div data-testid="exercise-parameter-form">
      <button
        onClick={() =>
          onGenerate({
            type: ExerciseType.SIGHT_READING,
            keySignature: KeySignature.C_MAJOR,
            timeSignature: TimeSignature.FOUR_FOUR,
            clef: Clef.TREBLE,
            range: { lowest: 'C4', highest: 'C6' },
            difficulty: 5,
            measures: 8,
            tempo: 120,
          })
        }
        disabled={isGenerating}
        data-testid="generate-button"
      >
        {isGenerating ? 'Generating...' : 'Generate Exercise'}
      </button>
    </div>
  ),
}))

jest.mock('../components/ExerciseGenerator/ExercisePreview', () => ({
  ExercisePreview: ({ exercise }: { exercise: any }) => (
    <div data-testid="exercise-preview">
      <h3>{exercise.metadata.title}</h3>
      <p>{exercise.metadata.description}</p>
    </div>
  ),
}))

// ProtectedRoute is no longer used in ExerciseLibrary

describe('ExerciseLibrary', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    primaryInstrument: 'PIANO' as const,
    isAnonymous: false,
  }

  const mockExercise: GeneratedExercise = {
    id: 'exercise-1',
    userId: 'user-123',
    type: ExerciseType.SIGHT_READING,
    parameters: {
      keySignature: KeySignature.C_MAJOR,
      timeSignature: TimeSignature.FOUR_FOUR,
      clef: Clef.TREBLE,
      range: { lowest: 'C4', highest: 'C6' },
      difficulty: 5,
      measures: 8,
      tempo: 120,
    },
    measures: [],
    metadata: {
      title: 'Sight-reading in C Major - Level 5',
      description: 'A 8-measure sight-reading exercise in C major at 120 BPM',
      focusAreas: ['note reading', 'rhythm accuracy'],
      estimatedDuration: 16,
      tags: ['sight_reading', 'intermediate', 'c-major'],
    },
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }

  const authContextValue = {
    user: mockUser,
    loading: false,
    isAuthenticated: true,
    isAnonymous: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshAuth: jest.fn(),
    syncToCloud: jest.fn(),
    localUserData: null,
  }

  let mockSheetMusicModule: jest.Mocked<SheetMusicLibraryModule>

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock useAuth hook
    ;(useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      isAuthenticated: true,
      isAnonymous: false,
    })

    // Reset EventBus mock
    ;(EventBus.getInstance as jest.Mock).mockReturnValue({
      publish: jest.fn(),
      subscribe: jest.fn(),
    })

    // Setup SheetMusicLibraryModule mock
    mockSheetMusicModule = {
      initialize: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
      listUserExercises: jest.fn().mockResolvedValue([mockExercise]),
      generateExercise: jest.fn().mockResolvedValue(mockExercise),
      saveExercise: jest.fn().mockResolvedValue(undefined),
      loadExercise: jest.fn().mockResolvedValue(mockExercise),
    } as unknown as jest.Mocked<SheetMusicLibraryModule>
    ;(SheetMusicLibraryModule as jest.Mock).mockImplementation(
      () => mockSheetMusicModule
    )
  })

  const renderExerciseLibrary = () => {
    return render(
      <MemoryRouter initialEntries={['/exercises']}>
        <AuthContext.Provider value={authContextValue}>
          <Routes>
            <Route path="/exercises" element={<ExerciseLibrary />} />
            <Route path="/practice" element={<div>Practice Page</div>} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    )
  }

  it('renders the exercise library page', async () => {
    renderExerciseLibrary()

    expect(screen.getByText('Exercise Library')).toBeInTheDocument()
    expect(
      screen.getByText('Generate and manage your practice exercises')
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(mockSheetMusicModule.initialize).toHaveBeenCalled()
      expect(mockSheetMusicModule.listUserExercises).toHaveBeenCalledWith(
        'user-123'
      )
    })
  })

  it('displays tabs for generate and library', async () => {
    renderExerciseLibrary()

    expect(screen.getByText('Generate New Exercise')).toBeInTheDocument()

    // Wait for exercises to load
    await waitFor(() => {
      expect(screen.getByText(/My Exercises \(1\)/)).toBeInTheDocument()
    })
  })

  it('switches between generate and library tabs', async () => {
    renderExerciseLibrary()

    // Initially on generate tab
    expect(screen.getByTestId('exercise-parameter-form')).toBeInTheDocument()

    // Wait for exercises to load first
    await waitFor(() => {
      expect(screen.getByText(/My Exercises \(1\)/)).toBeInTheDocument()
    })

    // Click library tab
    fireEvent.click(screen.getByText(/My Exercises \(1\)/))

    await waitFor(() => {
      expect(screen.getByText('Saved Exercises')).toBeInTheDocument()
      expect(screen.getByText(mockExercise.metadata.title)).toBeInTheDocument()
    })
  })

  it('generates a new exercise', async () => {
    renderExerciseLibrary()

    // Wait for module to initialize and user to be ready
    await waitFor(() => {
      expect(mockSheetMusicModule.initialize).toHaveBeenCalled()
    })

    const generateButton = screen.getByTestId('generate-button')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(mockSheetMusicModule.generateExercise).toHaveBeenCalledWith({
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 8,
        tempo: 120,
        userId: 'user-123',
      })
    })

    // Should switch to library tab and show the new exercise
    await waitFor(() => {
      expect(screen.getByText('Saved Exercises')).toBeInTheDocument()
      expect(screen.getByTestId('exercise-preview')).toBeInTheDocument()
    })
  })

  it('selects and displays an exercise', async () => {
    renderExerciseLibrary()

    // Wait for exercises to load first
    await waitFor(() => {
      expect(screen.getByText(/My Exercises \(1\)/)).toBeInTheDocument()
    })

    // Switch to library tab
    fireEvent.click(screen.getByText(/My Exercises \(1\)/))

    await waitFor(() => {
      expect(screen.getByText(mockExercise.metadata.title)).toBeInTheDocument()
    })

    // Click on the exercise
    fireEvent.click(screen.getByText(mockExercise.metadata.title))

    await waitFor(() => {
      expect(screen.getByTestId('exercise-preview')).toBeInTheDocument()
      expect(screen.getByText('Practice')).toBeInTheDocument()
      expect(screen.getByText('Export')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
  })

  it('navigates to practice page with exercise', async () => {
    renderExerciseLibrary()

    // Wait for exercises to load first
    await waitFor(() => {
      expect(screen.getByText(/My Exercises \(1\)/)).toBeInTheDocument()
    })

    // Switch to library tab and select exercise
    fireEvent.click(screen.getByText(/My Exercises \(1\)/))
    await waitFor(() => {
      fireEvent.click(screen.getByText(mockExercise.metadata.title))
    })

    // Click practice button
    await waitFor(() => {
      const practiceButton = screen.getByText('Practice')
      fireEvent.click(practiceButton)
    })

    // Should navigate to practice page
    await waitFor(() => {
      expect(screen.getByText('Practice Page')).toBeInTheDocument()
    })
  })

  it('handles exercise deletion', async () => {
    renderExerciseLibrary()

    // Wait for exercises to load first
    await waitFor(() => {
      expect(screen.getByText(/My Exercises \(1\)/)).toBeInTheDocument()
    })

    // Switch to library tab and select exercise
    fireEvent.click(screen.getByText(/My Exercises \(1\)/))
    await waitFor(() => {
      fireEvent.click(screen.getByText(mockExercise.metadata.title))
    })

    // Click delete button
    await waitFor(() => {
      const deleteButton = screen.getByText('Delete')
      fireEvent.click(deleteButton)
    })

    // Exercise should be removed
    await waitFor(() => {
      expect(
        screen.queryByText(mockExercise.metadata.title)
      ).not.toBeInTheDocument()
    })
  })

  it('shows export coming soon message', async () => {
    renderExerciseLibrary()

    // Wait for exercises to load first
    await waitFor(() => {
      expect(screen.getByText(/My Exercises \(1\)/)).toBeInTheDocument()
    })

    // Switch to library tab and select exercise
    fireEvent.click(screen.getByText(/My Exercises \(1\)/))
    await waitFor(() => {
      fireEvent.click(screen.getByText(mockExercise.metadata.title))
    })

    // Click export button
    await waitFor(() => {
      const exportButton = screen.getByText('Export')
      fireEvent.click(exportButton)
    })

    // Should show coming soon message
    await waitFor(() => {
      expect(
        screen.getByText('Export feature coming soon!')
      ).toBeInTheDocument()
    })
  })

  it('handles initialization error', async () => {
    mockSheetMusicModule.initialize.mockRejectedValue(new Error('Init failed'))

    renderExerciseLibrary()

    await waitFor(() => {
      expect(
        screen.getByText('Failed to initialize exercise library')
      ).toBeInTheDocument()
    })
  })

  it('handles generation error', async () => {
    mockSheetMusicModule.generateExercise.mockRejectedValue(
      new Error('Generation failed')
    )

    renderExerciseLibrary()

    // Wait for module to initialize and user to be ready
    await waitFor(() => {
      expect(mockSheetMusicModule.initialize).toHaveBeenCalled()
    })

    const generateButton = screen.getByTestId('generate-button')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(
        screen.getByText('Failed to generate exercise. Please try again.')
      ).toBeInTheDocument()
    })
  })

  it('shows waiting message when user session is not ready', async () => {
    // Override the useAuth mock for this test - user still null after initialization
    ;(useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      isAnonymous: true,
    })

    renderExerciseLibrary()

    // Wait for module to initialize
    await waitFor(() => {
      expect(mockSheetMusicModule.initialize).toHaveBeenCalled()
    })

    const generateButton = screen.getByTestId('generate-button')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(
        screen.getByText('Please wait for user session to initialize.')
      ).toBeInTheDocument()
    })
  })

  it('shows empty state when no exercises exist', async () => {
    mockSheetMusicModule.listUserExercises.mockResolvedValue([])

    renderExerciseLibrary()

    // Switch to library tab
    fireEvent.click(screen.getByText(/My Exercises \(0\)/))

    await waitFor(() => {
      expect(
        screen.getByText('No exercises yet. Generate your first exercise!')
      ).toBeInTheDocument()
    })
  })

  it('cleans up module on unmount', () => {
    const { unmount } = renderExerciseLibrary()

    unmount()

    expect(mockSheetMusicModule.destroy).toHaveBeenCalled()
  })

  it('works properly for anonymous users', async () => {
    // Mock an anonymous user with an ID
    const anonymousUser = {
      id: 'anonymous-456',
      displayName: null,
      primaryInstrument: 'PIANO' as const,
      isAnonymous: true,
    }

    ;(useAuth as jest.Mock).mockReturnValue({
      user: anonymousUser,
      loading: false,
      isAuthenticated: false,
      isAnonymous: true,
    })

    renderExerciseLibrary()

    // Wait for module to initialize
    await waitFor(() => {
      expect(mockSheetMusicModule.initialize).toHaveBeenCalled()
    })

    // Should be able to generate exercises
    const generateButton = screen.getByTestId('generate-button')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(mockSheetMusicModule.generateExercise).toHaveBeenCalledWith({
        type: ExerciseType.SIGHT_READING,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        clef: Clef.TREBLE,
        range: { lowest: 'C4', highest: 'C6' },
        difficulty: 5,
        measures: 8,
        tempo: 120,
        userId: 'anonymous-456',
      })
    })
  })
})
