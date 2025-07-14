/**
 * Request ID middleware for tracing and debugging
 */

import { createMiddleware } from 'hono/factory'
import type { Env, Variables } from '../types/env'

/**
 * Generate or extract request ID and add it to context
 */
export const requestId = () => {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(
    async (c, next) => {
      // Check if request ID is provided in headers
      let reqId =
        c.req.header('X-Request-ID') || c.req.header('X-Correlation-ID')

      // Generate new ID if not provided
      if (!reqId) {
        reqId = crypto.randomUUID()
      }

      // Store in context for access by handlers
      c.set('requestId', reqId)

      // Add to response headers
      c.header('X-Request-ID', reqId)

      // Continue with request
      await next()
    }
  )
}
