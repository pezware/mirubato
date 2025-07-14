/**
 * Health check routes
 */

import { Hono } from 'hono'
import type { Env } from '../types/env'
import { healthHandler } from '../api/handlers/health'

export const healthRoutes = new Hono<{ Bindings: Env }>()

// Mount all health check endpoints
healthRoutes.route('/', healthHandler)
