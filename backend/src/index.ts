import { ApolloServer } from '@apollo/server'
import { startServerAndCreateCloudflareWorkersHandler } from '@as-integrations/cloudflare-workers'
import { resolvers } from './resolvers'
import type { GraphQLContext, Env } from './types/context'
import { nanoid } from 'nanoid'
import { verifyJWT } from './utils/auth'
import { createRateLimiter } from './utils/rateLimiter'
import { typeDefs } from './schema'
import { logRequest } from './middleware/logging'
import { isOriginAllowed, corsConfig } from './config/cors'

// Helper to get CORS headers based on origin
function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || ''

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }

  // Check if origin is allowed based on configuration
  // Default to production if ENVIRONMENT is not set
  const environment = (env.ENVIRONMENT || 'production') as
    | 'production'
    | 'development'
  const isAllowed = isOriginAllowed(origin, environment)

  // Log for debugging (remove in production)
  console.log(
    `CORS check: origin="${origin}", env="${environment}" (raw: ${env.ENVIRONMENT}), allowed=${isAllowed}`
  )

  if (isAllowed) {
    corsHeaders['Access-Control-Allow-Origin'] = origin
  } else if (origin) {
    // Log why origin was rejected
    console.log(`CORS rejected: origin "${origin}" not in allowed list`)
  }

  return corsHeaders
}

// Helper function to add CORS headers to response
function addCorsHeaders(
  response: Response,
  request: Request,
  env: Env
): Response {
  const newResponse = new Response(response.body, response)
  const corsHeaders = getCorsHeaders(request, env)
  if (corsHeaders) {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value)
    })
  }
  return newResponse
}

// Export default handler for Cloudflare Workers
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request, env),
      })
    }

    // Test endpoint
    if (url.pathname === '/test') {
      return addCorsHeaders(
        new Response(
          JSON.stringify({
            message: 'Backend is working!',
            env: env.ENVIRONMENT,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ),
        request,
        env
      )
    }

    // Debug CORS endpoint
    if (url.pathname === '/debug/cors') {
      const origin = request.headers.get('Origin') || 'no-origin'
      const environment = (env.ENVIRONMENT || 'production') as
        | 'production'
        | 'development'
      const isAllowed = isOriginAllowed(origin, environment)

      return addCorsHeaders(
        new Response(
          JSON.stringify({
            origin,
            environment,
            envRaw: env.ENVIRONMENT,
            isAllowed,
            corsConfig: {
              production: corsConfig.production.domains,
              patterns: corsConfig.production.patterns,
            },
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ),
        request,
        env
      )
    }

    // Handle GraphQL endpoint
    if (url.pathname === '/graphql') {
      // Log request in development
      if (env.ENVIRONMENT === 'development') {
        await logRequest(request)
      }

      try {
        // Create Apollo Server instance
        const server = new ApolloServer<GraphQLContext>({
          typeDefs,
          resolvers,
          introspection: true, // Enable in development
        })

        // Create the handler with context function
        const handleGraphQL = startServerAndCreateCloudflareWorkersHandler(
          server,
          {
            context: async ({ request }): Promise<GraphQLContext> => {
              console.log('Creating GraphQL context')
              const requestId = nanoid()
              const ip = request.headers.get('CF-Connecting-IP') || undefined

              // Rate limiting (skip in development if RATE_LIMITER not available)
              if (env.RATE_LIMITER) {
                const rateLimiter = createRateLimiter(env.RATE_LIMITER, ip)
                const allowed = await rateLimiter.checkLimit()
                if (!allowed) {
                  throw new Error('Rate limit exceeded')
                }
              }

              // Extract and verify JWT token if present
              let user
              const authorization = request.headers.get('Authorization')
              if (authorization?.startsWith('Bearer ')) {
                const token = authorization.slice(7)
                try {
                  const payload = await verifyJWT(token, env.JWT_SECRET)
                  // TODO: Load full user data from database
                  user = payload.user
                } catch (error) {
                  // Invalid token, continue without user context
                }
              }

              return {
                env,
                user,
                requestId,
                ip,
              }
            },
          }
        )

        // Call the handler - it only expects the request
        const response = await handleGraphQL(request)
        console.log('GraphQL response status:', response.status)

        // Log error responses in development
        if (env.ENVIRONMENT === 'development' && response.status >= 400) {
          const clonedResponse = response.clone()
          const responseBody = await clonedResponse.text()
          console.log('GraphQL error response:', responseBody)
        }

        return addCorsHeaders(response, request, env)
      } catch (error) {
        console.error('GraphQL handler error:', error)
        return addCorsHeaders(
          new Response(
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
          ),
          request,
          env
        )
      }
    }

    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/livez') {
      const response = new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: env.CF_VERSION_METADATA?.id || 'unknown',
          environment: env.ENVIRONMENT || 'unknown',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Version': env.CF_VERSION_METADATA?.id || 'unknown',
            'X-Environment': env.ENVIRONMENT || 'unknown',
          },
        }
      )
      return addCorsHeaders(response, request, env)
    }

    // 404 for other routes
    return addCorsHeaders(
      new Response('Not Found', { status: 404 }),
      request,
      env
    )
  },
}
