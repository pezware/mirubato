/**
 * Documentation routes
 */

import { Hono } from 'hono'
import type { Env } from '../types/env'
import { docsHandler } from '../api/handlers/docs'

export const docsRoutes = new Hono<{ Bindings: Env }>()

// Mount documentation endpoints
docsRoutes.route('/', docsHandler)
