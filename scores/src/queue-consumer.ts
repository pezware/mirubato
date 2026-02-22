/**
 * Queue Consumer for Async Score Processing
 *
 * Handles:
 * - PDF preview generation
 * - IMSLP imports
 * - Metadata extraction
 */

import {
  BrowserRenderingService,
  type BrowserRenderingEnv,
} from './services/browser-rendering'
import { extractTextFromPdf } from './services/pdfTextExtractor'
import { PDFTextExtractionResult } from './types/ai'

interface GeneratePreviewsJob {
  scoreId: string
  action: 'generate-previews'
  data: { pdfUrl: string; r2Key: string }
}

interface ImportImslpJob {
  scoreId: string
  action: 'import-imslp'
  data: { url: string }
}

interface DownloadImslpPdfJob {
  scoreId: string
  action: 'download-imslp-pdf'
  data: { imslpUrl: string; pdfLinks: Array<{ href?: string }> }
}

interface ExtractMetadataJob {
  scoreId: string
  action: 'extract-metadata'
  data: { r2Key: string }
}

type ScoreProcessingJob =
  | GeneratePreviewsJob
  | ImportImslpJob
  | DownloadImslpPdfJob
  | ExtractMetadataJob

export default {
  async queue(
    batch: MessageBatch<ScoreProcessingJob>,
    env: Env
  ): Promise<void> {
    const browserService = new BrowserRenderingService(
      env as unknown as BrowserRenderingEnv
    )

    for (const message of batch.messages) {
      const job = message.body

      try {
        console.warn(`Processing job: ${job.action} for score ${job.scoreId}`)

        switch (job.action) {
          case 'generate-previews':
            await generatePreviews(job.scoreId, job.data, env, browserService)
            break

          case 'import-imslp':
            await importFromIMSLP(job.scoreId, job.data, env, browserService)
            break

          case 'download-imslp-pdf':
            await downloadIMSLPPDF(job.scoreId, job.data, env)
            break

          case 'extract-metadata':
            await extractMetadata(job.scoreId, job.data, env)
            break

          default:
            console.error(
              `Unknown action: ${(job as { action: string }).action}`
            )
        }

        // Acknowledge successful processing
        message.ack()
      } catch (error) {
        console.error(
          `Failed to process job ${job.action} for score ${job.scoreId}:`,
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
    if (metadata.pdfLinks && metadata.pdfLinks.length > 0 && env.PDF_QUEUE) {
      await env.PDF_QUEUE.send({
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
  data: { imslpUrl: string; pdfLinks: Array<{ href?: string }> },
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
    if (env.PDF_QUEUE) {
      const baseUrl = env.SCORES_URL || 'https://scores.mirubato.com'
      await env.PDF_QUEUE.send({
        scoreId,
        action: 'generate-previews',
        data: {
          pdfUrl: `${baseUrl}/api/scores/${scoreId}/download/pdf`,
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
 * Extract metadata from PDF using text extraction and AI
 * Implements issue #676: PDF text extraction in queue consumer
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

    const pdfArrayBuffer = await pdf.arrayBuffer()

    // Step 1: Extract text from PDF using pdfjs-dist
    let textExtractionResult: PDFTextExtractionResult
    try {
      textExtractionResult = await extractTextFromPdf(pdfArrayBuffer, {
        maxPages: 5, // Extract first 5 pages for metadata
        includePageBreaks: false,
        timeout: 15000,
      })

      // Handle soft failure (function returned success: false)
      if (!textExtractionResult.success) {
        console.warn(
          `Text extraction soft failure for score ${scoreId}: ${textExtractionResult.error || 'Unknown error'}`
        )
      } else {
        console.warn(
          `Text extraction succeeded for score ${scoreId}. ` +
            `Has embedded text: ${textExtractionResult.hasEmbeddedText}, ` +
            `Pages extracted: ${textExtractionResult.pagesExtracted}/${textExtractionResult.pageCount}`
        )
      }

      // Store extraction results in database (even for failures, to track status)
      await storeTextExtractionResults(env, scoreId, textExtractionResult)
    } catch (extractError) {
      console.error(`Text extraction error for score ${scoreId}:`, extractError)
      textExtractionResult = {
        success: false,
        text: '',
        pageCount: 0,
        pagesExtracted: 0,
        metadata: {},
        hasEmbeddedText: false,
        extractionMethod: 'pdfjs',
        error:
          extractError instanceof Error
            ? extractError.message
            : 'Unknown extraction error',
        extractedAt: new Date().toISOString(),
      }
    }

    // Step 2: Use PDF metadata if available (high confidence)
    if (
      textExtractionResult.metadata.title ||
      textExtractionResult.metadata.author
    ) {
      const updates: string[] = []
      const params: (string | null)[] = []

      if (textExtractionResult.metadata.title) {
        updates.push('title = COALESCE(NULLIF(title, ""), ?)')
        params.push(textExtractionResult.metadata.title)
      }

      if (textExtractionResult.metadata.author) {
        updates.push('composer = COALESCE(NULLIF(composer, ""), ?)')
        params.push(textExtractionResult.metadata.author)
      }

      if (updates.length > 0) {
        params.push(scoreId)
        await env.DB.prepare(
          `UPDATE scores SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        )
          .bind(...params)
          .run()

        console.warn(`Updated score ${scoreId} with PDF metadata`)
      }
    }

    // Step 3: Use AI for enhanced metadata extraction if available
    if (env.AI && textExtractionResult.hasEmbeddedText) {
      try {
        await extractMetadataWithAI(
          env,
          scoreId,
          textExtractionResult.text,
          data.r2Key
        )
      } catch (aiError) {
        console.error(
          `AI metadata extraction failed for score ${scoreId}:`,
          aiError
        )
        // Continue - text extraction still provides value
      }
    } else if (env.AI) {
      // Fallback to visual analysis for PDFs without embedded text
      const browserService = new BrowserRenderingService(
        env as unknown as BrowserRenderingEnv
      )
      const baseUrl = env.SCORES_URL || 'https://scores.mirubato.com'
      const pdfUrl = `${baseUrl}/files/${data.r2Key}`

      try {
        await browserService.pdfToImage(pdfUrl, 1)
        console.warn(
          `Visual analysis fallback triggered for score ${scoreId} (no embedded text)`
        )
      } catch (visualError) {
        console.error(
          `Visual analysis failed for score ${scoreId}:`,
          visualError
        )
      }
    }

    console.warn(`Metadata extraction completed for score ${scoreId}`)
  } catch (error) {
    console.error(`Metadata extraction failed for score ${scoreId}:`, error)
    throw error
  }
}

/**
 * Store text extraction results in the database
 */
async function storeTextExtractionResults(
  env: Env,
  scoreId: string,
  result: PDFTextExtractionResult
): Promise<void> {
  try {
    // Store extracted text and metadata in score_versions
    await env.DB.prepare(
      `UPDATE score_versions
       SET extracted_text = ?,
           pdf_metadata = ?,
           text_extraction_status = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE score_id = ? AND format = 'pdf'`
    )
      .bind(
        result.hasEmbeddedText ? result.text : null,
        JSON.stringify(result.metadata),
        result.success
          ? result.hasEmbeddedText
            ? 'completed'
            : 'no_text'
          : 'failed',
        scoreId
      )
      .run()
  } catch (error) {
    console.error(
      `Failed to store extraction results for score ${scoreId}:`,
      error
    )
    // Non-fatal - continue processing
  }
}

/**
 * Use AI to extract enhanced metadata from extracted text
 */
async function extractMetadataWithAI(
  env: Env,
  scoreId: string,
  extractedText: string,
  _r2Key: string
): Promise<void> {
  if (!env.AI || !extractedText) {
    return
  }

  try {
    // Use Cloudflare AI to analyze the extracted text
    const prompt = `Analyze this text extracted from sheet music and extract metadata.

Text from PDF:
"""
${extractedText.slice(0, 2000)}
"""

Extract and return as JSON:
{
  "title": "piece title",
  "composer": "composer name",
  "opus": "opus or catalog number if present",
  "instrument": "primary instrument",
  "difficulty": "beginner/intermediate/advanced",
  "stylePeriod": "baroque/classical/romantic/modern/contemporary",
  "year": composition year as number or null,
  "tags": ["relevant", "tags"],
  "description": "brief description"
}

Only include fields you can determine from the text. Return valid JSON only.`

    const response = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.1,
    })

    // Parse AI response
    const responseText = String(
      (response as { response?: string })?.response || ''
    )
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      let metadata: Record<string, unknown>
      try {
        metadata = JSON.parse(jsonMatch[0])
      } catch (parseError) {
        console.error(
          `Failed to parse AI JSON response for score ${scoreId}:`,
          parseError
        )
        return
      }

      // Update score with AI-extracted metadata
      const updates: string[] = []
      const params: (string | number | null)[] = []

      if (metadata.title) {
        updates.push('title = COALESCE(NULLIF(title, ""), ?)')
        params.push(String(metadata.title))
      }
      if (metadata.composer) {
        updates.push('composer = COALESCE(NULLIF(composer, ""), ?)')
        params.push(String(metadata.composer))
      }
      if (metadata.opus) {
        updates.push('opus = COALESCE(NULLIF(opus, ""), ?)')
        params.push(String(metadata.opus))
      }

      // Validate and normalize instrument (must be PIANO, GUITAR, or BOTH)
      if (metadata.instrument) {
        const normalizedInstrument = normalizeInstrument(
          String(metadata.instrument)
        )
        if (normalizedInstrument) {
          updates.push('instrument = COALESCE(NULLIF(instrument, ""), ?)')
          params.push(normalizedInstrument)
        }
      }

      // Validate and normalize difficulty (must be BEGINNER, INTERMEDIATE, or ADVANCED)
      if (metadata.difficulty) {
        const normalizedDifficulty = normalizeDifficulty(
          String(metadata.difficulty)
        )
        if (normalizedDifficulty) {
          updates.push('difficulty = COALESCE(NULLIF(difficulty, ""), ?)')
          params.push(normalizedDifficulty)
        }
      }

      // Store additional metadata as JSON
      if (
        metadata.stylePeriod ||
        metadata.year ||
        metadata.tags ||
        metadata.description
      ) {
        const additionalMetadata = {
          stylePeriod: metadata.stylePeriod,
          year: metadata.year,
          tags: metadata.tags,
          description: metadata.description,
          aiExtractedAt: new Date().toISOString(),
        }
        updates.push('metadata = json_patch(COALESCE(metadata, "{}"), ?)')
        params.push(JSON.stringify(additionalMetadata))
      }

      if (updates.length > 0) {
        params.push(scoreId)
        await env.DB.prepare(
          `UPDATE scores SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        )
          .bind(...params)
          .run()

        console.warn(`Updated score ${scoreId} with AI-extracted metadata`)
      }
    }
  } catch (error) {
    console.error(`AI text analysis failed for score ${scoreId}:`, error)
    // Non-fatal - text extraction still provides value
  }
}

/**
 * Normalize instrument value to match database constraints
 * @returns 'PIANO' | 'GUITAR' | 'BOTH' | null
 */
function normalizeInstrument(value: string): string | null {
  const lower = value.toLowerCase().trim()

  // Direct matches
  if (lower === 'piano' || lower === 'keyboard' || lower === 'pianoforte') {
    return 'PIANO'
  }
  if (lower === 'guitar' || lower === 'classical guitar') {
    return 'GUITAR'
  }
  if (lower === 'both') {
    return 'BOTH'
  }

  // Keyword detection
  const hasPiano = /piano|keyboard|klavier/.test(lower)
  const hasGuitar = /guitar|guitare|gitarre/.test(lower)

  if (hasPiano && hasGuitar) {
    return 'BOTH'
  }
  if (hasPiano) {
    return 'PIANO'
  }
  if (hasGuitar) {
    return 'GUITAR'
  }

  // Other instruments not supported by schema - return null
  return null
}

/**
 * Normalize difficulty value to match database constraints
 * @returns 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null
 */
function normalizeDifficulty(value: string): string | null {
  const lower = value.toLowerCase().trim()

  // Direct matches and synonyms
  if (
    lower === 'beginner' ||
    lower === 'easy' ||
    lower === 'elementary' ||
    lower === 'novice'
  ) {
    return 'BEGINNER'
  }
  if (lower === 'intermediate' || lower === 'medium' || lower === 'moderate') {
    return 'INTERMEDIATE'
  }
  if (
    lower === 'advanced' ||
    lower === 'hard' ||
    lower === 'difficult' ||
    lower === 'expert' ||
    lower === 'professional'
  ) {
    return 'ADVANCED'
  }

  // Not a recognized difficulty level
  return null
}
