/**
 * Enhanced logging middleware with structured logs
 */

import { createMiddleware } from 'hono/factory'
import type { Env, Variables } from '../types/env'

interface LogContext {
  requestId: string
  method: string
  path: string
  query?: Record<string, string>
  userId?: string
  userEmail?: string
  ip?: string
  userAgent?: string
  timestamp: string
  duration?: number
  status?: number
  error?: {
    message: string
    code?: string
  }
}

/**
 * Structured logging middleware
 */
export const structuredLogger = () => {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(
    async (c, next) => {
      const start = Date.now()
      const requestId = c.get('requestId') || crypto.randomUUID()

      // Build initial log context
      const logContext: LogContext = {
        requestId,
        method: c.req.method,
        path: c.req.path,
        query: c.req.query(),
        ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
        userAgent: c.req.header('User-Agent'),
        timestamp: new Date().toISOString(),
      }

      // Log request
      if (c.env.LOG_LEVEL === 'debug' || c.env.ENVIRONMENT !== 'production') {
        console.log('Request:', JSON.stringify(logContext))
      }

      try {
        // Continue with request
        await next()

        // Add response data
        logContext.duration = Date.now() - start
        logContext.status = c.res.status
        logContext.userId = c.get('userId')
        logContext.userEmail = c.get('userEmail')

        // Log response
        if (
          c.env.LOG_LEVEL === 'debug' ||
          (c.res.status >= 400 && c.env.ENVIRONMENT !== 'production')
        ) {
          console.log('Response:', JSON.stringify(logContext))
        }
      } catch (error) {
        // Add error data
        logContext.duration = Date.now() - start
        logContext.status = 500
        logContext.error = {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: (error as any)?.code,
        }

        // Log error
        console.error('Error:', JSON.stringify(logContext))

        // Re-throw to be handled by error handler
        throw error
      }
    }
  )
}

/**
 * Simple access logger for production
 */
export const accessLogger = () => {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(
    async (c, next) => {
      const start = Date.now()
      const requestId = c.get('requestId') || '-'

      await next()

      const duration = Date.now() - start
      const log = `${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms [${requestId}]`

      if (c.res.status >= 400) {
        console.error(log)
      } else if (c.env.LOG_LEVEL !== 'error') {
        console.log(log)
      }
    }
  )
}
