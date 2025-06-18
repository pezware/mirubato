import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AuthService } from '../../../services/auth'
import { createMockDB, MockD1Database } from '../../../test-utils/db'
import { createMockKV } from '../../../test-utils/graphql'
import type { User } from '../../../types/shared'
import type { KVNamespace } from '@cloudflare/workers-types'

// Mock the auth utils to avoid jsonwebtoken issues in test environment
vi.mock('../../../utils/auth', () => {
  return {
    generateMagicLinkToken: vi.fn(() => 'test-magic-link-token'),
    createJWT: vi.fn(async (_user: any) => 'test-jwt-token'),
    createRefreshToken: vi.fn(async () => 'test-refresh-token'),
    verifyRefreshToken: vi.fn(async (token: string) => {
      if (token === 'valid-refresh-token' || token.startsWith('test-')) {
        return { sub: 'user_123' }
      }
      throw new Error('Invalid token')
    }),
    verifyJWT: vi.fn(async (token: string) => {
      if (token === 'valid-jwt-token' || token.startsWith('test-')) {
        return { sub: 'user_123', user: { id: 'user_123' } }
      }
      throw new Error('Invalid token')
    }),
  }
})

describe('AuthService', () => {
  let authService: AuthService
  let _mockDB: MockD1Database
  let mockKV: ReturnType<typeof createMockKV>
  const testSecret = 'test-jwt-secret'

  beforeEach(() => {
    _mockDB = createMockDB() as unknown as MockD1Database
    mockKV = createMockKV()
    authService = new AuthService(mockKV as unknown as KVNamespace, testSecret)
  })

  describe('createMagicLink', () => {
    it('should create and store magic link', async () => {
      const email = 'test@example.com'
      const token = await authService.createMagicLink(email)

      expect(token).toBe('test-magic-link-token') // mocked by generateMagicLinkToken

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
        hasCloudStorage: true,
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
        hasCloudStorage: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const { refreshToken } = await authService.generateTokens(user)
      const result = await authService.verifyRefreshToken(refreshToken)

      expect(result.sub).toBe('user_123')
    })

    it('should throw error for invalid token', async () => {
      await expect(
        authService.verifyRefreshToken('invalid-token')
      ).rejects.toThrow()
    })
  })
})
