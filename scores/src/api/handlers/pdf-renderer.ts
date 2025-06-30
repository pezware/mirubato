import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { launch } from '@cloudflare/puppeteer'
import { R2Presigner } from '../../utils/r2-presigner'
import { z } from 'zod'
import { rateLimiters } from '../../middleware/rateLimiter'
import {
  getErrorElementText,
  isPdfJsLoaded,
} from '../../browser/pdf-page-evaluations'

export const pdfRendererHandler = new Hono<{ Bindings: Env }>()

// PDF viewer HTML template
const PDF_VIEWER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF Viewer</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: #f5f5f5;
    }
    
    #pdf-container {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }
    
    #pdf-canvas {
      max-width: 100%;
      max-height: 100%;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      background: white;
    }
    
    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: Arial, sans-serif;
      font-size: 18px;
      color: #666;
    }
    
    #error {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: Arial, sans-serif;
      font-size: 18px;
      color: #d32f2f;
      text-align: center;
      padding: 20px;
      background: white;
      border: 2px solid #d32f2f;
      border-radius: 8px;
      display: none;
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js"></script>
  <script>
    // Configure PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
    
    // Signal when rendering is complete
    window.renderingComplete = false;
    
    // Parse query parameters
    const params = new URLSearchParams(window.location.search);
    const pdfUrl = params.get('url');
    const pageNumber = parseInt(params.get('page') || '1');
    const scale = parseFloat(params.get('scale') || '2.0');
    
    async function renderPDF() {
      const loadingEl = document.getElementById('loading');
      const errorEl = document.getElementById('error');
      const canvas = document.getElementById('pdf-canvas');
      const ctx = canvas.getContext('2d');
      
      if (!pdfUrl) {
        errorEl.textContent = 'No PDF URL provided';
        errorEl.style.display = 'block';
        loadingEl.style.display = 'none';
        return;
      }
      
      try {
        // Load the PDF
        loadingEl.textContent = 'Loading PDF...';
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        
        loadingTask.onProgress = function(progress) {
          if (progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            loadingEl.textContent = \`Loading PDF... \${percent}%\`;
          }
        };
        
        const pdf = await loadingTask.promise;
        
        // Check if page number is valid
        if (pageNumber < 1 || pageNumber > pdf.numPages) {
          throw new Error(\`Invalid page number. PDF has \${pdf.numPages} pages.\`);
        }
        
        // Get the page
        loadingEl.textContent = \`Rendering page \${pageNumber}...\`;
        const page = await pdf.getPage(pageNumber);
        
        // Set up the canvas
        const viewport = page.getViewport({ scale: scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render the page
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };
        
        const renderTask = page.render(renderContext);
        await renderTask.promise;
        
        // Hide loading message
        loadingEl.style.display = 'none';
        
        // Mark rendering as complete
        window.renderingComplete = true;
        
        // Dispatch event to signal completion
        window.dispatchEvent(new Event('pdf-rendered'));
        
      } catch (error) {
        console.error('Error rendering PDF:', error);
        errorEl.textContent = \`Error: \${error.message}\`;
        errorEl.style.display = 'block';
        loadingEl.style.display = 'none';
        
        // Dispatch error event
        window.dispatchEvent(new CustomEvent('pdf-error', { detail: error }));
      }
    }
    
    // Start rendering when page loads
    window.addEventListener('DOMContentLoaded', renderPDF);
  </script>
</head>
<body>
  <div id="pdf-container">
    <div id="loading">Initializing...</div>
    <div id="error"></div>
    <canvas id="pdf-canvas"></canvas>
  </div>
</body>
</html>`

// Input validation schemas
const scoreIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid score ID format')
const pageNumberSchema = z.number().int().positive()
const renderParamsSchema = z.object({
  width: z.number().int().min(100).max(4000).default(1200),
  format: z.enum(['webp', 'png', 'jpeg']).default('webp'),
  quality: z.number().int().min(1).max(100).default(85),
  scale: z.number().min(0.5).max(3).default(2),
})

// Simple test: render a webpage
pdfRendererHandler.get('/test-webpage', async c => {
  if (!c.env.BROWSER) {
    throw new HTTPException(500, { message: 'Browser Rendering not available' })
  }

  const browser = await launch(c.env.BROWSER, { keep_alive: 60000 }) // 1 minute

  try {
    const page = await browser.newPage()

    // Create a simple HTML page with some content
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            margin: 40px;
            font-family: Arial, sans-serif;
            line-height: 1.6;
          }
          h1 {
            color: #333;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .score-info {
            background: #f4f4f4;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <h1>Score Rendering Test</h1>
        <div class="score-info">
          <h2>Beethoven - Moonlight Sonata</h2>
          <p>Movement 1 - Adagio sostenuto</p>
          <p>Page 1 of 8</p>
        </div>
        <p>This is a test of the Cloudflare Browser Rendering API.</p>
        <p>In production, this would display the actual PDF score.</p>
      </body>
      </html>
    `

    await page.setContent(html)

    // Set viewport
    await page.setViewport({
      width: 1200,
      height: 800,
    })

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'webp',
      quality: 85,
    })

    await browser.close()

    return new Response(screenshot, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    await browser.close()
    console.error('Rendering error:', error)
    throw new HTTPException(500, {
      message: `Failed to render: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
})

// Render PDF using Google Docs viewer (more reliable)
pdfRendererHandler.get(
  '/render-google/:scoreId/page/:pageNumber',
  rateLimiters.perScore,
  async c => {
    if (!c.env.BROWSER) {
      throw new HTTPException(500, {
        message: 'Browser Rendering not available',
      })
    }

    const scoreId = c.req.param('scoreId')
    void scoreId // Will be used when connecting to actual PDFs
    const pageNumber = parseInt(c.req.param('pageNumber'))
    const width = parseInt(c.req.query('width') || '1200')

    const browser = await launch(c.env.BROWSER, { keep_alive: 60000 }) // 1 minute

    try {
      // For testing, use a public PDF
      const testPdfUrl = 'https://www.africau.edu/images/default/sample.pdf'

      // Use Google Docs viewer
      const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(testPdfUrl)}&embedded=true&hl=en#:0.page.${pageNumber}`

      const page = await browser.newPage()

      // Set viewport
      await page.setViewport({
        width: width,
        height: Math.floor(width * 1.414), // A4 ratio
        deviceScaleFactor: 2,
      })

      // Navigate to Google Docs viewer
      await page.goto(googleViewerUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      // Wait for the viewer to load
      await page.waitForSelector('img[role="img"]', {
        visible: true,
        timeout: 20000,
      })

      // Wait a bit more for full render
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'webp',
        quality: 85,
        fullPage: false,
      })

      await browser.close()

      return new Response(screenshot, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    } catch (error) {
      await browser.close()
      console.error('Google Docs rendering error:', error)
      throw new HTTPException(500, {
        message: `Failed to render with Google Docs: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }
)

// Production-ready: Render score from R2 storage
pdfRendererHandler.get(
  '/render/:scoreId/page/:pageNumber',
  rateLimiters.perScore,
  async c => {
    // Local development fallback - serve a placeholder image
    if (!c.env.BROWSER) {
      console.warn(
        'Browser Rendering not available - serving placeholder for local development'
      )

      // For local development, create a simple placeholder image
      const scoreId = c.req.param('scoreId')
      const pageNumber = c.req.param('pageNumber')

      // Create a simple SVG placeholder
      const placeholderSvg = `
      <svg width="800" height="1131" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="1131" fill="#f5f5f5" stroke="#ddd" stroke-width="2"/>
        <text x="400" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#666">
          Score: ${scoreId}
        </text>
        <text x="400" y="440" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#888">
          Page ${pageNumber}
        </text>
        <text x="400" y="500" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#aaa">
          (Local Development Mode)
        </text>
        <text x="400" y="540" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#aaa">
          Browser Rendering API not available locally
        </text>
        <rect x="100" y="600" width="600" height="400" fill="#fff" stroke="#ccc" stroke-width="1"/>
        <text x="400" y="800" text-anchor="middle" font-family="Arial, sans-serif" font-size="60" fill="#ddd">
          🎼
        </text>
      </svg>
    `

      return new Response(placeholderSvg.trim(), {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache',
          'X-Development-Mode': 'true',
        },
      })
    }

    try {
      // Validate inputs
      const scoreId = scoreIdSchema.parse(c.req.param('scoreId'))
      const pageNumber = pageNumberSchema.parse(
        parseInt(c.req.param('pageNumber'))
      )

      // Parse query parameters with defaults
      const params = renderParamsSchema.parse({
        width: parseInt(c.req.query('width') || '1200'),
        format: c.req.query('format'),
        quality: parseInt(c.req.query('quality') || '85'),
        scale: parseFloat(c.req.query('scale') || '2'),
      })

      // Check cache first
      const cacheKey = `pdf-render:${scoreId}:${pageNumber}:${params.width}:${params.format}:${params.scale}`
      const cached = await c.env.CACHE.get(cacheKey, { type: 'stream' })

      if (cached) {
        return new Response(cached, {
          headers: {
            'Content-Type': `image/${params.format}`,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Cache': 'HIT',
            'X-Score-Id': scoreId,
            'X-Page-Number': pageNumber.toString(),
          },
        })
      }

      // Special handling for test scores
      let pdfUrl: string
      let pageCount: number = 10 // Default for test scores

      if (scoreId.startsWith('test_')) {
        // For test scores, get PDF from R2 using presigned URL
        const testPdfMap: Record<string, { r2Key: string; pageCount: number }> =
          {
            test_aire_sureno: { r2Key: 'test-data/score_01.pdf', pageCount: 1 },
            test_romance_anonimo: {
              r2Key: 'test-data/score_02.pdf',
              pageCount: 3,
            },
          }

        const testPdfInfo = testPdfMap[scoreId]
        if (!testPdfInfo) {
          throw new HTTPException(404, {
            message: 'Test score not found',
          })
        }

        pageCount = testPdfInfo.pageCount

        // Generate pre-signed URL for the test PDF in R2
        const presigner = new R2Presigner(c.env)
        pdfUrl = await presigner.generatePresignedUrl(testPdfInfo.r2Key)
      } else {
        // Get score version from database for real scores
        const scoreVersion = await c.env.DB.prepare(
          'SELECT r2_key, page_count FROM score_versions WHERE score_id = ? AND format = ? AND processing_status = ?'
        )
          .bind(scoreId, 'pdf', 'completed')
          .first<{ r2_key: string; page_count: number }>()

        if (!scoreVersion) {
          throw new HTTPException(404, {
            message: 'Score not found or not yet processed',
          })
        }

        pageCount = scoreVersion.page_count || 0

        // Generate pre-signed URL for the PDF
        const presigner = new R2Presigner(c.env)
        pdfUrl = await presigner.generatePresignedUrl(scoreVersion.r2_key)
      }

      // Validate page number
      if (pageNumber > pageCount) {
        throw new HTTPException(400, {
          message: `Invalid page number. This score has ${pageCount} pages.`,
        })
      }

      // Launch browser
      const browser = await launch(c.env.BROWSER, { keep_alive: 60000 }) // 1 minute

      try {
        const page = await browser.newPage()

        // Set viewport based on requested width
        await page.setViewport({
          width: params.width,
          height: Math.floor(params.width * 1.414), // A4 aspect ratio
          deviceScaleFactor: 1,
        })

        // Load our custom PDF viewer with the PDF URL embedded
        const viewerHtml = PDF_VIEWER_HTML.replace(
          "const pdfUrl = params.get('url');",
          `const pdfUrl = '${pdfUrl}';`
        )
          .replace(
            "const pageNumber = parseInt(params.get('page') || '1');",
            `const pageNumber = ${pageNumber};`
          )
          .replace(
            "const scale = parseFloat(params.get('scale') || '2.0');",
            `const scale = ${params.scale};`
          )

        // Set the content directly
        await page.setContent(viewerHtml, {
          waitUntil: 'networkidle0',
        })

        // Wait for PDF to be rendered with better error handling
        try {
          await page.waitForFunction('window.renderingComplete === true', {
            timeout: 15000, // Reduced timeout to fail faster
          })
        } catch (timeoutError) {
          // Try to get any error information from the page
          const pageError = await page.evaluate(getErrorElementText)

          if (pageError) {
            throw new Error(`PDF rendering failed: ${pageError}`)
          }

          // Check if PDF.js loaded at all
          const pdfJsLoaded = await page.evaluate(isPdfJsLoaded)
          if (!pdfJsLoaded) {
            throw new Error('PDF.js library failed to load')
          }

          throw new Error(
            'PDF rendering timeout - page took too long to render'
          )
        }

        // Additional wait to ensure full render
        await new Promise(resolve => setTimeout(resolve, 500))

        // Take screenshot of the canvas
        const canvas = await page.$('#pdf-canvas')
        if (!canvas) {
          throw new Error('PDF canvas not found')
        }

        const screenshot = await canvas.screenshot({
          type: params.format as 'png' | 'jpeg' | 'webp',
          quality: params.format === 'png' ? undefined : params.quality,
        })

        await browser.close()

        // Cache the result
        await c.env.CACHE.put(cacheKey, screenshot, {
          expirationTtl: 86400 * 30, // 30 days
        })

        // Update render count analytics
        await c.env.DB.prepare(
          'UPDATE score_analytics SET render_count = render_count + 1, last_viewed_at = CURRENT_TIMESTAMP WHERE score_id = ?'
        )
          .bind(scoreId)
          .run()

        return new Response(screenshot, {
          headers: {
            'Content-Type': `image/${params.format}`,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Cache': 'MISS',
            'X-Score-Id': scoreId,
            'X-Page-Number': pageNumber.toString(),
            'X-Page-Count': pageCount.toString(),
          },
        })
      } catch (error) {
        await browser.close()
        console.error('Browser rendering error:', error)
        throw new HTTPException(500, {
          message: `Failed to render PDF: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    } catch (error) {
      // Handle validation errors
      if (error instanceof z.ZodError) {
        throw new HTTPException(400, {
          message: 'Invalid parameters',
          cause: error.errors,
        })
      }

      // Re-throw HTTP exceptions
      if (error instanceof HTTPException) {
        throw error
      }

      // Generic error
      console.error('PDF rendering error:', error)
      throw new HTTPException(500, {
        message: `Failed to render: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }
)
