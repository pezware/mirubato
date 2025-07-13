import { describe, it, expect, vi, beforeEach } from 'vitest'
import { auth, serviceAuth, getUserInfo } from '../../middleware/auth'
import type { Context } from 'hono'
import type { Env } from '../../types/env'
import { verify } from 'hono/jwt'

// Mock hono/jwt
vi.mock('hono/jwt', () => ({
  verify: vi.fn(),
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

  describe('auth middleware', () => {
    it('should parse valid JWT token from Bearer header', async () => {
      const mockPayload = { sub: 'user123', email: 'test@example.com' }
      ;(mockContext.req!.header as any).mockReturnValue('Bearer valid-token')
      ;(verify as any).mockResolvedValue(mockPayload)

      await auth()(mockContext as Context, mockNext)

      expect(verify).toHaveBeenCalledWith('valid-token', 'test-secret')
      expect(mockContext.set).toHaveBeenCalledWith('userId', 'user123')
      expect(mockContext.set).toHaveBeenCalledWith(
        'userEmail',
        'test@example.com'
      )
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle missing authorization header when optional', async () => {
      ;(mockContext.req!.header as any).mockReturnValue(undefined)

      await auth({ optional: true })(mockContext as Context, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should throw on missing authorization header when required', async () => {
      ;(mockContext.req!.header as any).mockReturnValue(undefined)

      await expect(auth()(mockContext as Context, mockNext)).rejects.toThrow()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle invalid JWT token', async () => {
      ;(mockContext.req!.header as any).mockReturnValue('Bearer invalid-token')
      ;(verify as any).mockRejectedValue(new Error('Invalid token'))

      await expect(auth()(mockContext as Context, mockNext)).rejects.toThrow()
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('serviceAuth', () => {
    it('should allow valid service authentication', async () => {
      const allowedServices = ['api-service', 'scores-service']

      // Generate the expected token to match what the middleware will generate
      const encoder = new TextEncoder()
      const data = encoder.encode('scores-service:test-secret')
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const expectedToken = hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      ;(mockContext.req!.header as any).mockImplementation((header: string) => {
        if (header === 'X-Service-Name') return 'scores-service'
        if (header === 'X-Service-Token') return expectedToken
        return undefined
      })

      await serviceAuth(allowedServices)(mockContext as Context, mockNext)

      expect(mockContext.set).toHaveBeenCalledWith(
        'serviceName',
        'scores-service'
      )
      expect(mockNext).toHaveBeenCalled()
    })

    it('should reject invalid service authentication', async () => {
      const allowedServices = ['api-service']
      ;(mockContext.req!.header as any).mockImplementation((header: string) => {
        if (header === 'X-Service-Auth') return 'unknown-service'
        return undefined
      })

      await expect(
        serviceAuth(allowedServices)(mockContext as Context, mockNext)
      ).rejects.toThrow()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject missing service header', async () => {
      const allowedServices = ['api-service']
      ;(mockContext.req!.header as any).mockReturnValue(undefined)

      await expect(
        serviceAuth(allowedServices)(mockContext as Context, mockNext)
      ).rejects.toThrow()
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('getUserInfo', () => {
    it('should return user info for JWT auth', () => {
      mockContext.get = vi.fn().mockImplementation((key: string) => {
        if (key === 'userId') return 'user123'
        if (key === 'userEmail') return 'test@example.com'
        return undefined
      })

      const info = getUserInfo(mockContext as Context)

      expect(info).toEqual({
        userId: 'user123',
        email: 'test@example.com',
        authenticated: true,
        method: 'jwt',
      })
    })

    it('should return service info for service auth', () => {
      mockContext.get = vi.fn().mockImplementation((key: string) => {
        if (key === 'serviceName') return 'api-service'
        return undefined
      })

      const info = getUserInfo(mockContext as Context)

      expect(info).toEqual({
        authenticated: true,
        method: 'service',
      })
    })

    it('should return unauthenticated for no auth', () => {
      mockContext.get = vi.fn().mockReturnValue(undefined)

      const info = getUserInfo(mockContext as Context)

      expect(info).toEqual({
        authenticated: false,
      })
    })
  })
})
