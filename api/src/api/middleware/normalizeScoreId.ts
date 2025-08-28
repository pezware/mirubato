/**
 * Middleware for normalizing score IDs in API requests
 *
 * This ensures all score IDs are normalized before they reach handlers,
 * preventing duplicate entries and inconsistent data storage.
 */

import type { Context, Next } from 'hono'
import {
  normalizeExistingScoreId,
  generateNormalizedScoreId,
} from '../../utils/scoreIdNormalizer'

/**
 * Middleware to normalize scoreId URL parameters
 * Use this for routes with :scoreId parameter
 */
export const normalizeScoreIdParam = async (c: Context, next: Next) => {
  const scoreId = c.req.param('scoreId')

  if (scoreId) {
    // Normalize the scoreId and store both original and normalized versions
    const normalized = normalizeExistingScoreId(scoreId)

    // Store in context for handlers to use
    c.set('normalizedScoreId', normalized)
    c.set('originalScoreId', scoreId)
  }

  await next()
}

/**
 * Middleware to normalize scoreId in request body
 * Use this for POST/PUT requests with scoreId in body
 */
export const normalizeScoreIdBody = async (c: Context, next: Next) => {
  // Only process if there's a body
  const contentType = c.req.header('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    await next()
    return
  }

  try {
    const body = await c.req.json()

    if (body && typeof body === 'object') {
      // Normalize scoreId field if present
      if (body.scoreId && typeof body.scoreId === 'string') {
        body.scoreId = normalizeExistingScoreId(body.scoreId)
      }

      // Normalize pieces array if present (for logbook entries)
      if (body.pieces && Array.isArray(body.pieces)) {
        body.pieces = body.pieces.map((piece: any) => {
          if (piece && typeof piece === 'object' && piece.title) {
            const scoreId = generateNormalizedScoreId(
              piece.title,
              piece.composer
            )
            return {
              ...piece,
              id: scoreId,
            }
          }
          return piece
        })
      }

      // Handle scoreTitle/scoreComposer fields (legacy format)
      if (body.scoreTitle && typeof body.scoreTitle === 'string') {
        const scoreComposer = body.scoreComposer || ''
        body.scoreId = generateNormalizedScoreId(body.scoreTitle, scoreComposer)
      }

      // Store normalized body for handlers
      c.set('normalizedBody', body)
    }
  } catch (error) {
    // If JSON parsing fails, let the handler deal with it
    console.warn('Failed to parse request body for normalization:', error)
  }

  await next()
}

/**
 * Middleware to normalize scoreId in query parameters
 * Use this for GET requests with scoreId in query string
 */
export const normalizeScoreIdQuery = async (c: Context, next: Next) => {
  const scoreId = c.req.query('scoreId')

  if (scoreId) {
    const normalized = normalizeExistingScoreId(scoreId)

    // Store normalized version in context
    c.set('normalizedQueryScoreId', normalized)
  }

  await next()
}

/**
 * Combined middleware that normalizes scoreId from all sources
 * Use this when you want to handle params, body, and query all at once
 */
export const normalizeAllScoreIds = async (c: Context, next: Next) => {
  // Normalize URL parameters
  await normalizeScoreIdParam(c, async () => {})

  // Normalize request body
  await normalizeScoreIdBody(c, async () => {})

  // Normalize query parameters
  await normalizeScoreIdQuery(c, async () => {})

  await next()
}
