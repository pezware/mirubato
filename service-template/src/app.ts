import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { swaggerUI } from '@hono/swagger-ui'
import type { Env } from './types'

// Import middleware
import { errorHandler } from './middleware/error'
import { rateLimiter } from './middleware/rate-limit'

// Import routes
import { healthRoutes } from './routes/health'
import { docsRoute } from './routes/docs'
// import { apiRoutes } from './routes/api'

/**
 * Create and configure Hono app
 */
export const app = new Hono<{ Bindings: Env }>()

/**
 * Global middleware
 */
app.use('*', logger())

// CORS configuration
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: origin => {
      const allowedOrigin = c.env.CORS_ORIGIN
      if (allowedOrigin === '*') return origin

      const allowed = allowedOrigin.split(',').map(o => o.trim())
      return allowed.includes(origin) ? origin : allowed[0]
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
  return corsMiddleware(c, next)
})

// Global rate limiting for all routes
app.use('*', rateLimiter({ requests: 100, window: 60 }))

/**
 * Routes
 */
// Health check endpoints
app.route('/', healthRoutes)

// API documentation
app.get('/docs', c => {
  return docsRoute(c)
})

app.get('/swagger', swaggerUI({ url: '/docs' }))

// API routes
// app.route('/api', apiRoutes)

/**
 * 404 handler
 */
app.notFound(c => {
  return c.json(
    {
      success: false,
      error: 'Not Found',
      message: `The requested endpoint ${c.req.path} does not exist`,
    },
    404
  )
})

/**
 * Global error handler
 */
app.onError(errorHandler)

/**
 * Export configured app
 */
export default app
