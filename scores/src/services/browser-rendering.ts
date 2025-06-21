/**
 * Browser Rendering Service
 *
 * Utilizes Cloudflare's Browser Rendering API for:
 * - PDF to image conversion
 * - Web scraping (IMSLP)
 * - Score rendering
 */

interface BrowserRenderingEnv extends Env {
  BROWSER: any // Browser Rendering binding
  CF_ACCOUNT_ID: string
  CF_API_TOKEN: string
}

export class BrowserRenderingService {
  constructor(private env: BrowserRenderingEnv) {}

  /**
   * Convert PDF page to image
   */
  async pdfToImage(
    pdfUrl: string,
    pageNumber: number = 1
  ): Promise<ArrayBuffer> {
    try {
      // If using the binding (preferred)
      if (this.env.BROWSER) {
        const result = await this.env.BROWSER.screenshot({
          url: `${pdfUrl}#page=${pageNumber}`,
          options: {
            viewport: {
              width: 1200,
              height: 1600,
            },
            fullPage: false,
            type: 'png',
          },
        })
        return result
      }

      // Fallback to API call
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/browser-rendering/screenshot`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.env.CF_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: `${pdfUrl}#page=${pageNumber}`,
            options: {
              viewport: {
                width: 1200,
                height: 1600,
              },
              fullPage: false,
              type: 'png',
            },
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Browser rendering failed: ${response.statusText}`)
      }

      return await response.arrayBuffer()
    } catch (error) {
      console.error('PDF to image conversion failed:', error)
      throw error
    }
  }

  /**
   * Scrape IMSLP page for metadata
   */
  async scrapeIMSLP(imslpUrl: string): Promise<IMSLPMetadata> {
    try {
      // Get page as markdown for easier parsing
      const markdown = await this.getPageAsMarkdown(imslpUrl)

      // Get all links on the page
      const links = await this.getPageLinks(imslpUrl)

      // Parse metadata from markdown
      const metadata = this.parseIMSLPMarkdown(markdown)

      // Find PDF links
      const pdfLinks = links.filter(
        (link: any) =>
          link.href?.includes('.pdf') || link.href?.includes('/api.php?')
      )

      return {
        ...metadata,
        pdfLinks,
      }
    } catch (error) {
      console.error('IMSLP scraping failed:', error)
      throw error
    }
  }

  /**
   * Get page content as markdown
   */
  private async getPageAsMarkdown(url: string): Promise<string> {
    if (this.env.BROWSER) {
      const result = await this.env.BROWSER.markdown({ url })
      return result
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/browser-rendering/markdown`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      }
    )

    return await response.text()
  }

  /**
   * Get all links from a page
   */
  private async getPageLinks(url: string): Promise<any[]> {
    if (this.env.BROWSER) {
      const result = await this.env.BROWSER.links({
        url,
        options: { selector: 'a' },
      })
      return result
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/browser-rendering/links`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.env.CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          options: { selector: 'a' },
        }),
      }
    )

    return await response.json()
  }

  /**
   * Parse IMSLP markdown to extract metadata
   */
  private parseIMSLPMarkdown(markdown: string): Partial<IMSLPMetadata> {
    const metadata: Partial<IMSLPMetadata> = {}

    // Extract title (usually in first heading)
    const titleMatch = markdown.match(/^#\s+(.+)$/m)
    if (titleMatch) {
      metadata.title = titleMatch[1]
    }

    // Extract composer
    const composerMatch = markdown.match(/Composer[:\s]+(.+?)[\n\r]/i)
    if (composerMatch) {
      metadata.composer = composerMatch[1].trim()
    }

    // Extract work information
    const workMatch = markdown.match(/Work Title[:\s]+(.+?)[\n\r]/i)
    if (workMatch) {
      metadata.workTitle = workMatch[1].trim()
    }

    // Extract opus number
    const opusMatch = markdown.match(/Opus[\/\s]+(.+?)[\n\r]/i)
    if (opusMatch) {
      metadata.opus = opusMatch[1].trim()
    }

    // Extract instrumentation
    const instrumentMatch = markdown.match(/Instrumentation[:\s]+(.+?)[\n\r]/i)
    if (instrumentMatch) {
      metadata.instrumentation = instrumentMatch[1].trim()
    }

    // Extract year
    const yearMatch = markdown.match(/Year[:\s]+(\d{4})/i)
    if (yearMatch) {
      metadata.year = parseInt(yearMatch[1])
    }

    // Extract movements
    const movementsMatch = markdown.match(/Movements[:\s]+(.+?)[\n\r]/i)
    if (movementsMatch) {
      metadata.movements = movementsMatch[1].trim()
    }

    // Extract difficulty (if available)
    const difficultyMatch = markdown.match(/Difficulty[:\s]+(.+?)[\n\r]/i)
    if (difficultyMatch) {
      metadata.difficulty = difficultyMatch[1].trim()
    }

    return metadata
  }

  /**
   * Render HTML with VexFlow to image
   */
  async renderVexFlowToImage(
    vexflowCode: string,
    width: number = 800,
    height: number = 600
  ): Promise<ArrayBuffer> {
    // Create HTML page with VexFlow
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin: 0; padding: 20px; background: white; }
          #output { margin: 0 auto; }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/vexflow@4/build/vexflow-min.js"></script>
      </head>
      <body>
        <div id="output"></div>
        <script>
          const { Renderer, Stave, StaveNote, Voice, Formatter } = Vex.Flow;
          
          // Create renderer
          const div = document.getElementById('output');
          const renderer = new Renderer(div, Renderer.Backends.SVG);
          renderer.resize(${width}, ${height});
          const context = renderer.getContext();
          
          // User code
          ${vexflowCode}
        </script>
      </body>
      </html>
    `

    // Store HTML temporarily
    const tempKey = `vexflow-${Date.now()}`
    await this.env.CACHE.put(tempKey, html, { expirationTtl: 60 })

    // Render to screenshot
    const screenshot = await this.env.BROWSER.screenshot({
      url: `https://scores.mirubato.com/render/${tempKey}`,
      options: {
        viewport: { width, height },
        waitUntil: 'networkidle0',
        fullPage: false,
        type: 'png',
      },
    })

    // Clean up
    await this.env.CACHE.delete(tempKey)

    return screenshot
  }

  /**
   * Generate PDF preview thumbnails
   */
  async generatePDFPreviews(
    pdfUrl: string,
    maxPages: number = 5
  ): Promise<PreviewResult[]> {
    const previews: PreviewResult[] = []

    for (let page = 1; page <= maxPages; page++) {
      try {
        const image = await this.pdfToImage(pdfUrl, page)
        previews.push({
          page,
          success: true,
          data: image,
        })
      } catch (error) {
        previews.push({
          page,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Preview generation failed',
        })
        // Stop if we can't render a page (probably reached end)
        if (page > 1) break
      }
    }

    return previews
  }
}

// Types
interface IMSLPMetadata {
  title?: string
  composer?: string
  workTitle?: string
  opus?: string
  instrumentation?: string
  year?: number
  movements?: string
  difficulty?: string
  pdfLinks?: any[]
}

interface PreviewResult {
  page: number
  success: boolean
  data?: ArrayBuffer
  error?: string
}
