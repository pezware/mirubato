/**
 * Mirubato Sync Worker - Real-time synchronization service
 * Built on Cloudflare Workers + Durable Objects + WebSockets
 */

import { verifyWebSocketToken } from './auth'

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
  const providedUserId = url.searchParams.get('userId')
  const token = url.searchParams.get('token')

  if (!providedUserId || !token) {
    return new Response(JSON.stringify({ error: 'Missing userId or token' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verify JWT token
  const verifiedUser = await verifyWebSocketToken(token, env.JWT_SECRET)
  if (!verifiedUser) {
    console.error('JWT verification failed for WebSocket connection')
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Ensure the userId in the token matches the provided userId
  if (verifiedUser.userId !== providedUserId) {
    console.error(
      `User ID mismatch: token=${verifiedUser.userId}, provided=${providedUserId}`
    )
    return new Response(JSON.stringify({ error: 'User ID mismatch' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(
    `✅ Authenticated WebSocket connection for user ${verifiedUser.userId}`
  )

  // Get the Durable Object for this user's sync coordination
  // For now, one coordinator per user - could be optimized to have shared coordinators
  const coordinatorId = env.SYNC_COORDINATOR.idFromName(
    `user:${verifiedUser.userId}`
  )
  const coordinator = env.SYNC_COORDINATOR.get(coordinatorId)

  // Forward the WebSocket request to the Durable Object
  // Include the verified user info in the URL for the Durable Object
  const authenticatedUrl = new URL(request.url)
  authenticatedUrl.searchParams.set('userId', verifiedUser.userId)
  authenticatedUrl.searchParams.set('email', verifiedUser.email)
  authenticatedUrl.searchParams.set('authenticated', 'true')

  const authenticatedRequest = new Request(authenticatedUrl, request)
  return coordinator.fetch(authenticatedRequest)
}
