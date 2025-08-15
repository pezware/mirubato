import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScoreStore } from '../scoreStore'

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
    })
  })

  it('should have initial state', () => {
    const { result } = renderHook(() => useScoreStore())

    // Check that the store has the expected properties
    expect(result.current.currentScore).toBeDefined()
    expect(result.current.metronomeSettings).toBeDefined()
    expect(result.current.autoScrollEnabled).toBe(false)
    expect(result.current.showManagement).toBe(false)
  })
})
