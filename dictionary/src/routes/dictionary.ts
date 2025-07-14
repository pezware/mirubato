/**
 * Dictionary API routes
 */

import { Hono } from 'hono'
import type { Env, Variables } from '../types/env'
import { auth } from '../middleware/auth'

// Import handlers
import { termsHandler } from '../api/handlers/terms'
import { searchHandler } from '../api/handlers/search'
import { batchHandler } from '../api/handlers/batch'
import { exportHandler } from '../api/handlers/export'
import { enhanceHandler } from '../api/handlers/enhance'
import { adminHandler } from '../api/handlers/admin'
import { analyticsHandler } from '../api/handlers/analytics'

export const dictionaryRoutes = new Hono<{
  Bindings: Env
  Variables: Variables
}>()

// API v1 routes
const v1 = new Hono<{ Bindings: Env; Variables: Variables }>()

// Public endpoints
v1.route('/terms', termsHandler)
v1.route('/search', searchHandler)
v1.route('/batch', batchHandler)
v1.route('/export', exportHandler)
v1.route('/analytics', analyticsHandler)

// Protected endpoints (require auth)
v1.use('/enhance/*', auth())
v1.route('/enhance', enhanceHandler)

// Admin endpoints (require admin role)
v1.use('/admin/*', auth({ roles: ['admin'] }))
v1.route('/admin', adminHandler)

// Mount v1 routes
dictionaryRoutes.route('/api/v1', v1)
