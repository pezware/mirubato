import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../../index'
import type { Variables } from '../middleware'
import { getCanonicalComposerName } from '../../services/composerCanonicalizer'

export const autocompleteHandler = new Hono<{
  Bindings: Env
  Variables: Variables
}>()

interface AutocompleteResult {
  value: string
  label: string
  metadata?: {
    gradeLevel?: number
    instrument?: string
    composer?: string
  }
}

// Helper function to search user's practice history
async function searchUserHistory(
  db: D1Database,
  userId: string,
  entityType: 'composer' | 'piece',
  query: string
): Promise<Set<string>> {
  const results = new Set<string>()

  try {
    // Query sync_data table for user's logbook entries
    const { results: entries } = await db
      .prepare(
        `SELECT data FROM sync_data 
         WHERE user_id = ? AND entity_type = 'logbook_entry' 
         AND deleted_at IS NULL`
      )
      .bind(userId)
      .all()

    // Parse each entry and extract composers/pieces
    for (const entry of entries) {
      const data = JSON.parse(entry.data as string)
      if (data.pieces && Array.isArray(data.pieces)) {
        for (const piece of data.pieces) {
          if (entityType === 'composer' && piece.composer) {
            if (piece.composer.toLowerCase().includes(query.toLowerCase())) {
              results.add(piece.composer)
            }
          } else if (entityType === 'piece' && piece.title) {
            if (piece.title.toLowerCase().includes(query.toLowerCase())) {
              results.add(piece.title)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error searching user history:', error)
  }

  return results
}

// GET /api/autocomplete/composers
autocompleteHandler.get('/composers', async c => {
  try {
    const query = c.req.query('q') || ''
    const limit = parseInt(c.req.query('limit') || '10')

    if (query.length < 2) {
      return c.json({ results: [] })
    }

    const results: AutocompleteResult[] = []
    const addedCanonicalNames = new Set<string>() // Track canonical names to avoid duplicates

    // Get user ID from JWT if authenticated
    const userId = c.get('userId') as string | undefined

    // Search user's history if authenticated
    if (userId) {
      const userComposers = await searchUserHistory(
        c.env.DB,
        userId,
        'composer',
        query
      )

      for (const composer of userComposers) {
        // Get canonical name for the composer
        const canonicalName = getCanonicalComposerName(composer) || composer

        // Only add if we haven't added this canonical name yet
        if (!addedCanonicalNames.has(canonicalName)) {
          results.push({
            value: canonicalName,
            label: canonicalName,
          })
          addedCanonicalNames.add(canonicalName)
        }
      }
    }

    // Search KV cache for pre-populated composers
    const kvSearchKey = `composer:search:${query.toLowerCase()}`
    const cachedResults = await c.env.MUSIC_CATALOG.get(kvSearchKey, 'json')

    if (cachedResults && Array.isArray(cachedResults)) {
      for (const composer of cachedResults) {
        // Get canonical name
        const canonicalName = getCanonicalComposerName(composer) || composer

        // Avoid duplicates based on canonical name
        if (!addedCanonicalNames.has(canonicalName)) {
          results.push({
            value: canonicalName,
            label: canonicalName,
          })
          addedCanonicalNames.add(canonicalName)
        }
      }
    } else {
      // Fallback: List all composers and filter
      // In production, this would be pre-indexed for better performance
      const allComposersKey = 'composers:all'
      const allComposers =
        ((await c.env.MUSIC_CATALOG.get(
          allComposersKey,
          'json'
        )) as string[]) || []

      for (const composer of allComposers) {
        // Check if the canonical name or original matches the query
        const canonicalName = getCanonicalComposerName(composer) || composer

        if (
          canonicalName.toLowerCase().includes(query.toLowerCase()) ||
          composer.toLowerCase().includes(query.toLowerCase())
        ) {
          // Avoid duplicates based on canonical name
          if (!addedCanonicalNames.has(canonicalName)) {
            results.push({
              value: canonicalName,
              label: canonicalName,
            })
            addedCanonicalNames.add(canonicalName)
          }
        }
      }

      // Cache the search results for 1 hour
      if (results.length > 0) {
        await c.env.MUSIC_CATALOG.put(
          kvSearchKey,
          JSON.stringify(results.map(r => r.value)),
          { expirationTtl: 3600 }
        )
      }
    }

    // Sort results: user's history first, then alphabetically
    results.sort((a, b) => a.label.localeCompare(b.label))

    return c.json({
      results: results.slice(0, limit),
      total: results.length,
    })
  } catch (error) {
    console.error('Autocomplete composers error:', error)
    throw new HTTPException(500, {
      message: 'Failed to fetch composer suggestions',
    })
  }
})

// GET /api/autocomplete/pieces
autocompleteHandler.get('/pieces', async c => {
  try {
    const query = c.req.query('q') || ''
    const limit = parseInt(c.req.query('limit') || '10')
    const composer = c.req.query('composer') // Optional filter by composer

    if (query.length < 2) {
      return c.json({ results: [] })
    }

    const results: AutocompleteResult[] = []

    // Get user ID from JWT if authenticated
    const userId = c.get('userId') as string | undefined

    // Search user's history if authenticated
    if (userId) {
      const userPieces = await searchUserHistory(
        c.env.DB,
        userId,
        'piece',
        query
      )

      for (const piece of userPieces) {
        results.push({
          value: piece,
          label: piece,
        })
      }
    }

    // Search KV cache for pre-populated pieces
    const kvSearchKey = composer
      ? `piece:search:${composer.toLowerCase()}:${query.toLowerCase()}`
      : `piece:search:${query.toLowerCase()}`
    const cachedResults = await c.env.MUSIC_CATALOG.get(kvSearchKey, 'json')

    if (cachedResults && Array.isArray(cachedResults)) {
      for (const piece of cachedResults) {
        // Avoid duplicates
        if (!results.some(r => r.value === piece.title)) {
          results.push({
            value: piece.title,
            label: piece.title,
            metadata: {
              composer: piece.composer,
              gradeLevel: piece.gradeLevel,
              instrument: piece.instrument,
            },
          })
        }
      }
    } else {
      // Fallback: Search all pieces
      const allPiecesKey = composer
        ? `pieces:by-composer:${composer.toLowerCase()}`
        : 'pieces:all'
      const allPieces =
        ((await c.env.MUSIC_CATALOG.get(allPiecesKey, 'json')) as any[]) || []

      const filteredPieces = []
      for (const piece of allPieces) {
        // Search in both title and composer
        const titleMatches =
          piece.title && piece.title.toLowerCase().includes(query.toLowerCase())
        const composerMatches =
          piece.composer &&
          piece.composer.toLowerCase().includes(query.toLowerCase())

        if (titleMatches || composerMatches) {
          if (!results.some(r => r.value === piece.title)) {
            filteredPieces.push(piece)
            results.push({
              value: piece.title,
              label: piece.title,
              metadata: {
                composer: piece.composer,
                gradeLevel: piece.gradeLevel,
                instrument: piece.instrument,
              },
            })
          }
        }
      }

      // Cache the search results for 1 hour
      if (filteredPieces.length > 0) {
        await c.env.MUSIC_CATALOG.put(
          kvSearchKey,
          JSON.stringify(filteredPieces),
          { expirationTtl: 3600 }
        )
      }
    }

    // Sort results: user's history first, then by grade level, then alphabetically
    results.sort((a, b) => {
      // User's pieces (no metadata) come first
      if (!a.metadata && b.metadata) return -1
      if (a.metadata && !b.metadata) return 1

      // Then sort by grade level (easier pieces first)
      if (a.metadata?.gradeLevel && b.metadata?.gradeLevel) {
        const gradeDiff = a.metadata.gradeLevel - b.metadata.gradeLevel
        if (gradeDiff !== 0) return gradeDiff
      }

      // Finally, alphabetically
      return a.label.localeCompare(b.label)
    })

    return c.json({
      results: results.slice(0, limit),
      total: results.length,
    })
  } catch (error) {
    console.error('Autocomplete pieces error:', error)
    throw new HTTPException(500, {
      message: 'Failed to fetch piece suggestions',
    })
  }
})
