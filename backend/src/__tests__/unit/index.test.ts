import { Env } from '../../types/context'
import type {
  D1Database,
  KVNamespace,
  DurableObjectNamespace,
} from '@cloudflare/workers-types'
import type { RateLimiter } from '../../utils/rateLimiter'

// Mock all dependencies before they are imported
jest.mock('@apollo/server', () => ({
  ApolloServer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}))

jest.mock('@as-integrations/cloudflare-workers', () => ({
  startServerAndCreateCloudflareWorkersHandler: jest.fn(),
}))

jest.mock('../../resolvers', () => ({
  resolvers: {},
}))

jest.mock('../../schema', () => ({
  typeDefs: 'type Query { test: String }',
}))

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-id-123'),
}))

jest.mock('../../utils/auth', () => ({
  verifyJWT: jest.fn(),
}))

jest.mock('../../utils/rateLimiter', () => ({
  createRateLimiter: jest.fn(),
}))

jest.mock('../../middleware/logging', () => ({
  logRequest: jest.fn(),
}))

jest.mock('../../config/cors', () => ({
  isOriginAllowed: jest.fn(),
}))

// Now import the handler after all mocks are set up
import handler from '../../index'
import { ApolloServer } from '@apollo/server'
import { startServerAndCreateCloudflareWorkersHandler } from '@as-integrations/cloudflare-workers'
import { verifyJWT } from '../../utils/auth'
import { createRateLimiter } from '../../utils/rateLimiter'
import { logRequest } from '../../middleware/logging'
import { isOriginAllowed } from '../../config/cors'

describe('Cloudflare Workers Handler', () => {
  let mockEnv: Env
  let mockGraphQLHandler: jest.Mock

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup default environment
    mockEnv = {
      ENVIRONMENT: 'development',
      JWT_SECRET: 'test-secret',
      RATE_LIMITER: {} as DurableObjectNamespace,
      CF_VERSION_METADATA: { id: 'test-version-123' },
      DB: {} as D1Database,
      MIRUBATO_MAGIC_LINKS: {} as KVNamespace,
    }

    // Setup default mock implementations
    // eslint-disable-next-line no-extra-semi
    ;(isOriginAllowed as jest.Mock).mockReturnValue(true)
    // eslint-disable-next-line no-extra-semi
    // getCorsConfig mock removed - no longer used

    const mockRateLimiter: RateLimiter = {
      checkLimit: jest.fn().mockResolvedValue(true),
    }
    ;(createRateLimiter as jest.Mock).mockReturnValue(mockRateLimiter)
    ;(logRequest as jest.Mock).mockResolvedValue(undefined)
    ;(verifyJWT as jest.Mock).mockResolvedValue({ user: { id: 'test-user' } })

    // Setup Apollo Server mock
    mockGraphQLHandler = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { test: 'success' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    ;(
      startServerAndCreateCloudflareWorkersHandler as jest.Mock
    ).mockReturnValue(mockGraphQLHandler)
  })

  describe('CORS Handling', () => {
    it('should handle OPTIONS preflight requests', async () => {
      const request = new Request('https://api.example.com/graphql', {
        method: 'OPTIONS',
        headers: { Origin: 'https://example.com' },
      })

      const response = await handler.fetch(request, mockEnv)

      expect(response.status).toBe(204)
      expect(isOriginAllowed).toHaveBeenCalledWith(
        'https://example.com',
        'development'
      )
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
        'GET, POST, OPTIONS'
      )
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain(
        'Content-Type'
      )
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400')
    })

    it('should add CORS headers to allowed origins', async () => {
      // eslint-disable-next-line no-extra-semi
      ;(isOriginAllowed as jest.Mock).mockReturnValue(true)

      const request = new Request('https://api.example.com/health', {
        headers: { Origin: 'https://example.com' },
      })

      const response = await handler.fetch(request, mockEnv)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://example.com'
      )
    })

    it('should not add origin header for disallowed origins', async () => {
      // eslint-disable-next-line no-extra-semi
      ;(isOriginAllowed as jest.Mock).mockReturnValue(false)

      const request = new Request('https://api.example.com/health', {
        headers: { Origin: 'https://malicious.com' },
      })

      const response = await handler.fetch(request, mockEnv)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
        'GET, POST, OPTIONS'
      )
    })

    it('should handle requests without origin header', async () => {
      const request = new Request('https://api.example.com/health')

      const response = await handler.fetch(request, mockEnv)

      expect(isOriginAllowed).toHaveBeenCalledWith('', 'development')
      expect(response.status).toBe(200)
    })
  })

  describe('Health Endpoints', () => {
    it('should respond to /health endpoint', async () => {
      const request = new Request('https://api.example.com/health')

      const response = await handler.fetch(request, mockEnv)

      expect(response.status).toBe(200)

      const data = (await response.json()) as {
        message: string
        env: string
        timestamp: string
      }
      expect(data).toEqual({
        message: 'Backend is working!',
        env: 'development',
        timestamp: expect.any(String),
      })

      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should respond to /livez endpoint', async () => {
      const request = new Request('https://api.example.com/livez')

      const response = await handler.fetch(request, mockEnv)

      expect(response.status).toBe(200)

      const data = (await response.json()) as {
        status: string
        timestamp: string
        version: string
        environment: string
      }
      expect(data).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        version: 'test-version-123',
        environment: 'development',
      })

      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('X-Version')).toBe('test-version-123')
      expect(response.headers.get('X-Environment')).toBe('development')
    })

    it('should handle missing version metadata', async () => {
      const envWithoutVersion = { ...mockEnv, CF_VERSION_METADATA: undefined }
      const request = new Request('https://api.example.com/livez')

      const response = await handler.fetch(request, envWithoutVersion)

      const data = (await response.json()) as {
        status: string
        timestamp: string
        version: string
        environment: string
      }
      expect(data.version).toBe('unknown')
      expect(response.headers.get('X-Version')).toBe('unknown')
    })

    it('should respond to legacy /test endpoint', async () => {
      const request = new Request('https://api.example.com/test')

      const response = await handler.fetch(request, mockEnv)

      expect(response.status).toBe(200)

      const data = (await response.json()) as {
        message: string
        env: string
        timestamp: string
      }
      expect(data.message).toBe('Backend is working!')
      expect(data.env).toBe('development')
      expect(data.timestamp).toBeDefined()
    })

    it('should handle missing environment', async () => {
      const envWithoutEnv = { ...mockEnv, ENVIRONMENT: undefined }
      const request = new Request('https://api.example.com/livez')

      const response = await handler.fetch(request, envWithoutEnv)

      const data = (await response.json()) as {
        status: string
        timestamp: string
        version: string
        environment: string
      }
      expect(data.environment).toBe('unknown')
      expect(response.headers.get('X-Environment')).toBe('unknown')
    })
  })

  // CORS Debug Endpoint tests removed - endpoint was removed from code

  describe('GraphQL Endpoint', () => {
    it('should handle GraphQL requests successfully', async () => {
      const request = new Request('https://api.example.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1',
        },
        body: JSON.stringify({
          query: '{ test }',
        }),
      })

      const response = await handler.fetch(request, mockEnv)

      expect(response.status).toBe(200)
      const data = (await response.json()) as { data: { test: string } }
      expect(data).toEqual({ data: { test: 'success' } })

      // Verify Apollo Server was created
      expect(ApolloServer).toHaveBeenCalledWith(
        expect.objectContaining({
          typeDefs: expect.any(String),
          resolvers: expect.any(Object) as Record<string, unknown>,
          introspection: true,
        })
      )

      // Verify handler was created with proper context
      expect(startServerAndCreateCloudflareWorkersHandler).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          context: expect.any(Function),
        })
      )
    })

    it('should create GraphQL context with user when authenticated', async () => {
      // eslint-disable-next-line no-extra-semi
      ;(verifyJWT as jest.Mock).mockResolvedValue({
        user: { id: 'authenticated-user' },
      })

      const request = new Request('https://api.example.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1',
          Cookie: 'auth-token=valid-token',
        },
        body: JSON.stringify({ query: '{ test }' }),
      })

      await handler.fetch(request, mockEnv)

      // Get the context function that was passed to the handler
      const handlerCall = (
        startServerAndCreateCloudflareWorkersHandler as jest.Mock
      ).mock.calls[0]
      const contextFn = handlerCall[1].context

      // Call the context function
      const context = await contextFn({ request })

      expect(context).toMatchObject({
        env: mockEnv,
        user: { id: 'authenticated-user' },
        requestId: 'mock-id-123',
        ip: '192.168.1.1',
        db: mockEnv.DB,
      })

      expect(verifyJWT).toHaveBeenCalledWith('valid-token', 'test-secret')
    })

    it('should handle invalid JWT gracefully', async () => {
      // eslint-disable-next-line no-extra-semi
      ;(verifyJWT as jest.Mock).mockRejectedValue(new Error('Invalid token'))

      const request = new Request('https://api.example.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token',
        },
        body: JSON.stringify({ query: '{ test }' }),
      })

      await handler.fetch(request, mockEnv)

      // Get the context function
      const handlerCall = (
        startServerAndCreateCloudflareWorkersHandler as jest.Mock
      ).mock.calls[0]
      const contextFn = handlerCall[1].context

      // Call the context function - should not throw
      const context = await contextFn({ request })

      expect(context.user).toBeUndefined()
    })

    it('should apply rate limiting when RATE_LIMITER is available', async () => {
      const mockCheckLimit = jest.fn().mockResolvedValue(false)
      ;(createRateLimiter as jest.Mock).mockReturnValue({
        checkLimit: mockCheckLimit,
      })

      const request = new Request('https://api.example.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1',
        },
        body: JSON.stringify({ query: '{ test }' }),
      })

      await handler.fetch(request, mockEnv)

      // Get the context function
      const handlerCall = (
        startServerAndCreateCloudflareWorkersHandler as jest.Mock
      ).mock.calls[0]
      const contextFn = handlerCall[1].context

      // Call the context function - should throw due to rate limit
      await expect(contextFn({ request })).rejects.toThrow(
        'Rate limit exceeded'
      )

      expect(createRateLimiter).toHaveBeenCalledWith(
        mockEnv.RATE_LIMITER,
        '192.168.1.1'
      )
      expect(mockCheckLimit).toHaveBeenCalled()
    })

    it('should skip rate limiting when RATE_LIMITER is not available', async () => {
      const envWithoutRateLimiter = { ...mockEnv, RATE_LIMITER: undefined }

      const request = new Request('https://api.example.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: '{ test }' }),
      })

      await handler.fetch(request, envWithoutRateLimiter)

      // Get the context function
      const handlerCall = (
        startServerAndCreateCloudflareWorkersHandler as jest.Mock
      ).mock.calls[0]
      const contextFn = handlerCall[1].context

      // Call the context function - should not throw
      const context = await contextFn({ request })

      expect(context).toBeDefined()
      expect(createRateLimiter).not.toHaveBeenCalled()
    })

    it('should log requests in development', async () => {
      const request = new Request('https://api.example.com/graphql', {
        method: 'POST',
        body: JSON.stringify({ query: '{ test }' }),
      })

      await handler.fetch(request, mockEnv)

      expect(logRequest).toHaveBeenCalledWith(request)
    })

    it('should not log requests in production', async () => {
      const prodEnv = { ...mockEnv, ENVIRONMENT: 'production' }
      const request = new Request('https://api.example.com/graphql', {
        method: 'POST',
        body: JSON.stringify({ query: '{ test }' }),
      })

      await handler.fetch(request, prodEnv)

      expect(logRequest).not.toHaveBeenCalled()
    })

    it('should handle GraphQL handler errors', async () => {
      mockGraphQLHandler.mockRejectedValue(
        new Error('GraphQL processing failed')
      )

      const request = new Request('https://api.example.com/graphql', {
        method: 'POST',
        body: JSON.stringify({ query: '{ test }' }),
      })

      const response = await handler.fetch(request, mockEnv)

      expect(response.status).toBe(500)
      const data = (await response.json()) as {
        error: string
        message: string
        stack?: string
      }
      expect(data).toEqual({
        error: 'Internal server error',
        message: 'GraphQL processing failed',
        stack: expect.stringContaining('GraphQL processing failed'),
      })
    })

    it('should not include stack trace in production', async () => {
      mockGraphQLHandler.mockRejectedValue(
        new Error('GraphQL processing failed')
      )

      const prodEnv = { ...mockEnv, ENVIRONMENT: 'production' }
      const request = new Request('https://api.example.com/graphql', {
        method: 'POST',
        body: JSON.stringify({ query: '{ test }' }),
      })

      const response = await handler.fetch(request, prodEnv)

      expect(response.status).toBe(500)
      const data = (await response.json()) as {
        error: string
        message: string
        stack?: string
      }
      expect(data.stack).toBeUndefined()
    })

    it('should handle error responses in development', async () => {
      mockGraphQLHandler.mockResolvedValue(
        new Response(JSON.stringify({ errors: ['Test error'] }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const request = new Request('https://api.example.com/graphql', {
        method: 'POST',
        body: JSON.stringify({ query: '{ test }' }),
      })

      const response = await handler.fetch(request, mockEnv)

      expect(response.status).toBe(400)
      const data = (await response.json()) as { errors: string[] }
      expect(data.errors).toEqual(['Test error'])
    })

    it('should handle non-Error exceptions', async () => {
      mockGraphQLHandler.mockRejectedValue('String error')

      const request = new Request('https://api.example.com/graphql', {
        method: 'POST',
        body: JSON.stringify({ query: '{ test }' }),
      })

      const response = await handler.fetch(request, mockEnv)

      expect(response.status).toBe(500)
      const data = (await response.json()) as { error: string; message: string }
      expect(data.message).toBe('Unknown error')
    })
  })

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const request = new Request('https://api.example.com/unknown')

      const response = await handler.fetch(request, mockEnv)

      expect(response.status).toBe(404)
      expect(await response.text()).toBe('Not Found')
    })

    it('should add CORS headers to 404 responses', async () => {
      const request = new Request('https://api.example.com/unknown', {
        headers: { Origin: 'https://example.com' },
      })

      const response = await handler.fetch(request, mockEnv)

      expect(response.status).toBe(404)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://example.com'
      )
    })
  })

  describe('Environment Handling', () => {
    it('should default to production when ENVIRONMENT is not set', async () => {
      const envWithoutEnvironment = { ...mockEnv, ENVIRONMENT: undefined }

      const request = new Request('https://api.example.com/health')

      await handler.fetch(request, envWithoutEnvironment)

      expect(isOriginAllowed).toHaveBeenCalledWith('', 'production')
    })

    it('should handle edge cases in environment detection', async () => {
      // Test with empty string environment
      const envEmptyString = { ...mockEnv, ENVIRONMENT: '' as const }
      const request = new Request('https://api.example.com/health')

      const response = await handler.fetch(request, envEmptyString)
      const data = (await response.json()) as { env: string }

      // Empty string environment is returned as-is
      expect(data.env).toBe('')
    })
  })

  // Console Logging tests removed - console statements were removed from code

  describe('Request IP Handling', () => {
    it('should extract IP from CF-Connecting-IP header', async () => {
      const request = new Request('https://api.example.com/graphql', {
        method: 'POST',
        headers: {
          'CF-Connecting-IP': '10.0.0.1',
        },
        body: JSON.stringify({ query: '{ test }' }),
      })

      await handler.fetch(request, mockEnv)

      const handlerCall = (
        startServerAndCreateCloudflareWorkersHandler as jest.Mock
      ).mock.calls[0]
      const contextFn = handlerCall[1].context
      const context = await contextFn({ request })

      expect(context.ip).toBe('10.0.0.1')
    })

    it('should handle missing CF-Connecting-IP header', async () => {
      const request = new Request('https://api.example.com/graphql', {
        method: 'POST',
        body: JSON.stringify({ query: '{ test }' }),
      })

      await handler.fetch(request, mockEnv)

      const handlerCall = (
        startServerAndCreateCloudflareWorkersHandler as jest.Mock
      ).mock.calls[0]
      const contextFn = handlerCall[1].context
      const context = await contextFn({ request })

      expect(context.ip).toBeUndefined()
    })
  })
})
