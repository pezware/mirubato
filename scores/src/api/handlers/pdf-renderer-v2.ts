import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { launch } from '@cloudflare/puppeteer'
import { R2Presigner } from '../../utils/r2-presigner'
import { z } from 'zod'
import { rateLimiters } from '../../middleware/rateLimiter'
import { generatePdfHtmlTemplate } from '../../utils/pdfHtmlTemplate'
import {
  checkRenderError,
  checkCanvasHasContent,
} from '../../browser/pdf-page-evaluations'

export const pdfRendererV2Handler = new Hono<{ Bindings: Env }>()

// Input validation
const renderParamsSchema = z.object({
  scoreId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  pageNumber: z.number().int().positive(),
  width: z.number().int().min(100).max(4000).default(1200),
  format: z.enum(['webp', 'png', 'jpeg']).default('webp'),
  quality: z.number().int().min(1).max(100).default(85),
})

// Main render endpoint
pdfRendererV2Handler.get(
  '/render/:scoreId/page/:pageNumber',
  rateLimiters.perScore,
  async c => {
    try {
      // Validate inputs
      const params = renderParamsSchema.parse({
        scoreId: c.req.param('scoreId'),
        pageNumber: parseInt(c.req.param('pageNumber')),
        width: parseInt(c.req.query('width') || '1200'),
        format: c.req.query('format'),
        quality: parseInt(c.req.query('quality') || '85'),
      })

      // Check if pre-rendered version exists
      const preRenderedKey = `rendered/${params.scoreId}/page-${params.pageNumber}.${params.format}`
      const cached = await c.env.SCORES_BUCKET.get(preRenderedKey)

      if (cached) {
        // Return pre-rendered image
        return new Response(cached.body, {
          headers: {
            'Content-Type': `image/${params.format}`,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Cache-Status': 'HIT',
          },
        })
      }

      // Check Browser Rendering availability
      if (!c.env.BROWSER) {
        // Development fallback - return a placeholder
        return generatePlaceholder(params.scoreId, params.pageNumber)
      }

      // Get PDF URL
      const pdfUrl = await getPdfUrl(params.scoreId, c.env)

      // Render the page
      const image = await renderPage(c.env.BROWSER, pdfUrl, params)

      // Store pre-rendered version for next time
      c.executionCtx.waitUntil(
        c.env.SCORES_BUCKET.put(preRenderedKey, image, {
          httpMetadata: {
            contentType: `image/${params.format}`,
          },
        })
      )

      return new Response(image, {
        headers: {
          'Content-Type': `image/${params.format}`,
          'Cache-Control': 'public, max-age=3600',
          'X-Cache-Status': 'MISS',
        },
      })
    } catch (error) {
      console.error('PDF render error:', error)

      if (error instanceof z.ZodError) {
        throw new HTTPException(400, { message: 'Invalid parameters' })
      }

      if (error instanceof HTTPException) throw error

      throw new HTTPException(500, {
        message: `Failed to render PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }
)

// Get PDF URL for a score
async function getPdfUrl(scoreId: string, env: Env): Promise<string> {
  // Special handling for test scores
  if (scoreId.startsWith('test_')) {
    const testPdfMap: Record<string, string> = {
      test_aire_sureno: 'test-data/score_01.pdf',
      test_romance_anonimo: 'test-data/score_02.pdf',
    }

    const r2Key = testPdfMap[scoreId]
    if (!r2Key) {
      throw new HTTPException(404, { message: 'Test score not found' })
    }

    const presigner = new R2Presigner(env)
    return await presigner.generatePresignedUrl(r2Key)
  }

  // Get from database for real scores
  const scoreVersion = await env.DB.prepare(
    'SELECT r2_key FROM score_versions WHERE score_id = ? AND format = ? AND processing_status = ?'
  )
    .bind(scoreId, 'pdf', 'completed')
    .first<{ r2_key: string }>()

  if (!scoreVersion) {
    throw new HTTPException(404, {
      message: 'Score not found or not yet processed',
    })
  }

  const presigner = new R2Presigner(env)
  return await presigner.generatePresignedUrl(scoreVersion.r2_key)
}

// Render a single page with optimized settings
async function renderPage(
  browserBinding: Env['BROWSER'],
  pdfUrl: string,
  params: z.infer<typeof renderParamsSchema>
): Promise<ArrayBuffer> {
  const browser = await launch(browserBinding, {
    // Keep browser alive for 5 minutes for complex PDFs
    keep_alive: 300000, // 5 minutes in milliseconds
  })

  try {
    const page = await browser.newPage()

    // Set viewport
    await page.setViewport({
      width: params.width,
      height: Math.floor(params.width * 1.414), // A4 ratio
      deviceScaleFactor: 1,
    })

    // Calculate scale based on desired width
    const scale = params.width / 612 // Standard PDF width is 612 points

    // Generate HTML with shared template
    const html = generatePdfHtmlTemplate({
      pdfUrl,
      pageNumber: params.pageNumber,
      scale,
      quality: 'simple',
    })

    // Load the page
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
    })

    // Wait for render completion with multiple strategies
    try {
      await Promise.race([
        // Wait for success signal
        page.waitForFunction('window.renderComplete === true', {
          timeout: 8000, // 8 second timeout for rendering
        }),
        // Or wait for error signal
        page.waitForFunction('window.renderError !== undefined', {
          timeout: 8000,
        }),
      ])

      // Check if there was an error
      const renderError = await page.evaluate(checkRenderError)
      if (renderError) {
        throw new Error(`PDF.js error: ${renderError}`)
      }
    } catch {
      // If timeout, check if canvas has content
      const hasContent = await page.evaluate(checkCanvasHasContent)

      if (!hasContent) {
        throw new Error('PDF rendering timeout - no content rendered')
      }

      // Canvas has content, proceed despite timeout
      console.warn('Render timeout but canvas has content, proceeding...')
    }

    // Take screenshot of the canvas element
    const canvas = await page.$('#pdf-canvas')
    if (!canvas) {
      throw new Error('Canvas element not found')
    }

    const screenshot = await canvas.screenshot({
      type: params.format as 'png' | 'jpeg' | 'webp',
      quality: params.format === 'png' ? undefined : params.quality,
    })

    // Convert Buffer to ArrayBuffer if needed
    if (screenshot instanceof Buffer) {
      return screenshot.buffer.slice(
        screenshot.byteOffset,
        screenshot.byteOffset + screenshot.byteLength
      )
    }
    return screenshot as ArrayBuffer
  } finally {
    await browser.close()
  }
}

// Generate placeholder for development
function generatePlaceholder(scoreId: string, pageNumber: number): Response {
  const svg = `
    <svg width="800" height="1131" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="1131" fill="#f5f5f5" stroke="#ddd" stroke-width="2"/>
      <text x="400" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#666">
        Score: ${scoreId}
      </text>
      <text x="400" y="440" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#888">
        Page ${pageNumber}
      </text>
      <text x="400" y="500" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#aaa">
        (Development Mode - No Browser Rendering)
      </text>
    </svg>
  `

  return new Response(svg.trim(), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache',
    },
  })
}

// Generate placeholder thumbnail for development
function generateThumbnailPlaceholder(scoreId: string): Response {
  const svg = `
    <svg width="400" height="566" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="566" fill="#f5f5f5" stroke="#ddd" stroke-width="1"/>
      <text x="200" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#888">
        ${scoreId.substring(0, 12)}...
      </text>
      <text x="200" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#aaa">
        (Thumbnail)
      </text>
    </svg>
  `

  return new Response(svg.trim(), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache',
    },
  })
}

// Thumbnail configuration (must match pdf-processor.ts)
const THUMBNAIL_WIDTH = 400

// Thumbnail endpoint - optimized for grid view
pdfRendererV2Handler.get('/thumbnail/:scoreId', async c => {
  try {
    const scoreId = c.req.param('scoreId')

    // Validate score ID
    if (!/^[a-zA-Z0-9_-]+$/.test(scoreId)) {
      throw new HTTPException(400, { message: 'Invalid score ID format' })
    }

    // Check for pre-generated thumbnail in R2
    const thumbnailKey = `thumbnails/${scoreId}/thumb.webp`
    const cached = await c.env.SCORES_BUCKET.get(thumbnailKey)

    if (cached) {
      // Return pre-generated thumbnail
      return new Response(cached.body, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Cache-Status': 'HIT',
        },
      })
    }

    // If no pre-generated thumbnail, check if Browser Rendering is available
    if (!c.env.BROWSER) {
      // Development fallback
      return generateThumbnailPlaceholder(scoreId)
    }

    // Generate thumbnail on-demand (fallback for older scores)
    const pdfUrl = await getPdfUrl(scoreId, c.env)

    const params = {
      scoreId,
      pageNumber: 1,
      width: THUMBNAIL_WIDTH,
      format: 'webp' as const,
      quality: 75,
    }

    const image = await renderPage(c.env.BROWSER, pdfUrl, params)

    // Store for next time (async, don't wait)
    c.executionCtx.waitUntil(
      c.env.SCORES_BUCKET.put(thumbnailKey, image, {
        httpMetadata: {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000, immutable',
        },
      })
    )

    return new Response(image, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=3600', // Shorter cache for on-demand generated
        'X-Cache-Status': 'MISS',
      },
    })
  } catch (error) {
    console.error('Thumbnail error:', error)

    if (error instanceof HTTPException) throw error

    throw new HTTPException(500, {
      message: `Failed to get thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})
