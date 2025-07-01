import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { RenderOptionsSchema, ApiResponse } from '../../types/api'
import { RenderedScore } from '../../types/score'
import {
  addCacheHeaders,
  getCachedResponse,
  cacheResponse,
  handleConditionalRequest,
} from '../../utils/cache'

export const renderHandler = new Hono<{ Bindings: Env }>()

// Mount under /scores/:id/render
renderHandler.get('/scores/:id/render', async c => {
  try {
    const scoreId = c.req.param('id')

    // Parse render options
    const options = RenderOptionsSchema.parse({
      format: c.req.query('format') || 'svg',
      scale: c.req.query('scale') ? parseFloat(c.req.query('scale')!) : 1,
      pageNumber: c.req.query('pageNumber')
        ? parseInt(c.req.query('pageNumber')!)
        : undefined,
      width: c.req.query('width') ? parseInt(c.req.query('width')!) : undefined,
      height: c.req.query('height')
        ? parseInt(c.req.query('height')!)
        : undefined,
      theme: c.req.query('theme') || 'light',
      showFingerings: c.req.query('showFingerings') === 'true',
      showNoteNames: c.req.query('showNoteNames') === 'true',
    })

    // Check if score exists
    const score = await c.env.DB.prepare('SELECT * FROM scores WHERE id = ?')
      .bind(scoreId)
      .first()

    if (!score) {
      throw new HTTPException(404, { message: 'Score not found' })
    }

    // Update analytics
    await c.env.DB.prepare(
      `
      INSERT INTO score_analytics (score_id, render_count, last_viewed_at)
      VALUES (?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(score_id) DO UPDATE SET
        render_count = render_count + 1,
        last_viewed_at = CURRENT_TIMESTAMP
    `
    )
      .bind(scoreId)
      .run()

    // TODO: Implement actual rendering logic
    // For now, return a placeholder response
    const renderedScore: RenderedScore = {
      format: options.format,
      data:
        options.format === 'svg'
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="10" y="50">Score rendering coming soon</text></svg>'
          : 'Rendering not yet implemented',
      pageCount: 1,
      dimensions: {
        width: options.width || 800,
        height: options.height || 600,
      },
    }

    const response: ApiResponse<RenderedScore> = {
      success: true,
      data: renderedScore,
      message: 'Score rendering is currently in development',
    }

    return c.json(response)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error rendering score:', error)
    throw new HTTPException(500, { message: 'Failed to render score' })
  }
})

// Simple PDF download handler for imported scores
renderHandler.get('/scores/:id/download/pdf', async c => {
  try {
    const scoreId = c.req.param('id')

    // Get score from database
    const score = await c.env.DB.prepare('SELECT * FROM scores WHERE id = ?')
      .bind(scoreId)
      .first<any>()

    if (!score) {
      throw new HTTPException(404, { message: 'Score not found' })
    }

    // If this is an imported score with pdf_url, serve it from R2
    if (score.pdf_url && score.pdf_url.startsWith('/files/')) {
      const r2Key = score.pdf_url.replace('/files/', '')
      const object = await c.env.SCORES_BUCKET.get(r2Key)

      if (!object) {
        throw new HTTPException(404, { message: 'PDF file not found' })
      }

      // Return the PDF with appropriate headers for viewing
      const headers = new Headers({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${score.file_name || 'score.pdf'}"`,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*', // Allow cross-origin requests for PDF viewer
      })

      return new Response(object.body, { headers })
    }

    // Fall back to original logic for non-imported scores
    // ... original download logic continues below
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error downloading PDF:', error)
    throw new HTTPException(500, { message: 'Failed to download PDF' })
  }
})

// Original download handler for multiple formats
renderHandler.get('/scores/:id/download/:format', async c => {
  try {
    // Check edge cache first
    const cachedResponse = await getCachedResponse(c.req.raw, c)
    if (cachedResponse) {
      return cachedResponse
    }

    const scoreId = c.req.param('id')
    const format = c.req.param('format')

    // Validate format
    if (!['pdf', 'musicxml', 'png', 'svg'].includes(format)) {
      throw new HTTPException(400, { message: 'Invalid format' })
    }

    // Check if score exists
    const score = await c.env.DB.prepare('SELECT * FROM scores WHERE id = ?')
      .bind(scoreId)
      .first()

    if (!score) {
      throw new HTTPException(404, { message: 'Score not found' })
    }

    // Check if version exists
    const version = await c.env.DB.prepare(
      'SELECT * FROM score_versions WHERE score_id = ? AND format = ?'
    )
      .bind(scoreId, format)
      .first()

    if (!version) {
      throw new HTTPException(404, {
        message: `Score not available in ${format} format`,
      })
    }

    // Update download analytics
    await c.env.DB.prepare(
      `
      INSERT INTO score_analytics (score_id, download_count, last_viewed_at)
      VALUES (?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(score_id) DO UPDATE SET
        download_count = download_count + 1,
        last_viewed_at = CURRENT_TIMESTAMP
    `
    )
      .bind(scoreId)
      .run()

    // Get file from R2
    const object = await c.env.SCORES_BUCKET.get(version.r2_key as string)

    if (!object) {
      throw new HTTPException(404, { message: 'File not found in storage' })
    }

    // Set appropriate headers
    const headers = new Headers()
    headers.set('Content-Type', getContentType(format))
    headers.set(
      'Content-Disposition',
      `attachment; filename="${(score as any).title.replace(/[^a-z0-9]/gi, '_')}.${format}"`
    )

    if (version.file_size_bytes) {
      headers.set('Content-Length', version.file_size_bytes.toString())
    }

    // Add R2 metadata if available
    if (object.httpEtag) {
      headers.set('ETag', object.httpEtag)
    }
    if (object.uploaded) {
      headers.set('Last-Modified', object.uploaded.toUTCString())
    }

    // Create response
    let response = new Response(object.body, { headers })

    // Add cache headers - score versions are immutable
    response = addCacheHeaders(response, getContentType(format), {
      isVersioned: true,
      isPublic: true,
    })

    // Handle conditional requests
    const conditionalResponse = handleConditionalRequest(c.req.raw, response)
    if (conditionalResponse) {
      return conditionalResponse
    }

    // Cache response at edge
    await cacheResponse(c.req.raw, response.clone(), c)

    return response
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error downloading score:', error)
    throw new HTTPException(500, { message: 'Failed to download score' })
  }
})

function getContentType(format: string): string {
  const contentTypes: Record<string, string> = {
    pdf: 'application/pdf',
    musicxml: 'application/vnd.recordare.musicxml+xml',
    png: 'image/png',
    svg: 'image/svg+xml',
    abc: 'text/vnd.abc',
  }
  return contentTypes[format] || 'application/octet-stream'
}
