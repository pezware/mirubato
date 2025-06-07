import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExercisePreview } from './ExercisePreview'
import {
  GeneratedExercise,
  ExerciseType,
  KeySignature,
  TimeSignature,
  Clef,
  NoteDuration,
} from '../../modules/sheetMusic/types'
import { AudioProvider } from '../../contexts/AudioContext'
import { NotationRenderer } from '../../utils/notationRenderer'

// Mock dependencies
jest.mock('../../utils/notationRenderer')
jest.mock('../../utils/logger')
jest.mock('../../contexts/AudioContext', () => ({
  ...jest.requireActual('../../contexts/AudioContext'),
  useAudioManager: jest.fn(),
}))

const mockAudioManager = {
  initialize: jest.fn(),
  playNoteAt: jest.fn(),
  isInitialized: jest.fn(() => false),
  setInstrument: jest.fn(),
  getInstrument: jest.fn(() => 'piano'),
  playNote: jest.fn(),
  isLoading: jest.fn(() => false),
  dispose: jest.fn(),
}

const mockNotationRenderer = {
  render: jest.fn(),
}

// Mock the NotationRenderer constructor
;(
  NotationRenderer as jest.MockedClass<typeof NotationRenderer>
).mockImplementation(() => {
  return mockNotationRenderer as unknown as NotationRenderer
})

describe('ExercisePreview', () => {
  const mockExercise: GeneratedExercise = {
    id: 'test-exercise-1',
    userId: 'user-1',
    type: ExerciseType.SIGHT_READING,
    parameters: {
      keySignature: KeySignature.C_MAJOR,
      timeSignature: TimeSignature.FOUR_FOUR,
      clef: Clef.TREBLE,
      range: { lowest: 'C4', highest: 'C6' },
      difficulty: 5,
      measures: 8,
      tempo: 120,
      technicalElements: [],
      rhythmicPatterns: [],
      dynamicRange: [],
      scaleTypes: [],
      intervalPatterns: [],
      includeFingerings: false,
    },
    measures: [
      {
        number: 1,
        clef: Clef.TREBLE,
        keySignature: KeySignature.C_MAJOR,
        timeSignature: TimeSignature.FOUR_FOUR,
        notes: [
          { keys: ['c/4'], duration: NoteDuration.QUARTER, time: 0 },
          { keys: ['d/4'], duration: NoteDuration.QUARTER, time: 1 },
          { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 2 },
          { keys: ['f/4'], duration: NoteDuration.QUARTER, time: 3 },
        ],
      },
      {
        number: 2,
        notes: [
          { keys: ['g/4'], duration: NoteDuration.HALF, time: 0 },
          { keys: ['a/4'], duration: NoteDuration.HALF, time: 2 },
        ],
      },
    ],
    metadata: {
      title: 'Sight Reading Exercise #1',
      description: 'Practice basic note reading in C Major',
      focusAreas: ['Note Reading', 'Rhythm'],
      estimatedDuration: 120,
      tags: ['beginner', 'sight-reading'],
    },
    createdAt: new Date('2023-06-06T10:00:00Z'),
  }

  const mockOnSave = jest.fn()
  const mockOnRegenerate = jest.fn()

  const defaultProps = {
    exercise: mockExercise,
    onSave: mockOnSave,
    onRegenerate: mockOnRegenerate,
    isLoading: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const { useAudioManager } = jest.requireMock('../../contexts/AudioContext')
    useAudioManager.mockReturnValue(mockAudioManager)
  })

  const renderWithAudio = (ui: React.ReactElement) => {
    return render(<AudioProvider>{ui}</AudioProvider>)
  }

  describe('Rendering', () => {
    it('renders the exercise preview with all sections', () => {
      renderWithAudio(<ExercisePreview {...defaultProps} />)

      // Header
      expect(screen.getByText('Sight Reading Exercise #1')).toBeInTheDocument()
      expect(
        screen.getByText('Practice basic note reading in C Major')
      ).toBeInTheDocument()

      // Controls
      expect(
        screen.getByRole('button', { name: /regenerate/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /save exercise/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /start playback/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /zoom out/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /zoom in/i })
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument()

      // Exercise details
      expect(screen.getByText('SIGHT_READING')).toBeInTheDocument()
      expect(screen.getByText('5/10')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // 2 measures
      expect(screen.getByText('2:00')).toBeInTheDocument() // 120 seconds

      // Focus areas
      expect(screen.getByText('Note Reading')).toBeInTheDocument()
      expect(screen.getByText('Rhythm')).toBeInTheDocument()
    })

    it('renders loading state when isLoading is true', () => {
      renderWithAudio(<ExercisePreview {...defaultProps} isLoading={true} />)

      expect(screen.getByText('Generating exercise...')).toBeInTheDocument()
      expect(
        screen.queryByText('Sight Reading Exercise #1')
      ).not.toBeInTheDocument()
    })

    it('hides optional buttons when callbacks are not provided', () => {
      renderWithAudio(
        <ExercisePreview exercise={mockExercise} isLoading={false} />
      )

      expect(
        screen.queryByRole('button', { name: /regenerate/i })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /save exercise/i })
      ).not.toBeInTheDocument()
    })

    it('renders notation container with proper accessibility', () => {
      renderWithAudio(<ExercisePreview {...defaultProps} />)

      const notationContainer = screen.getByRole('img', {
        name: /sheet music for sight reading exercise #1/i,
      })
      expect(notationContainer).toBeInTheDocument()
      expect(notationContainer).toHaveClass('notation-container')
    })
  })

  describe('Notation Rendering', () => {
    it('initializes NotationRenderer on mount', () => {
      renderWithAudio(<ExercisePreview {...defaultProps} />)

      expect(NotationRenderer).toHaveBeenCalledTimes(1)
      expect(NotationRenderer).toHaveBeenCalledWith(expect.any(HTMLDivElement))
    })

    it('renders notation with correct parameters', () => {
      renderWithAudio(<ExercisePreview {...defaultProps} />)

      expect(mockNotationRenderer.render).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-exercise-1',
          title: 'Sight Reading Exercise #1',
          composer: 'Generated Exercise',
          measures: mockExercise.measures,
        }),
        expect.objectContaining({
          width: expect.any(Number),
          scale: 1,
          measuresPerLine: 2,
          startMeasureNumber: 0,
        })
      )
    })
  })

  describe('Playback Controls', () => {
    it('starts playback when play button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAudio(<ExercisePreview {...defaultProps} />)

      const playButton = screen.getByRole('button', { name: /start playback/i })
      await user.click(playButton)

      expect(mockAudioManager.initialize).toHaveBeenCalled()
      // Check that playNoteAt was called for each note
      expect(mockAudioManager.playNoteAt).toHaveBeenCalledWith(
        'c4',
        expect.any(Number),
        '4n', // Tone.js duration format
        0.8
      )
      expect(mockAudioManager.playNoteAt).toHaveBeenCalledWith(
        'd4',
        expect.any(Number),
        '4n', // Tone.js duration format
        0.8
      )

      // Button should now show pause
      expect(
        screen.getByRole('button', { name: /pause playback/i })
      ).toBeInTheDocument()
    })

    it('stops playback when pause button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAudio(<ExercisePreview {...defaultProps} />)

      // Start playback first
      const playButton = screen.getByRole('button', { name: /start playback/i })
      await user.click(playButton)

      // Then pause
      const pauseButton = screen.getByRole('button', {
        name: /pause playback/i,
      })
      await user.click(pauseButton)

      // Since stop is not available, just check state update
      expect(
        screen.getByRole('button', { name: /start playback/i })
      ).toBeInTheDocument()
    })

    it('handles playback errors gracefully', async () => {
      mockAudioManager.initialize.mockRejectedValueOnce(
        new Error('Audio error')
      )

      const user = userEvent.setup()
      renderWithAudio(<ExercisePreview {...defaultProps} />)

      const playButton = screen.getByRole('button', { name: /start playback/i })
      await user.click(playButton)

      // Should still show play button after error
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /start playback/i })
        ).toBeInTheDocument()
      })
    })
  })

  describe('Zoom Controls', () => {
    it('zooms in when zoom in button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAudio(<ExercisePreview {...defaultProps} />)

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
      const zoomDisplay = screen.getByRole('button', { name: /reset zoom/i })

      expect(zoomDisplay).toHaveTextContent('100%')

      await user.click(zoomInButton)
      expect(zoomDisplay).toHaveTextContent('125%')

      // Verify notation re-renders with new zoom
      expect(mockNotationRenderer.render).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ scale: 1.25 })
      )
    })

    it('zooms out when zoom out button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAudio(<ExercisePreview {...defaultProps} />)

      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i })
      const zoomDisplay = screen.getByRole('button', { name: /reset zoom/i })

      await user.click(zoomOutButton)
      expect(zoomDisplay).toHaveTextContent('75%')
    })

    it('resets zoom when reset button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAudio(<ExercisePreview {...defaultProps} />)

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
      const zoomResetButton = screen.getByRole('button', {
        name: /reset zoom/i,
      })

      // Zoom in first
      await user.click(zoomInButton)
      await user.click(zoomInButton)
      expect(zoomResetButton).toHaveTextContent('150%')

      // Reset
      await user.click(zoomResetButton)
      expect(zoomResetButton).toHaveTextContent('100%')
    })

    it('disables zoom buttons at limits', async () => {
      const user = userEvent.setup()
      renderWithAudio(<ExercisePreview {...defaultProps} />)

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i })
      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i })

      // Zoom to max
      for (let i = 0; i < 5; i++) {
        await user.click(zoomInButton)
      }
      expect(zoomInButton).toBeDisabled()

      // Zoom to min
      for (let i = 0; i < 10; i++) {
        await user.click(zoomOutButton)
      }
      expect(zoomOutButton).toBeDisabled()
    })
  })

  describe('Pagination', () => {
    it('shows pagination controls for exercises with many measures', () => {
      const longExercise = {
        ...mockExercise,
        measures: Array(8)
          .fill(null)
          .map((_, i) => ({
            number: i + 1,
            notes: [{ keys: ['c/4'], duration: NoteDuration.WHOLE, time: 0 }],
          })),
      }

      renderWithAudio(
        <ExercisePreview {...defaultProps} exercise={longExercise} />
      )

      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /previous/i })
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })

    it('navigates between pages', async () => {
      const user = userEvent.setup()
      const longExercise = {
        ...mockExercise,
        measures: Array(8)
          .fill(null)
          .map((_, i) => ({
            number: i + 1,
            notes: [{ keys: ['c/4'], duration: NoteDuration.WHOLE, time: 0 }],
          })),
      }

      renderWithAudio(
        <ExercisePreview {...defaultProps} exercise={longExercise} />
      )

      const nextButton = screen.getByRole('button', { name: /next/i })
      const previousButton = screen.getByRole('button', { name: /previous/i })

      expect(previousButton).toBeDisabled()
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()

      await user.click(nextButton)
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
      expect(nextButton).toBeDisabled()
      expect(previousButton).not.toBeDisabled()

      await user.click(previousButton)
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    })

    it('does not show pagination for short exercises', () => {
      renderWithAudio(<ExercisePreview {...defaultProps} />)

      expect(screen.queryByText(/page \d of \d/i)).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /previous/i })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /next/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('User Actions', () => {
    it('calls onSave when save button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAudio(<ExercisePreview {...defaultProps} />)

      const saveButton = screen.getByRole('button', { name: /save exercise/i })
      await user.click(saveButton)

      expect(mockOnSave).toHaveBeenCalledWith(mockExercise)
    })

    it('calls onRegenerate when regenerate button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAudio(<ExercisePreview {...defaultProps} />)

      const regenerateButton = screen.getByRole('button', {
        name: /regenerate/i,
      })
      await user.click(regenerateButton)

      expect(mockOnRegenerate).toHaveBeenCalled()
    })

    it('triggers print when print button is clicked', async () => {
      const mockPrint = jest.fn()
      global.window.print = mockPrint

      const user = userEvent.setup()
      renderWithAudio(<ExercisePreview {...defaultProps} />)

      const printButton = screen.getByRole('button', { name: /print/i })
      await user.click(printButton)

      expect(mockPrint).toHaveBeenCalled()
    })
  })

  describe('Responsive Behavior', () => {
    it('adjusts notation width based on container size', () => {
      // Mock offsetWidth before rendering
      Object.defineProperty(HTMLDivElement.prototype, 'offsetWidth', {
        value: 600,
        configurable: true,
      })

      renderWithAudio(<ExercisePreview {...defaultProps} />)

      expect(mockNotationRenderer.render).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ width: 600 })
      )

      // Reset the mock
      Object.defineProperty(HTMLDivElement.prototype, 'offsetWidth', {
        value: 800,
        configurable: true,
      })
    })
  })
})
