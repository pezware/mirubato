import { Hono } from 'hono'
import { scoresHandler } from './handlers/scores'
import { searchHandler } from './handlers/search'
import { renderHandler } from './handlers/render'
import { importHandler } from './handlers/import'
import { importImagesHandler } from './handlers/importImages'
import { enhancedImportHandler } from './handlers/import-enhanced'
import { collectionsHandler } from './handlers/collections'
import { userCollectionsHandler } from './handlers/userCollections'
import { favoritesHandler } from './handlers/favorites'
import { featuredCollectionsHandler } from './handlers/featuredCollections'
import { sharedCollectionsHandler } from './handlers/sharedCollections'
import { pdfRendererHandler } from './handlers/pdf-renderer'
import { pdfRendererV2Handler } from './handlers/pdf-renderer-v2'
import { adminHandler } from './handlers/admin'

export const api = new Hono<{ Bindings: Env }>()

// API documentation
api.get('/', c => {
  return c.json({
    version: '1.0.0',
    documentation: '/docs',
    openapi: '/api/openapi.json',
    endpoints: {
      health: {
        '/livez': 'Liveness probe',
        '/readyz': 'Readiness probe',
        '/health': 'Comprehensive health check',
        '/metrics': 'Prometheus metrics',
      },
      scores: {
        'GET /api/scores': 'List all scores with pagination and filtering',
        'GET /api/scores/:id': 'Get a single score by ID',
        'POST /api/scores': 'Create a new score entry',
        'PUT /api/scores/:id': 'Update a score',
        'DELETE /api/scores/:id': 'Delete a score',
        'POST /api/scores/batch/delete':
          'Batch delete multiple scores (max 100)',
      },
      search: {
        'GET /api/search': 'Search scores with advanced filtering',
        'GET /api/search/popular': 'Get popular scores',
        'GET /api/search/recent': 'Get recently added scores',
      },
      render: {
        'GET /api/scores/:id/render': 'Render a score in various formats',
        'GET /api/scores/:id/download/:format':
          'Download score in specific format',
        'GET /api/pdf/v2/thumbnail/:scoreId':
          'Get optimized thumbnail for grid view (pre-generated)',
        'GET /api/pdf/v2/render/:scoreId/page/:pageNumber':
          'Get pre-rendered page image',
      },
      import: {
        'POST /api/import': 'Import score from URL or file upload',
        'POST /api/import/images': 'Import score from image files (PNG, JPG)',
        'POST /api/import/pdf': 'Import score from PDF upload',
        'POST /api/import/imslp': 'Import score from IMSLP URL',
        'POST /api/import/batch': 'Batch import multiple URLs',
      },
      collections: {
        'GET /api/collections': 'List all public collections',
        'GET /api/collections/:slug': 'Get collection by slug',
        'POST /api/collections': 'Create a new collection (admin)',
        'PUT /api/collections/:id': 'Update a collection (admin)',
        'DELETE /api/collections/:id': 'Delete a collection (admin)',
      },
      userCollections: {
        'GET /api/user/collections': "List user's collections",
        'GET /api/user/collections/:id': 'Get user collection details',
        'POST /api/user/collections': 'Create new user collection',
        'PUT /api/user/collections/:id': 'Update user collection',
        'DELETE /api/user/collections/:id': 'Delete user collection',
        'POST /api/user/collections/:id/scores': 'Add score to collection',
        'POST /api/user/collections/:id/scores/batch':
          'Batch add multiple scores to collection (max 100)',
        'DELETE /api/user/collections/:id/scores/:scoreId':
          'Remove score from collection',
        'GET /api/user/collections/score/:scoreId':
          'Get collections containing a score',
        'POST /api/user/collections/batch/score-collections':
          'Batch get collections for multiple scores (eliminates N+1 queries)',
      },
      favorites: {
        'GET /api/user/favorites': "List user's favorite scores",
        'GET /api/user/favorites/ids': 'Get favorite score IDs only',
        'GET /api/user/favorites/check/:scoreId':
          'Check if a score is favorited',
        'POST /api/user/favorites/:scoreId': 'Add score to favorites',
        'DELETE /api/user/favorites/:scoreId': 'Remove score from favorites',
        'POST /api/user/favorites/:scoreId/toggle': 'Toggle favorite status',
        'POST /api/user/favorites/batch/check':
          'Batch check favorite status for multiple scores',
      },
      featuredCollections: {
        'GET /api/collections/featured': 'List featured collections (public)',
        'POST /api/collections/featured/feature':
          'Feature a collection (admin)',
        'DELETE /api/collections/featured/feature/:id':
          'Unfeature a collection (admin)',
        'PUT /api/collections/featured/order':
          'Update featured collection order (admin)',
      },
      sharedCollections: {
        'GET /api/collections/shared/with-me': 'Collections shared with me',
        'GET /api/collections/shared/by-me':
          'Collections I have shared (teacher)',
        'POST /api/collections/shared/:id/share': 'Share collection (teacher)',
        'DELETE /api/collections/shared/:id/share':
          'Unshare collection (teacher)',
      },
    },
  })
})

// Mount handlers
api.route('/scores', scoresHandler)
api.route('/search', searchHandler)

// Mount the basic import handler first (for /api/import endpoint)
api.route('/import', importHandler)

// Mount image import handler
api.route('/import/images', importImagesHandler)

// Use enhanced import handler for specific routes if browser rendering is available
api.use('/import/*', async (c, next) => {
  // Only intercept specific enhanced routes, not the base /import route
  const path = c.req.path
  if (
    c.env.BROWSER &&
    (path.includes('/pdf') ||
      path.includes('/imslp') ||
      path.includes('/batch'))
  ) {
    // Use enhanced handler with browser rendering
    return enhancedImportHandler.fetch(c.req.raw, c.env, c.executionCtx)
  }
  // Fall back to basic handler
  await next()
})
api.route('/collections', collectionsHandler)

// User collections routes
api.route('/user/collections', userCollectionsHandler)

// User favorites routes
api.route('/user/favorites', favoritesHandler)

// Featured collections routes (public access)
api.route('/collections/featured', featuredCollectionsHandler)

// Shared collections routes (authenticated access)
api.route('/collections/shared', sharedCollectionsHandler)

// Render routes need special handling due to nested paths
api.route('/', renderHandler)

// PDF rendering routes - v2 is the optimized version
api.route('/pdf/v2', pdfRendererV2Handler)
// Keep original for backwards compatibility
api.route('/pdf', pdfRendererHandler)

// Admin routes (protected)
api.route('/admin', adminHandler)
