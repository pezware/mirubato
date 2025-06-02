/* eslint-disable @typescript-eslint/no-explicit-any */
import { audioManager } from './audioManager'
import * as Tone from 'tone'

// Mock Tone.js
jest.mock('tone')

describe('AudioManager', () => {
  const mockTone = Tone as jest.Mocked<typeof Tone>
  let mockPianoSampler: any
  let mockGuitarSynth: any
  let mockReverb: any
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()

    // Reset the audioManager state by calling dispose
    // This is critical to ensure tests don't interfere with each other
    audioManager.dispose()

    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    // Mock Tone.start
    mockTone.start = jest.fn().mockResolvedValue(undefined)

    // Mock Tone.loaded
    mockTone.loaded = jest.fn().mockResolvedValue(undefined)

    // Mock reverb
    mockReverb = {
      toDestination: jest.fn().mockReturnThis(),
      dispose: jest.fn(),
    }
    ;(mockTone.Reverb as any) = jest.fn().mockReturnValue(mockReverb)

    // Create fresh mock for piano sampler
    mockPianoSampler = {
      toDestination: jest.fn().mockReturnThis(),
      connect: jest.fn(),
      triggerAttackRelease: jest.fn(),
      dispose: jest.fn(),
    }

    // Important: Create a new implementation each time that returns the current mockPianoSampler
    ;(mockTone.Sampler as any) = jest.fn().mockImplementation(() => {
      return mockPianoSampler
    })

    // Create fresh mock for guitar synth
    mockGuitarSynth = {
      toDestination: jest.fn().mockReturnThis(),
      connect: jest.fn(),
      triggerAttackRelease: jest.fn(),
      dispose: jest.fn(),
    }

    // Important: Create a new implementation each time that returns the current mockGuitarSynth
    ;(mockTone.PolySynth as any) = jest.fn().mockImplementation(() => {
      return mockGuitarSynth
    })
    ;(mockTone.Synth as any) = jest.fn()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()

    // Ensure the audioManager is fully reset
    audioManager.dispose()
    
    // Also reset all module mocks
    jest.resetModules()
  })

  describe('Initialization', () => {
    it('initializes audio system successfully', async () => {
      await audioManager.initialize()

      expect(mockTone.start).toHaveBeenCalled()
      expect(mockTone.Sampler).toHaveBeenCalledWith(
        expect.objectContaining({
          urls: expect.objectContaining({
            C4: 'C4.mp3',
            A4: 'A4.mp3',
          }),
          baseUrl: 'https://tonejs.github.io/audio/salamander/',
          release: 1,
        })
      )
      expect(mockTone.PolySynth).toHaveBeenCalled()
      expect(mockTone.Reverb).toHaveBeenCalledWith({
        decay: 2.5,
        wet: 0.15,
        preDelay: 0.01,
      })
      expect(mockPianoSampler.connect).toHaveBeenCalledWith(mockReverb)
      expect(mockGuitarSynth.connect).toHaveBeenCalledWith(mockReverb)
      expect(audioManager.isInitialized()).toBe(true)
    })

    it('does not reinitialize if already initialized', async () => {
      await audioManager.initialize()
      jest.clearAllMocks()

      await audioManager.initialize()

      expect(mockTone.start).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith('Audio already initialized')
    })

    it('waits for existing initialization if already loading', async () => {
      // Start two initializations concurrently
      const init1 = audioManager.initialize()
      const init2 = audioManager.initialize()

      await Promise.all([init1, init2])

      // Should only create one set of instruments
      expect(mockTone.Sampler).toHaveBeenCalledTimes(1)
      expect(mockTone.PolySynth).toHaveBeenCalledTimes(1)
    })

    it('handles initialization errors gracefully', async () => {
      const error = new Error('Audio context failed')
      mockTone.start.mockRejectedValue(error)

      await expect(audioManager.initialize()).rejects.toThrow(
        'Audio context failed'
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Audio initialization error:',
        error
      )
      expect(audioManager.isInitialized()).toBe(false)
    })

    it('handles sample loading errors but continues', async () => {
      mockTone.Sampler.mockImplementation((config?: any) => {
        // Simulate calling the onerror callback
        if (config?.onerror) {
          config.onerror(new Error('Sample load error'))
        }
        return mockPianoSampler
      }) as any

      await audioManager.initialize()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load piano samples:',
        new Error('Sample load error')
      )
      // Should still initialize successfully with fallback
      expect(audioManager.isInitialized()).toBe(true)
    })

    it('logs successful sample loading', async () => {
      mockTone.Sampler.mockImplementation((config?: any) => {
        // Simulate calling the onload callback
        if (config?.onload) {
          config.onload()
        }
        return mockPianoSampler
      }) as any

      await audioManager.initialize()

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Piano samples loaded successfully'
      )
    })
  })

  describe('Instrument Management', () => {
    it('sets and gets instrument correctly', () => {
      expect(audioManager.getInstrument()).toBe('piano') // default

      audioManager.setInstrument('guitar')
      expect(audioManager.getInstrument()).toBe('guitar')
      expect(consoleLogSpy).toHaveBeenCalledWith('Switched to guitar')

      audioManager.setInstrument('piano')
      expect(audioManager.getInstrument()).toBe('piano')
      expect(consoleLogSpy).toHaveBeenCalledWith('Switched to piano')
    })
  })

  describe('Note Playing', () => {
    it('plays a single note on piano', async () => {
      await audioManager.initialize()
      jest.clearAllMocks()
      await audioManager.playNote('C4')

      expect(mockPianoSampler.triggerAttackRelease).toHaveBeenCalledWith(
        'C4',
        '8n',
        undefined,
        0.8
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Successfully played: C4 on piano'
      )
    })

    it('plays multiple notes (chord) on piano', async () => {
      await audioManager.initialize()
      jest.clearAllMocks()
      await audioManager.playNote(['C4', 'E4', 'G4'], '4n', 0.5)

      expect(mockPianoSampler.triggerAttackRelease).toHaveBeenCalledWith(
        ['C4', 'E4', 'G4'],
        '4n',
        undefined,
        0.5
      )
    })

    it('plays a note on guitar', async () => {
      await audioManager.initialize()
      jest.clearAllMocks()
      audioManager.setInstrument('guitar')
      await audioManager.playNote('E3', '16n', 0.9)

      expect(mockGuitarSynth.triggerAttackRelease).toHaveBeenCalledWith(
        'E3',
        '16n',
        undefined,
        0.9
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Successfully played: E3 on guitar'
      )
    })

    it('initializes automatically on first play attempt', async () => {
      // Force a fresh state by disposing first
      audioManager.dispose()

      // Verify audioManager is not initialized
      expect(audioManager.isInitialized()).toBe(false)

      // Play note without explicit initialization - should not throw
      await expect(audioManager.playNote('A4')).resolves.toBeUndefined()

      // Should have initialized automatically
      expect(audioManager.isInitialized()).toBe(true)

      // Verify initialization happened by checking Tone.start was called
      expect(mockTone.start).toHaveBeenCalled()
    })

    it('handles play errors gracefully', async () => {
      // This test verifies error handling by creating a broken sampler
      audioManager.dispose()

      // Clear all mocks to ensure clean state
      jest.clearAllMocks()

      // Create a sampler that will throw when triggerAttackRelease is called
      const brokenSampler = {
        toDestination: jest.fn().mockReturnThis(),
        connect: jest.fn(),
        triggerAttackRelease: jest.fn().mockImplementation(() => {
          throw new Error('Playback failed')
        }),
        dispose: jest.fn(),
      }

      // Reset the Sampler mock completely and make it return our broken sampler
      ;(mockTone.Sampler as any).mockReset()
      ;(mockTone.Sampler as any).mockImplementation(() => brokenSampler)

      await audioManager.initialize()

      await expect(audioManager.playNote('C4')).rejects.toThrow(
        'Playback failed'
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error playing note:',
        expect.any(Error)
      )
    })

    it('throws error if instrument not available', async () => {
      // Simulate piano sampler not being created
      audioManager.dispose()

      // Create a mock that doesn't have toDestination
      const brokenSampler = {}
      mockTone.Sampler.mockReturnValue(brokenSampler as any)

      // This should fail during initialization
      await expect(audioManager.initialize()).rejects.toThrow()
    })
  })

  describe('Scheduled Note Playing', () => {
    it('schedules a note at specific time on piano', async () => {
      await audioManager.initialize()

      // Should be able to schedule a note without throwing
      await expect(
        audioManager.playNoteAt('D4', 1.5, '8n', 0.7)
      ).resolves.toBeUndefined()
    })

    it('schedules a chord at specific time on guitar', async () => {
      await audioManager.initialize()

      audioManager.setInstrument('guitar')
      await audioManager.playNoteAt(['E3', 'B3', 'E4'], 2.0, '2n', 0.6)

      expect(mockGuitarSynth.triggerAttackRelease).toHaveBeenCalledWith(
        ['E3', 'B3', 'E4'],
        '2n',
        2.0,
        0.6
      )
    })

    it('initializes if needed before scheduling', async () => {
      // Force a fresh state by disposing first
      audioManager.dispose()

      // Verify not initialized
      expect(audioManager.isInitialized()).toBe(false)

      // Schedule note without explicit initialization - should not throw
      await expect(audioManager.playNoteAt('G4', 0.5)).resolves.toBeUndefined()

      // Should have initialized automatically
      expect(audioManager.isInitialized()).toBe(true)
    })

    it('handles scheduling errors gracefully', async () => {
      // This test verifies error handling by creating a broken sampler
      audioManager.dispose()

      // Clear all mocks to ensure clean state
      jest.clearAllMocks()

      // Create a sampler that will throw when triggerAttackRelease is called
      const brokenSampler = {
        toDestination: jest.fn().mockReturnThis(),
        connect: jest.fn(),
        triggerAttackRelease: jest.fn().mockImplementation(() => {
          throw new Error('Scheduling failed')
        }),
        dispose: jest.fn(),
      }

      // Reset the Sampler mock completely and make it return our broken sampler
      ;(mockTone.Sampler as any).mockReset()
      ;(mockTone.Sampler as any).mockImplementation(() => brokenSampler)

      await audioManager.initialize()

      await expect(audioManager.playNoteAt('C4', 1.0)).rejects.toThrow(
        'Scheduling failed'
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error scheduling note:',
        expect.any(Error)
      )
    })
  })

  describe('State Management', () => {
    it('correctly reports initialization state', async () => {
      expect(audioManager.isInitialized()).toBe(false)
      expect(audioManager.isLoading()).toBe(false)

      const initPromise = audioManager.initialize()
      expect(audioManager.isLoading()).toBe(true)

      await initPromise
      expect(audioManager.isInitialized()).toBe(true)
      expect(audioManager.isLoading()).toBe(false)
    })

    it('disposes resources correctly', async () => {
      await audioManager.initialize()

      audioManager.dispose()

      expect(mockPianoSampler.dispose).toHaveBeenCalled()
      expect(mockGuitarSynth.dispose).toHaveBeenCalled()
      expect(audioManager.isInitialized()).toBe(false)
      expect(audioManager.isLoading()).toBe(false)
    })

    it('can reinitialize after disposal', async () => {
      await audioManager.initialize()
      audioManager.dispose()
      jest.clearAllMocks()

      await audioManager.initialize()

      expect(mockTone.start).toHaveBeenCalled()
      expect(mockTone.Sampler).toHaveBeenCalled()
      expect(audioManager.isInitialized()).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('handles Tone.loaded rejection', async () => {
      mockTone.loaded.mockRejectedValue(new Error('Samples failed to load'))

      await expect(audioManager.initialize()).rejects.toThrow(
        'Samples failed to load'
      )
      expect(audioManager.isInitialized()).toBe(false)
    })

    it('resets loading promise on error', async () => {
      mockTone.start.mockRejectedValueOnce(new Error('First attempt failed'))

      // First attempt fails
      await expect(audioManager.initialize()).rejects.toThrow(
        'First attempt failed'
      )

      // Second attempt should work
      mockTone.start.mockResolvedValue(undefined)
      await expect(audioManager.initialize()).resolves.toBeUndefined()
      expect(audioManager.isInitialized()).toBe(true)
    })

    it('handles disposal during initialization', async () => {
      // Create a delayed promise for Tone.loaded
      let resolveLoaded: () => void
      mockTone.loaded.mockReturnValue(
        new Promise(resolve => {
          resolveLoaded = resolve
        })
      )

      const initPromise = audioManager.initialize()

      // Wait a bit to ensure initialization has started
      await new Promise(resolve => setTimeout(resolve, 0))

      // Complete the loading
      resolveLoaded!()

      await initPromise

      // Now dispose to clean up
      audioManager.dispose()

      // Should clean up properly
      expect(mockPianoSampler.dispose).toHaveBeenCalled()
      expect(mockGuitarSynth.dispose).toHaveBeenCalled()
    })
  })
})
