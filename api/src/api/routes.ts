import { Hono } from 'hono'
import { authHandler } from './handlers/auth'
import { syncHandler } from './handlers/sync'
import { userHandler } from './handlers/user'
import { debugHandler } from './handlers/debug'
import { autocompleteHandler } from './handlers/autocomplete'
import { repertoireHandler } from './handlers/repertoire'
import { goalsHandler } from './handlers/goals'
import { piecesHandler } from './handlers/pieces'
import {
  normalizeScoreIdBody,
  normalizeScoreIdParam,
} from './middleware/normalizeScoreId'
import type { Env } from '../index'

export const api = new Hono<{ Bindings: Env }>()

// API documentation
api.get('/', c => {
  return c.json({
    version: '1.1.0',
    documentation: '/docs',
    openapi: '/openapi.json',
    endpoints: {
      auth: {
        'POST /api/auth/request-magic-link':
          'Request magic link for email auth',
        'POST /api/auth/verify-magic-link': 'Verify magic link token',
        'POST /api/auth/google': 'Authenticate with Google OAuth',
        'POST /api/auth/refresh': 'Refresh access token',
        'POST /api/auth/logout': 'Logout user',
      },
      sync: {
        'POST /api/sync/pull': 'Get all user data from cloud',
        'POST /api/sync/push': 'Push local changes to cloud',
        'POST /api/sync/batch': 'Bidirectional sync batch',
        'GET /api/sync/status': 'Get sync metadata',
      },
      user: {
        'GET /api/user/me': 'Get current user info',
        'GET /api/user/preferences': 'Get user preferences',
        'PUT /api/user/preferences': 'Update user preferences',
        'DELETE /api/user/me': 'Delete user account',
      },
      autocomplete: {
        'GET /api/autocomplete/composers': 'Get composer name suggestions',
        'GET /api/autocomplete/pieces': 'Get piece title suggestions',
      },
      repertoire: {
        'GET /api/repertoire': 'List user repertoire',
        'GET /api/repertoire/:scoreId/stats':
          'Get repertoire stats for a piece',
        'POST /api/repertoire': 'Add piece to repertoire',
        'PUT /api/repertoire/:scoreId': 'Update repertoire item',
        'DELETE /api/repertoire/:scoreId': 'Remove from repertoire',
      },
      goals: {
        'GET /api/goals': 'List user goals with optional filters',
        'GET /api/goals/:id': 'Get specific goal with stats',
        'POST /api/goals': 'Create new goal',
        'PUT /api/goals/:id': 'Update goal',
        'POST /api/goals/:id/progress': 'Track progress on a goal',
        'DELETE /api/goals/:id': 'Delete goal',
      },
      pieces: {
        'PUT /api/pieces/update-name': 'Update piece name across all entries',
      },
    },
  })
})

// Apply normalization middleware before handlers
// This ensures all score IDs are normalized before reaching the handlers

// Sync endpoints - normalize score IDs in request body
api.use('/sync/*', normalizeScoreIdBody)

// Repertoire endpoints - normalize score IDs in params and body
api.use('/repertoire/:scoreId/*', normalizeScoreIdParam)
api.use('/repertoire/*', normalizeScoreIdBody)

// Pieces endpoints - normalize score IDs in body
api.use('/pieces/*', normalizeScoreIdBody)

// Mount handlers
api.route('/auth', authHandler)
api.route('/sync', syncHandler)
api.route('/user', userHandler)
api.route('/debug', debugHandler)
api.route('/autocomplete', autocompleteHandler)
api.route('/repertoire', repertoireHandler)
api.route('/goals', goalsHandler)
api.route('/pieces', piecesHandler)
