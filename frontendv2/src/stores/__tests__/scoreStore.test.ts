import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScoreStore } from '../scoreStore'
import { usePracticeStore } from '../practiceStore'
import { useLogbookStore } from '../logbookStore'

// Mock functions
const mockStartPractice = vi.fn()
const mockStopPractice = vi.fn(() => ({
  scoreId: 'test-score-1',
  scoreTitle: 'Test Score',
  scoreComposer: 'Test Composer',
  duration: 120,
  startTime: new Date(),
  endTime: new Date(),
}))

// Mock the practice store
vi.mock('../practiceStore', () => ({
  usePracticeStore: {
    getState: vi.fn(() => ({
      startPractice: mockStartPractice,
      stopPractice: mockStopPractice,
    })),
  },
}))

// Mock the logbook store
vi.mock('../logbookStore', () => ({
  useLogbookStore: {
    getState: vi.fn(() => ({
      createEntry: vi.fn(),
    })),
  },
}))

describe('scoreStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the store state by directly setting currentScore
    useScoreStore.setState({
      currentScore: {
        id: 'test-score-1',
        title: 'Test Score',
        composer: 'Test Composer',
        description: '',
        difficulty: 'intermediate',
        duration: 5,
        instruments: ['piano'],
        genre: 'classical',
        tags: [],
        visibility: 'public',
        uploadedBy: 'test-user',
        uploadedAt: new Date().toISOString(),
        viewCount: 0,
        practiceCount: 0,
        fileUrl: '',
        thumbnailUrl: '',
        previewPages: 1,
      },
      isRecording: false,
    })
  })

  it('should stop practice without creating a logbook entry', () => {
    const { result } = renderHook(() => useScoreStore())
    const logbookCreateEntry = vi.spyOn(
      useLogbookStore.getState(),
      'createEntry'
    )

    // Start practice
    act(() => {
      result.current.startPractice()
    })

    expect(result.current.isRecording).toBe(true)

    // Stop practice
    act(() => {
      result.current.stopPractice()
    })

    expect(result.current.isRecording).toBe(false)

    // Verify that logbook entry was NOT created directly
    expect(logbookCreateEntry).not.toHaveBeenCalled()

    // Verify that practiceStore.stopPractice was called
    expect(mockStopPractice).toHaveBeenCalled()
  })
})
