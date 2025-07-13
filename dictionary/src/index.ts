/**
 * Music Dictionary Service - Worker Entry Point
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { timing } from 'hono/timing'
import { Env, Variables } from './types/env'
import { errorHandler } from './utils/errors'
import { cache, edgeCache } from './middleware/cache'
import { tieredRateLimit } from './middleware/rate-limit'
import { auth } from './middleware/auth'

// Import route handlers
import { healthHandler } from './api/handlers/health'
import { termsHandler } from './api/handlers/terms'
import { searchHandler } from './api/handlers/search'
import { docsHandler } from './api/handlers/docs'
import { batchHandler } from './api/handlers/batch'
import { exportHandler } from './api/handlers/export'
import { enhanceHandler } from './api/handlers/enhance'
import { adminHandler } from './api/handlers/admin'
import { analyticsHandler } from './api/handlers/analytics'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Global middleware
app.use('*', cors({
  origin: [
    'https://mirubato.com',
    'https://www.mirubato.com',
    'https://mirubato-staging.com',
    'http://localhost:3000',
    'http://localhost:4000',
    'http://www-mirubato.localhost:4000'
  ],
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}))

app.use('*', logger())
app.use('*', timing())

// Apply tiered rate limiting to API routes
app.use('/api/*', tieredRateLimit({
  anonymous: {
    windowMs: 60000,
    max: 60,
    message: 'Too many requests from this IP, please try again later'
  },
  authenticated: {
    windowMs: 60000,
    max: 120,
  },
  premium: {
    windowMs: 60000,
    max: 600,
  }
}))

// Error handling
app.onError(errorHandler)

// Health check endpoints (no auth required)
app.route('/health', healthHandler)
app.route('/livez', healthHandler)
app.route('/readyz', healthHandler)
app.route('/metrics', healthHandler)

// Documentation
app.route('/docs', docsHandler)

// API v1 routes
const v1 = new Hono<{ Bindings: Env }>()

// Public endpoints
v1.route('/terms', termsHandler)
v1.route('/search', searchHandler)
v1.route('/batch', batchHandler)
v1.route('/export', exportHandler)
v1.route('/analytics', analyticsHandler)

// Protected endpoints (require auth)
v1.use('/enhance/*', auth())
v1.route('/enhance', enhanceHandler)

v1.use('/admin/*', auth({ roles: ['admin'] }))
v1.route('/admin', adminHandler)

// Mount v1 routes
app.route('/api/v1', v1)

// Root endpoint
app.get('/', (c) => {
  return c.json({
    service: 'Music Dictionary API',
    version: '1.0.0',
    status: 'operational',
    documentation: 'https://dictionary.mirubato.com/docs',
    endpoints: {
      health: '/health',
      api: {
        v1: {
          terms: '/api/v1/terms/:term',
          search: '/api/v1/search',
          batch: '/api/v1/batch',
          export: '/api/v1/export',
          enhance: '/api/v1/enhance (auth required)',
          admin: '/api/v1/admin (auth required)',
          analytics: '/api/v1/analytics/summary'
        }
      }
    }
  })
})

// 404 handler
app.notFound((c) => {
  return c.json({
    status: 'error',
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
      timestamp: new Date().toISOString()
    }
  }, 404)
})

export default app