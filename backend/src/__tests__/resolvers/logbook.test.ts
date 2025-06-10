import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { logbookResolvers } from '../../resolvers/logbook'
import type { Context } from '../../types/context'

// Mock database
const mockDb = {
  prepare: jest.fn().mockReturnThis(),
  bind: jest.fn().mockReturnThis(),
  first: jest.fn(),
  all: jest.fn(),
  run: jest.fn(),
}

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  primaryInstrument: 'PIANO' as const,
}

const mockContext = {
  env: { DB: mockDb as any },
  user: mockUser,
  requestId: 'test-request',
}

describe('Logbook Resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Query.logbookEntry', () => {
    it('should return a logbook entry for authenticated user', async () => {
      const mockEntry = {
        id: 'entry-123',
        user_id: 'user-123',
        timestamp: Date.now(),
        duration: 1800,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: '[]',
        techniques: '["scales"]',
        goal_ids: '[]',
        notes: 'Good practice session',
        mood: 'SATISFIED',
        tags: '["classical"]',
        session_id: null,
        metadata: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      }

      mockDb.first.mockResolvedValue(mockEntry)

      const result = await logbookResolvers.Query.logbookEntry(
        {},
        { id: 'entry-123' },
        mockContext as any,
        {} as any
      )

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      )
      expect(mockDb.bind).toHaveBeenCalledWith('entry-123', 'user-123')
      expect(result).toMatchObject({
        id: 'entry-123',
        user: mockUser,
        type: 'PRACTICE',
        instrument: 'PIANO',
        duration: 1800,
        techniques: ['scales'],
        tags: ['classical'],
        notes: 'Good practice session',
        mood: 'SATISFIED',
      })
    })

    it('should throw error if entry not found', async () => {
      mockDb.first.mockResolvedValue(null)

      await expect(
        logbookResolvers.Query!.logbookEntry!(
          {},
          { id: 'nonexistent' },
          mockContext,
          {} as any
        )
      ).rejects.toThrow('Logbook entry not found')
    })

    it('should throw error if user not authenticated', async () => {
      const unauthenticatedContext = { ...mockContext, user: null }

      await expect(
        logbookResolvers.Query!.logbookEntry!(
          {},
          { id: 'entry-123' },
          unauthenticatedContext,
          {} as any
        )
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('Query.myLogbookEntries', () => {
    it('should return paginated logbook entries with filters', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          user_id: 'user-123',
          timestamp: Date.now(),
          duration: 1800,
          type: 'PRACTICE',
          instrument: 'PIANO',
          pieces: '[]',
          techniques: '[]',
          goal_ids: '[]',
          notes: null,
          mood: null,
          tags: '[]',
          session_id: null,
          metadata: null,
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ]

      mockDb.first.mockResolvedValue({ count: 1 })
      mockDb.all.mockResolvedValue(mockEntries)

      const result = await logbookResolvers.Query!.myLogbookEntries!(
        {},
        {
          filter: { instruments: ['PIANO'] },
          offset: 0,
          limit: 20,
        },
        mockContext,
        {} as any
      )

      expect(result.totalCount).toBe(1)
      expect(result.edges).toHaveLength(1)
      expect(result.edges[0].node.id).toBe('entry-1')
      expect(result.pageInfo.hasNextPage).toBe(false)
    })

    it('should apply date range filters correctly', async () => {
      const startDate = new Date('2024-01-01').toISOString()
      const endDate = new Date('2024-01-31').toISOString()

      mockDb.first.mockResolvedValue({ count: 0 })
      mockDb.all.mockResolvedValue([])

      await logbookResolvers.Query!.myLogbookEntries!(
        {},
        {
          filter: { startDate, endDate },
          offset: 0,
          limit: 20,
        },
        mockContext,
        {} as any
      )

      expect(mockDb.bind).toHaveBeenCalledWith(
        'user-123',
        new Date(startDate).getTime(),
        new Date(endDate).getTime(),
        20,
        0
      )
    })
  })

  describe('Mutation.createLogbookEntry', () => {
    it('should create a new logbook entry', async () => {
      const input = {
        timestamp: new Date().toISOString(),
        duration: 1800,
        type: 'PRACTICE' as const,
        instrument: 'PIANO' as const,
        pieces: [],
        techniques: ['scales'],
        goalIds: [],
        notes: 'Good practice',
        mood: 'SATISFIED' as const,
        tags: ['classical'],
        sessionId: null,
        metadata: null,
      }

      mockDb.run.mockResolvedValue({ changes: 1 })

      const result = await logbookResolvers.Mutation!.createLogbookEntry!(
        {},
        { input },
        mockContext,
        {} as any
      )

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT')
      )
      expect(result).toMatchObject({
        user: mockUser,
        timestamp: input.timestamp,
        duration: input.duration,
        type: input.type,
        instrument: input.instrument,
        techniques: input.techniques,
        notes: input.notes,
        mood: input.mood,
        tags: input.tags,
      })
      expect(result.id).toBeDefined()
    })

    it('should throw error if user not authenticated', async () => {
      const unauthenticatedContext = { ...mockContext, user: null }

      await expect(
        logbookResolvers.Mutation!.createLogbookEntry!(
          {},
          { input: {} as any },
          unauthenticatedContext,
          {} as any
        )
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('Mutation.updateLogbookEntry', () => {
    it('should update an existing logbook entry', async () => {
      const updatedEntry = {
        id: 'entry-123',
        user_id: 'user-123',
        timestamp: Date.now(),
        duration: 2400, // Updated duration
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: '[]',
        techniques: '["scales", "arpeggios"]', // Updated techniques
        goal_ids: '[]',
        notes: 'Updated notes',
        mood: 'EXCITED',
        tags: '["classical", "technique"]',
        session_id: null,
        metadata: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      }

      mockDb.first
        .mockResolvedValueOnce({ id: 'entry-123' }) // Check if exists
        .mockResolvedValueOnce(updatedEntry) // Return updated entry

      mockDb.run.mockResolvedValue({ changes: 1 })

      const input = {
        id: 'entry-123',
        duration: 2400,
        techniques: ['scales', 'arpeggios'],
        notes: 'Updated notes',
        mood: 'EXCITED' as const,
        tags: ['classical', 'technique'],
      }

      const result = await logbookResolvers.Mutation!.updateLogbookEntry!(
        {},
        { input },
        mockContext,
        {} as any
      )

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE')
      )
      expect(result.duration).toBe(2400)
      expect(result.techniques).toEqual(['scales', 'arpeggios'])
      expect(result.notes).toBe('Updated notes')
      expect(result.mood).toBe('EXCITED')
    })

    it('should throw error if entry not found', async () => {
      mockDb.first.mockResolvedValue(null)

      await expect(
        logbookResolvers.Mutation!.updateLogbookEntry!(
          {},
          { input: { id: 'nonexistent' } as any },
          mockContext,
          {} as any
        )
      ).rejects.toThrow('Logbook entry not found')
    })
  })

  describe('Mutation.deleteLogbookEntry', () => {
    it('should delete a logbook entry', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      const result = await logbookResolvers.Mutation!.deleteLogbookEntry!(
        {},
        { id: 'entry-123' },
        mockContext,
        {} as any
      )

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE')
      )
      expect(mockDb.bind).toHaveBeenCalledWith('entry-123', 'user-123')
      expect(result).toBe(true)
    })

    it('should return false if entry not found', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 })

      const result = await logbookResolvers.Mutation!.deleteLogbookEntry!(
        {},
        { id: 'nonexistent' },
        mockContext,
        {} as any
      )

      expect(result).toBe(false)
    })
  })

  describe('Goal Mutations', () => {
    describe('createGoal', () => {
      it('should create a new goal', async () => {
        const input = {
          title: 'Master Chopin Etudes',
          description: 'Learn all Op. 10 etudes',
          targetDate: new Date().toISOString(),
          milestones: [
            { id: 'ms-1', title: 'Learn Etude No. 1', completed: false },
          ],
        }

        mockDb.run.mockResolvedValue({ changes: 1 })

        const result = await logbookResolvers.Mutation!.createGoal!(
          {},
          { input },
          mockContext,
          {} as any
        )

        expect(mockDb.prepare).toHaveBeenCalledWith(
          expect.stringContaining('INSERT')
        )
        expect(result).toMatchObject({
          user: mockUser,
          title: input.title,
          description: input.description,
          targetDate: input.targetDate,
          progress: 0,
          status: 'ACTIVE',
          milestones: input.milestones,
        })
        expect(result.id).toBeDefined()
      })
    })

    describe('updateGoal', () => {
      it('should update goal and auto-complete when progress reaches 100', async () => {
        const updatedGoal = {
          id: 'goal-123',
          user_id: 'user-123',
          title: 'Master Chopin Etudes',
          description: 'Learn all Op. 10 etudes',
          target_date: Date.now(),
          progress: 100,
          milestones: '[]',
          status: 'COMPLETED',
          linked_entry_ids: '[]',
          created_at: Date.now(),
          updated_at: Date.now(),
          completed_at: Date.now(),
        }

        mockDb.first
          .mockResolvedValueOnce({
            id: 'goal-123',
            status: 'ACTIVE',
            progress: 50,
          })
          .mockResolvedValueOnce(updatedGoal)

        mockDb.run.mockResolvedValue({ changes: 1 })

        const input = {
          id: 'goal-123',
          progress: 100,
        }

        const result = await logbookResolvers.Mutation!.updateGoal!(
          {},
          { input },
          mockContext,
          {} as any
        )

        expect(result.progress).toBe(100)
        expect(result.status).toBe('COMPLETED')
        expect(result.completedAt).toBeDefined()
      })
    })

    describe('linkLogbookEntryToGoal', () => {
      it('should link entry to goal', async () => {
        const mockGoal = {
          id: 'goal-123',
          user_id: 'user-123',
          title: 'Test Goal',
          description: 'Test Description',
          target_date: Date.now(),
          progress: 0,
          milestones: '[]',
          status: 'ACTIVE',
          linked_entry_ids: '[]',
          created_at: Date.now(),
          updated_at: Date.now(),
          completed_at: null,
        }

        mockDb.first
          .mockResolvedValueOnce({ id: 'entry-123' }) // Entry exists
          .mockResolvedValueOnce({ id: 'goal-123', linked_entry_ids: '[]' }) // Goal exists
          .mockResolvedValueOnce(mockGoal) // Updated goal

        mockDb.run.mockResolvedValue({ changes: 1 })

        const result = await logbookResolvers.Mutation!.linkLogbookEntryToGoal!(
          {},
          { entryId: 'entry-123', goalId: 'goal-123' },
          mockContext,
          {} as any
        )

        expect(mockDb.prepare).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE')
        )
        expect(result.id).toBe('goal-123')
      })

      it('should throw error if entry or goal not found', async () => {
        mockDb.first
          .mockResolvedValueOnce(null) // Entry not found
          .mockResolvedValueOnce({ id: 'goal-123' }) // Goal exists

        await expect(
          logbookResolvers.Mutation!.linkLogbookEntryToGoal!(
            {},
            { entryId: 'nonexistent', goalId: 'goal-123' },
            mockContext,
            {} as any
          )
        ).rejects.toThrow('Entry or goal not found')
      })
    })
  })

  describe('Field Resolvers', () => {
    describe('LogbookEntry.goals', () => {
      it('should resolve linked goals', async () => {
        const parent = {
          goalIds: ['goal-1', 'goal-2'],
          user: mockUser,
        }

        const mockGoals = [
          {
            id: 'goal-1',
            user_id: 'user-123',
            title: 'Goal 1',
            description: 'Description 1',
            target_date: Date.now(),
            progress: 50,
            milestones: '[]',
            status: 'ACTIVE',
            linked_entry_ids: '[]',
            created_at: Date.now(),
            updated_at: Date.now(),
            completed_at: null,
          },
        ]

        mockDb.all.mockResolvedValue(mockGoals)

        const result = await logbookResolvers.LogbookEntry!.goals!(
          parent as any,
          {},
          mockContext,
          {} as any
        )

        expect(mockDb.prepare).toHaveBeenCalledWith(
          expect.stringContaining('WHERE id IN')
        )
        expect(mockDb.bind).toHaveBeenCalledWith('goal-1', 'goal-2')
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe('goal-1')
      })

      it('should return empty array if no goal IDs', async () => {
        const parent = {
          goalIds: [],
          user: mockUser,
        }

        const result = await logbookResolvers.LogbookEntry!.goals!(
          parent as any,
          {},
          mockContext,
          {} as any
        )

        expect(result).toEqual([])
        expect(mockDb.prepare).not.toHaveBeenCalled()
      })
    })

    describe('LogbookEntry.session', () => {
      it('should resolve linked practice session', async () => {
        const parent = {
          sessionId: 'session-123',
          user: mockUser,
        }

        const mockSession = {
          id: 'session-123',
          user_id: 'user-123',
          instrument: 'PIANO',
          session_type: 'FREE_PRACTICE',
          started_at: Date.now(),
          completed_at: Date.now(),
          paused_duration: 0,
          accuracy: 0.95,
          notes_attempted: 100,
          notes_correct: 95,
        }

        mockDb.first.mockResolvedValue(mockSession)

        const result = await logbookResolvers.LogbookEntry!.session!(
          parent as any,
          {},
          mockContext,
          {} as any
        )

        expect(result).toMatchObject({
          id: 'session-123',
          user: mockUser,
          instrument: 'PIANO',
          sessionType: 'FREE_PRACTICE',
          accuracy: 0.95,
          notesAttempted: 100,
          notesCorrect: 95,
        })
      })

      it('should return null if no session ID', async () => {
        const parent = {
          sessionId: null,
          user: mockUser,
        }

        const result = await logbookResolvers.LogbookEntry!.session!(
          parent as any,
          {},
          mockContext,
          {} as any
        )

        expect(result).toBe(null)
        expect(mockDb.prepare).not.toHaveBeenCalled()
      })
    })
  })
})
