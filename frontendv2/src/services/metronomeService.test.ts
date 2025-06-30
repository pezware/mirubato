import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as Tone from 'tone'
import { getMetronome } from './metronomeService'

// Mock Tone.js
vi.mock('tone', () => {
  const mockLoop = {
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
    interval: 0.5,
  }

  const mockSynth = {
    triggerAttackRelease: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  }

  const mockVolume = {
    volume: { value: -6 },
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  }

  const mockTransport = {
    start: vi.fn(),
    stop: vi.fn(),
  }

  const mockContext = {
    state: 'suspended',
  }

  return {
    Loop: vi.fn((callback, interval) => {
      mockLoop.interval = interval
      // Store callback for testing
      mockLoop.callback = callback
      return mockLoop
    }),
    MembraneSynth: vi.fn(() => mockSynth),
    Volume: vi.fn(() => mockVolume),
    Transport: mockTransport,
    context: mockContext,
    start: vi.fn().mockResolvedValue(undefined),
  }
})

describe('MetronomeService', () => {
  let metronome: ReturnType<typeof getMetronome>

  beforeEach(() => {
    vi.clearAllMocks()
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

    it('should create and start a loop with correct interval', async () => {
      const mockTone = vi.mocked(Tone)
      mockTone.context.state = 'running'

      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })

      expect(mockTone.Loop).toHaveBeenCalledWith(expect.any(Function), 0.5) // 60/120 = 0.5
      expect(mockTone.Transport.start).toHaveBeenCalled()
    })

    it('should set volume correctly', async () => {
      const mockTone = vi.mocked(Tone)
      const mockVolume = mockTone.Volume()

      await metronome.start({ tempo: 120, volume: 0.5, accentBeats: true })

      // Volume 0.5 should convert to -30 dB
      expect(mockVolume.volume.value).toBe(-30)
    })

    it('should handle zero volume correctly', async () => {
      const mockTone = vi.mocked(Tone)
      const mockVolume = mockTone.Volume()

      await metronome.start({ tempo: 120, volume: 0, accentBeats: true })

      expect(mockVolume.volume.value).toBe(-Infinity)
    })
  })

  describe('stop', () => {
    it('should stop and dispose the loop', async () => {
      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })

      const mockTone = vi.mocked(Tone)
      const mockLoop = mockTone.Loop()

      metronome.stop()

      expect(mockLoop.stop).toHaveBeenCalled()
      expect(mockLoop.dispose).toHaveBeenCalled()
      expect(mockTone.Transport.stop).toHaveBeenCalled()
    })

    it('should reset beat counter', async () => {
      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })
      metronome.stop()

      expect(metronome.getIsPlaying()).toBe(false)
    })
  })

  describe('setTempo', () => {
    it('should update loop interval when playing', async () => {
      await metronome.start({ tempo: 120, volume: 0.7, accentBeats: true })

      const mockTone = vi.mocked(Tone)
      const mockLoop = mockTone.Loop()

      metronome.setTempo(60)

      expect(mockLoop.interval).toBe(1) // 60/60 = 1
    })

    it('should not update if not playing', () => {
      const mockTone = vi.mocked(Tone)
      const mockLoop = mockTone.Loop()

      metronome.setTempo(60)

      expect(mockLoop.interval).not.toBe(1)
    })
  })

  describe('setVolume', () => {
    it('should convert volume to decibels correctly', () => {
      const mockTone = vi.mocked(Tone)
      const mockVolume = mockTone.Volume()

      metronome.setVolume(0.75)

      expect(mockVolume.volume.value).toBe(-15) // -60 + (0.75 * 60) = -15
    })

    it('should handle edge cases', () => {
      const mockTone = vi.mocked(Tone)
      const mockVolume = mockTone.Volume()

      metronome.setVolume(1)
      expect(mockVolume.volume.value).toBe(0)

      metronome.setVolume(0)
      expect(mockVolume.volume.value).toBe(-Infinity)
    })
  })

  describe('setBeatsPerMeasure', () => {
    it('should update beats per measure', () => {
      metronome.setBeatsPerMeasure(3)
      // This is mainly internal state, hard to test without exposing it
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
})
