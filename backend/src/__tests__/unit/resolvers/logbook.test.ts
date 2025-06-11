import { logbookResolvers } from '../../../resolvers/logbook'
import type { GraphQLContext } from '../../../types/context'
import type { User } from '../../../types/shared'

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id-123',
}))

describe('Logbook Resolvers', () => {
  let mockContext: GraphQLContext
  let mockUser: User

  beforeEach(() => {
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      primaryInstrument: 'PIANO',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    const mockDB = {
      prepare: jest.fn().mockReturnThis(),
      bind: jest.fn().mockReturnThis(),
      first: jest.fn(),
      all: jest.fn(),
      run: jest.fn(),
    }

    mockContext = {
      env: {
        DB: mockDB as any,
        MIRUBATO_MAGIC_LINKS: {} as any,
        JWT_SECRET: 'test-secret',
        ENVIRONMENT: 'development',
      },
      user: mockUser,
      requestId: 'test-request-123',
    }
  })

  describe('Query', () => {
    describe('logbookEntry', () => {
      it('should throw error if not authenticated', async () => {
        mockContext.user = undefined

        await expect(
          logbookResolvers.Query!.logbookEntry!(
            {},
            { id: 'entry-123' },
            mockContext,
            {} as any
          )
        ).rejects.toThrow('Not authenticated')
      })

      it('should return null if entry not found', async () => {
        mockContext.env.DB.first.mockResolvedValue(null)

        const result = await logbookResolvers.Query!.logbookEntry!(
          {},
          { id: 'entry-123' },
          mockContext,
          {} as any
        )

        expect(result).toBeNull()
      })

      it('should return entry if found', async () => {
        const mockEntry = {
          id: 'entry-123',
          user_id: 'user-123',
          timestamp: 1704067200000,
          duration: 3600,
          type: 'PRACTICE',
          instrument: 'PIANO',
          pieces: '[]',
          techniques: '[]',
          goal_ids: '[]',
          tags: '[]',
          notes: 'Test notes',
          mood: 'SATISFIED',
          metadata: null,
          created_at: 1704067200000,
          updated_at: 1704067200000,
        }

        mockContext.env.DB.first.mockResolvedValue(mockEntry)

        const result = await logbookResolvers.Query!.logbookEntry!(
          {},
          { id: 'entry-123' },
          mockContext,
          {} as any
        )

        expect(result).toEqual({
          ...mockEntry,
          pieces: [],
          techniques: [],
          goalIds: [],
          tags: [],
          metadata: null,
          timestamp: '2024-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          user: mockUser,
        })
      })
    })

    describe('myLogbookEntries', () => {
      it('should throw error if not authenticated', async () => {
        mockContext.user = undefined

        await expect(
          logbookResolvers.Query!.myLogbookEntries!(
            {},
            {},
            mockContext,
            {} as any
          )
        ).rejects.toThrow('Not authenticated')
      })

      it('should return paginated entries', async () => {
        mockContext.env.DB.first.mockResolvedValue({ count: 2 })
        mockContext.env.DB.all.mockResolvedValue({
          results: [
            {
              id: 'entry-1',
              user_id: 'user-123',
              timestamp: 1704067200000,
              duration: 3600,
              type: 'PRACTICE',
              instrument: 'PIANO',
              pieces: '[]',
              techniques: '[]',
              goal_ids: '[]',
              tags: '[]',
              notes: 'Test 1',
              mood: 'SATISFIED',
              metadata: null,
              created_at: 1704067200000,
              updated_at: 1704067200000,
            },
            {
              id: 'entry-2',
              user_id: 'user-123',
              timestamp: 1704067200000,
              duration: 1800,
              type: 'LESSON',
              instrument: 'GUITAR',
              pieces: '[]',
              techniques: '[]',
              goal_ids: '[]',
              tags: '[]',
              notes: 'Test 2',
              mood: 'EXCITED',
              metadata: null,
              created_at: 1704067200000,
              updated_at: 1704067200000,
            },
          ],
        })

        const result = await logbookResolvers.Query!.myLogbookEntries!(
          {},
          { offset: 0, limit: 10 },
          mockContext,
          {} as any
        )

        expect(result.totalCount).toBe(2)
        expect(result.edges).toHaveLength(2)
        expect(result.pageInfo.hasNextPage).toBe(false)
        expect(result.pageInfo.hasPreviousPage).toBe(false)
      })
    })
  })

  describe('Mutation', () => {
    describe('createLogbookEntry', () => {
      it('should throw error if not authenticated', async () => {
        mockContext.user = undefined

        await expect(
          logbookResolvers.Mutation!.createLogbookEntry!(
            {},
            {
              input: {
                timestamp: '2024-01-01T00:00:00Z',
                duration: 3600,
                type: 'PRACTICE',
                instrument: 'PIANO',
                pieces: [],
              },
            },
            mockContext,
            {} as any
          )
        ).rejects.toThrow('Not authenticated')
      })

      it('should create new entry', async () => {
        mockContext.env.DB.run.mockResolvedValue({ meta: { changes: 1 } })

        const result = await logbookResolvers.Mutation!.createLogbookEntry!(
          {},
          {
            input: {
              timestamp: '2024-01-01T00:00:00Z',
              duration: 3600,
              type: 'PRACTICE',
              instrument: 'PIANO',
              pieces: [{ id: 'piece-123', title: 'Moonlight Sonata' }],
              techniques: ['scales', 'arpeggios'],
              mood: 'SATISFIED',
              tags: ['beethoven'],
              notes: 'Great practice session',
            },
          },
          mockContext,
          {} as any
        )

        expect(result).toMatchObject({
          id: 'test-id-123',
          userId: 'user-123',
          duration: 3600,
          type: 'PRACTICE',
          instrument: 'PIANO',
          mood: 'SATISFIED',
          notes: 'Great practice session',
        })
        expect(mockContext.env.DB.run).toHaveBeenCalled()
      })
    })

    describe('deleteLogbookEntry', () => {
      it('should throw error if not authenticated', async () => {
        mockContext.user = undefined

        await expect(
          logbookResolvers.Mutation!.deleteLogbookEntry!(
            {},
            { id: 'entry-123' },
            mockContext,
            {} as any
          )
        ).rejects.toThrow('Not authenticated')
      })

      it('should delete entry if exists', async () => {
        mockContext.env.DB.run.mockResolvedValue({ meta: { changes: 1 } })

        const result = await logbookResolvers.Mutation!.deleteLogbookEntry!(
          {},
          { id: 'entry-123' },
          mockContext,
          {} as any
        )

        expect(result).toBe(true)
      })

      it('should throw error if entry not found', async () => {
        mockContext.env.DB.run.mockResolvedValue({ meta: { changes: 0 } })

        await expect(
          logbookResolvers.Mutation!.deleteLogbookEntry!(
            {},
            { id: 'entry-123' },
            mockContext,
            {} as any
          )
        ).rejects.toThrow('Logbook entry not found')
      })
    })
  })

  describe('LogbookEntry', () => {
    describe('user', () => {
      it('should return user from context if userId matches', async () => {
        const parent = { userId: 'user-123' }

        const result = await logbookResolvers.LogbookEntry!.user!(
          parent as any,
          {},
          mockContext,
          {} as any
        )

        expect(result).toBe(mockUser)
      })

      it('should throw error if user not found', async () => {
        const parent = { userId: 'different-user' }

        await expect(
          logbookResolvers.LogbookEntry!.user!(
            parent as any,
            {},
            mockContext,
            {} as any
          )
        ).rejects.toThrow('User not found')
      })
    })
  })

  describe('Goal', () => {
    describe('user', () => {
      it('should return user from context if userId matches', async () => {
        const parent = { userId: 'user-123' }

        const result = await logbookResolvers.Goal!.user!(
          parent as any,
          {},
          mockContext,
          {} as any
        )

        expect(result).toBe(mockUser)
      })

      it('should throw error if user not found', async () => {
        const parent = { userId: 'different-user' }

        await expect(
          logbookResolvers.Goal!.user!(
            parent as any,
            {},
            mockContext,
            {} as any
          )
        ).rejects.toThrow('User not found')
      })
    })
  })
})
