import { ApolloServer } from '@apollo/server'
import { startServerAndCreateCloudflareWorkersHandler } from '@as-integrations/cloudflare-workers'
import { resolvers } from './resolvers'
import type { GraphQLContext, Env } from './types/context'
import { nanoid } from 'nanoid'
import { verifyJWT } from './utils/auth'
import { createRateLimiter } from './utils/rateLimiter'
import { typeDefs } from './schema'

// Create Apollo Server instance
const server = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  introspection: true, // Enable in development
})

// Create the Cloudflare Workers handler
const handleGraphQL = startServerAndCreateCloudflareWorkersHandler(server, {
  context: async ({
    request,
    env,
  }: {
    request: Request
    env: Env
  }): Promise<GraphQLContext> => {
    const requestId = nanoid()
    const ip = request.headers.get('CF-Connecting-IP') || undefined

    // Rate limiting
    const rateLimiter = createRateLimiter(env.RATE_LIMITER, ip)
    const allowed = await rateLimiter.checkLimit()
    if (!allowed) {
      throw new Error('Rate limit exceeded')
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
})

// Export default handler for Cloudflare Workers
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Handle GraphQL endpoint
    if (url.pathname === '/graphql') {
      return handleGraphQL(request, env)
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // 404 for other routes
    return new Response('Not Found', { status: 404 })
  },
}
