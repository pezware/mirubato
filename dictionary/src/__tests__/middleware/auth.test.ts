import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  authMiddleware,
  requireAuth,
  validateAPIKey,
} from '../../middleware/auth'
import type { Context } from 'hono'
import type { Env } from '../../types/env'
import jwt from 'jsonwebtoken'

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
    sign: vi.fn(),
  },
}))

describe('Auth Middleware', () => {
  let mockContext: Partial<Context>
  let mockEnv: Env
  let mockNext: any

  beforeEach(() => {
    mockEnv = {
      JWT_SECRET: 'test-secret',
      API_SERVICE_URL: 'http://localhost:8787',
      QUALITY_THRESHOLD: '70',
      CACHE_TTL: '3600',
      ENVIRONMENT: 'test',
      DB: {} as any,
      CACHE: {} as any,
      STORAGE: {} as any,
      AI: {} as any,
    }

    mockContext = {
      env: mockEnv,
      req: {
        header: vi.fn(),
      } as any,
      set: vi.fn(),
      json: vi.fn((data: any, status?: number) => {
        return new Response(JSON.stringify(data), {
          status: status || 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }),
    }

    mockNext = vi.fn().mockResolvedValue(undefined)
  })

  describe('authMiddleware', () => {
    it('should parse valid JWT token from Bearer header', async () => {
      const mockPayload = { user_id: 'user123', email: 'test@example.com' }
      ;(mockContext.req!.header as any).mockReturnValue('Bearer valid-token')
      ;(jwt.verify as any).mockReturnValue(mockPayload)

      await authMiddleware()(mockContext as Context, mockNext)

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret')
      expect(mockContext.set).toHaveBeenCalledWith('user', mockPayload)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle missing authorization header', async () => {
      ;(mockContext.req!.header as any).mockReturnValue(undefined)

      await authMiddleware()(mockContext as Context, mockNext)

      expect(mockContext.set).toHaveBeenCalledWith('user', null)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle invalid JWT token', async () => {
      ;(mockContext.req!.header as any).mockReturnValue('Bearer invalid-token')
      ;(jwt.verify as any).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      await authMiddleware()(mockContext as Context, mockNext)

      expect(mockContext.set).toHaveBeenCalledWith('user', null)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle API key authentication', async () => {
      ;(mockContext.req!.header as any).mockImplementation((header: string) => {
        if (header === 'X-API-Key') return 'test-api-key'
        return undefined
      })

      await authMiddleware()(mockContext as Context, mockNext)

      expect(mockContext.set).toHaveBeenCalledWith('apiKey', 'test-api-key')
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('requireAuth', () => {
    it('should allow authenticated users', async () => {
      mockContext.get = vi.fn().mockReturnValue({ user_id: 'user123' })

      await requireAuth()(mockContext as Context, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should reject unauthenticated requests', async () => {
      mockContext.get = vi.fn().mockReturnValue(null)

      const response = await requireAuth()(mockContext as Context, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
      const data = (await response.json()) as any
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should accept valid API key', async () => {
      mockContext.get = vi.fn().mockImplementation((key: string) => {
        if (key === 'user') return null
        if (key === 'apiKey') return 'valid-api-key'
      })

      // Mock KV namespace for API key validation
      mockEnv.CACHE = {
        get: vi.fn().mockResolvedValue(
          JSON.stringify({
            key: 'valid-api-key',
            tier: 'pro',
            rate_limit: 10000,
          })
        ),
      } as any

      await requireAuth()(mockContext as Context, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should allow service-to-service communication', async () => {
      mockContext.get = vi.fn().mockReturnValue(null)
      ;(mockContext.req!.header as any).mockImplementation((header: string) => {
        if (header === 'X-Service-Auth') return 'scores-service'
        return undefined
      })

      await requireAuth()(mockContext as Context, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('validateAPIKey', () => {
    it('should validate existing API key', async () => {
      const mockKeyData = {
        key: 'test-api-key',
        tier: 'pro',
        rate_limit: 10000,
        created_at: new Date().toISOString(),
      }

      mockEnv.CACHE = {
        get: vi.fn().mockResolvedValue(JSON.stringify(mockKeyData)),
      } as any

      const result = await validateAPIKey('test-api-key', mockEnv)

      expect(result).toEqual(mockKeyData)
      expect(mockEnv.CACHE.get).toHaveBeenCalledWith('api_key:test-api-key')
    })

    it('should return null for invalid API key', async () => {
      mockEnv.CACHE = {
        get: vi.fn().mockResolvedValue(null),
      } as any

      const result = await validateAPIKey('invalid-key', mockEnv)

      expect(result).toBeNull()
    })

    it('should handle cache errors gracefully', async () => {
      mockEnv.CACHE = {
        get: vi.fn().mockRejectedValue(new Error('Cache error')),
      } as any

      const result = await validateAPIKey('test-api-key', mockEnv)

      expect(result).toBeNull()
    })
  })
})
