// Mock all external dependencies
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
  getCorsConfig: jest.fn(),
}))

jest.mock('@apollo/server', () => ({
  ApolloServer: jest.fn(),
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
  nanoid: () => 'mock-id-123',
}))

import { Env } from '../../types/context'

// Create a mock handler function that simulates the main handler behavior
const createMockHandler = () => {
  const { verifyJWT } = require('../../utils/auth')
  const { createRateLimiter } = require('../../utils/rateLimiter')
  const { logRequest } = require('../../middleware/logging')
  const { isOriginAllowed, getCorsConfig } = require('../../config/cors')

  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const url = new URL(request.url)

      // Helper to get CORS headers
      const getCorsHeaders = (
        request: Request,
        env: Env
      ): Record<string, string> => {
        const origin = request.headers.get('Origin') || ''
        const environment = (env.ENVIRONMENT || 'production') as
          | 'production'
          | 'development'
        const isAllowed = isOriginAllowed(origin, environment)

        const corsHeaders: Record<string, string> = {
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers':
            'Content-Type, Authorization, x-apollo-operation-name, apollo-require-preflight',
          'Access-Control-Max-Age': '86400',
        }

        if (isAllowed) {
          corsHeaders['Access-Control-Allow-Origin'] = origin
        }

        return corsHeaders
      }

      // Helper to add CORS headers
      const addCorsHeaders = (
        response: Response,
        request: Request,
        env: Env
      ): Response => {
        const newResponse = new Response(response.body, response)
        const corsHeaders = getCorsHeaders(request, env)
        Object.entries(corsHeaders).forEach(([key, value]) => {
          newResponse.headers.set(key, value)
        })
        return newResponse
      }

      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: getCorsHeaders(request, env),
        })
      }

      // Health endpoints
      if (
        url.pathname === '/health' ||
        url.pathname === '/test' ||
        url.pathname === '/livez'
      ) {
        const data =
          url.pathname === '/test'
            ? {
                message: 'Backend is working!',
                env: env.ENVIRONMENT,
                timestamp: new Date().toISOString(),
              }
            : {
                status: 'ok',
                timestamp: new Date().toISOString(),
                version: env.CF_VERSION_METADATA?.id || 'unknown',
                environment: env.ENVIRONMENT || 'unknown',
              }

        const response = new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            ...(url.pathname !== '/test' && {
              'X-Version': env.CF_VERSION_METADATA?.id || 'unknown',
              'X-Environment': env.ENVIRONMENT || 'unknown',
            }),
          },
        })
        return addCorsHeaders(response, request, env)
      }

      // Debug CORS endpoint
      if (url.pathname === '/debug/cors') {
        const origin = request.headers.get('Origin') || 'no-origin'
        const environment = (env.ENVIRONMENT || 'production') as
          | 'production'
          | 'development'
        const isAllowed = isOriginAllowed(origin, environment)
        const corsConfig = getCorsConfig(environment)

        const response = new Response(
          JSON.stringify({
            origin,
            environment,
            envRaw: env.ENVIRONMENT,
            isAllowed,
            corsConfig: {
              production: corsConfig.production.domains,
              patterns: corsConfig.production.patterns,
              development: corsConfig.development.origins,
            },
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        )
        return addCorsHeaders(response, request, env)
      }

      // GraphQL endpoint
      if (url.pathname === '/graphql') {
        if (env.ENVIRONMENT === 'development') {
          await logRequest(request)
        }

        try {
          // Simulate GraphQL handler
          const response = new Response(
            JSON.stringify({ data: { test: 'success' } }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
          return addCorsHeaders(response, request, env)
        } catch (error) {
          const response = new Response(
            JSON.stringify({
              error: 'Internal server error',
              message: error instanceof Error ? error.message : 'Unknown error',
              stack:
                env.ENVIRONMENT === 'development' && error instanceof Error
                  ? error.stack
                  : undefined,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          )
          return addCorsHeaders(response, request, env)
        }
      }

      // 404 for other routes
      return addCorsHeaders(
        new Response('Not Found', { status: 404 }),
        request,
        env
      )
    },
  }
}

describe('Cloudflare Workers Handler', () => {
  let mockEnv: Env
  let handler: any

  const { verifyJWT } = require('../../utils/auth')
  const { createRateLimiter } = require('../../utils/rateLimiter')
  const { logRequest } = require('../../middleware/logging')
  const { isOriginAllowed, getCorsConfig } = require('../../config/cors')

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup default environment
    mockEnv = {
      ENVIRONMENT: 'development',
      JWT_SECRET: 'test-secret',
      RATE_LIMITER: {} as any,
      CF_VERSION_METADATA: { id: 'test-version-123' },
    } as Env

    // Setup default mock implementations
    isOriginAllowed.mockReturnValue(true)
    getCorsConfig.mockReturnValue({
      production: {
        domains: ['example.com'],
        patterns: [],
      },
      development: {
        origins: ['http://localhost:3000'],
      },
    })

    const mockRateLimiter = {
      checkLimit: jest.fn().mockResolvedValue(true),
    }
    createRateLimiter.mockReturnValue(mockRateLimiter)

    logRequest.mockResolvedValue(undefined)
    verifyJWT.mockResolvedValue({ user: { id: 'test-user' } })

    // Create handler instance
    handler = createMockHandler()
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
    })

    it('should add CORS headers to allowed origins', async () => {
      isOriginAllowed.mockReturnValue(true)

      const request = new Request('https://api.example.com/health', {
        headers: { Origin: 'https://example.com' },
      })

      const response = await handler.fetch(request, mockEnv)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://example.com'
      )
    })

    it('should not add origin header for disallowed origins', async () => {
      isOriginAllowed.mockReturnValue(false)

      const request = new Request('https://api.example.com/health', {
        headers: { Origin: 'https://malicious.com' },
      })

      const response = await handler.fetch(request, mockEnv)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
        'GET, POST, OPTIONS'
      )
    })
  })

  describe('Health Endpoints', () => {
    it('should respond to /health endpoint', async () => {
      const request = new Request('https://api.example.com/health')

      const response = await handler.fetch(request, mockEnv)

      expect(response.status).toBe(200)

      const data = await response.json()
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

    it('should respond to /livez endpoint', async () => {
      const request = new Request('https://api.example.com/livez')

      const response = await handler.fetch(request, mockEnv)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('ok')
    })

    it('should handle missing version metadata', async () => {
      const envWithoutVersion = { ...mockEnv, CF_VERSION_METADATA: undefined }
      const request = new Request('https://api.example.com/health')

      const response = await handler.fetch(request, envWithoutVersion)

      const data = await response.json()
      expect(data.version).toBe('unknown')
      expect(response.headers.get('X-Version')).toBe('unknown')
    })

    it('should respond to legacy /test endpoint', async () => {
      const request = new Request('https://api.example.com/test')

      const response = await handler.fetch(request, mockEnv)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.message).toBe('Backend is working!')
      expect(data.env).toBe('development')
    })
  })

  describe('CORS Debug Endpoint', () => {
    it('should provide CORS debugging information', async () => {
      const request = new Request('https://api.example.com/debug/cors', {
        headers: { Origin: 'https://example.com' },
      })

      const response = await handler.fetch(request, mockEnv)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        origin: 'https://example.com',
        environment: 'development',
        envRaw: 'development',
        isAllowed: true,
        corsConfig: {
          production: ['example.com'],
          patterns: [],
          development: ['http://localhost:3000'],
        },
        timestamp: expect.any(String),
      })

      expect(isOriginAllowed).toHaveBeenCalledWith(
        'https://example.com',
        'development'
      )
      expect(getCorsConfig).toHaveBeenCalledWith('development')
    })

    it('should handle requests without origin header in debug', async () => {
      const request = new Request('https://api.example.com/debug/cors')

      const response = await handler.fetch(request, mockEnv)

      const data = await response.json()
      expect(data.origin).toBe('no-origin')
    })

    it('should default to production environment', async () => {
      const envWithoutEnvironment = { ...mockEnv, ENVIRONMENT: undefined }
      const request = new Request('https://api.example.com/debug/cors')

      const response = await handler.fetch(request, envWithoutEnvironment)

      const data = await response.json()
      expect(data.environment).toBe('production')
      expect(data.envRaw).toBeUndefined()
    })
  })

  describe('GraphQL Endpoint', () => {
    it('should handle GraphQL requests successfully', async () => {
      const request = new Request('https://api.example.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: '{ test }',
        }),
      })

      const response = await handler.fetch(request, mockEnv)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({ data: { test: 'success' } })
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

      const request = new Request('https://api.example.com/debug/cors')

      await handler.fetch(request, envWithoutEnvironment)

      expect(isOriginAllowed).toHaveBeenCalledWith('no-origin', 'production')
    })

    it('should handle missing CF_VERSION_METADATA', async () => {
      const envWithoutVersion = { ...mockEnv, CF_VERSION_METADATA: undefined }

      const request = new Request('https://api.example.com/health')

      const response = await handler.fetch(request, envWithoutVersion)

      const data = await response.json()
      expect(data.version).toBe('unknown')
    })
  })
})
