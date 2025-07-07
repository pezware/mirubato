import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePracticeTracking } from '../usePracticeTracking'
import { useAutoLogging } from '../context'

// Mock the context
vi.mock('../context', () => ({
  useAutoLogging: vi.fn(),
}))

describe('usePracticeTracking', () => {
  const mockStartSession = vi.fn()
  const mockStopSession = vi.fn()
  const mockUpdateSession = vi.fn()
  const mockCancelSession = vi.fn()
  const mockUpdateConfig = vi.fn()

  const defaultMockContext = {
    currentSession: null,
    startSession: mockStartSession,
    stopSession: mockStopSession,
    updateSession: mockUpdateSession,
    cancelSession: mockCancelSession,
    isTracking: false,
    elapsedTime: 0,
    config: {
      enabled: true,
      minDuration: 60,
      roundingInterval: 1,
      showSummary: true,
      defaultTags: ['auto-logged'],
      defaultInstrument: 'PIANO' as const,
    },
    updateConfig: mockUpdateConfig,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAutoLogging).mockReturnValue(defaultMockContext)
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      usePracticeTracking({
        type: 'metronome',
        metadata: { title: 'Test Practice' },
      })
    )

    expect(result.current.isTracking).toBe(false)
    expect(result.current.elapsedTime).toBe(0)
    expect(result.current.formattedTime).toBe('0:00')
    expect(result.current.showSummary).toBe(false)
  })

  it('should start a practice session', () => {
    const { result } = renderHook(() =>
      usePracticeTracking({
        type: 'metronome',
        metadata: { title: 'Test Practice' },
      })
    )

    act(() => {
      result.current.start()
    })

    expect(mockStartSession).toHaveBeenCalledWith('metronome', {
      title: 'Test Practice',
    })
  })

  it('should format elapsed time correctly', () => {
    vi.mocked(useAutoLogging).mockReturnValue({
      ...defaultMockContext,
      elapsedTime: 125, // 2 minutes 5 seconds
    })

    const { result } = renderHook(() =>
      usePracticeTracking({
        type: 'metronome',
      })
    )

    expect(result.current.formattedTime).toBe('2:05')
  })

  it('should handle stop with summary', async () => {
    const mockSession = {
      id: '123',
      type: 'metronome' as const,
      startTime: new Date(),
      endTime: new Date(),
      duration: 120000, // 2 minutes
      metadata: { title: 'Test Practice' },
      autoLogEnabled: true,
    }

    mockStopSession.mockResolvedValue(mockSession)

    const { result } = renderHook(() =>
      usePracticeTracking({
        type: 'metronome',
      })
    )

    await act(async () => {
      await result.current.stop()
    })

    expect(mockStopSession).toHaveBeenCalled()
    expect(result.current.showSummary).toBe(true)
    expect(result.current.pendingSession).toEqual({
      duration: 120000,
      metadata: { title: 'Test Practice' },
    })
  })

  it('should handle stop without summary when config.showSummary is false', async () => {
    vi.mocked(useAutoLogging).mockReturnValue({
      ...defaultMockContext,
      config: {
        ...defaultMockContext.config,
        showSummary: false,
      },
    })

    const mockSession = {
      id: '123',
      type: 'metronome' as const,
      startTime: new Date(),
      endTime: new Date(),
      duration: 120000,
      metadata: { title: 'Test Practice' },
      autoLogEnabled: true,
    }

    mockStopSession.mockResolvedValue(mockSession)

    const onSessionEnd = vi.fn()
    const { result } = renderHook(() =>
      usePracticeTracking({
        type: 'metronome',
        onSessionEnd,
      })
    )

    await act(async () => {
      await result.current.stop()
    })

    expect(result.current.showSummary).toBe(false)
    expect(onSessionEnd).toHaveBeenCalledWith(120000, {
      title: 'Test Practice',
    })
  })

  it('should update session metadata', () => {
    const { result } = renderHook(() =>
      usePracticeTracking({
        type: 'score',
        metadata: { scoreTitle: 'Original Title' },
      })
    )

    act(() => {
      result.current.update({ scoreComposer: 'Bach' })
    })

    expect(mockUpdateSession).toHaveBeenCalledWith({ scoreComposer: 'Bach' })
  })

  it('should cancel session', () => {
    const { result } = renderHook(() =>
      usePracticeTracking({
        type: 'counter',
      })
    )

    act(() => {
      result.current.cancel()
    })

    expect(mockCancelSession).toHaveBeenCalled()
    expect(result.current.showSummary).toBe(false)
    expect(result.current.pendingSession).toBeNull()
  })

  it('should calculate duration in minutes with rounding', () => {
    vi.mocked(useAutoLogging).mockReturnValue({
      ...defaultMockContext,
      currentSession: {
        id: '123',
        type: 'metronome',
        startTime: new Date(),
        duration: 0,
        metadata: {},
        autoLogEnabled: true,
      },
      elapsedTime: 125, // 2 minutes 5 seconds
      config: {
        ...defaultMockContext.config,
        roundingInterval: 5, // Round to 5 minutes
      },
    })

    const { result } = renderHook(() =>
      usePracticeTracking({
        type: 'metronome',
      })
    )

    expect(result.current.durationMinutes).toBe(5) // Rounded up to 5 minutes
  })
})
