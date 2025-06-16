import { ApolloServer } from '@apollo/server'
import { startServerAndCreateCloudflareWorkersHandler } from '@as-integrations/cloudflare-workers'
import { resolvers } from './resolvers'
import type { GraphQLContext, Env } from './types/context'
import { nanoid } from 'nanoid'
import { verifyJWT } from './utils/auth'
import { createRateLimiter } from './utils/rateLimiter'
import { typeDefs } from './schema'
import { logRequest } from './middleware/logging'
import { isOriginAllowed } from './config/cors'
import { Instrument, Theme, NotationSize } from './types/shared'
import { getCookie } from './utils/cookies'
import { cookiePlugin } from './middleware/cookiePlugin'

// Helper to get CORS headers based on origin
function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || ''

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, x-apollo-operation-name, apollo-require-preflight',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  }

  // Check if origin is allowed based on configuration
  // Default to production if ENVIRONMENT is not set
  const environment = (env.ENVIRONMENT || 'production') as
    | 'production'
    | 'development'
  const isAllowed = isOriginAllowed(origin, environment)

  if (isAllowed) {
    corsHeaders['Access-Control-Allow-Origin'] = origin
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

    // Health endpoint
    if (url.pathname === '/health' || url.pathname === '/test') {
      return addCorsHeaders(
        new Response(
          JSON.stringify({
            message: 'Backend is working!',
            env: env.ENVIRONMENT,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
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
        console.log('[GraphQL] Request received:', {
          method: request.method,
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
        })
        await logRequest(request)
      }

      try {
        // Create Apollo Server instance
        const server = new ApolloServer<GraphQLContext>({
          typeDefs,
          resolvers,
          introspection: true, // Enable in development
          plugins: [cookiePlugin],
          formatError: err => {
            // Log errors in development
            if (env.ENVIRONMENT === 'development') {
              console.error('[GraphQL Error]', {
                message: err.message,
                path: err.path,
                extensions: err.extensions,
              })
            }
            return err
          },
        })

        // Create the handler with context function
        const handleGraphQL = startServerAndCreateCloudflareWorkersHandler(
          server,
          {
            context: async ({ request }): Promise<GraphQLContext> => {
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

              // Extract and verify JWT token from cookies
              let user
              const authToken = getCookie(request, 'auth-token')

              if (env.ENVIRONMENT === 'development') {
                console.log(
                  '[Auth Debug] Auth token from cookie:',
                  authToken ? `${authToken.slice(0, 20)}...` : 'none'
                )
              }

              if (authToken) {
                try {
                  const payload = await verifyJWT(authToken, env.JWT_SECRET)
                  if (env.ENVIRONMENT === 'development') {
                    console.log(
                      '[Auth Debug] JWT payload:',
                      JSON.stringify(payload)
                    )
                  }

                  // Handle different JWT payload formats
                  if (payload.user) {
                    // Standard format with full user object
                    user = payload.user
                  } else if ('userId' in payload || payload.sub) {
                    // Legacy format with userId only - create minimal user object
                    const userId =
                      ('userId' in payload
                        ? (payload as { userId: string }).userId
                        : payload.sub) || ''
                    user = {
                      id: userId,
                      email: payload.email || '',
                      hasCloudStorage: true,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      primaryInstrument: Instrument.PIANO,
                      preferences: {
                        theme: Theme.LIGHT,
                        notationSize: NotationSize.MEDIUM,
                        practiceReminders: true,
                        dailyGoalMinutes: 30,
                      },
                      stats: {
                        totalPracticeTime: 0,
                        consecutiveDays: 0,
                        piecesCompleted: 0,
                        accuracyAverage: 0,
                      },
                    }
                    if (env.ENVIRONMENT === 'development') {
                      console.log(
                        '[Auth Debug] Created user object:',
                        JSON.stringify(user)
                      )
                    }
                  }
                } catch (error) {
                  if (env.ENVIRONMENT === 'development') {
                    console.log('[Auth Debug] JWT verification error:', error)
                  }
                  // Invalid token, continue without user context
                }
              } else if (env.ENVIRONMENT === 'development') {
                console.log('[Auth Debug] No auth token found in cookies')
              }

              return {
                env,
                user,
                requestId,
                ip,
                db: env.DB,
                request,
              }
            },
          }
        )

        // Call the handler - it only expects the request
        const response = await handleGraphQL(request)

        // Log error responses in development
        if (env.ENVIRONMENT === 'development' && response.status >= 400) {
          const clonedResponse = response.clone()
          const responseText = await clonedResponse.text()
          console.error('[GraphQL] Error response:', {
            status: response.status,
            body: responseText,
          })
        }

        return addCorsHeaders(response, request, env)
      } catch (error) {
        // GraphQL handler error
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

    // Debug endpoint to test auth
    if (url.pathname === '/debug/auth' && env.ENVIRONMENT === 'development') {
      const authorization = request.headers.get('Authorization')
      let payload = null
      let error = null

      if (authorization?.startsWith('Bearer ')) {
        const token = authorization.slice(7)
        try {
          payload = await verifyJWT(token, env.JWT_SECRET)
        } catch (e) {
          error = e instanceof Error ? e.message : String(e)
        }
      }

      return addCorsHeaders(
        new Response(
          JSON.stringify({
            hasAuth: !!authorization,
            tokenPrefix: authorization?.substring(0, 20),
            payload,
            error,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        ),
        request,
        env
      )
    }

    // 404 for other routes
    return addCorsHeaders(
      new Response('Not Found', { status: 404 }),
      request,
      env
    )
  },
}
