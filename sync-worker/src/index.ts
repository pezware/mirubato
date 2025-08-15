/**
 * Mirubato Sync Worker - Real-time synchronization service
 * Built on Cloudflare Workers + Durable Objects + WebSockets
 */

export interface Env {
  // Durable Object bindings
  SYNC_COORDINATOR: DurableObjectNamespace

  // Database and storage
  DB: D1Database

  // Environment variables
  JWT_SECRET: string
  API_URL: string
  ENVIRONMENT: string
}

// Export Durable Object class
export { SyncCoordinator } from './syncCoordinator'

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const url = new URL(request.url)

      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response(
          JSON.stringify({
            service: 'sync-worker',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: env.ENVIRONMENT || 'unknown',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // WebSocket sync endpoint
      if (url.pathname === '/sync/ws') {
        return await handleWebSocketRequest(request, env)
      }

      // Not found
      return new Response('Not Found', { status: 404 })
    } catch (error) {
      console.error('Sync worker error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  },
}

async function handleWebSocketRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url)

  // Extract auth parameters
  const userId = url.searchParams.get('userId')
  const token = url.searchParams.get('token')

  if (!userId || !token) {
    return new Response('Missing userId or token', { status: 400 })
  }

  // Verify JWT token (simplified for now)
  if (!(await isValidToken(token, env))) {
    return new Response('Invalid token', { status: 401 })
  }

  // Get the Durable Object for this user's sync coordination
  // For now, one coordinator per user - could be optimized to have shared coordinators
  const coordinatorId = env.SYNC_COORDINATOR.idFromName(`user:${userId}`)
  const coordinator = env.SYNC_COORDINATOR.get(coordinatorId)

  // Forward the WebSocket request to the Durable Object
  return coordinator.fetch(request)
}

async function isValidToken(token: string, env: Env): Promise<boolean> {
  // TODO: Implement proper JWT verification
  // For now, just check if token exists and is not empty
  return token.length > 10
}
