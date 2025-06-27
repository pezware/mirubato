import { Hono } from 'hono'
import { authHandler } from './handlers/auth'
import { syncHandler } from './handlers/sync'
import { userHandler } from './handlers/user'
import { debugHandler } from './handlers/debug'
import { autocompleteHandler } from './handlers/autocomplete'
import type { Env } from '../index'

export const api = new Hono<{ Bindings: Env }>()

// API documentation
api.get('/', c => {
  return c.json({
    version: '1.0.0',
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
        'PUT /api/user/preferences': 'Update user preferences',
        'DELETE /api/user/me': 'Delete user account',
      },
      autocomplete: {
        'GET /api/autocomplete/composers': 'Get composer name suggestions',
        'GET /api/autocomplete/pieces': 'Get piece title suggestions',
      },
    },
  })
})

// Mount handlers
api.route('/auth', authHandler)
api.route('/sync', syncHandler)
api.route('/user', userHandler)
api.route('/debug', debugHandler)
api.route('/autocomplete', autocompleteHandler)
