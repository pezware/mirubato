import { MultiVoiceAudioManager } from './multiVoiceAudioManager'
import {
  Score,
  MultiVoiceNote,
  Staff,
  Part,
  MultiVoiceMeasure,
} from '../modules/sheetMusic/multiVoiceTypes'
import { Clef, NoteDuration, TimeSignature } from '../modules/sheetMusic/types'
import * as Tone from 'tone'

// Mock Tone.js
jest.mock('tone', () => {
  const mockSampler = {
    triggerAttackRelease: jest.fn(),
    triggerAttack: jest.fn(),
    triggerRelease: jest.fn(),
    connect: jest.fn().mockReturnThis(),
    toDestination: jest.fn().mockReturnThis(),
    dispose: jest.fn(),
  }

  const mockPolySynth = {
    triggerAttackRelease: jest.fn(),
    triggerAttack: jest.fn(),
    triggerRelease: jest.fn(),
    connect: jest.fn().mockReturnThis(),
    toDestination: jest.fn().mockReturnThis(),
    dispose: jest.fn(),
  }

  const mockTransport = {
    schedule: jest.fn((callback, when) => {
      // For testing, execute immediately
      callback(when)
      return 0
    }),
    clear: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    position: 0,
    bpm: {
      value: 120,
    },
    playbackRate: 1,
  }

  const mockReverb = {
    toDestination: jest.fn().mockReturnThis(),
    dispose: jest.fn(),
  }

  const mockSynth = {
    triggerAttackRelease: jest.fn(),
    triggerAttack: jest.fn(),
    triggerRelease: jest.fn(),
    connect: jest.fn().mockReturnThis(),
    toDestination: jest.fn().mockReturnThis(),
    dispose: jest.fn(),
  }

  const mockLoop = {
    start: jest.fn(),
    stop: jest.fn(),
    dispose: jest.fn(),
  }

  return {
    start: jest.fn().mockResolvedValue(undefined),
    loaded: jest.fn().mockResolvedValue(undefined),
    now: jest.fn().mockReturnValue(0),
    Transport: mockTransport,
    Sampler: jest.fn().mockReturnValue(mockSampler),
    PolySynth: jest.fn().mockReturnValue(mockPolySynth),
    Synth: jest.fn().mockImplementation(() => mockSynth),
    Reverb: jest.fn().mockReturnValue(mockReverb),
    Loop: jest.fn().mockImplementation(() => {
      return mockLoop
    }),
    Gain: jest.fn().mockReturnValue({
      gain: { value: 1 },
      connect: jest.fn(),
      toDestination: jest.fn().mockReturnThis(),
      dispose: jest.fn(),
    }),
    Panner: jest.fn().mockReturnValue({
      pan: { value: 0 },
      connect: jest.fn(),
      toDestination: jest.fn().mockReturnThis(),
      dispose: jest.fn(),
    }),
  }
})

describe('MultiVoiceAudioManager', () => {
  let audioManager: MultiVoiceAudioManager
  let mockTone: jest.Mocked<typeof Tone>

  // Helper function to create a simple test score
  const createTestScore = (): Score => {
    const rightHandNotes: MultiVoiceNote[] = [
      {
        keys: ['c/4'],
        duration: NoteDuration.QUARTER,
        time: 0,
        voiceId: 'rightHand',
      },
      {
        keys: ['e/4'],
        duration: NoteDuration.QUARTER,
        time: 1,
        voiceId: 'rightHand',
      },
    ]

    const leftHandNotes: MultiVoiceNote[] = [
      {
        keys: ['c/3'],
        duration: NoteDuration.HALF,
        time: 0,
        voiceId: 'leftHand',
      },
    ]

    const trebleStaff: Staff = {
      id: 'treble',
      clef: Clef.TREBLE,
      voices: [
        {
          id: 'rightHand',
          name: 'Right Hand',
          notes: rightHandNotes,
        },
      ],
    }

    const bassStaff: Staff = {
      id: 'bass',
      clef: Clef.BASS,
      voices: [
        {
          id: 'leftHand',
          name: 'Left Hand',
          notes: leftHandNotes,
        },
      ],
    }

    const measure: MultiVoiceMeasure = {
      number: 1,
      staves: [trebleStaff, bassStaff],
      timeSignature: TimeSignature.FOUR_FOUR,
      tempo: 120,
    }

    const part: Part = {
      id: 'piano',
      name: 'Piano',
      instrument: 'piano',
      staves: ['treble', 'bass'],
    }

    return {
      title: 'Test Score',
      composer: 'Test Composer',
      parts: [part],
      measures: [measure],
      metadata: {
        createdAt: new Date(),
        modifiedAt: new Date(),
        source: 'test',
        tags: [],
      },
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockTone = Tone as jest.Mocked<typeof Tone>
    audioManager = new MultiVoiceAudioManager()
  })

  afterEach(() => {
    audioManager.dispose()
  })

  describe('Initialization', () => {
    it('should initialize audio system', async () => {
      expect(audioManager.isInitialized()).toBe(false)
      await audioManager.initialize()
      expect(audioManager.isInitialized()).toBe(true)
      expect(mockTone.start).toHaveBeenCalled()
    })

    it('should handle multiple initialization calls', async () => {
      await audioManager.initialize()
      await audioManager.initialize()
      expect(mockTone.start).toHaveBeenCalledTimes(1)
    })
  })

  describe('Score Playback', () => {
    beforeEach(async () => {
      await audioManager.initialize()
    })

    it('should play a complete score with multiple voices', async () => {
      const score = createTestScore()
      await audioManager.playScore(score)

      expect(mockTone.Transport.start).toHaveBeenCalled()
      expect(mockTone.Transport.schedule).toHaveBeenCalled()
    })

    it('should stop playback', async () => {
      const score = createTestScore()
      await audioManager.playScore(score)
      audioManager.stopPlayback()

      expect(mockTone.Transport.stop).toHaveBeenCalled()
      expect(mockTone.Transport.clear).toHaveBeenCalled()
    })

    it('should respect tempo settings', async () => {
      const score = createTestScore()
      score.measures[0].tempo = 90
      await audioManager.playScore(score)

      expect(mockTone.Transport.bpm.value).toBe(90)
    })
  })

  describe('Voice Management', () => {
    beforeEach(async () => {
      await audioManager.initialize()
    })

    it('should play only specified voice', async () => {
      const score = createTestScore()
      await audioManager.playVoice(score, 'rightHand')

      const mockSampler = (mockTone.Sampler as any).mock.results[0].value
      expect(mockSampler.triggerAttackRelease).toHaveBeenCalledWith(
        ['c/4'],
        expect.any(String),
        expect.any(Number),
        expect.any(Number)
      )
      expect(mockSampler.triggerAttackRelease).toHaveBeenCalledWith(
        ['e/4'],
        expect.any(String),
        expect.any(Number),
        expect.any(Number)
      )
      // Should not play left hand notes
      expect(mockSampler.triggerAttackRelease).not.toHaveBeenCalledWith(
        ['c/3'],
        expect.any(String),
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('should mute specified voice during score playback', async () => {
      const score = createTestScore()
      audioManager.muteVoice('leftHand')
      await audioManager.playScore(score)

      const mockSampler = (mockTone.Sampler as any).mock.results[0].value
      // Should play right hand
      expect(mockSampler.triggerAttackRelease).toHaveBeenCalledWith(
        ['c/4'],
        expect.any(String),
        expect.any(Number),
        expect.any(Number)
      )
      // Should not play muted left hand
      expect(mockSampler.triggerAttackRelease).not.toHaveBeenCalledWith(
        ['c/3'],
        expect.any(String),
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('should unmute voice', () => {
      audioManager.muteVoice('leftHand')
      expect(audioManager.isVoiceMuted('leftHand')).toBe(true)

      audioManager.unmuteVoice('leftHand')
      expect(audioManager.isVoiceMuted('leftHand')).toBe(false)
    })

    it('should solo voice', async () => {
      const score = createTestScore()
      audioManager.soloVoice('rightHand')
      await audioManager.playScore(score)

      const mockSampler = (mockTone.Sampler as any).mock.results[0].value
      // Should only play soloed voice
      expect(mockSampler.triggerAttackRelease).toHaveBeenCalledWith(
        ['c/4'],
        expect.any(String),
        expect.any(Number),
        expect.any(Number)
      )
      expect(mockSampler.triggerAttackRelease).not.toHaveBeenCalledWith(
        ['c/3'],
        expect.any(String),
        expect.any(Number),
        expect.any(Number)
      )
    })

    it('should clear solo', () => {
      audioManager.soloVoice('rightHand')
      expect(audioManager.getSoloedVoice()).toBe('rightHand')

      audioManager.clearSolo()
      expect(audioManager.getSoloedVoice()).toBeNull()
    })
  })

  describe('Voice Volume Control', () => {
    beforeEach(async () => {
      await audioManager.initialize()
    })

    it('should set voice volume', () => {
      audioManager.setVoiceVolume('rightHand', 0.5)
      expect(audioManager.getVoiceVolume('rightHand')).toBe(0.5)
    })

    it('should clamp volume between 0 and 1', () => {
      audioManager.setVoiceVolume('rightHand', -0.5)
      expect(audioManager.getVoiceVolume('rightHand')).toBe(0)

      audioManager.setVoiceVolume('rightHand', 1.5)
      expect(audioManager.getVoiceVolume('rightHand')).toBe(1)
    })

    it('should apply voice volume during playback', async () => {
      const score = createTestScore()
      audioManager.setVoiceVolume('rightHand', 0.7)
      await audioManager.playScore(score)

      const mockSampler = (mockTone.Sampler as any).mock.results[0].value
      // Find the call for rightHand voice
      const rightHandCall = mockSampler.triggerAttackRelease.mock.calls.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (call: any[]) => call[0][0] === 'c/4' || call[0][0] === 'e/4'
      )
      expect(rightHandCall).toBeDefined()
      // Velocity is voice volume * 0.8
      expect(rightHandCall[3]).toBeCloseTo(0.7 * 0.8, 2)
    })
  })

  describe('Metronome', () => {
    beforeEach(async () => {
      await audioManager.initialize()
    })

    it('should start metronome with time signature', () => {
      audioManager.startMetronome(TimeSignature.FOUR_FOUR, 120)
      expect(audioManager.isMetronomeActive()).toBe(true)
    })

    it('should stop metronome', () => {
      audioManager.startMetronome(TimeSignature.FOUR_FOUR, 120)
      audioManager.stopMetronome()
      expect(audioManager.isMetronomeActive()).toBe(false)
    })

    it('should adjust metronome tempo', () => {
      audioManager.startMetronome(TimeSignature.FOUR_FOUR, 120)
      audioManager.setMetronomeTempo(90)
      expect(mockTone.Transport.bpm.value).toBe(90)
    })
  })

  describe('Playback Events', () => {
    beforeEach(async () => {
      await audioManager.initialize()
    })

    it('should emit note events during playback', async () => {
      const noteCallback = jest.fn()
      audioManager.onNotePlay(noteCallback)

      const score = createTestScore()
      await audioManager.playScore(score)

      expect(noteCallback).toHaveBeenCalledWith({
        note: expect.objectContaining({
          keys: ['c/4'],
          voiceId: 'rightHand',
        }),
        time: expect.any(Number),
        velocity: expect.any(Number),
      })
    })

    it('should emit measure change events', async () => {
      const measureCallback = jest.fn()
      audioManager.onMeasureChange(measureCallback)

      const score = createTestScore()
      await audioManager.playScore(score)

      expect(measureCallback).toHaveBeenCalledWith({
        measureNumber: 1,
        time: expect.any(Number),
      })
    })
  })

  describe('Export Audio', () => {
    it('should export score as audio buffer', async () => {
      await audioManager.initialize()
      const score = createTestScore()

      const audioBuffer = await audioManager.exportAudio(score, {
        format: 'wav',
        sampleRate: 44100,
      })

      expect(audioBuffer).toBeDefined()
      expect(audioBuffer).toBeInstanceOf(ArrayBuffer)
      expect(audioBuffer.byteLength).toBeGreaterThan(0)
    })
  })

  describe('Cleanup', () => {
    it('should dispose resources properly', async () => {
      await audioManager.initialize()
      audioManager.dispose()

      const mockSampler = (mockTone.Sampler as any).mock.results[0].value
      const mockReverb = (mockTone.Sampler as any).mock.results[0].value

      expect(mockSampler.dispose).toHaveBeenCalled()
      expect(mockReverb.dispose).toHaveBeenCalled()
      expect(audioManager.isInitialized()).toBe(false)
    })
  })
})
