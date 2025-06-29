import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { launch } from '@cloudflare/puppeteer'

export const pdfRendererHandler = new Hono<{ Bindings: Env }>()

// Simple test: render a webpage
pdfRendererHandler.get('/test-webpage', async c => {
  if (!c.env.BROWSER) {
    throw new HTTPException(500, { message: 'Browser Rendering not available' })
  }

  const browser = await launch(c.env.BROWSER)

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
pdfRendererHandler.get('/render-google/:scoreId/page/:pageNumber', async c => {
  if (!c.env.BROWSER) {
    throw new HTTPException(500, { message: 'Browser Rendering not available' })
  }

  const scoreId = c.req.param('scoreId')
  void scoreId // Will be used when connecting to actual PDFs
  const pageNumber = parseInt(c.req.param('pageNumber'))
  const width = parseInt(c.req.query('width') || '1200')

  const browser = await launch(c.env.BROWSER)

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
})

// Production-ready: Render score from R2 storage
pdfRendererHandler.get('/render/:scoreId/page/:pageNumber', async c => {
  if (!c.env.BROWSER) {
    throw new HTTPException(500, { message: 'Browser Rendering not available' })
  }

  const scoreId = c.req.param('scoreId')
  const pageNumber = parseInt(c.req.param('pageNumber'))
  const width = parseInt(c.req.query('width') || '1200')
  const format = c.req.query('format') || 'webp'

  // Check cache first
  const cacheKey = `pdf-render:${scoreId}:${pageNumber}:${width}:${format}`
  const cached = await c.env.CACHE.get(cacheKey, { type: 'stream' })

  if (cached) {
    return new Response(cached, {
      headers: {
        'Content-Type': `image/${format}`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Cache': 'HIT',
      },
    })
  }

  // For now, render a placeholder
  const browser = await launch(c.env.BROWSER)

  try {
    const page = await browser.newPage()

    // Create a placeholder score page
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 40px;
            font-family: 'Times New Roman', serif;
            background: #fefefe;
            width: ${width}px;
            height: ${Math.floor(width * 1.414)}px;
            box-sizing: border-box;
          }
          .score-header {
            text-align: center;
            margin-bottom: 40px;
          }
          .title {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .composer {
            font-size: 18px;
            font-style: italic;
          }
          .staff-lines {
            margin: 40px 0;
          }
          .staff {
            position: relative;
            height: 80px;
            margin: 20px 0;
          }
          .line {
            position: absolute;
            width: 100%;
            height: 1px;
            background: #000;
          }
          .page-number {
            position: absolute;
            bottom: 20px;
            right: 20px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="score-header">
          <div class="title">Score ID: ${scoreId}</div>
          <div class="composer">Cloudflare Browser Rendering Demo</div>
        </div>
        
        <div class="staff-lines">
          ${[0, 1, 2, 3]
            .map(
              _staffNum => `
            <div class="staff">
              ${[0, 1, 2, 3, 4]
                .map(
                  lineNum => `
                <div class="line" style="top: ${lineNum * 16}px"></div>
              `
                )
                .join('')}
            </div>
          `
            )
            .join('')}
        </div>
        
        <div class="page-number">Page ${pageNumber}</div>
      </body>
      </html>
    `

    await page.setContent(html)

    // Set viewport
    await page.setViewport({
      width: width,
      height: Math.floor(width * 1.414),
    })

    // Take screenshot
    const screenshot = await page.screenshot({
      type: format as 'png' | 'jpeg' | 'webp',
      quality: format === 'png' ? undefined : 85,
    })

    await browser.close()

    // Cache the result
    await c.env.CACHE.put(cacheKey, screenshot, {
      expirationTtl: 86400 * 7, // 7 days
    })

    return new Response(screenshot, {
      headers: {
        'Content-Type': `image/${format}`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Cache': 'MISS',
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
