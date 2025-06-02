import { NotationRenderer } from './notationRenderer'
import { SheetMusic, Measure } from '../types/sheetMusic'

// Mock VexFlow
jest.mock('vexflow', () => {
  const mockContext = {
    scale: jest.fn(),
    setFont: jest.fn(),
    fillText: jest.fn(),
  }

  const mockRenderer = {
    resize: jest.fn(),
    getContext: jest.fn().mockReturnValue(mockContext),
  }

  const mockStave = {
    addClef: jest.fn().mockReturnThis(),
    addTimeSignature: jest.fn().mockReturnThis(),
    addKeySignature: jest.fn().mockReturnThis(),
    setContext: jest.fn().mockReturnThis(),
    draw: jest.fn(),
  }

  const mockVoice = {
    addTickables: jest.fn(),
    draw: jest.fn(),
  }

  const mockFormatter = {
    joinVoices: jest.fn().mockReturnThis(),
    format: jest.fn(),
  }

  const mockBeam = {
    setContext: jest.fn().mockReturnThis(),
    draw: jest.fn(),
  }

  return {
    Renderer: jest.fn(() => mockRenderer),
    Stave: jest.fn(() => mockStave),
    StaveNote: jest.fn(config => ({
      ...config,
      getDuration: jest.fn().mockReturnValue(config.duration),
    })),
    Voice: jest.fn(() => mockVoice),
    Formatter: jest.fn(() => mockFormatter),
    Beam: jest.fn(() => mockBeam),
    // Expose mocks for test access
    __mocks: {
      mockContext,
      mockRenderer,
      mockStave,
      mockVoice,
      mockFormatter,
      mockBeam,
    },
  }
})

// Import mocked VexFlow
import * as VexFlow from 'vexflow'

describe('NotationRenderer', () => {
  let container: HTMLDivElement
  let renderer: NotationRenderer

  // Get mocks from VexFlow
  const mocks = (VexFlow as any).__mocks
  const {
    mockContext,
    mockRenderer,
    mockStave,
    mockVoice,
    mockFormatter,
    mockBeam,
  } = mocks

  beforeEach(() => {
    // Create container element
    container = document.createElement('div')
    document.body.appendChild(container)

    // Mock static property
    VexFlow.Renderer.Backends = { SVG: 'SVG' } as any

    // Clear all mock calls
    jest.clearAllMocks()

    // Create renderer instance
    renderer = new NotationRenderer(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    jest.clearAllMocks()
  })

  // Helper function to create mock sheet music
  const createMockSheetMusic = (measureCount: number = 2): SheetMusic => ({
    id: 'test-piece',
    title: 'Test Piece',
    composer: 'Test Composer',
    instrument: 'piano',
    measures: Array.from({ length: measureCount }, (_, i) => ({
      clef: i === 0 ? 'treble' : undefined,
      timeSignature: i === 0 ? '4/4' : undefined,
      keySignature: i === 0 ? 'C' : undefined,
      tempo: i === 0 ? { bpm: 120, marking: 'Allegro' } : undefined,
      notes: [
        { keys: ['c/4'], duration: '4' },
        { keys: ['d/4'], duration: '4' },
        { keys: ['e/4'], duration: '4' },
        { keys: ['f/4'], duration: '4' },
      ],
    })),
  })

  describe('Initialization', () => {
    it('creates a NotationRenderer with container', () => {
      expect(renderer).toBeInstanceOf(NotationRenderer)
    })
  })

  describe('Rendering', () => {
    it('renders sheet music with default options', () => {
      const sheetMusic = createMockSheetMusic()
      const options = { width: 800, scale: 1.0 }

      renderer.render(sheetMusic, options)

      // Check renderer creation and configuration
      expect(VexFlow.Renderer).toHaveBeenCalledWith(container, 'SVG')
      expect(mockRenderer.resize).toHaveBeenCalledWith(800, 250) // 100 + 1 line * 150
      expect(mockContext.scale).toHaveBeenCalledWith(1.0, 1.0)

      // Check staves created
      expect(VexFlow.Stave).toHaveBeenCalledTimes(2) // 2 measures

      // Check first measure has clef, time signature, and key signature
      expect(mockStave.addClef).toHaveBeenCalledWith('treble')
      expect(mockStave.addTimeSignature).toHaveBeenCalledWith('4/4')
      expect(mockStave.addKeySignature).toHaveBeenCalledWith('C')

      // Check notes created
      expect(VexFlow.StaveNote).toHaveBeenCalledTimes(8) // 4 notes per measure * 2 measures

      // Check voice and formatter
      expect(VexFlow.Voice).toHaveBeenCalledTimes(2)
      expect(mockVoice.addTickables).toHaveBeenCalledTimes(2)
      expect(mockFormatter.format).toHaveBeenCalledTimes(2)

      // Check tempo marking
      expect(mockContext.fillText).toHaveBeenCalledWith('Allegro', 20, 30)
    })

    it('renders with custom measures per line', () => {
      const sheetMusic = createMockSheetMusic(4)
      const options = { width: 800, scale: 1.0, measuresPerLine: 1 }

      renderer.render(sheetMusic, options)

      // With 1 measure per line and 4 measures, height should be 60 + 4 * 150
      expect(mockRenderer.resize).toHaveBeenCalledWith(800, 660)

      // Check all 4 staves created
      expect(VexFlow.Stave).toHaveBeenCalledTimes(4)
    })

    it('renders with start measure number', () => {
      const sheetMusic = createMockSheetMusic(4)
      const options = {
        width: 800,
        scale: 1.0,
        measuresPerLine: 2,
        startMeasureNumber: 10,
      }

      renderer.render(sheetMusic, options)

      // Check measure numbers
      expect(mockContext.fillText).toHaveBeenCalledWith(
        '11',
        expect.any(Number),
        expect.any(Number)
      )
      expect(mockContext.fillText).toHaveBeenCalledWith(
        '13',
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('handles different scale values', () => {
      const sheetMusic = createMockSheetMusic()
      const options = { width: 800, scale: 1.5 }

      renderer.render(sheetMusic, options)

      expect(mockContext.scale).toHaveBeenCalledWith(1.5, 1.5)
    })

    it('clears previous content before rendering', () => {
      container.innerHTML = '<div>Previous content</div>'

      const sheetMusic = createMockSheetMusic()
      const options = { width: 800, scale: 1.0 }

      renderer.render(sheetMusic, options)

      expect(container.innerHTML).toBe('') // Container cleared before VexFlow rendering
    })

    it('creates beams for sixteenth notes', () => {
      const sheetMusic: SheetMusic = {
        id: 'test',
        title: 'Test',
        composer: 'Test',
        instrument: 'piano',
        measures: [
          {
            notes: [
              { keys: ['c/4'], duration: '16' },
              { keys: ['d/4'], duration: '16' },
              { keys: ['e/4'], duration: '16' },
              { keys: ['f/4'], duration: '16' },
              { keys: ['g/4'], duration: '16' },
              { keys: ['a/4'], duration: '16' },
              { keys: ['b/4'], duration: '16' },
              { keys: ['c/5'], duration: '16' },
            ],
          },
        ],
      }

      renderer.render(sheetMusic, { width: 800, scale: 1.0 })

      // Should create 2 beams (groups of 4 sixteenth notes)
      expect(VexFlow.Beam).toHaveBeenCalledTimes(2)
      expect(mockBeam.draw).toHaveBeenCalledTimes(2)
    })

    it('does not create beams for non-sixteenth notes', () => {
      const sheetMusic = createMockSheetMusic() // Uses quarter notes

      renderer.render(sheetMusic, { width: 800, scale: 1.0 })

      expect(VexFlow.Beam).not.toHaveBeenCalled()
    })

    it('handles measures without optional properties', () => {
      const sheetMusic: SheetMusic = {
        id: 'test',
        title: 'Test',
        composer: 'Test',
        instrument: 'piano',
        measures: [
          {
            notes: [{ keys: ['c/4'], duration: '4' }],
          },
        ],
      }

      renderer.render(sheetMusic, { width: 800, scale: 1.0 })

      // Should not call add methods for missing properties
      expect(mockStave.addClef).not.toHaveBeenCalled()
      expect(mockStave.addTimeSignature).not.toHaveBeenCalled()
      expect(mockStave.addKeySignature).not.toHaveBeenCalled()

      // Should not render tempo
      expect(mockContext.fillText).not.toHaveBeenCalledWith(
        expect.stringContaining('Allegro'),
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('calculates proper dimensions for different layouts', () => {
      // Test with 3 measures, 2 per line
      const sheetMusic = createMockSheetMusic(3)
      const options = { width: 1000, scale: 1.0, measuresPerLine: 2 }

      renderer.render(sheetMusic, options)

      // Should have 2 lines (3 measures / 2 per line = 1.5, rounded up to 2)
      expect(mockRenderer.resize).toHaveBeenCalledWith(1000, 400) // 100 + 2 * 150

      // Check stave positioning
      expect(VexFlow.Stave).toHaveBeenCalledWith(20, 40, 480) // First stave
      expect(VexFlow.Stave).toHaveBeenCalledWith(500, 40, 480) // Second stave
      expect(VexFlow.Stave).toHaveBeenCalledWith(20, 190, 480) // Third stave on new line
    })
  })

  describe('Disposal', () => {
    it('cleans up resources on dispose', () => {
      const sheetMusic = createMockSheetMusic()
      renderer.render(sheetMusic, { width: 800, scale: 1.0 })

      renderer.dispose()

      // Try to render again to ensure cleanup
      renderer.render(sheetMusic, { width: 800, scale: 1.0 })

      // Should create new renderer
      expect(VexFlow.Renderer).toHaveBeenCalledTimes(2)
    })

    it('can dispose without rendering', () => {
      expect(() => renderer.dispose()).not.toThrow()
    })

    it('can dispose multiple times', () => {
      renderer.dispose()
      expect(() => renderer.dispose()).not.toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty measures array', () => {
      const sheetMusic: SheetMusic = {
        id: 'test',
        title: 'Test',
        composer: 'Test',
        instrument: 'piano',
        measures: [],
      }

      expect(() =>
        renderer.render(sheetMusic, { width: 800, scale: 1.0 })
      ).not.toThrow()
      expect(VexFlow.Stave).not.toHaveBeenCalled()
    })

    it('handles very small width', () => {
      const sheetMusic = createMockSheetMusic()
      const options = { width: 100, scale: 1.0 }

      renderer.render(sheetMusic, options)

      expect(mockRenderer.resize).toHaveBeenCalledWith(100, expect.any(Number))
    })

    it('handles very large scale', () => {
      const sheetMusic = createMockSheetMusic()
      const options = { width: 800, scale: 5.0 }

      renderer.render(sheetMusic, options)

      expect(mockContext.scale).toHaveBeenCalledWith(5.0, 5.0)
    })

    it('handles partial beams at end of measure', () => {
      const sheetMusic: SheetMusic = {
        id: 'test',
        title: 'Test',
        composer: 'Test',
        instrument: 'piano',
        measures: [
          {
            notes: [
              { keys: ['c/4'], duration: '16' },
              { keys: ['d/4'], duration: '16' },
              { keys: ['e/4'], duration: '16' }, // Only 3 sixteenth notes
            ],
          },
        ],
      }

      renderer.render(sheetMusic, { width: 800, scale: 1.0 })

      // Should not create beam for incomplete group
      expect(VexFlow.Beam).not.toHaveBeenCalled()
    })
  })
})
