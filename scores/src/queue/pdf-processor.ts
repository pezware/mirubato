import { launch } from '@cloudflare/puppeteer'
import { R2Presigner } from '../utils/r2-presigner'
import { PdfCacheManager } from '../utils/pdfCache'
import { generatePdfHtmlTemplate } from '../utils/pdfHtmlTemplate'
import { CloudflareAiExtractor } from '../services/cloudflareAiExtractor'
import { ImageAnalysisRequest } from '../types/ai'

interface ProcessPdfMessage {
  type: 'process-new-score'
  scoreId: string
  r2Key: string
  uploadedAt: string
}

export async function processPdfScore(message: ProcessPdfMessage, env: Env) {
  const { scoreId, r2Key } = message

  // Starting PDF processing for score

  const cacheManager = new PdfCacheManager(env.CACHE)
  let documentHash: string | undefined

  try {
    // Generate document hash for caching
    documentHash = await cacheManager.generateCacheKey(r2Key, env)

    // Check if already processed
    if (await cacheManager.isProcessedRecently(documentHash)) {
      // Score already processed recently, skipping
      await updateScoreStatus(env, scoreId, 'completed')
      return
    }

    // Update status to processing
    await updateScoreStatus(env, scoreId, 'processing')
    await cacheManager.updateStatus(documentHash, 'processing')

    // Generate presigned URL for the PDF
    const presigner = new R2Presigner(env)
    const pdfUrl = await presigner.generatePresignedUrl(r2Key)

    // Analyze PDF to get page count
    const { pageCount } = await analyzePdf(env, pdfUrl)
    // PDF has multiple pages

    // Create score version entry
    await createScoreVersion(env, scoreId, r2Key, pageCount)

    // Process pages in batches to avoid timeout
    const batchSize = 5
    for (let i = 0; i < pageCount; i += batchSize) {
      const batch = []
      for (let j = i; j < Math.min(i + batchSize, pageCount); j++) {
        batch.push(renderAndStorePage(env, scoreId, pdfUrl, j + 1))
      }

      // Process batch in parallel
      await Promise.all(batch)
      // Processed batch of pages
    }

    // Update status to completed
    await updateScoreStatus(env, scoreId, 'completed')
    await cacheManager.setMetadata(documentHash, {
      status: 'completed',
      pageCount,
      r2Prefix: `rendered/${scoreId}/`,
      lastUpdated: new Date().toISOString(),
      processingCompletedAt: new Date().toISOString(),
    })
    // Completed processing score
  } catch (error) {
    console.error(`Failed to process score ${scoreId}:`, error)
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    await updateScoreStatus(env, scoreId, 'failed', errorMessage)

    // Update cache with failure status if we have a hash
    if (documentHash) {
      await cacheManager.updateStatus(documentHash, 'failed', errorMessage)
    }

    throw error
  }
}

async function analyzePdf(
  env: Env,
  pdfUrl: string
): Promise<{ pageCount: number }> {
  const browser = await launch(env.BROWSER, { keep_alive: 60000 }) // 60 seconds

  try {
    const page = await browser.newPage()

    // Simple HTML to load PDF and get page count
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs"></script>
        <script>
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
          
          async function analyze() {
            try {
              const pdf = await pdfjsLib.getDocument('${pdfUrl}').promise;
              window.pdfInfo = {
                pageCount: pdf.numPages
              };
            } catch (error) {
              window.pdfError = error.message;
            }
          }
          
          analyze();
        </script>
      </head>
      <body></body>
      </html>
    `

    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    // Wait for analysis
    await page.waitForFunction(
      'window.pdfInfo !== undefined || window.pdfError !== undefined',
      { timeout: 10000 }
    )

    const result = await page.evaluate(() => {
      const global = globalThis as any
      return {
        info: global.pdfInfo,
        error: global.pdfError,
      }
    })

    if (result.error) {
      throw new Error(`PDF analysis failed: ${result.error}`)
    }

    return { pageCount: result.info.pageCount }
  } finally {
    await browser.close()
  }
}

async function renderAndStorePage(
  env: Env,
  scoreId: string,
  pdfUrl: string,
  pageNumber: number
): Promise<void> {
  const browser = await launch(env.BROWSER, { keep_alive: 120000 }) // 2 minutes

  try {
    const page = await browser.newPage()

    // Set viewport for high quality rendering
    await page.setViewport({
      width: 1200,
      height: 1697, // A4 ratio
      deviceScaleFactor: 2,
    })

    // Render page with shared template
    const html = generatePdfHtmlTemplate({
      pdfUrl,
      pageNumber,
      scale: 2.0, // High quality
      quality: 'simple',
    })

    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    // Wait for render
    await page.waitForFunction(
      'window.renderComplete === true || window.renderError !== undefined',
      { timeout: 15000 }
    )

    // Check for errors
    const error = await page.evaluate(() => {
      const global = globalThis as any
      return global.renderError
    })
    if (error) {
      throw new Error(`Page render error: ${error}`)
    }

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'webp',
      quality: 90,
      fullPage: true,
    })

    // Store in R2
    const key = `rendered/${scoreId}/page-${pageNumber}.webp`
    await env.SCORES_BUCKET.put(key, screenshot, {
      httpMetadata: {
        contentType: 'image/webp',
      },
    })

    // For the first page, perform AI analysis if Cloudflare AI is available
    if (pageNumber === 1 && env.AI) {
      try {
        console.log('Performing AI visual analysis on first page')

        // Convert webp to base64 for AI analysis
        const base64Image = btoa(
          String.fromCharCode(...new Uint8Array(screenshot))
        )

        const aiExtractor = new CloudflareAiExtractor(env.AI as any)
        const analysisRequest: ImageAnalysisRequest = {
          imageData: base64Image,
          mimeType: 'image/webp',
          analysisType: 'score-metadata',
        }

        const visualAnalysis =
          await aiExtractor.extractFromImage(analysisRequest)

        // Store visual analysis results in the database
        if (visualAnalysis.confidence > 0.5) {
          await env.DB.prepare(
            `UPDATE scores 
             SET visual_analysis = ?, 
                 visual_confidence = ?,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`
          )
            .bind(
              JSON.stringify(visualAnalysis),
              visualAnalysis.confidence,
              scoreId
            )
            .run()

          console.log(
            'Visual analysis stored with confidence:',
            visualAnalysis.confidence
          )
        }
      } catch (error) {
        console.error('Visual analysis failed:', error)
        // Don't fail the whole process if AI analysis fails
      }
    }
  } finally {
    await browser.close()
  }
}

async function updateScoreStatus(
  env: Env,
  scoreId: string,
  status: string,
  error?: string
): Promise<void> {
  await env.DB.prepare(
    'UPDATE scores SET processing_status = ?, processing_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
    .bind(status, error || null, scoreId)
    .run()
}

async function createScoreVersion(
  env: Env,
  scoreId: string,
  r2Key: string,
  pageCount: number
): Promise<void> {
  const id = crypto.randomUUID()

  await env.DB.prepare(
    `INSERT INTO score_versions (
      id, score_id, format, r2_key, page_count, processing_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  )
    .bind(id, scoreId, 'pdf', r2Key, pageCount, 'completed')
    .run()
}
