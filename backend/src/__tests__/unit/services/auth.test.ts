import { AuthService } from '../../../services/auth'
import { createMockDB, MockD1Database } from '../../../test-utils/db'
import { createMockKV } from '../../../test-utils/graphql'
import type { User } from '../../../types/shared'
import type { D1Database, KVNamespace } from '@cloudflare/workers-types'

describe('AuthService', () => {
  let authService: AuthService
  let mockDB: MockD1Database
  let mockKV: ReturnType<typeof createMockKV>
  const testSecret = 'test-jwt-secret'

  beforeEach(() => {
    mockDB = createMockDB() as unknown as MockD1Database
    mockKV = createMockKV()
    authService = new AuthService(
      mockDB as unknown as D1Database,
      mockKV as unknown as KVNamespace,
      testSecret
    )
  })

  describe('createMagicLink', () => {
    it('should create and store magic link', async () => {
      const email = 'test@example.com'
      const token = await authService.createMagicLink(email)

      expect(token).toBeTruthy()
      expect(token.length).toBe(32)

      // Verify token was stored in KV
      const storedEmail = await mockKV.get(`magic_link:${token}`)
      expect(storedEmail).toBe(email)
    })
  })

  describe('verifyMagicLink', () => {
    it('should verify valid magic link', async () => {
      const email = 'test@example.com'
      const token = await authService.createMagicLink(email)

      const result = await authService.verifyMagicLink(token)

      expect(result).toBe(email)

      // Verify token was deleted after use
      const storedEmail = await mockKV.get(`magic_link:${token}`)
      expect(storedEmail).toBeNull()
    })

    it('should return null for invalid token', async () => {
      const result = await authService.verifyMagicLink('invalid-token')

      expect(result).toBeNull()
    })
  })

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const user: User = {
        id: 'user_123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: 'PIANO',
        preferences: {
          theme: 'LIGHT',
          notationSize: 'MEDIUM',
          practiceReminders: true,
          dailyGoalMinutes: 30,
        },
        stats: {
          totalPracticeTime: 0,
          consecutiveDays: 0,
          piecesCompleted: 0,
          accuracyAverage: 0,
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const tokens = await authService.generateTokens(user)

      expect(tokens.accessToken).toBeTruthy()
      expect(tokens.refreshToken).toBeTruthy()
      expect(tokens.accessToken).not.toBe(tokens.refreshToken)
    })
  })

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', async () => {
      const user: User = {
        id: 'user_123',
        email: 'test@example.com',
        displayName: 'Test User',
        primaryInstrument: 'PIANO',
        preferences: {
          theme: 'LIGHT',
          notationSize: 'MEDIUM',
          practiceReminders: true,
          dailyGoalMinutes: 30,
        },
        stats: {
          totalPracticeTime: 0,
          consecutiveDays: 0,
          piecesCompleted: 0,
          accuracyAverage: 0,
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const { refreshToken } = await authService.generateTokens(user)
      const userId = await authService.verifyRefreshToken(refreshToken)

      expect(userId).toBe('user_123')
    })

    it('should throw error for invalid token', async () => {
      await expect(
        authService.verifyRefreshToken('invalid-token')
      ).rejects.toThrow()
    })
  })
})
