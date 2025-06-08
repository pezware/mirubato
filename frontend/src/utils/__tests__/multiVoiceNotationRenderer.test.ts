/**
 * Tests for MultiVoiceNotationRenderer
 */
import { MultiVoiceNotationRenderer } from '../multiVoiceNotationRenderer'
import { Score } from '../../modules/sheetMusic/multiVoiceTypes'
import {
  Clef,
  NoteDuration,
  TimeSignature,
  KeySignature,
  Articulation,
} from '../../modules/sheetMusic/types'
import { Renderer, Stave } from 'vexflow'

// Mock VexFlow
jest.mock('vexflow', () => {
  const mockContext = {
    clear: jest.fn(),
    setFont: jest.fn(),
    scale: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    fillText: jest.fn(),
  }

  const mockRenderer = {
    resize: jest.fn(),
    getContext: jest.fn(() => mockContext),
  }

  const mockStave = {
    addClef: jest.fn().mockReturnThis(),
    addKeySignature: jest.fn().mockReturnThis(),
    addTimeSignature: jest.fn().mockReturnThis(),
    setMeasure: jest.fn().mockReturnThis(),
    setContext: jest.fn().mockReturnThis(),
    draw: jest.fn(),
    getWidth: jest.fn(() => 200),
  }

  const mockVoice = {
    addTickables: jest.fn(),
    draw: jest.fn(),
  }

  const mockFormatter = {
    joinVoices: jest.fn().mockReturnThis(),
    format: jest.fn(),
  }

  const mockStaveNote = {
    setStemDirection: jest.fn().mockReturnThis(),
    addModifier: jest.fn().mockReturnThis(),
    addDot: jest.fn().mockReturnThis(),
  }

  const mockBeam = {
    setContext: jest.fn().mockReturnThis(),
    draw: jest.fn(),
  }

  const mockStaveTie = {
    setContext: jest.fn().mockReturnThis(),
    draw: jest.fn(),
  }

  const mockStaveConnector = {
    setType: jest.fn().mockReturnThis(),
    setContext: jest.fn().mockReturnThis(),
    draw: jest.fn(),
  }

  const StaveConnectorMock = jest.fn(() => mockStaveConnector) as any
  StaveConnectorMock.type = {
    BRACE: 1,
    SINGLE_LEFT: 2,
  }

  const mockFactory = jest.fn()

  const Renderer = jest.fn(() => mockRenderer) as any
  Renderer.Backends = {
    SVG: 1,
    CANVAS: 2,
  }

  return {
    Renderer,
    Stave: jest.fn(() => mockStave),
    Voice: jest.fn(() => mockVoice),
    Formatter: jest.fn(() => mockFormatter),
    StaveNote: jest.fn(() => mockStaveNote),
    Beam: jest.fn(() => mockBeam),
    StaveTie: jest.fn(() => mockStaveTie),
    StaveConnector: StaveConnectorMock,
    Factory: jest.fn(() => mockFactory),
    Accidental: jest.fn(),
    Dot: jest.fn(),
    Articulation: jest.fn(),
    Annotation: Object.assign(
      jest.fn().mockImplementation(() => ({
        setVerticalJustification: jest.fn().mockReturnThis(),
      })),
      {
        VerticalJustify: {
          TOP: 1,
          BOTTOM: 2,
        },
      }
    ),
    System: jest.fn(),
    EasyScore: jest.fn(),
  }
})

describe('MultiVoiceNotationRenderer', () => {
  let container: HTMLElement
  let renderer: MultiVoiceNotationRenderer

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'test-container'
    document.body.appendChild(container)
    renderer = new MultiVoiceNotationRenderer(container)
  })

  afterEach(() => {
    renderer.destroy()
    document.body.removeChild(container)
  })

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(renderer).toBeDefined()
      expect(Renderer).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.any(Number)
      )
    })

    it('should accept custom options', () => {
      const customRenderer = new MultiVoiceNotationRenderer(container, {
        width: 800,
        height: 600,
        scale: 1.5,
      })
      expect(customRenderer).toBeDefined()
      customRenderer.destroy()
    })
  })

  describe('renderScore', () => {
    it('should render a simple single-voice score', () => {
      const score: Score = {
        title: 'Test Score',
        composer: 'Test Composer',
        parts: [
          {
            id: 'piano',
            name: 'Piano',
            instrument: 'piano',
            staves: ['treble'],
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
                    id: 'main',
                    notes: [
                      {
                        keys: ['c/4'],
                        duration: NoteDuration.QUARTER,
                        time: 0,
                        voiceId: 'main',
                      },
                      {
                        keys: ['d/4'],
                        duration: NoteDuration.QUARTER,
                        time: 1,
                        voiceId: 'main',
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
        },
      }

      expect(() => renderer.renderScore(score)).not.toThrow()

      // Verify context methods were called
      const mockContext = (
        Renderer as unknown as jest.Mock
      ).mock.results[0].value.getContext()
      expect(mockContext.clear).toHaveBeenCalled()
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'Test Score',
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      )
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'Test Composer',
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      )
    })

    it('should render a multi-voice score', () => {
      const score: Score = {
        title: 'SATB Piece',
        composer: 'Choral Composer',
        parts: [
          {
            id: 'choir',
            name: 'Choir',
            instrument: 'choir',
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
                    id: 'soprano',
                    name: 'Soprano',
                    stemDirection: 'up',
                    notes: [
                      {
                        keys: ['g/4'],
                        duration: NoteDuration.HALF,
                        time: 0,
                        voiceId: 'soprano',
                      },
                    ],
                  },
                  {
                    id: 'alto',
                    name: 'Alto',
                    stemDirection: 'down',
                    notes: [
                      {
                        keys: ['e/4'],
                        duration: NoteDuration.HALF,
                        time: 0,
                        voiceId: 'alto',
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
                    id: 'tenor',
                    name: 'Tenor',
                    stemDirection: 'up',
                    notes: [
                      {
                        keys: ['c/3'],
                        duration: NoteDuration.HALF,
                        time: 0,
                        voiceId: 'tenor',
                      },
                    ],
                  },
                  {
                    id: 'bass',
                    name: 'Bass',
                    stemDirection: 'down',
                    notes: [
                      {
                        keys: ['c/2'],
                        duration: NoteDuration.HALF,
                        time: 0,
                        voiceId: 'bass',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          source: 'test',
          tags: [],
        },
      }

      expect(() => renderer.renderScore(score)).not.toThrow()

      // Verify staves were created for both clefs
      expect(Stave).toHaveBeenCalled()

      // Verify voices were created
      const VoiceMock = jest.requireMock('vexflow').Voice
      expect(VoiceMock).toHaveBeenCalled() // Multiple voices created
    })

    it('should handle grand staff notation', () => {
      const score: Score = {
        title: 'Piano Sonata',
        composer: 'Classical Composer',
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
                        keys: ['c/5', 'e/5', 'g/5'], // C major chord
                        duration: NoteDuration.WHOLE,
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
                        duration: NoteDuration.WHOLE,
                        time: 0,
                        voiceId: 'leftHand',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          source: 'test',
          tags: [],
        },
      }

      expect(() => renderer.renderScore(score)).not.toThrow()

      // Verify stave connector was used for grand staff
      const StaveConnectorMock = jest.requireMock('vexflow').StaveConnector
      expect(StaveConnectorMock).toHaveBeenCalled()
    })

    it('should handle notes with articulations and dynamics', () => {
      const score: Score = {
        title: 'Articulated Piece',
        composer: 'Test',
        parts: [
          {
            id: 'violin',
            name: 'Violin',
            instrument: 'violin',
            staves: ['violin'],
          },
        ],
        measures: [
          {
            number: 1,
            staves: [
              {
                id: 'violin',
                clef: Clef.TREBLE,
                voices: [
                  {
                    id: 'main',
                    notes: [
                      {
                        keys: ['g/4'],
                        duration: NoteDuration.QUARTER,
                        time: 0,
                        voiceId: 'main',
                        articulation: Articulation.STACCATO,
                        dynamic: 'f' as any,
                        fingering: '1',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          source: 'test',
          tags: [],
        },
      }

      expect(() => renderer.renderScore(score)).not.toThrow()

      // Verify note creation
      const StaveNoteMock = jest.requireMock('vexflow').StaveNote
      expect(StaveNoteMock).toHaveBeenCalled()
    })

    it('should handle arranger information', () => {
      const score: Score = {
        title: 'Arranged Piece',
        composer: 'Original Composer',
        arranger: 'Arranger Name',
        parts: [
          {
            id: 'piano',
            name: 'Piano',
            instrument: 'piano',
            staves: ['main'],
          },
        ],
        measures: [
          {
            number: 1,
            staves: [
              {
                id: 'main',
                clef: Clef.TREBLE,
                voices: [
                  {
                    id: 'main',
                    notes: [],
                  },
                ],
              },
            ],
          },
        ],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          source: 'test',
          tags: [],
        },
      }

      renderer.renderScore(score)

      const mockContext = (
        Renderer as unknown as jest.Mock
      ).mock.results[0].value.getContext()
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'arr. Arranger Name',
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      )
    })
  })

  describe('updateOptions', () => {
    it('should update rendering options', () => {
      renderer.updateOptions({
        scale: 2.0,
        showMeasureNumbers: false,
      })

      // Verify renderer was recreated
      expect(Renderer).toHaveBeenCalled()
    })
  })

  describe('resize', () => {
    it('should resize the renderer', () => {
      renderer.resize(1000, 600)

      // Verify renderer was recreated with new dimensions
      expect(Renderer).toHaveBeenCalled()
      const mockRenderer = (Renderer as unknown as jest.Mock).mock.results[0]
        .value
      expect(mockRenderer.resize).toHaveBeenCalledWith(1000, 600)
    })
  })

  describe('clear', () => {
    it('should clear the rendering context', () => {
      renderer.clear()

      const mockContext = (
        Renderer as unknown as jest.Mock
      ).mock.results[0].value.getContext()
      expect(mockContext.clear).toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('should clean up resources', () => {
      renderer.destroy()

      // Try to render after destroy should not throw but won't do anything
      const score: Score = {
        title: 'Test',
        composer: 'Test',
        parts: [],
        measures: [],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          source: 'test',
          tags: [],
        },
      }

      expect(() => renderer.renderScore(score)).toThrow(
        'Renderer not initialized'
      )
    })
  })
})
