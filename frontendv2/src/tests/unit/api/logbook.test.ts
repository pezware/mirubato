import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { LogbookEntry, Goal } from '../../../api/logbook'

// Mock the API client module
vi.mock('../../../api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// Import after mocking
import { logbookApi } from '../../../api/logbook'
import { apiClient } from '../../../api/client'

describe('Logbook API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage mocks
    ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReset()
    ;(localStorage.setItem as ReturnType<typeof vi.fn>).mockReset()
    ;(localStorage.removeItem as ReturnType<typeof vi.fn>).mockReset()
    ;(localStorage.clear as ReturnType<typeof vi.fn>).mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getEntries', () => {
    it('should fetch entries via sync pull API', async () => {
      const mockEntries: LogbookEntry[] = [
        {
          id: 'entry1',
          timestamp: '2025-06-26T10:00:00Z',
          duration: 30,
          type: 'PRACTICE',
          instrument: 'PIANO',
          pieces: [{ title: 'Moonlight Sonata', composer: 'Beethoven' }],
          techniques: ['scales'],
          goalIds: ['goal1'],
          mood: null,
          tags: ['morning'],
          createdAt: '2025-06-26T10:00:00Z',
          updatedAt: '2025-06-26T10:00:00Z',
        },
      ]

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          entries: mockEntries,
          goals: [],
          lastSync: '2025-06-26T10:00:00Z',
        },
      })

      const result = await logbookApi.getEntries()

      expect(apiClient.post).toHaveBeenCalledWith('/api/sync/pull', {
        types: ['logbook_entry'],
        since: null,
      })
      expect(result).toEqual([
        {
          ...mockEntries[0],
          type: 'practice',
          instrument: 'piano',
          mood: null,
        },
      ])
    })

    it('should return empty array if no entries in response', async () => {
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          goals: [],
          lastSync: '2025-06-26T10:00:00Z',
        },
      })

      const result = await logbookApi.getEntries()

      expect(result).toEqual([])
    })

    it('should handle API errors', async () => {
      const error = new Error('Network error')
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(error)

      await expect(logbookApi.getEntries()).rejects.toThrow('Network error')
    })
  })

  describe('createEntry', () => {
    const mockEntryData: Omit<LogbookEntry, 'id' | 'createdAt' | 'updatedAt'> =
      {
        timestamp: '2025-06-26T10:00:00.000Z',
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [{ title: 'Moonlight Sonata', composer: 'Beethoven' }],
        techniques: ['scales'],
        goalIds: ['goal1'],
        mood: null,
        tags: ['morning'],
      }

    it('should create a new entry with generated ID and timestamps', async () => {
      const mockDate = new Date('2025-06-26T12:00:00Z')
      vi.setSystemTime(mockDate)
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { success: true },
      })

      const result = await logbookApi.createEntry(mockEntryData)

      expect(apiClient.post).toHaveBeenCalledWith('/api/sync/push', {
        changes: {
          entries: [
            expect.objectContaining({
              ...mockEntryData,
              id: expect.stringMatching(/^entry_\d+_[a-z0-9]+$/),
              createdAt: '2025-06-26T12:00:00.000Z',
              updatedAt: '2025-06-26T12:00:00.000Z',
            }),
          ],
        },
      })

      expect(result).toMatchObject({
        ...mockEntryData,
        id: expect.any(String),
        createdAt: '2025-06-26T12:00:00.000Z',
        updatedAt: '2025-06-26T12:00:00.000Z',
      })

      vi.useRealTimers()
    })

    it('should preserve provided identifiers and timestamps when supplied', async () => {
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { success: true },
      })

      const legacyEntry = {
        id: 'entry_legacy',
        timestamp: '2025-09-16T18:03:00 -05:00',
        duration: 45,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [],
        techniques: [],
        goalIds: [],
        tags: [],
      } as Parameters<typeof logbookApi.createEntry>[0]

      await logbookApi.createEntry(legacyEntry)

      const postedEntry = (apiClient.post as ReturnType<typeof vi.fn>).mock
        .calls[0][1].changes.entries[0] as LogbookEntry

      expect(postedEntry.id).toBe('entry_legacy')
      expect(postedEntry.timestamp).toBe('2025-09-16T23:03:00.000Z')
      expect(postedEntry.duration).toBe(45)
      expect(postedEntry.type).toBe('PRACTICE')
      expect(postedEntry.instrument).toBe('PIANO')

      vi.useRealTimers()
    })

    it('should throw error if sync push fails', async () => {
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { success: false },
      })

      await expect(logbookApi.createEntry(mockEntryData)).rejects.toThrow(
        'Failed to create entry'
      )
    })

    it('should handle network errors', async () => {
      const error = new Error('Network error')
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(error)

      await expect(logbookApi.createEntry(mockEntryData)).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('updateEntry', () => {
    const existingEntry: LogbookEntry = {
      id: 'entry1',
      timestamp: '2025-06-26T10:00:00Z',
      duration: 30,
      type: 'PRACTICE',
      instrument: 'PIANO',
      pieces: [{ title: 'Moonlight Sonata', composer: 'Beethoven' }],
      techniques: ['scales'],
      goalIds: ['goal1'],
      mood: 'SATISFIED',
      tags: ['morning'],
      metadata: { source: 'manual' },
      createdAt: '2025-06-26T10:00:00Z',
      updatedAt: '2025-06-26T10:00:00Z',
    }

    beforeEach(() => {
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify([existingEntry])
      )
    })

    it('should update an existing entry', async () => {
      const mockDate = new Date('2025-06-26T14:00:00Z')
      vi.setSystemTime(mockDate)

      const updates = { duration: 45 }

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { success: true },
      })

      const result = await logbookApi.updateEntry('entry1', updates)

      expect(apiClient.post).toHaveBeenCalledWith('/api/sync/push', {
        changes: {
          entries: [
            {
              ...existingEntry,
              ...updates,
              updatedAt: '2025-06-26T14:00:00.000Z',
              notes: existingEntry.notes || null,
              mood: updates.mood || existingEntry.mood || null,
              pieces: existingEntry.pieces.map(p => ({
                ...p,
                composer: p.composer || null,
                measures: p.measures || null,
                tempo: p.tempo || null,
              })),
              techniques: existingEntry.techniques || [],
              goalIds: existingEntry.goalIds || [],
              tags: existingEntry.tags || [],
              metadata: existingEntry.metadata || { source: 'manual' },
            },
          ],
        },
      })

      expect(result).toEqual({
        ...existingEntry,
        ...updates,
        updatedAt: '2025-06-26T14:00:00.000Z',
        notes: existingEntry.notes || null,
        mood: updates.mood || existingEntry.mood || null,
        pieces: existingEntry.pieces.map(p => ({
          ...p,
          composer: p.composer || null,
          measures: p.measures || null,
          tempo: p.tempo || null,
        })),
        techniques: existingEntry.techniques || [],
        goalIds: existingEntry.goalIds || [],
        tags: existingEntry.tags || [],
        metadata: existingEntry.metadata || { source: 'manual' },
      })

      vi.useRealTimers()
    })

    it('should throw error if no entries in localStorage', async () => {
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null)

      await expect(
        logbookApi.updateEntry('entry1', { duration: 45 })
      ).rejects.toThrow('No entries found')
    })

    it('should throw error if entry not found', async () => {
      await expect(
        logbookApi.updateEntry('nonexistent', { duration: 45 })
      ).rejects.toThrow('Entry not found')
    })

    it('should throw error if sync push fails', async () => {
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { success: false },
      })

      await expect(
        logbookApi.updateEntry('entry1', { duration: 45 })
      ).rejects.toThrow('Failed to update entry')
    })
  })

  describe('deleteEntry', () => {
    it('should mark entry as deleted via sync push', async () => {
      const mockDate = new Date('2025-06-26T15:00:00Z')
      vi.setSystemTime(mockDate)
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { success: true },
      })

      await logbookApi.deleteEntry('entry1')

      expect(apiClient.post).toHaveBeenCalledWith('/api/sync/push', {
        changes: {
          entries: [
            {
              id: 'entry1',
              deletedAt: '2025-06-26T15:00:00.000Z',
            },
          ],
        },
      })

      vi.useRealTimers()
    })
  })

  describe('Goals API', () => {
    describe('getGoals', () => {
      const mockGoals: Goal[] = [
        {
          id: 'goal1',
          title: 'Master Moonlight Sonata',
          description: 'Learn all three movements',
          targetDate: '2025-12-31T00:00:00Z',
          progress: 30,
          milestones: [
            {
              id: 'm1',
              title: 'First movement',
              completed: true,
              completedAt: '2025-06-01T00:00:00Z',
            },
          ],
          status: 'ACTIVE',
          linkedEntries: ['entry1', 'entry2'],
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-06-01T00:00:00Z',
        },
      ]

      it('should fetch all goals', async () => {
        ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { goals: mockGoals },
        })

        const result = await logbookApi.getGoals()

        expect(apiClient.get).toHaveBeenCalledWith('/api/goals', {
          params: undefined,
        })
        expect(result).toEqual([
          {
            ...mockGoals[0],
            status: 'active',
          },
        ])
      })

      it('should fetch goals by status', async () => {
        ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { goals: mockGoals },
        })

        const result = await logbookApi.getGoals('active')

        expect(apiClient.get).toHaveBeenCalledWith('/api/goals', {
          params: { status: 'active' },
        })
        expect(result).toEqual([
          {
            ...mockGoals[0],
            status: 'active',
          },
        ])
      })

      it('should handle API errors', async () => {
        const error = new Error('Network error')
        ;(apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(error)

        await expect(logbookApi.getGoals()).rejects.toThrow('Network error')
      })
    })

    describe('createGoal', () => {
      const mockGoalData: Omit<
        Goal,
        'id' | 'createdAt' | 'updatedAt' | 'progress' | 'linkedEntries'
      > = {
        title: 'Learn Jazz Piano',
        description: 'Master jazz standards',
        targetDate: '2025-12-31T00:00:00Z',
        milestones: [{ id: 'm1', title: 'Learn scales', completed: false }],
        status: 'ACTIVE',
      }

      it('should create a new goal', async () => {
        const mockGoal: Goal = {
          ...mockGoalData,
          id: 'goal2',
          progress: 0,
          linkedEntries: [],
          createdAt: '2025-06-26T16:00:00Z',
          updatedAt: '2025-06-26T16:00:00Z',
        }

        ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: mockGoal,
        })

        const result = await logbookApi.createGoal(mockGoalData)

        expect(apiClient.post).toHaveBeenCalledWith('/api/goals', mockGoalData)
        expect(result).toEqual(mockGoal)
      })
    })

    describe('updateGoal', () => {
      it('should update an existing goal', async () => {
        const updates = { progress: 50, status: 'COMPLETED' as const }
        const mockUpdatedGoal: Goal = {
          id: 'goal1',
          title: 'Master Moonlight Sonata',
          progress: 50,
          status: 'COMPLETED',
          milestones: [],
          linkedEntries: [],
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-06-26T17:00:00Z',
        }

        ;(apiClient.put as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: mockUpdatedGoal,
        })

        const result = await logbookApi.updateGoal('goal1', updates)

        expect(apiClient.put).toHaveBeenCalledWith('/api/goals/goal1', updates)
        expect(result).toEqual(mockUpdatedGoal)
      })
    })

    describe('deleteGoal', () => {
      it('should delete a goal', async () => {
        ;(apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: {},
        })

        await logbookApi.deleteGoal('goal1')

        expect(apiClient.delete).toHaveBeenCalledWith('/api/goals/goal1')
      })
    })

    describe('linkEntryToGoal', () => {
      it('should link an entry to a goal', async () => {
        const mockUpdatedGoal: Goal = {
          id: 'goal1',
          title: 'Master Moonlight Sonata',
          progress: 30,
          status: 'ACTIVE',
          milestones: [],
          linkedEntries: ['entry1', 'entry2', 'entry3'],
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-06-26T18:00:00Z',
        }

        ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: mockUpdatedGoal,
        })

        const result = await logbookApi.linkEntryToGoal('entry3', 'goal1')

        expect(apiClient.post).toHaveBeenCalledWith('/api/goals/goal1/link', {
          entryId: 'entry3',
        })
        expect(result).toEqual(mockUpdatedGoal)
      })
    })
  })
})
