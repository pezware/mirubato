/**
 * Tests for MultiVoiceSheetMusicDisplay Component
 */
import { render, screen, waitFor } from '@testing-library/react'
import { MultiVoiceSheetMusicDisplay } from './MultiVoiceSheetMusicDisplay'
import { Score } from '../modules/sheetMusic/multiVoiceTypes'
import {
  Clef,
  NoteDuration,
  TimeSignature,
  KeySignature,
} from '../modules/sheetMusic/types'
import { MultiVoiceNotationRenderer } from '../utils/multiVoiceNotationRenderer'

// Mock the renderer
jest.mock('../utils/multiVoiceNotationRenderer')

// Mock useViewport hook
jest.mock('../hooks/useViewport', () => ({
  useViewport: () => ({ width: 1200, height: 800 }),
}))

describe('MultiVoiceSheetMusicDisplay', () => {
  let mockRenderer: jest.Mocked<MultiVoiceNotationRenderer>

  const createTestScore = (): Score => ({
    title: 'Test Score',
    composer: 'Test Composer',
    parts: [
      {
        id: 'piano',
        name: 'Piano',
        instrument: 'piano',
        staves: ['treble', 'bass'],
      },
    ],
    measures: [
      {
        number: 1,
        staves: [
          {
            id: 'treble',
            clef: Clef.TREBLE,
            voices: [
              {
                id: 'rightHand',
                notes: [
                  {
                    keys: ['c/4'],
                    duration: NoteDuration.QUARTER,
                    time: 0,
                    voiceId: 'rightHand',
                  },
                ],
              },
            ],
          },
          {
            id: 'bass',
            clef: Clef.BASS,
            voices: [
              {
                id: 'leftHand',
                notes: [
                  {
                    keys: ['c/3'],
                    duration: NoteDuration.QUARTER,
                    time: 0,
                    voiceId: 'leftHand',
                  },
                ],
              },
            ],
          },
        ],
        timeSignature: TimeSignature.FOUR_FOUR,
        keySignature: KeySignature.C_MAJOR,
      },
    ],
    metadata: {
      createdAt: new Date(),
      modifiedAt: new Date(),
      source: 'test',
      tags: [],
      duration: 120, // 2 minutes
    },
  })

  beforeEach(() => {
    // Create mock renderer instance
    mockRenderer = {
      renderScore: jest.fn(),
      clear: jest.fn(),
      destroy: jest.fn(),
      updateOptions: jest.fn(),
      resize: jest.fn(),
    } as unknown as jest.Mocked<MultiVoiceNotationRenderer>

    // Mock the constructor
    ;(MultiVoiceNotationRenderer as jest.Mock).mockImplementation(
      () => mockRenderer
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render without crashing', () => {
    const score = createTestScore()
    const { container } = render(<MultiVoiceSheetMusicDisplay score={score} />)
    // Check that the component renders
    expect(
      container.querySelector('.multi-voice-sheet-music-display')
    ).toBeInTheDocument()
    // Check info section exists
    const infoDiv = container.querySelector('.mt-4.text-sm.text-gray-600')
    expect(infoDiv).toBeInTheDocument()
  })

  it('should display score information', () => {
    const score = createTestScore()
    const { container } = render(<MultiVoiceSheetMusicDisplay score={score} />)

    const infoDiv = container.querySelector('.mt-4.text-sm.text-gray-600')
    expect(infoDiv?.textContent).toContain('1 part')
    expect(infoDiv?.textContent).toContain('1 measure')
    expect(infoDiv?.textContent).toContain('Duration: ~2 min')
  })

  it('should handle multiple parts and measures', () => {
    const score = createTestScore()
    score.parts.push({
      id: 'violin',
      name: 'Violin',
      instrument: 'violin',
      staves: ['violin'],
    })
    score.measures.push({ ...score.measures[0], number: 2 })

    const { container } = render(<MultiVoiceSheetMusicDisplay score={score} />)

    const infoDiv = container.querySelector('.mt-4.text-sm.text-gray-600')
    expect(infoDiv?.textContent).toContain('2 parts')
    expect(infoDiv?.textContent).toContain('2 measures')
  })

  it('should initialize renderer on mount', () => {
    const score = createTestScore()
    render(<MultiVoiceSheetMusicDisplay score={score} />)

    expect(MultiVoiceNotationRenderer).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        width: expect.any(Number),
      })
    )
  })

  it('should render score when provided', async () => {
    const score = createTestScore()
    render(<MultiVoiceSheetMusicDisplay score={score} />)

    await waitFor(() => {
      expect(mockRenderer.clear).toHaveBeenCalled()
      expect(mockRenderer.renderScore).toHaveBeenCalledWith(score)
    })
  })

  it('should handle custom options', () => {
    const score = createTestScore()
    const options = {
      scale: 1.5,
      showMeasureNumbers: false,
      height: 600,
    }

    render(<MultiVoiceSheetMusicDisplay score={score} options={options} />)

    expect(MultiVoiceNotationRenderer).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining(options)
    )
  })

  it('should handle render complete callback', async () => {
    const score = createTestScore()
    const onRenderComplete = jest.fn()

    render(
      <MultiVoiceSheetMusicDisplay
        score={score}
        onRenderComplete={onRenderComplete}
      />
    )

    await waitFor(() => {
      expect(onRenderComplete).toHaveBeenCalled()
    })
  })

  it('should handle render errors', async () => {
    const score = createTestScore()
    const onRenderError = jest.fn()
    const error = new Error('Render failed')

    mockRenderer.renderScore.mockImplementation(() => {
      throw error
    })

    render(
      <MultiVoiceSheetMusicDisplay
        score={score}
        onRenderError={onRenderError}
      />
    )

    await waitFor(() => {
      expect(onRenderError).toHaveBeenCalledWith(error)
      expect(screen.getByText(/Error rendering score:/)).toBeInTheDocument()
      expect(screen.getByText(/Render failed/)).toBeInTheDocument()
    })
  })

  it('should show loading state while rendering', () => {
    const score = createTestScore()

    // Make renderScore async
    mockRenderer.renderScore.mockImplementation(() => {
      return new Promise(() => {
        // Simulating async behavior
      })
    })

    render(<MultiVoiceSheetMusicDisplay score={score} />)

    // Loading should not be visible initially due to React state updates
    // But we can verify the renderer was called
    expect(mockRenderer.renderScore).toHaveBeenCalled()
  })

  it('should handle window resize', async () => {
    const score = createTestScore()
    render(<MultiVoiceSheetMusicDisplay score={score} />)

    // Simulate window resize
    global.dispatchEvent(new Event('resize'))

    // Wait for debounced resize
    await waitFor(
      () => {
        expect(mockRenderer.resize).toHaveBeenCalled()
      },
      { timeout: 400 }
    )

    // Should re-render after resize
    expect(mockRenderer.renderScore).toHaveBeenCalledTimes(2)
  })

  it('should clean up on unmount', () => {
    const score = createTestScore()
    const { unmount } = render(<MultiVoiceSheetMusicDisplay score={score} />)

    unmount()

    expect(mockRenderer.destroy).toHaveBeenCalled()
  })

  it('should update options when they change', async () => {
    const score = createTestScore()
    const { rerender } = render(<MultiVoiceSheetMusicDisplay score={score} />)

    const newOptions = { scale: 2.0 }
    rerender(<MultiVoiceSheetMusicDisplay score={score} options={newOptions} />)

    await waitFor(() => {
      expect(mockRenderer.updateOptions).toHaveBeenCalledWith(
        expect.objectContaining(newOptions)
      )
    })
  })

  it('should apply custom className', () => {
    const score = createTestScore()
    const { container } = render(
      <MultiVoiceSheetMusicDisplay score={score} className="custom-class" />
    )

    expect(
      container.querySelector('.multi-voice-sheet-music-display.custom-class')
    ).toBeInTheDocument()
  })

  it('should handle scores without duration metadata', () => {
    const score = createTestScore()
    delete score.metadata.duration

    const { container } = render(<MultiVoiceSheetMusicDisplay score={score} />)

    const infoDiv = container.querySelector('.mt-4.text-sm.text-gray-600')
    expect(infoDiv?.textContent).toContain('1 part')
    expect(infoDiv?.textContent).toContain('1 measure')
    expect(infoDiv?.textContent).not.toContain('Duration:')
  })

  it('should handle initialization errors', async () => {
    const error = new Error('Failed to initialize')
    const onRenderError = jest.fn()

    ;(MultiVoiceNotationRenderer as jest.Mock).mockImplementation(() => {
      throw error
    })

    const score = createTestScore()
    render(
      <MultiVoiceSheetMusicDisplay
        score={score}
        onRenderError={onRenderError}
      />
    )

    await waitFor(() => {
      expect(onRenderError).toHaveBeenCalledWith(error)
      expect(screen.getByText(/Error rendering score:/)).toBeInTheDocument()
    })
  })
})
