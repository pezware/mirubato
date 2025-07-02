import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { generateId } from '../../utils/generateId'
import { EnhancedRateLimiter } from '../../utils/enhancedRateLimiter'
import { AiMetadataExtractor } from '../../services/aiMetadataExtractor'
import { HybridAiExtractor } from '../../services/hybridAiExtractor'

const importHandler = new Hono<{ Bindings: Env }>()

// Rate limiting helper
async function checkRateLimit(
  c: { env: Env; req: { header: (name: string) => string | undefined } },
  authHeader: string | undefined
): Promise<{
  allowed: boolean
  remainingMs?: number
  reason?: string
  rateLimiter?: EnhancedRateLimiter
  key?: string
}> {
  // If JWT is provided, skip rate limiting
  if (authHeader?.startsWith('Bearer ')) {
    try {
      return { allowed: true }
    } catch (error) {
      // Invalid token, apply rate limiting
    }
  }

  // Apply rate limiting for unauthenticated requests
  const clientIp = c.req.header('CF-Connecting-IP') || 'unknown'
  const rateLimitKey = `import:${clientIp}`

  // Use enhanced rate limiter with failure tracking
  const rateLimiter = new EnhancedRateLimiter(c.env.CACHE, {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 1, // 1 request per 10 minutes
    failureMultiplier: 2, // Double wait time for each failure
    maxFailures: 5, // Ban after 5 failures
    banDurationMs: 60 * 60 * 1000, // 1 hour ban
  })

  const result = await rateLimiter.checkLimit(rateLimitKey)
  return { ...result, rateLimiter, key: rateLimitKey }
}

// Import endpoint - mounted at /api/import in routes.ts
importHandler.post('/', async c => {
  let rateLimiterInfo: { rateLimiter?: EnhancedRateLimiter; key?: string } = {}

  try {
    // Check rate limit
    const authHeader = c.req.header('Authorization')
    const { allowed, remainingMs, reason, rateLimiter, key } =
      await checkRateLimit(c, authHeader)

    // Store for potential failure tracking
    rateLimiterInfo = { rateLimiter, key }

    if (!allowed) {
      const remainingMinutes = Math.ceil((remainingMs || 0) / 60000)
      throw new HTTPException(429, {
        message:
          reason ||
          `Rate limit exceeded. Please wait ${remainingMinutes} minutes before trying again.`,
      })
    }

    // Get request data
    const { url, filename, aiProvider } = await c.req.json<{
      url: string
      filename?: string
      aiProvider?: 'cloudflare' | 'gemini' | 'hybrid'
    }>()

    if (!url) {
      throw new HTTPException(400, { message: 'PDF URL is required' })
    }

    let pdfBuffer: ArrayBuffer
    let originalFileName: string

    // Check if it's a data URL (base64 upload)
    if (url.startsWith('data:')) {
      try {
        const [header, base64Data] = url.split(',')
        if (!header.includes('application/pdf')) {
          throw new HTTPException(400, { message: 'Invalid PDF data URL' })
        }

        pdfBuffer = Buffer.from(base64Data, 'base64')
        originalFileName = filename || 'uploaded.pdf'
      } catch (error) {
        throw new HTTPException(400, { message: 'Invalid base64 PDF data' })
      }
    } else {
      // Regular URL download
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

      pdfBuffer = await pdfResponse.arrayBuffer()
      const urlPath = pdfUrl.pathname
      originalFileName = urlPath.split('/').pop() || 'unknown.pdf'
    }

    const pdfBytes = new Uint8Array(pdfBuffer)

    // Validate PDF magic bytes
    const pdfMagic = pdfBytes.slice(0, 4)
    if (String.fromCharCode(...pdfMagic) !== '%PDF') {
      throw new HTTPException(400, { message: 'Invalid PDF file' })
    }

    // Generate unique ID for this score
    const scoreId = generateId()

    // Clean filename
    const cleanFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_')

    // Create R2 key
    const r2Key = `imports/${scoreId}/${cleanFileName}`

    // Upload to R2 with optimized cache headers
    await c.env.SCORES_BUCKET.put(r2Key, pdfBuffer, {
      httpMetadata: {
        contentType: 'application/pdf',
        cacheControl: 'public, max-age=31536000, immutable', // 1 year cache for immutable PDFs
      },
      customMetadata: {
        sourceUrl: url,
        importedAt: new Date().toISOString(),
        scoreId: scoreId,
      },
    })

    // Extract metadata using AI (with provider selection)
    let aiMetadata: Record<string, unknown>
    try {
      // Check which AI providers are available
      const hasCloudflareAi = !!c.env.AI
      const hasGeminiApi = !!c.env.GEMINI_API_KEY

      if (hasCloudflareAi && hasGeminiApi && aiProvider !== 'gemini') {
        // Use hybrid approach for best results
        // Using hybrid AI extraction (Cloudflare + Gemini)
        const hybridExtractor = new HybridAiExtractor(
          c.env.AI as any, // Type assertion needed due to workers-types mismatch
          {
            geminiApiKey: c.env.GEMINI_API_KEY,
            preferCloudflare: true,
            enableCrossValidation: aiProvider === 'hybrid',
          }
        )

        const hybridResult = await hybridExtractor.extractFromPdf(
          pdfBuffer,
          url
        )
        aiMetadata = {
          title: hybridResult.title,
          subtitle: hybridResult.subtitle,
          composer: hybridResult.composer,
          opus: hybridResult.opus,
          instrument: hybridResult.instrument,
          difficulty: hybridResult.difficultyLabel || 'INTERMEDIATE',
          difficultyLevel: hybridResult.difficulty || 5,
          year: hybridResult.year,
          stylePeriod: hybridResult.stylePeriod,
          tags: hybridResult.tags || [],
          description: hybridResult.description,
          confidence: hybridResult.mergedConfidence || hybridResult.confidence,
          extractedAt: new Date().toISOString(),
          provider: hybridResult.provider,
          discrepancies: hybridResult.discrepancies,
        } as Record<string, unknown>
      } else if (hasGeminiApi) {
        // Fallback to Gemini-only extraction
        // Using Gemini AI extraction
        const aiExtractor = new AiMetadataExtractor(c.env.GEMINI_API_KEY)
        const extractedResult = await aiExtractor.extractFromPdf(pdfBytes, url)
        aiMetadata = extractedResult as Record<string, unknown>
      } else if (hasCloudflareAi) {
        // Use Cloudflare AI only (would need PDF to image conversion)
        console.warn(
          'Cloudflare AI only - PDF to image conversion not yet implemented'
        )
        throw new Error('PDF to image conversion required for Cloudflare AI')
      } else {
        throw new Error('No AI provider configured')
      }

      // Log if AI extraction had issues
      if (aiMetadata.error) {
        console.warn('AI extraction had issues:', aiMetadata.error)
      }
      if ((aiMetadata.confidence as number) < 0.5) {
        console.warn('Low confidence AI extraction, used fallback')
      }
    } catch (error) {
      console.error('AI extraction failed:', error)
      // Fallback metadata when AI fails
      aiMetadata = {
        title: cleanFileName.replace('.pdf', ''),
        composer: 'Unknown',
        instrument: 'PIANO',
        difficulty: 'INTERMEDIATE',
        difficultyLevel: 5,
        tags: [],
        confidence: 0,
        error:
          'AI extraction failed: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      }
    }

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
        generateSlug(
          (aiMetadata.title as string) || cleanFileName,
          aiMetadata.opus as string
        ),
        (aiMetadata.title as string) || cleanFileName.replace('.pdf', ''),
        (aiMetadata.subtitle as string) || null,
        (aiMetadata.composer as string) || 'Unknown',
        (aiMetadata.opus as string) || null,
        (aiMetadata.instrument as string) || 'PIANO',
        (aiMetadata.difficulty as string) || 'INTERMEDIATE',
        (aiMetadata.difficultyLevel as number) || 5,
        (aiMetadata.year as number) || null,
        (aiMetadata.stylePeriod as string) || null,
        JSON.stringify((aiMetadata.tags as string[]) || []),
        (aiMetadata.description as string) || null,
        'manual', // Changed from 'import' to satisfy DB constraint
        url,
        `/files/${r2Key}`,
        cleanFileName,
        'completed',
        JSON.stringify(aiMetadata as Record<string, unknown>),
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

    // Return success response with warning if AI had issues
    interface ImportResponse {
      success: boolean
      data: {
        id: string
        slug: string
        title: string
        composer: string
        instrument: string
        difficulty: string
        pdfUrl: string
        metadata: Record<string, unknown>
      }
      warning?: string
    }

    const response: ImportResponse = {
      success: true,
      data: {
        id: scoreId,
        slug: generateSlug(
          (aiMetadata.title as string) || cleanFileName,
          aiMetadata.opus as string
        ),
        title:
          (aiMetadata.title as string) || cleanFileName.replace('.pdf', ''),
        composer: (aiMetadata.composer as string) || 'Unknown',
        instrument: (aiMetadata.instrument as string) || 'PIANO',
        difficulty: (aiMetadata.difficulty as string) || 'INTERMEDIATE',
        pdfUrl: `/files/${r2Key}`,
        metadata: aiMetadata,
      },
    }

    // Add warning if AI extraction had issues
    if (aiMetadata.error || (aiMetadata.confidence as number) < 0.7) {
      response.warning =
        (aiMetadata.error as string) ||
        'AI analysis had low confidence. Some metadata was extracted from the URL.'
    }

    // Record success with rate limiter
    if (rateLimiterInfo.rateLimiter && rateLimiterInfo.key) {
      await rateLimiterInfo.rateLimiter.recordSuccess(rateLimiterInfo.key)
    }

    return c.json(response)
  } catch (error) {
    // Track failures for rate limiting
    if (rateLimiterInfo.rateLimiter && rateLimiterInfo.key) {
      const isCritical = error instanceof HTTPException && error.status === 400
      await rateLimiterInfo.rateLimiter.recordFailure(
        rateLimiterInfo.key,
        isCritical
      )
    }

    if (error instanceof HTTPException) {
      throw error
    }

    console.error('Import error:', error)
    throw new HTTPException(500, {
      message: 'Failed to import PDF',
    })
  }
})

// Helper function to generate slug with opus information
function generateSlug(
  titleOrText: string,
  opus?: string,
  composer?: string
): string {
  // If called with just one argument (backward compatibility)
  if (arguments.length === 1) {
    return titleOrText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100)
  }

  // Enhanced slug generation including opus
  const slugParts = [titleOrText]

  if (opus) {
    // Extract opus number and part (e.g., "Op. 11 No. 6" -> "op11-no6")
    const opusSlug = opus
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    slugParts.push(opusSlug)
  }

  return slugParts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}

// Health check for AI integration
importHandler.get('/health', async c => {
  const aiExtractor = new AiMetadataExtractor(c.env.GEMINI_API_KEY)

  // Test AI connectivity
  const pingResult = await aiExtractor.ping()

  return c.json({
    success: true,
    ai: {
      available: aiExtractor.isAvailable(),
      hasApiKey: !!c.env.GEMINI_API_KEY,
      keyPrefix: c.env.GEMINI_API_KEY
        ? c.env.GEMINI_API_KEY.substring(0, 8) + '...'
        : null,
      ping: pingResult,
    },
    rateLimit: {
      enabled: true,
      anonymous: '1 request per 10 minutes',
      authenticated: 'unlimited',
    },
  })
})

// Get import status
importHandler.get('/:id', async c => {
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
