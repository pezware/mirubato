import { Hono } from 'hono'
import { scoresHandler } from './handlers/scores'
import { searchHandler } from './handlers/search'
import { renderHandler } from './handlers/render'
import { importHandler } from './handlers/import'
import { enhancedImportHandler } from './handlers/import-enhanced'
import { collectionsHandler } from './handlers/collections'
import { pdfRendererHandler } from './handlers/pdf-renderer'

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
      },
      import: {
        'POST /api/import/pdf': 'Import score from PDF upload',
        'POST /api/import/imslp': 'Import score from IMSLP URL',
        'POST /api/import/batch': 'Batch import multiple URLs',
      },
      collections: {
        'GET /api/collections': 'List all collections',
        'GET /api/collections/:slug': 'Get collection by slug',
        'POST /api/collections': 'Create a new collection',
        'PUT /api/collections/:id': 'Update a collection',
        'DELETE /api/collections/:id': 'Delete a collection',
      },
    },
  })
})

// Mount handlers
api.route('/scores', scoresHandler)
api.route('/search', searchHandler)

// Use enhanced import handler if browser rendering is available
api.use('/import/*', async (c, next) => {
  if (c.env.BROWSER) {
    // Use enhanced handler with browser rendering
    return enhancedImportHandler.fetch(c.req.raw, c.env, c.executionCtx)
  }
  // Fall back to basic handler
  await next()
})

api.route('/import', importHandler)
api.route('/collections', collectionsHandler)

// Render routes need special handling due to nested paths
api.route('/', renderHandler)

// PDF rendering routes
api.route('/pdf', pdfRendererHandler)
