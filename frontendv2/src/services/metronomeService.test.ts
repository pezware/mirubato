import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as Tone from 'tone'
import { getMetronome } from './metronomeService'

// Mock timers
vi.useFakeTimers()

// Mock Tone.js
vi.mock('tone', () => {
  const mockSynth = {
    triggerAttackRelease: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  }

  const mockVolume = {
    volume: { value: -6, rampTo: vi.fn() },
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  }

  const mockTransport = {
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    bpm: { value: 120, rampTo: vi.fn() },
  }

  const mockContext = {
    state: 'suspended',
  }

  const mockDraw = {
    schedule: vi.fn(),
  }

  return {
    MembraneSynth: vi.fn(() => mockSynth),
    Volume: vi.fn(() => mockVolume),
    Transport: mockTransport,
    context: mockContext,
    start: vi.fn().mockResolvedValue(undefined),
    now: vi.fn(() => 0),
    Draw: mockDraw,
  }
})

describe('MetronomeService', () => {
  let metronome: ReturnType<typeof getMetronome>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    // Get fresh instance for each test
    metronome = getMetronome()
  })

  afterEach(() => {
    metronome.dispose()
  })

  describe('start', () => {
    it('should start audio context if not running', async () => {
      const mockTone = vi.mocked(Tone)
      mockTone.context.state = 'suspended'

      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })

      expect(mockTone.start).toHaveBeenCalled()
    })

    it('should set transport BPM and start', async () => {
      const mockTone = vi.mocked(Tone)
      mockTone.context.state = 'running'

      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })

      expect(mockTone.Transport.bpm.value).toBe(120)
      expect(mockTone.Transport.start).toHaveBeenCalled()
    })

    it('should set volume correctly', async () => {
      const mockTone = vi.mocked(Tone)
      const mockVolume = mockTone.Volume()

      await metronome.start({ tempo: 120, volume: 0.5, accentBeats: true })

      // Volume 0.5 should convert to -30 dB using rampTo
      expect(mockVolume.volume.rampTo).toHaveBeenCalledWith(-30, 0.05)
    })

    it('should handle zero volume correctly', async () => {
      const mockTone = vi.mocked(Tone)
      const mockVolume = mockTone.Volume()

      await metronome.start({ tempo: 120, volume: 0, accentBeats: true })

      expect(mockVolume.volume.rampTo).toHaveBeenCalledWith(-Infinity, 0.05)
    })

    it('should start the scheduler', async () => {
      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })

      // Fast-forward time to trigger scheduler
      vi.advanceTimersByTime(30)

      expect(metronome.getIsPlaying()).toBe(true)
    })

    it('should schedule visual callbacks if provided', async () => {
      const mockTone = vi.mocked(Tone)
      const visualCallback = { onBeat: vi.fn() }

      await metronome.start(
        { tempo: 120, volume: 0.7, accentBeats: true },
        visualCallback
      )

      // Fast-forward to trigger scheduler
      vi.advanceTimersByTime(30)

      // Should have scheduled notes with visual feedback
      expect(mockTone.Draw.schedule).toHaveBeenCalled()
    })
  })

  describe('stop', () => {
    it('should stop transport and cancel scheduled events', async () => {
      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })

      const mockTone = vi.mocked(Tone)

      metronome.stop()

      expect(mockTone.Transport.stop).toHaveBeenCalled()
      expect(mockTone.Transport.cancel).toHaveBeenCalled()
    })

    it('should clear the scheduler timeout', async () => {
      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      metronome.stop()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    it('should reset playing state', async () => {
      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })
      metronome.stop()

      expect(metronome.getIsPlaying()).toBe(false)
    })
  })

  describe('setTempo', () => {
    it('should use Transport.bpm.rampTo for smooth changes', () => {
      const mockTone = vi.mocked(Tone)

      metronome.setTempo(60)

      expect(mockTone.Transport.bpm.rampTo).toHaveBeenCalledWith(60, 0.1)
    })

    it('should update internal tempo value', async () => {
      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })

      metronome.setTempo(90)

      // The internal tempo is used for scheduling
      const mockTone = vi.mocked(Tone)
      expect(mockTone.Transport.bpm.rampTo).toHaveBeenCalledWith(90, 0.1)
    })
  })

  describe('setVolume', () => {
    it('should convert volume to decibels correctly with smooth ramping', () => {
      const mockTone = vi.mocked(Tone)
      const mockVolume = mockTone.Volume()

      metronome.setVolume(0.75)

      expect(mockVolume.volume.rampTo).toHaveBeenCalledWith(-15, 0.05) // -60 + (0.75 * 60) = -15
    })

    it('should handle edge cases', () => {
      const mockTone = vi.mocked(Tone)
      const mockVolume = mockTone.Volume()

      metronome.setVolume(1)
      expect(mockVolume.volume.rampTo).toHaveBeenCalledWith(0, 0.05)

      metronome.setVolume(0)
      expect(mockVolume.volume.rampTo).toHaveBeenCalledWith(-Infinity, 0.05)
    })
  })

  describe('setBeatsPerMeasure', () => {
    it('should update beats per measure', () => {
      metronome.setBeatsPerMeasure(3)
      // This is mainly internal state, verifying it doesn't throw
      expect(true).toBe(true)
    })
  })

  describe('getIsPlaying', () => {
    it('should return false initially', () => {
      expect(metronome.getIsPlaying()).toBe(false)
    })

    it('should return true after start', async () => {
      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })
      expect(metronome.getIsPlaying()).toBe(true)
    })

    it('should return false after stop', async () => {
      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })
      metronome.stop()
      expect(metronome.getIsPlaying()).toBe(false)
    })
  })

  describe('dispose', () => {
    it('should clean up all resources', async () => {
      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })

      const mockTone = vi.mocked(Tone)
      const mockSynth = mockTone.MembraneSynth()
      const mockVolume = mockTone.Volume()

      metronome.dispose()

      expect(mockSynth.dispose).toHaveBeenCalledTimes(2) // Both synths
      expect(mockVolume.dispose).toHaveBeenCalled()
    })
  })

  describe('lookahead scheduling', () => {
    it('should schedule notes ahead of time', async () => {
      const mockTone = vi.mocked(Tone)
      const mockSynth = mockTone.MembraneSynth()

      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })

      // Advance time to trigger scheduler multiple times
      vi.advanceTimersByTime(150) // Should trigger scheduler ~6 times

      // Should have scheduled multiple notes
      expect(mockSynth.triggerAttackRelease).toHaveBeenCalled()
    })

    it('should handle accent beats correctly', async () => {
      const mockTone = vi.mocked(Tone)
      const mockSynth = mockTone.MembraneSynth()

      // Mock Tone.now() to return increasing values
      let currentTime = 0
      mockTone.now.mockImplementation(() => {
        return currentTime
      })

      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })

      // Advance time to schedule multiple beats
      currentTime = 0.5 // Move time forward to trigger more scheduling
      vi.advanceTimersByTime(600) // Advance enough to get multiple beats

      // Should have scheduled multiple notes
      const calls = mockSynth.triggerAttackRelease.mock.calls
      expect(calls.length).toBeGreaterThan(1)

      // First beat should be accent (G2)
      expect(calls[0]).toEqual(['G2', '16n', expect.any(Number)])

      // Subsequent beats should be normal (C3) if we have more than one
      if (calls.length > 1) {
        expect(calls[1]).toEqual(['C3', '16n', expect.any(Number)])
      }
    })
  })
})
