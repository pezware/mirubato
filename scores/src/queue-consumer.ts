/**
 * Queue Consumer for Async Score Processing
 *
 * Handles:
 * - PDF preview generation
 * - IMSLP imports
 * - Metadata extraction
 */

import { BrowserRenderingService } from './services/browser-rendering'

interface ScoreProcessingJob {
  scoreId: string
  action:
    | 'generate-previews'
    | 'import-imslp'
    | 'download-imslp-pdf'
    | 'extract-metadata'
  data: any
}

export default {
  async queue(
    batch: MessageBatch<ScoreProcessingJob>,
    env: Env
  ): Promise<void> {
    const browserService = new BrowserRenderingService(env as any)

    for (const message of batch.messages) {
      const { scoreId, action, data } = message.body

      try {
        console.warn(`Processing job: ${action} for score ${scoreId}`)

        switch (action) {
          case 'generate-previews':
            await generatePreviews(scoreId, data, env, browserService)
            break

          case 'import-imslp':
            await importFromIMSLP(scoreId, data, env, browserService)
            break

          case 'download-imslp-pdf':
            await downloadIMSLPPDF(scoreId, data, env)
            break

          case 'extract-metadata':
            await extractMetadata(scoreId, data, env)
            break

          default:
            console.error(`Unknown action: ${action}`)
        }

        // Acknowledge successful processing
        message.ack()
      } catch (error) {
        console.error(
          `Failed to process job ${action} for score ${scoreId}:`,
          error
        )

        // Retry the message (will be retried based on queue configuration)
        message.retry()
      }
    }
  },
}

/**
 * Generate preview images for PDF pages
 */
async function generatePreviews(
  scoreId: string,
  data: { pdfUrl: string; r2Key: string },
  env: Env,
  browserService: BrowserRenderingService
): Promise<void> {
  console.warn(`Generating previews for score ${scoreId}`)

  try {
    // Generate previews for first 5 pages
    const previews = await browserService.generatePDFPreviews(data.pdfUrl, 5)

    let successCount = 0
    let pageCount = 0

    // Save preview images
    for (const preview of previews) {
      if (preview.success && preview.data) {
        await env.SCORES_BUCKET.put(
          `previews/${scoreId}/page-${preview.page}.png`,
          preview.data,
          {
            httpMetadata: { contentType: 'image/png' },
            customMetadata: {
              scoreId,
              page: preview.page.toString(),
              generatedAt: new Date().toISOString(),
            },
          }
        )
        successCount++
      }
      pageCount = preview.page
    }

    // Update score version with page count
    await env.DB.prepare(
      `
      UPDATE score_versions 
      SET page_count = ?, processing_status = ?
      WHERE score_id = ? AND format = 'pdf'
    `
    )
      .bind(pageCount, successCount > 0 ? 'completed' : 'failed', scoreId)
      .run()

    // Update analytics
    await env.DB.prepare(
      `
      INSERT INTO score_analytics (score_id, view_count, last_viewed_at)
      VALUES (?, 0, CURRENT_TIMESTAMP)
      ON CONFLICT(score_id) DO NOTHING
    `
    )
      .bind(scoreId)
      .run()

    console.warn(`Generated ${successCount} previews for score ${scoreId}`)
  } catch (error) {
    console.error(`Preview generation failed for score ${scoreId}:`, error)

    // Mark as failed
    await env.DB.prepare(
      `
      UPDATE score_versions 
      SET processing_status = 'failed', processing_error = ?
      WHERE score_id = ? AND format = 'pdf'
    `
    )
      .bind(
        error instanceof Error ? error.message : 'Processing failed',
        scoreId
      )
      .run()

    throw error
  }
}

/**
 * Import score from IMSLP
 */
async function importFromIMSLP(
  scoreId: string,
  data: { url: string },
  env: Env,
  browserService: BrowserRenderingService
): Promise<void> {
  console.warn(`Importing from IMSLP for score ${scoreId}`)

  try {
    // Scrape IMSLP page
    const metadata = await browserService.scrapeIMSLP(data.url)

    // Update score with scraped metadata
    const updates = []
    const params = []

    if (metadata.title) {
      updates.push('title = ?')
      params.push(metadata.title)
    }

    if (metadata.composer) {
      updates.push('composer = ?')
      params.push(metadata.composer)
    }

    if (metadata.opus) {
      updates.push('opus = ?')
      params.push(metadata.opus)
    }

    if (metadata.year) {
      updates.push('metadata = json_set(metadata, "$.year", ?)')
      params.push(metadata.year)
    }

    if (updates.length > 0) {
      params.push(scoreId)
      await env.DB.prepare(
        `UPDATE scores SET ${updates.join(', ')} WHERE id = ?`
      )
        .bind(...params)
        .run()
    }

    // If PDF links found, queue for download
    if (metadata.pdfLinks && metadata.pdfLinks.length > 0 && env.SCORE_QUEUE) {
      await env.SCORE_QUEUE.send({
        scoreId,
        action: 'download-imslp-pdf',
        data: {
          imslpUrl: data.url,
          pdfLinks: metadata.pdfLinks,
        },
      })
    }

    console.warn(`IMSLP import completed for score ${scoreId}`)
  } catch (error) {
    console.error(`IMSLP import failed for score ${scoreId}:`, error)
    throw error
  }
}

/**
 * Download PDF from IMSLP
 */
async function downloadIMSLPPDF(
  scoreId: string,
  data: { imslpUrl: string; pdfLinks: any[] },
  env: Env
): Promise<void> {
  console.warn(`Downloading PDF for score ${scoreId}`)

  try {
    // Find the first valid PDF link
    let pdfUrl = null
    for (const link of data.pdfLinks) {
      if (
        link.href &&
        (link.href.includes('.pdf') || link.href.includes('/api.php?'))
      ) {
        pdfUrl = link.href
        if (!pdfUrl.startsWith('http')) {
          pdfUrl = new URL(pdfUrl, data.imslpUrl).href
        }
        break
      }
    }

    if (!pdfUrl) {
      throw new Error('No valid PDF link found')
    }

    // Download PDF
    const response = await fetch(pdfUrl)
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`)
    }

    const pdfData = await response.arrayBuffer()

    // Save to R2
    const r2Key = `scores/${scoreId}/original.pdf`
    await env.SCORES_BUCKET.put(r2Key, pdfData, {
      httpMetadata: {
        contentType: 'application/pdf',
      },
      customMetadata: {
        scoreId,
        source: 'imslp',
        downloadedAt: new Date().toISOString(),
      },
    })

    // Create version entry
    const versionId = crypto.randomUUID()
    await env.DB.prepare(
      `
      INSERT INTO score_versions (
        id, score_id, format, r2_key, file_size_bytes, processing_status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
    )
      .bind(versionId, scoreId, 'pdf', r2Key, pdfData.byteLength, 'processing')
      .run()

    // Queue for preview generation
    if (env.SCORE_QUEUE) {
      await env.SCORE_QUEUE.send({
        scoreId,
        action: 'generate-previews',
        data: {
          pdfUrl: `https://scores.mirubato.com/api/scores/${scoreId}/download/pdf`,
          r2Key,
        },
      })
    }

    console.warn(`PDF downloaded successfully for score ${scoreId}`)
  } catch (error) {
    console.error(`PDF download failed for score ${scoreId}:`, error)
    throw error
  }
}

/**
 * Extract metadata from PDF using AI
 */
async function extractMetadata(
  scoreId: string,
  data: { r2Key: string },
  env: Env
): Promise<void> {
  console.warn(`Extracting metadata for score ${scoreId}`)

  try {
    // Get PDF from R2
    const pdf = await env.SCORES_BUCKET.get(data.r2Key)
    if (!pdf) {
      throw new Error('PDF not found in storage')
    }

    // TODO: Implement PDF text extraction
    // For now, we'll use AI to analyze the first page image

    if (env.AI) {
      // Get first page as image
      const browserService = new BrowserRenderingService(env as any)
      const pdfUrl = `https://scores.mirubato.com/files/${data.r2Key}`
      await browserService.pdfToImage(pdfUrl, 1)

      // Use AI to analyze the image
      // Note: This would require a vision model, which may not be available yet
      console.warn('AI metadata extraction not yet implemented')
    }

    console.warn(`Metadata extraction completed for score ${scoreId}`)
  } catch (error) {
    console.error(`Metadata extraction failed for score ${scoreId}:`, error)
    throw error
  }
}
