import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { generateId } from '../../utils/generateId'
import { RateLimiter } from '../../utils/rateLimiter'

const importHandler = new Hono<{ Bindings: Env }>()

// Rate limiting helper
async function checkRateLimit(
  c: { env: Env; req: { header: (name: string) => string | undefined } },
  authHeader: string | undefined
): Promise<{ allowed: boolean; remainingMs?: number }> {
  // If JWT is provided, skip rate limiting
  if (authHeader?.startsWith('Bearer ')) {
    try {
      // TODO: Verify JWT token
      // For now, we'll accept any Bearer token
      return { allowed: true }
    } catch (error) {
      // Invalid token, apply rate limiting
    }
  }

  // Apply rate limiting for unauthenticated requests
  const clientIp = c.req.header('CF-Connecting-IP') || 'unknown'
  const rateLimitKey = `import:${clientIp}`

  // Use KV-based rate limiter
  const rateLimiter = new RateLimiter(c.env.CACHE, {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 1, // 1 request per 10 minutes
  })

  const allowed = await rateLimiter.isAllowed(rateLimitKey)
  const remainingMs = await rateLimiter.getRemainingTime(rateLimitKey)

  return { allowed, remainingMs }
}

// Import endpoint
importHandler.post('/import', async c => {
  try {
    // Check rate limit
    const authHeader = c.req.header('Authorization')
    const { allowed, remainingMs } = await checkRateLimit(c, authHeader)

    if (!allowed) {
      const remainingMinutes = Math.ceil((remainingMs || 0) / 60000)
      throw new HTTPException(429, {
        message: `Rate limit exceeded. Please wait ${remainingMinutes} minutes before trying again.`,
      })
    }

    // Get PDF URL from request
    const { url } = await c.req.json<{ url: string }>()

    if (!url) {
      throw new HTTPException(400, { message: 'PDF URL is required' })
    }

    // Validate URL format
    let pdfUrl: URL
    try {
      pdfUrl = new URL(url)
      if (!['http:', 'https:'].includes(pdfUrl.protocol)) {
        throw new Error('Invalid protocol')
      }
    } catch (error) {
      throw new HTTPException(400, { message: 'Invalid URL format' })
    }

    // Fetch the PDF
    const pdfResponse = await fetch(pdfUrl.toString(), {
      headers: {
        'User-Agent': 'Mirubato-Scores-Service/1.1.0',
      },
    })

    if (!pdfResponse.ok) {
      throw new HTTPException(400, {
        message: `Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`,
      })
    }

    // Validate content type
    const contentType = pdfResponse.headers.get('content-type')
    if (!contentType?.includes('pdf')) {
      throw new HTTPException(400, {
        message: 'URL does not point to a PDF file',
      })
    }

    // Get PDF content
    const pdfBuffer = await pdfResponse.arrayBuffer()
    const pdfBytes = new Uint8Array(pdfBuffer)

    // Validate PDF magic bytes
    const pdfMagic = pdfBytes.slice(0, 4)
    if (String.fromCharCode(...pdfMagic) !== '%PDF') {
      throw new HTTPException(400, { message: 'Invalid PDF file' })
    }

    // Generate unique ID for this score
    const scoreId = generateId()

    // Extract filename from URL or generate one
    const urlPath = pdfUrl.pathname
    const originalFileName = urlPath.split('/').pop() || 'unknown.pdf'
    const cleanFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_')

    // Create R2 key
    const r2Key = `imports/${scoreId}/${cleanFileName}`

    // Upload to R2
    await c.env.SCORES_BUCKET.put(r2Key, pdfBuffer, {
      httpMetadata: {
        contentType: 'application/pdf',
      },
      customMetadata: {
        sourceUrl: url,
        importedAt: new Date().toISOString(),
        scoreId: scoreId,
      },
    })

    // Extract metadata using AI (mock for now)
    const aiMetadata = await extractMetadataFromPDF(pdfBytes, url)

    // Create database record
    const db = c.env.DB
    await db
      .prepare(
        `INSERT INTO scores (
          id, slug, title, subtitle, composer, opus,
          instrument, difficulty, difficulty_level,
          year, style_period, tags, description,
          source, source_url, pdf_url, file_name,
          processing_status, ai_metadata, imported_at,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          datetime('now'), datetime('now')
        )`
      )
      .bind(
        scoreId,
        generateSlug(aiMetadata.title || cleanFileName),
        aiMetadata.title || cleanFileName.replace('.pdf', ''),
        aiMetadata.subtitle || null,
        aiMetadata.composer || 'Unknown',
        aiMetadata.opus || null,
        aiMetadata.instrument || 'PIANO',
        aiMetadata.difficulty || 'INTERMEDIATE',
        aiMetadata.difficultyLevel || 5,
        aiMetadata.year || null,
        aiMetadata.stylePeriod || null,
        JSON.stringify(aiMetadata.tags || []),
        aiMetadata.description || null,
        'import',
        url,
        `/files/${r2Key}`,
        cleanFileName,
        'completed',
        JSON.stringify(aiMetadata),
        new Date().toISOString()
      )
      .run()

    // Create analytics record
    await db
      .prepare(
        `INSERT INTO score_analytics (score_id, view_count, download_count, render_count)
         VALUES (?, 0, 0, 0)`
      )
      .bind(scoreId)
      .run()

    // Return success response
    return c.json({
      success: true,
      data: {
        id: scoreId,
        slug: generateSlug(aiMetadata.title || cleanFileName),
        title: aiMetadata.title || cleanFileName.replace('.pdf', ''),
        composer: aiMetadata.composer || 'Unknown',
        pdfUrl: `/files/${r2Key}`,
        metadata: aiMetadata,
      },
    })
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }

    console.error('Import error:', error)
    throw new HTTPException(500, {
      message: 'Failed to import PDF',
    })
  }
})

// Helper function to generate slug
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}

interface ExtractedMetadata {
  title?: string
  subtitle?: string
  composer?: string
  opus?: string
  instrument?: string
  difficulty?: string
  difficultyLevel?: number
  year?: number
  stylePeriod?: string
  tags?: string[]
  description?: string
  extractedAt: string
  confidence: number
}

// Mock AI metadata extraction (replace with Gemini API later)
async function extractMetadataFromPDF(
  pdfBytes: Uint8Array,
  sourceUrl: string
): Promise<ExtractedMetadata> {
  // For now, return mock data based on URL
  // Later, this will use Gemini API to analyze the PDF

  const urlLower = sourceUrl.toLowerCase()

  // Simple heuristics for now
  const isGuitar = urlLower.includes('guitar') || urlLower.includes('gtr')

  // Extract potential title from URL
  const urlParts = sourceUrl.split('/').pop()?.replace('.pdf', '') || 'Unknown'
  const titleParts = urlParts
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))

  return {
    title: titleParts.join(' '),
    composer: 'Unknown',
    instrument: isGuitar ? 'GUITAR' : 'PIANO',
    difficulty: 'INTERMEDIATE',
    difficultyLevel: 5,
    tags: [isGuitar ? 'guitar' : 'piano', 'imported', 'public-domain'],
    description: `Imported from ${new URL(sourceUrl).hostname}`,
    extractedAt: new Date().toISOString(),
    confidence: 0.3, // Low confidence for mock data
  }
}

// Get import status
importHandler.get('/import/:id', async c => {
  const scoreId = c.req.param('id')

  const db = c.env.DB
  const score = await db
    .prepare(`SELECT * FROM scores WHERE id = ?`)
    .bind(scoreId)
    .first()

  if (!score) {
    throw new HTTPException(404, { message: 'Score not found' })
  }

  return c.json({
    success: true,
    data: score,
  })
})

export { importHandler }
