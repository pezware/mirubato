import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

const adminHandler = new Hono<{ Bindings: Env }>()

// Admin endpoint to reprocess imported PDFs
adminHandler.post('/reprocess-imports', async c => {
  try {
    // Check for admin authorization
    const authHeader = c.req.header('Authorization')
    const adminToken = c.env.ADMIN_TOKEN

    if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }

    const { dryRun = true, limit = 10 } = await c.req.json<{
      dryRun?: boolean
      limit?: number
    }>()

    // Find scores that were imported but might not have rendered pages
    const scores = await c.env.DB.prepare(
      `SELECT id, slug, title, source, processing_status, pdf_url, file_name, created_at
       FROM scores 
       WHERE source = 'manual' 
       AND processing_status = 'completed'
       ORDER BY created_at DESC
       LIMIT ?`
    )
      .bind(limit)
      .all()

    const scoresToReprocess = []

    // Check each score for rendered pages
    for (const score of scores.results || []) {
      const firstPageKey = `rendered/${score.id}/page-1.webp`

      try {
        const firstPage = await c.env.SCORES_BUCKET.head(firstPageKey)

        if (!firstPage) {
          scoresToReprocess.push({
            id: score.id as string,
            title: score.title as string,
            slug: score.slug as string,
            pdf_url: score.pdf_url as string,
            created_at: score.created_at as string,
          })
        }
      } catch (error) {
        // If we can't check, assume it needs reprocessing
        scoresToReprocess.push({
          id: score.id as string,
          title: score.title as string,
          slug: score.slug as string,
          pdf_url: score.pdf_url as string,
          created_at: score.created_at as string,
          checkError: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    if (dryRun) {
      return c.json({
        success: true,
        dryRun: true,
        message: `Found ${scoresToReprocess.length} scores that need reprocessing`,
        scores: scoresToReprocess,
      })
    }

    // Process the scores
    const results = {
      processed: 0,
      failed: 0,
      errors: [] as Array<{ scoreId: string; error: string }>,
    }

    for (const score of scoresToReprocess) {
      try {
        // Update status to pending
        await c.env.DB.prepare(
          'UPDATE scores SET processing_status = ? WHERE id = ?'
        )
          .bind('pending', score.id)
          .run()

        // Extract R2 key from pdf_url
        const r2Key = (score.pdf_url as string).replace('/files/', '')

        // Queue for processing
        if (c.env.PDF_QUEUE) {
          await c.env.PDF_QUEUE.send({
            type: 'process-new-score',
            scoreId: score.id as string,
            r2Key: r2Key,
            uploadedAt: score.created_at as string,
          })
        }

        results.processed++
      } catch (error) {
        results.failed++
        results.errors.push({
          scoreId: score.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return c.json({
      success: true,
      dryRun: false,
      message: `Reprocessed ${results.processed} scores`,
      results,
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error

    console.error('Admin reprocess error:', error)
    throw new HTTPException(500, {
      message: 'Failed to reprocess imports',
    })
  }
})

// Get processing status for a specific score
adminHandler.get('/score-status/:id', async c => {
  try {
    const authHeader = c.req.header('Authorization')
    const adminToken = c.env.ADMIN_TOKEN

    if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }

    const scoreId = c.req.param('id')

    // Get score details
    const score = await c.env.DB.prepare('SELECT * FROM scores WHERE id = ?')
      .bind(scoreId)
      .first()

    if (!score) {
      throw new HTTPException(404, { message: 'Score not found' })
    }

    // Check for rendered pages
    const renderedPages = []
    let pageNumber = 1
    let hasMorePages = true

    while (hasMorePages && pageNumber <= 100) {
      const pageKey = `rendered/${scoreId}/page-${pageNumber}.webp`

      try {
        const page = await c.env.SCORES_BUCKET.head(pageKey)
        if (page) {
          renderedPages.push({
            page: pageNumber,
            key: pageKey,
            size: page.size,
            uploaded: page.uploaded,
          })
          pageNumber++
        } else {
          hasMorePages = false
        }
      } catch {
        hasMorePages = false
      }
    }

    // Check PDF file
    const r2Key = (score.pdf_url as string).replace('/files/', '')
    let pdfInfo = null

    try {
      const pdf = await c.env.SCORES_BUCKET.head(r2Key)
      if (pdf) {
        pdfInfo = {
          key: r2Key,
          size: pdf.size,
          uploaded: pdf.uploaded,
        }
      }
    } catch (error) {
      console.error('Failed to check PDF:', error)
    }

    return c.json({
      success: true,
      score: {
        id: score.id as string,
        title: score.title as string,
        processing_status: score.processing_status as string,
        source: score.source as string,
        created_at: score.created_at as string,
      },
      pdf: pdfInfo,
      renderedPages: {
        count: renderedPages.length,
        pages: renderedPages,
      },
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error

    console.error('Admin status error:', error)
    throw new HTTPException(500, {
      message: 'Failed to get score status',
    })
  }
})

export { adminHandler }
