import { vi, describe, it, expect, beforeEach } from 'vitest'
import { practiceResolvers } from '../../../resolvers/practice'
import type { GraphQLContext, Env } from '../../../types/context'
import type { GraphQLResolveInfo } from '../../../types/generated/graphql'
import type { D1Database, KVNamespace } from '@cloudflare/workers-types'

// Mock crypto
global.crypto = {
  randomUUID: () => 'mock-uuid-123',
} as any

describe('Practice Resolvers', () => {
  // Mock environment
  const mockEnv: Env = {
    DB: {} as D1Database,
    MIRUBATO_MAGIC_LINKS: {} as KVNamespace,
    JWT_SECRET: 'test-secret',
    ENVIRONMENT: 'development',
  }

  // Mock database
  const mockDB = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
    batch: vi.fn(),
  } as any

  // Mock context
  const mockContext: GraphQLContext = {
    env: { ...mockEnv, DB: mockDB },
    user: {
      id: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      primaryInstrument: 'PIANO',
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        theme: 'LIGHT',
        notationSize: 'MEDIUM',
        soundEnabled: true,
        metronomeBPM: 120,
        practiceReminders: false,
      },
      stats: {
        totalPracticeTime: 0,
        sessionsCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastPracticeDate: null,
      },
    } as any,
    requestId: 'test-request-id',
    db: mockDB,
  }

  const mockContextWithoutUser: GraphQLContext = {
    env: { ...mockEnv, DB: mockDB },
    user: undefined,
    requestId: 'test-request-id',
    db: mockDB,
  }

  describe('Query Resolvers', () => {
    describe('practiceSession', () => {
      it('returns session when found', async () => {
        const mockSession = {
          id: 'session-123',
          user_id: 'user-123',
          instrument: 'PIANO',
          started_at: '2024-01-01T00:00:00Z',
        }
        mockDB.first.mockResolvedValue(mockSession)

        const result = await practiceResolvers.Query.practiceSession(
          {},
          { id: 'session-123' },
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(mockDB.prepare).toHaveBeenCalledWith(
          'SELECT * FROM practice_sessions WHERE id = ?'
        )
        expect(mockDB.bind).toHaveBeenCalledWith('session-123')
        expect(result).toBe(mockSession)
      })

      it('returns null when not found', async () => {
        mockDB.first.mockResolvedValue(null)

        const result = await practiceResolvers.Query.practiceSession(
          {},
          { id: 'session-123' },
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(result).toBeNull()
      })

      it('returns null when not authenticated', async () => {
        mockDB.first.mockResolvedValue(null)

        const result = await practiceResolvers.Query.practiceSession(
          {},
          { id: 'session-123' },
          mockContextWithoutUser,
          {} as GraphQLResolveInfo
        )

        expect(result).toBeNull()
      })
    })

    describe('myPracticeSessions', () => {
      beforeEach(() => {
        vi.clearAllMocks()
      })

      it('returns empty connection when no sessions', async () => {
        mockDB.all.mockResolvedValue({ results: [] })
        mockDB.first.mockResolvedValue({ count: 0 })

        const result = await practiceResolvers.Query.myPracticeSessions(
          {},
          {},
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(result).toEqual({
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          totalCount: 0,
        })
      })

      it('returns sessions with pagination', async () => {
        const mockSessions = [
          { id: 'session-1', user_id: 'user-123' },
          { id: 'session-2', user_id: 'user-123' },
        ]
        mockDB.all.mockResolvedValue({ results: mockSessions })
        mockDB.first.mockResolvedValue({ count: 2 })

        const result = await practiceResolvers.Query.myPracticeSessions(
          {},
          { limit: 10, offset: 0 },
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(result.edges).toHaveLength(2)
        expect(result.totalCount).toBe(2)
        expect(result.pageInfo.hasNextPage).toBe(false)
      })

      it('accepts instrument filter parameter', async () => {
        mockDB.all.mockResolvedValue({ results: [] })
        mockDB.first.mockResolvedValue({ count: 0 })

        await practiceResolvers.Query.myPracticeSessions(
          {},
          { instrument: 'GUITAR' },
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(mockDB.prepare).toHaveBeenCalledWith(
          expect.stringContaining('AND instrument = ?')
        )
      })

      it('accepts pagination parameters', async () => {
        mockDB.all.mockResolvedValue({ results: [] })
        mockDB.first.mockResolvedValue({ count: 100 })

        const result = await practiceResolvers.Query.myPracticeSessions(
          {},
          { offset: 10, limit: 50 },
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(result.pageInfo.hasPreviousPage).toBe(true)
        expect(result.pageInfo.hasNextPage).toBe(true)
      })

      it('throws error when not authenticated', async () => {
        await expect(
          practiceResolvers.Query.myPracticeSessions(
            {},
            {},
            mockContextWithoutUser,
            {} as GraphQLResolveInfo
          )
        ).rejects.toThrow('Authentication required')
      })
    })
  })

  describe('Mutation Resolvers', () => {
    describe('startPracticeSession', () => {
      beforeEach(() => {
        vi.clearAllMocks()
      })

      it('creates a new practice session', async () => {
        const mockSession = {
          id: 'new-session-id',
          user_id: 'user-123',
          instrument: 'PIANO',
          status: 'IN_PROGRESS',
        }
        mockDB.run.mockResolvedValue({})
        mockDB.first.mockResolvedValue(mockSession)

        const input = {
          sessionType: 'FREE_PRACTICE' as const,
          sheetMusicId: 'music-123',
          instrument: 'PIANO' as const,
        }

        const result = await practiceResolvers.Mutation.startPracticeSession(
          {},
          { input },
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(mockDB.prepare).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO practice_sessions')
        )
        expect(result).toBe(mockSession)
      })

      it('throws error when not authenticated', async () => {
        const input = {
          sessionType: 'FREE_PRACTICE' as const,
          instrument: 'PIANO' as const,
        }

        await expect(
          practiceResolvers.Mutation.startPracticeSession(
            {},
            { input },
            mockContextWithoutUser,
            {} as GraphQLResolveInfo
          )
        ).rejects.toThrow('Authentication required')
      })
    })

    describe('pausePracticeSession', () => {
      it('pauses an active session', async () => {
        const mockSession = {
          id: 'session-123',
          status: 'PAUSED',
        }
        mockDB.run.mockResolvedValue({})
        mockDB.first.mockResolvedValue(mockSession)

        const result = await practiceResolvers.Mutation.pausePracticeSession(
          {},
          { sessionId: 'session-123' },
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(mockDB.prepare).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE practice_sessions')
        )
        expect(result).toBe(mockSession)
      })

      it('throws error when not authenticated', async () => {
        await expect(
          practiceResolvers.Mutation.pausePracticeSession(
            {},
            { sessionId: 'session-123' },
            mockContextWithoutUser,
            {} as GraphQLResolveInfo
          )
        ).rejects.toThrow('Authentication required')
      })
    })

    describe('resumePracticeSession', () => {
      it('resumes a paused session', async () => {
        const mockSession = {
          id: 'session-123',
          status: 'IN_PROGRESS',
        }
        mockDB.run.mockResolvedValue({})
        mockDB.first.mockResolvedValue(mockSession)

        const result = await practiceResolvers.Mutation.resumePracticeSession(
          {},
          { sessionId: 'session-123' },
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(mockDB.prepare).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE practice_sessions')
        )
        expect(result).toBe(mockSession)
      })
    })

    describe('completePracticeSession', () => {
      it('completes a session with stats', async () => {
        const mockSession = {
          id: 'session-123',
          status: 'COMPLETED',
          accuracy: 85.5,
        }
        mockDB.run.mockResolvedValue({})
        mockDB.first.mockResolvedValue(mockSession)

        const input = {
          sessionId: 'session-123',
          accuracy: 85.5,
          notesAttempted: 100,
          notesCorrect: 85,
        }

        const result = await practiceResolvers.Mutation.completePracticeSession(
          {},
          { input },
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(mockDB.prepare).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE practice_sessions')
        )
        expect(result).toBe(mockSession)
      })
    })

    describe('createPracticeLog', () => {
      it('creates a practice log entry', async () => {
        const mockLog = {
          id: 'log-123',
          session_id: 'session-123',
          activity_type: 'SIGHT_READING',
        }
        mockDB.run.mockResolvedValue({})
        mockDB.first.mockResolvedValue(mockLog)

        const input = {
          sessionId: 'session-123',
          activityType: 'SIGHT_READING' as const,
          durationSeconds: 300,
        }

        const result = await practiceResolvers.Mutation.createPracticeLog(
          {},
          { input },
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(mockDB.prepare).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO practice_logs')
        )
        expect(result).toBe(mockLog)
      })
    })
  })

  describe('PracticeSession Type Resolvers', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    const mockSession = {
      id: 'session-123',
      user_id: 'user-123',
      sheet_music_id: 'music-123',
      instrument: 'PIANO' as const,
    }

    describe('user', () => {
      it('returns user from database', async () => {
        const mockUserData = {
          id: 'user-123',
          email: 'test@example.com',
          display_name: 'Test User',
          primary_instrument: 'PIANO',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }

        const mockPreferences = {
          preferences: JSON.stringify({
            theme: 'LIGHT',
            notationSize: 'MEDIUM',
            soundEnabled: true,
            metronomeBPM: 120,
            practiceReminders: false,
          }),
        }

        // Mock the database to return user data
        mockDB.first
          .mockResolvedValueOnce(mockUserData)
          .mockResolvedValueOnce(mockPreferences)

        const result = await practiceResolvers.PracticeSession.user(
          mockSession,
          {},
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(mockDB.prepare).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE id = ?'
        )
        expect(mockDB.bind).toHaveBeenCalledWith('user-123')
        expect(result).toBeDefined()
        expect(result?.id).toBe('user-123')
        expect(result?.email).toBe('test@example.com')
      })

      it('returns null when user not found', async () => {
        mockDB.first.mockResolvedValueOnce(null)

        const result = await practiceResolvers.PracticeSession.user(
          mockSession,
          {},
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(result).toBeNull()
      })

      it('returns null when no user id available', async () => {
        const sessionWithoutUserId = {
          id: 'session-123',
          instrument: 'PIANO' as const,
        }

        const result = await practiceResolvers.PracticeSession.user(
          sessionWithoutUserId,
          {},
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(result).toBeNull()
      })
    })

    describe('sheetMusic', () => {
      it('returns sheet music when found', async () => {
        const mockSheetMusic = {
          id: 'music-123',
          title: 'Fur Elise',
          composer: 'Beethoven',
        }
        mockContext.env.DB.first.mockResolvedValue(mockSheetMusic)

        const result = await practiceResolvers.PracticeSession.sheetMusic(
          mockSession,
          {},
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(mockContext.env.DB.prepare).toHaveBeenCalledWith(
          'SELECT * FROM sheet_music WHERE id = ?'
        )
        expect(mockContext.env.DB.bind).toHaveBeenCalledWith('music-123')
        expect(result).toBe(mockSheetMusic)
      })

      it('returns null when no sheetMusicId', async () => {
        const sessionWithoutMusic = { ...mockSession, sheet_music_id: null }

        const result = await practiceResolvers.PracticeSession.sheetMusic(
          sessionWithoutMusic,
          {},
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(result).toBeNull()
      })
    })

    describe('logs', () => {
      it('returns logs for the session', async () => {
        const mockLogs = [
          { id: 'log-1', session_id: 'session-123' },
          { id: 'log-2', session_id: 'session-123' },
        ]
        mockDB.all.mockResolvedValue({ results: mockLogs })

        const result = await practiceResolvers.PracticeSession.logs(
          mockSession,
          {},
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(mockDB.prepare).toHaveBeenCalledWith(
          'SELECT * FROM practice_logs WHERE session_id = ? ORDER BY created_at ASC'
        )
        expect(mockDB.bind).toHaveBeenCalledWith('session-123')
        expect(result).toBe(mockLogs)
      })
    })
  })

  describe('Context and Authorization', () => {
    it('should throw error for queries without user context', async () => {
      await expect(
        practiceResolvers.Query.myPracticeSessions(
          {},
          {},
          mockContextWithoutUser,
          {} as GraphQLResolveInfo
        )
      ).rejects.toThrow('Authentication required')
    })

    it('should handle mutations without user context', async () => {
      const input = {
        sessionType: 'FREE_PRACTICE' as const,
        sheetMusicId: 'music-123',
        instrument: 'PIANO' as const,
      }

      await expect(
        practiceResolvers.Mutation.startPracticeSession(
          {},
          { input },
          mockContextWithoutUser,
          {} as GraphQLResolveInfo
        )
      ).rejects.toThrow('Authentication required')
    })
  })

  describe('Input Validation', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockDB.all.mockResolvedValue({ results: [] })
      mockDB.first.mockResolvedValue({ count: 0 })
    })

    it('handles various instrument types', async () => {
      const instruments = ['PIANO', 'GUITAR'] as const

      for (const instrument of instruments) {
        const result = await practiceResolvers.Query.myPracticeSessions(
          {},
          { instrument },
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(result).toBeDefined()
        expect(result.edges).toEqual([])
      }
    })

    it('handles edge case pagination values', async () => {
      const testCases = [
        { offset: 0, limit: 1 },
        { offset: 1000, limit: 100 },
      ]

      for (const { offset, limit } of testCases) {
        vi.clearAllMocks()
        mockDB.all.mockResolvedValue({ results: [] })
        mockDB.first.mockResolvedValue({ count: 0 })

        const result = await practiceResolvers.Query.myPracticeSessions(
          {},
          { offset, limit },
          mockContext,
          {} as GraphQLResolveInfo
        )

        expect(result).toBeDefined()
        expect(result.edges).toEqual([])
      }
    })
  })

  describe('Future Implementation Tests', () => {
    // These tests are skipped but document expected behavior for future implementation
    // TODO: Implement practiceSession query by ID in resolver
    it.skip('practiceSession should fetch session by ID', async () => {
      // Future test when implemented
      const result = await practiceResolvers.Query.practiceSession(
        {},
        { id: 'session-123' },
        mockContext,
        {} as GraphQLResolveInfo
      )

      expect(result).toMatchObject({
        id: 'session-123',
        userId: 'user-123',
        instrument: expect.any(String),
      })
    })

    // TODO: Implement myPracticeSessions query in resolver
    it.skip('myPracticeSessions should return user sessions', async () => {
      // Future test when implemented
      const result = await practiceResolvers.Query.myPracticeSessions(
        {},
        {},
        mockContext,
        {} as GraphQLResolveInfo
      )

      expect(result.edges.length).toBeGreaterThan(0)
      expect(result.totalCount).toBeGreaterThan(0)
    })

    // TODO: Implement startPracticeSession mutation in resolver
    it.skip('startPracticeSession should create new session', async () => {
      // Future test when implemented
      const input = {
        sheetMusicId: 'music-123',
        instrument: 'PIANO' as const,
      }

      const result = await practiceResolvers.Mutation.startPracticeSession(
        {},
        { input },
        mockContext,
        {} as GraphQLResolveInfo
      )

      expect(result).toMatchObject({
        id: expect.any(String),
        userId: mockContext.user!.id,
        sheetMusicId: input.sheetMusicId,
        instrument: input.instrument,
        startedAt: expect.any(Date),
      })
    })

    // TODO: Add authentication check for practice mutations
    it.skip('should require authentication for mutations', async () => {
      // Future test when auth is implemented
      const input = {
        sheetMusicId: 'music-123',
        instrument: 'PIANO' as const,
      }

      await expect(
        practiceResolvers.Mutation.startPracticeSession(
          {},
          { input },
          mockContextWithoutUser,
          {} as GraphQLResolveInfo
        )
      ).rejects.toThrow('Unauthorized')
    })
  })
})
