import { Hono } from 'hono'
import type { Env } from '../../types/env'
import { termsHandler } from '../../api/handlers/terms'
import { searchHandler } from '../../api/handlers/search'
import { batchHandler } from '../../api/handlers/batch'
import { healthHandler } from '../../api/handlers/health'
import { exportHandler } from '../../api/handlers/export'
import { enhanceHandler } from '../../api/handlers/enhance'
import { adminHandler } from '../../api/handlers/admin'
import { analyticsHandler } from '../../api/handlers/analytics'
import { auth } from '../../middleware/auth'
import { errorHandler } from '../../utils/errors'

export function createTestApp(env: Env): Hono<{ Bindings: Env }> {
  const app = new Hono<{ Bindings: Env }>()

  // Error handling
  app.onError(errorHandler)

  // Health check endpoints
  app.route('/health', healthHandler)
  app.route('/livez', healthHandler)
  app.route('/readyz', healthHandler)
  app.route('/metrics', healthHandler)

  // API v1 routes
  const v1 = new Hono<{ Bindings: Env }>()

  // Public endpoints
  v1.route('/terms', termsHandler)
  v1.route('/search', searchHandler)
  v1.route('/batch', batchHandler)
  v1.route('/export', exportHandler)
  v1.route('/analytics', analyticsHandler)

  // Protected endpoints
  v1.use('/enhance/*', auth())
  v1.route('/enhance', enhanceHandler)

  v1.use('/admin/*', auth({ roles: ['admin'] }))
  v1.route('/admin', adminHandler)

  // Mount v1 routes
  app.route('/api/v1', v1)

  return app
}