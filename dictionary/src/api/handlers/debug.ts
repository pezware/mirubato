/**
 * Debug handler for troubleshooting
 */
import { Hono } from 'hono'
import { Env } from '../../types/env'
import { debugSearch } from '../../services/storage/dictionary-database-debug'

export const debugHandler = new Hono<{ Bindings: Env }>()

/**
 * Debug search endpoint
 * GET /api/v1/debug/search?q=term
 */
debugHandler.get('/search', async c => {
  const query = c.req.query('q') || 'allegro'

  try {
    const results = await debugSearch(c.env.DB, query)

    return c.json({
      success: true,
      debug: true,
      query,
      results,
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Debug search failed',
        stack: error instanceof Error ? error.stack : undefined,
      },
      500
    )
  }
})

/**
 * Clear cache endpoint
 * POST /api/v1/debug/clear-cache
 */
debugHandler.post('/clear-cache', async c => {
  try {
    // Clear all search-related cache keys
    const cacheKeys = await c.env.CACHE.list({ prefix: 'search:' })

    let cleared = 0
    for (const key of cacheKeys.keys) {
      await c.env.CACHE.delete(key.name)
      cleared++
    }

    // Also clear term cache
    const termKeys = await c.env.CACHE.list({ prefix: 'term:' })
    for (const key of termKeys.keys) {
      await c.env.CACHE.delete(key.name)
      cleared++
    }

    return c.json({
      success: true,
      message: `Cleared ${cleared} cache entries`,
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear cache',
      },
      500
    )
  }
})
