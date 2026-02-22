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
    // Get the body - check if it's already been parsed by validation middleware
    let body = c.get('validatedBody')

    if (!body) {
      // If not validated yet, get the raw body
      body = await c.req.json()
    }

    if (body && typeof body === 'object') {
      // Create a normalized copy to avoid mutating the original
      const normalizedBody = { ...body }

      // For sync endpoints, normalize within the changes object
      if (normalizedBody.changes) {
        const changes = normalizedBody.changes

        // Normalize entries within changes
        if (changes.entries && Array.isArray(changes.entries)) {
          changes.entries = changes.entries.map(
            (entry: Record<string, unknown>) => {
              const normalizedEntry = { ...entry }

              // Normalize pieces array in each entry
              if (
                normalizedEntry.pieces &&
                Array.isArray(normalizedEntry.pieces)
              ) {
                normalizedEntry.pieces = normalizedEntry.pieces.map(
                  (piece: Record<string, unknown>) => {
                    if (piece && typeof piece === 'object' && piece.title) {
                      const scoreId = generateNormalizedScoreId(
                        piece.title as string,
                        piece.composer as string | undefined
                      )
                      return {
                        ...piece,
                        id: scoreId,
                      }
                    }
                    return piece
                  }
                )
              }

              // Normalize scoreId field if present
              if (
                normalizedEntry.scoreId &&
                typeof normalizedEntry.scoreId === 'string'
              ) {
                normalizedEntry.scoreId = normalizeExistingScoreId(
                  normalizedEntry.scoreId
                )
              }

              // Handle scoreTitle/scoreComposer fields (legacy format)
              if (
                normalizedEntry.scoreTitle &&
                typeof normalizedEntry.scoreTitle === 'string'
              ) {
                const scoreComposer =
                  (normalizedEntry.scoreComposer as string) || ''
                normalizedEntry.scoreId = generateNormalizedScoreId(
                  normalizedEntry.scoreTitle as string,
                  scoreComposer
                )
              }

              return normalizedEntry
            }
          )
        }
      }

      // For non-sync endpoints, normalize at top level
      else {
        // Normalize scoreId field if present
        if (
          normalizedBody.scoreId &&
          typeof normalizedBody.scoreId === 'string'
        ) {
          normalizedBody.scoreId = normalizeExistingScoreId(
            normalizedBody.scoreId
          )
        }

        // Normalize pieces array if present (for logbook entries)
        if (normalizedBody.pieces && Array.isArray(normalizedBody.pieces)) {
          normalizedBody.pieces = normalizedBody.pieces.map(
            (piece: Record<string, unknown>) => {
              if (piece && typeof piece === 'object' && piece.title) {
                const scoreId = generateNormalizedScoreId(
                  piece.title as string,
                  piece.composer as string | undefined
                )
                return {
                  ...piece,
                  id: scoreId,
                }
              }
              return piece
            }
          )
        }

        // Handle scoreTitle/scoreComposer fields (legacy format)
        if (
          normalizedBody.scoreTitle &&
          typeof normalizedBody.scoreTitle === 'string'
        ) {
          const scoreComposer = normalizedBody.scoreComposer || ''
          normalizedBody.scoreId = generateNormalizedScoreId(
            normalizedBody.scoreTitle,
            scoreComposer
          )
        }
      }

      // Store normalized body for handlers to use
      c.set('normalizedBody', normalizedBody)
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
