import { AudioManager, createAudioManager } from './audioManager'
import { MockAudioManager } from './mockAudioManager'
import { AudioManagerInterface } from './audioManagerInterface'

// Mock Tone.js
const mockTone = {
  start: jest.fn().mockResolvedValue(undefined),
  loaded: jest.fn().mockResolvedValue(undefined),
  Sampler: jest.fn().mockImplementation(() => ({
    toDestination: jest.fn().mockReturnThis(),
    connect: jest.fn(),
    triggerAttackRelease: jest.fn(),
    dispose: jest.fn(),
  })),
  PolySynth: jest.fn().mockImplementation(() => ({
    toDestination: jest.fn().mockReturnThis(),
    connect: jest.fn(),
    triggerAttackRelease: jest.fn(),
    dispose: jest.fn(),
  })),
  Synth: jest.fn(),
  Reverb: jest.fn().mockImplementation(() => ({
    toDestination: jest.fn().mockReturnThis(),
  })),
}

describe('AudioManager', () => {
  let audioManager: AudioManagerInterface
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    if (audioManager && audioManager.dispose) {
      audioManager.dispose()
    }
  })

  describe('AudioManager Implementation', () => {
    beforeEach(() => {
      audioManager = new AudioManager({}, mockTone as any)
    })

    describe('Initialization', () => {
      it('should start uninitialized', () => {
        expect(audioManager.isInitialized()).toBe(false)
        expect(audioManager.isLoading()).toBe(false)
      })

      it('should initialize successfully', async () => {
        await audioManager.initialize()

        expect(audioManager.isInitialized()).toBe(true)
        expect(audioManager.isLoading()).toBe(false)
        expect(mockTone.start).toHaveBeenCalled()
        expect(mockTone.Sampler).toHaveBeenCalled()
        expect(mockTone.PolySynth).toHaveBeenCalled()
        expect(mockTone.Reverb).toHaveBeenCalled()
      })

      it('should not reinitialize if already initialized', async () => {
        await audioManager.initialize()
        const startCallCount = mockTone.start.mock.calls.length

        await audioManager.initialize()

        expect(mockTone.start).toHaveBeenCalledTimes(startCallCount)
      })

      it('should handle initialization errors', async () => {
        mockTone.start.mockRejectedValueOnce(new Error('Audio context failed'))

        await expect(audioManager.initialize()).rejects.toThrow(
          'Audio context failed'
        )
        expect(audioManager.isInitialized()).toBe(false)
      })

      it('should wait for existing initialization', async () => {
        const promise1 = audioManager.initialize()
        const promise2 = audioManager.initialize()

        await Promise.all([promise1, promise2])

        expect(mockTone.start).toHaveBeenCalledTimes(1)
      })
    })

    describe('Instrument Management', () => {
      it('should default to piano', () => {
        expect(audioManager.getInstrument()).toBe('piano')
      })

      it('should switch instruments', () => {
        audioManager.setInstrument('guitar')
        expect(audioManager.getInstrument()).toBe('guitar')

        audioManager.setInstrument('piano')
        expect(audioManager.getInstrument()).toBe('piano')
      })

      it('should use custom default instrument', () => {
        const customAudioManager = new AudioManager(
          { defaultInstrument: 'guitar' },
          mockTone as any
        )
        expect(customAudioManager.getInstrument()).toBe('guitar')
        customAudioManager.dispose()
      })
    })

    describe('Note Playing', () => {
      let pianoSampler: any
      let guitarSynth: any

      beforeEach(async () => {
        pianoSampler = {
          toDestination: jest.fn().mockReturnThis(),
          connect: jest.fn(),
          triggerAttackRelease: jest.fn(),
          dispose: jest.fn(),
        }
        guitarSynth = {
          toDestination: jest.fn().mockReturnThis(),
          connect: jest.fn(),
          triggerAttackRelease: jest.fn(),
          dispose: jest.fn(),
        }

        mockTone.Sampler.mockImplementation(() => pianoSampler)
        mockTone.PolySynth.mockImplementation(() => guitarSynth)

        await audioManager.initialize()
      })

      it('should play a single note on piano', async () => {
        await audioManager.playNote('C4')

        expect(pianoSampler.triggerAttackRelease).toHaveBeenCalledWith(
          'C4',
          '8n',
          undefined,
          0.8
        )
      })

      it('should play a chord on piano', async () => {
        await audioManager.playNote(['C4', 'E4', 'G4'], '4n', 0.6)

        expect(pianoSampler.triggerAttackRelease).toHaveBeenCalledWith(
          ['C4', 'E4', 'G4'],
          '4n',
          undefined,
          0.6
        )
      })

      it('should play notes on guitar', async () => {
        audioManager.setInstrument('guitar')
        await audioManager.playNote('E3', '2n', 0.9)

        expect(guitarSynth.triggerAttackRelease).toHaveBeenCalledWith(
          'E3',
          '2n',
          undefined,
          0.9
        )
      })

      it('should initialize before playing if not initialized', async () => {
        const uninitializedManager = new AudioManager({}, mockTone as any)
        expect(uninitializedManager.isInitialized()).toBe(false)

        await uninitializedManager.playNote('C4')

        expect(uninitializedManager.isInitialized()).toBe(true)
        uninitializedManager.dispose()
      })

      it('should schedule notes at specific times', async () => {
        await audioManager.playNoteAt('D4', 1.5, '16n', 0.7)

        expect(pianoSampler.triggerAttackRelease).toHaveBeenCalledWith(
          'D4',
          '16n',
          1.5,
          0.7
        )
      })

      it('should handle errors when playing notes', async () => {
        pianoSampler.triggerAttackRelease.mockImplementation(() => {
          throw new Error('Playback failed')
        })

        await expect(audioManager.playNote('C4')).rejects.toThrow(
          'Playback failed'
        )
      })
    })

    describe('Resource Management', () => {
      it('should dispose resources properly', async () => {
        await audioManager.initialize()
        const pianoSampler = mockTone.Sampler.mock.results[0].value
        const guitarSynth = mockTone.PolySynth.mock.results[0].value

        audioManager.dispose()

        expect(pianoSampler.dispose).toHaveBeenCalled()
        expect(guitarSynth.dispose).toHaveBeenCalled()
        expect(audioManager.isInitialized()).toBe(false)
        expect(audioManager.isLoading()).toBe(false)
      })
    })

    describe('Configuration', () => {
      it('should use custom sample base URL', async () => {
        const customManager = new AudioManager(
          {
            samplesBaseUrl: 'https://custom.example.com/samples/',
          },
          mockTone as any
        )

        await customManager.initialize()

        expect(mockTone.Sampler).toHaveBeenCalledWith(
          expect.objectContaining({
            baseUrl: 'https://custom.example.com/samples/',
          })
        )

        customManager.dispose()
      })

      it('should use custom reverb settings', async () => {
        const customManager = new AudioManager(
          {
            reverb: {
              decay: 1.5,
              wet: 0.25,
              preDelay: 0.02,
            },
          },
          mockTone as any
        )

        await customManager.initialize()

        expect(mockTone.Reverb).toHaveBeenCalledWith({
          decay: 1.5,
          wet: 0.25,
          preDelay: 0.02,
        })

        customManager.dispose()
      })
    })
  })

  describe('Factory Function', () => {
    it('should create AudioManager instances', () => {
      const instance = createAudioManager({}, mockTone as any)
      expect(instance).toBeInstanceOf(AudioManager)
      instance.dispose()
    })

    it('should pass configuration to instances', () => {
      const instance = createAudioManager(
        { defaultInstrument: 'guitar' },
        mockTone as any
      )
      expect(instance.getInstrument()).toBe('guitar')
      instance.dispose()
    })
  })

  describe('MockAudioManager', () => {
    beforeEach(() => {
      audioManager = new MockAudioManager()
    })

    it('should implement AudioManagerInterface', () => {
      expect(audioManager.isInitialized).toBeDefined()
      expect(audioManager.initialize).toBeDefined()
      expect(audioManager.setInstrument).toBeDefined()
      expect(audioManager.getInstrument).toBeDefined()
      expect(audioManager.playNote).toBeDefined()
      expect(audioManager.playNoteAt).toBeDefined()
      expect(audioManager.isLoading).toBeDefined()
      expect(audioManager.dispose).toBeDefined()
    })

    it('should track played notes', async () => {
      const mockManager = audioManager as MockAudioManager

      await mockManager.playNote('C4')
      await mockManager.playNote(['E4', 'G4'], '4n', 0.5)
      await mockManager.playNoteAt('D4', 2.0, '2n', 0.7)

      const playedNotes = mockManager.getPlayedNotes()
      expect(playedNotes).toHaveLength(3)
      expect(playedNotes[0]).toEqual({
        note: 'C4',
        duration: '8n',
        velocity: 0.8,
      })
      expect(playedNotes[1]).toEqual({
        note: ['E4', 'G4'],
        duration: '4n',
        velocity: 0.5,
      })
      expect(playedNotes[2]).toEqual({
        note: 'D4',
        duration: '2n',
        velocity: 0.7,
        time: 2.0,
      })
    })

    it('should clear played notes', async () => {
      const mockManager = audioManager as MockAudioManager

      await mockManager.playNote('C4')
      mockManager.clearPlayedNotes()

      expect(mockManager.getPlayedNotes()).toHaveLength(0)
    })
  })
})
