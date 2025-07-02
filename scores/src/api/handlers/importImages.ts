import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { generateId } from '../../utils/generateId'
import { EnhancedRateLimiter } from '../../utils/enhancedRateLimiter'
import { HybridAiExtractor } from '../../services/hybridAiExtractor'
import { getUserIdFromAuth } from '../../utils/auth'

const importImagesHandler = new Hono<{ Bindings: Env }>()

// Maximum file sizes
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB per image
const MAX_TOTAL_SIZE = 50 * 1024 * 1024 // 50MB total
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg']

// ImageUpload interface removed - not used

// Rate limiting helper (reuse from import.ts pattern)
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
      const userId = await getUserIdFromAuth(c as any)
      if (userId) {
        return { allowed: true }
      }
    } catch (error) {
      // Invalid token, apply rate limiting
    }
  }

  // Apply rate limiting for unauthenticated requests
  const clientIp = c.req.header('CF-Connecting-IP') || 'unknown'
  const rateLimitKey = `import-images:${clientIp}`

  const rateLimiter = new EnhancedRateLimiter(c.env.CACHE, {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 1, // 1 request per 10 minutes
    failureMultiplier: 2,
    maxFailures: 5,
    banDurationMs: 60 * 60 * 1000, // 1 hour ban
  })

  const result = await rateLimiter.checkLimit(rateLimitKey)
  return { ...result, rateLimiter, key: rateLimitKey }
}

// Helper to process base64 data URL
function processDataUrl(dataUrl: string): {
  mimeType: string
  buffer: ArrayBuffer
} {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid data URL format')
  }

  const mimeType = matches[1]
  const base64 = matches[2]
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return { mimeType, buffer: bytes.buffer }
}

// Import images endpoint - mounted at /api/import/images
importImagesHandler.post('/', async c => {
  let rateLimiterInfo: { rateLimiter?: EnhancedRateLimiter; key?: string } = {}

  try {
    const authHeader = c.req.header('Authorization')

    // Check rate limit
    const rateLimit = await checkRateLimit(c, authHeader)
    rateLimiterInfo = { rateLimiter: rateLimit.rateLimiter, key: rateLimit.key }

    if (!rateLimit.allowed) {
      if (rateLimit.reason === 'banned') {
        throw new HTTPException(429, {
          message: 'Too many failed attempts. Please try again later.',
        })
      }
      throw new HTTPException(429, {
        message: `Rate limit exceeded. Please wait ${Math.ceil(
          rateLimit.remainingMs! / 1000
        )} seconds.`,
      })
    }

    // Get user ID (required for image uploads)
    const userId = await getUserIdFromAuth(c as any)
    if (!userId) {
      throw new HTTPException(401, {
        message: 'Authentication required for image uploads',
      })
    }

    // Parse request body
    const body = await c.req.json()
    const { images, title, composer, instrument, difficulty, tags } = body

    // Validate images array
    if (!Array.isArray(images) || images.length === 0) {
      throw new HTTPException(400, { message: 'No images provided' })
    }

    if (images.length > 20) {
      throw new HTTPException(400, { message: 'Maximum 20 images per score' })
    }

    // Process and validate each image
    const processedImages: Array<{
      pageNumber: number
      buffer: ArrayBuffer
      mimeType: string
      filename: string
    }> = []

    let totalSize = 0

    for (let i = 0; i < images.length; i++) {
      const image = images[i]

      if (!image.data || !image.filename) {
        throw new HTTPException(400, { message: `Invalid image at index ${i}` })
      }

      try {
        const { mimeType, buffer } = processDataUrl(image.data)

        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
          throw new HTTPException(400, {
            message: `Invalid image type at index ${i}. Allowed: PNG, JPG, JPEG`,
          })
        }

        const size = buffer.byteLength
        if (size > MAX_IMAGE_SIZE) {
          throw new HTTPException(400, {
            message: `Image at index ${i} exceeds 10MB limit`,
          })
        }

        totalSize += size
        if (totalSize > MAX_TOTAL_SIZE) {
          throw new HTTPException(400, {
            message: 'Total image size exceeds 50MB limit',
          })
        }

        processedImages.push({
          pageNumber: i + 1,
          buffer,
          mimeType,
          filename: image.filename,
        })
      } catch (error) {
        throw new HTTPException(400, {
          message: `Failed to process image at index ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }

    // Generate score ID
    const scoreId = generateId()

    // Store images in R2
    const imageUrls: Array<{ pageNumber: number; url: string; r2Key: string }> =
      []

    for (const img of processedImages) {
      const extension = img.mimeType.split('/')[1]
      const r2Key = `user-uploads/${userId}/${scoreId}/page-${img.pageNumber}.${extension}`

      await c.env.SCORES_BUCKET.put(r2Key, img.buffer, {
        httpMetadata: {
          contentType: img.mimeType,
        },
        customMetadata: {
          userId,
          scoreId,
          pageNumber: String(img.pageNumber),
          originalFilename: img.filename,
        },
      })

      // Generate URL (this will need to be served through the scores service)
      const url = `/api/scores/${scoreId}/pages/${img.pageNumber}`
      imageUrls.push({ pageNumber: img.pageNumber, url, r2Key })
    }

    // Extract metadata from first image using AI
    let extractedMetadata: {
      title?: string
      composer?: string
      opus?: string
      catalogNumber?: string
      instrument?: string
      difficulty?: string
      difficultyLevel?: number
      tags?: string[]
      visualFeatures?: any
    } = {}
    let visualAnalysis = null
    let visualConfidence = 0

    try {
      const aiExtractor = new HybridAiExtractor(c.env.AI as any)
      const firstImageKey = imageUrls[0].r2Key
      const firstImageData = await c.env.SCORES_BUCKET.get(firstImageKey)

      if (firstImageData) {
        const buffer = await firstImageData.arrayBuffer()
        const base64Data = `data:${processedImages[0].mimeType};base64,${btoa(String.fromCharCode(...new Uint8Array(buffer)))}`
        const result = await aiExtractor.extractFromImage({
          imageData: base64Data,
          mimeType: processedImages[0].mimeType as 'image/jpeg' | 'image/png',
          analysisType: 'score-metadata',
        })

        extractedMetadata = {
          title: result.title,
          composer: result.composer,
          opus: result.opus,
          instrument: result.instrument,
          difficulty: result.difficultyLabel,
          difficultyLevel: result.difficulty,
          tags: result.tags || [],
          visualFeatures: result.visualFeatures,
        }
        visualAnalysis = result.visualFeatures
        visualConfidence = result.confidence
      }
    } catch (error) {
      console.error('AI extraction failed:', error)
      // Continue without AI metadata - user can provide manually
    }

    // Merge user-provided metadata with AI-extracted (user takes precedence)
    const finalTitle = title || extractedMetadata.title || 'Untitled Score'
    const finalComposer = composer || extractedMetadata.composer || 'Unknown'
    const finalInstrument =
      instrument || extractedMetadata.instrument || 'PIANO'
    const finalDifficulty =
      difficulty || extractedMetadata.difficulty || 'INTERMEDIATE'

    // Generate slug
    const slug = generateSlug(
      finalTitle,
      extractedMetadata.opus || extractedMetadata.catalogNumber
    )

    // Create score record
    const score = {
      id: scoreId,
      title: finalTitle,
      composer: finalComposer,
      slug,
      instrument: finalInstrument,
      difficulty: finalDifficulty,
      difficulty_level: extractedMetadata.difficultyLevel || 5,
      source: 'upload' as const,
      source_type: 'multi-image' as const,
      page_count: processedImages.length,
      user_id: userId,
      visibility: 'private' as const, // Always private for user uploads
      tags: JSON.stringify(tags || extractedMetadata.tags || []),
      metadata: JSON.stringify({
        uploadedImages: imageUrls.length,
        originalFilenames: processedImages.map(img => img.filename),
        ...extractedMetadata,
      }),
      ai_metadata: extractedMetadata ? JSON.stringify(extractedMetadata) : null,
      visual_analysis: visualAnalysis ? JSON.stringify(visualAnalysis) : null,
      visual_confidence: visualConfidence,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      imported_at: new Date().toISOString(),
    }

    // Insert score into database
    await c.env.DB.prepare(
      `INSERT INTO scores (
        id, title, composer, slug, instrument, difficulty, difficulty_level,
        source, source_type, page_count, user_id, visibility, tags, metadata,
        ai_metadata, visual_analysis, visual_confidence,
        created_at, updated_at, imported_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        score.id,
        score.title,
        score.composer,
        score.slug,
        score.instrument,
        score.difficulty,
        score.difficulty_level,
        score.source,
        score.source_type,
        score.page_count,
        score.user_id,
        score.visibility,
        score.tags,
        score.metadata,
        score.ai_metadata,
        score.visual_analysis,
        score.visual_confidence,
        score.created_at,
        score.updated_at,
        score.imported_at
      )
      .run()

    // Insert page records
    for (let i = 0; i < imageUrls.length; i++) {
      const img = imageUrls[i]
      const processedImg = processedImages[i]

      await c.env.DB.prepare(
        `INSERT INTO score_pages (
          id, score_id, page_number, image_url, r2_key, mime_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          generateId(),
          scoreId,
          img.pageNumber,
          img.url,
          img.r2Key,
          processedImg.mimeType,
          new Date().toISOString()
        )
        .run()
    }

    // Add to user's default collection
    await addToDefaultCollection(c.env, userId, scoreId)

    // Record success with rate limiter
    if (rateLimiterInfo.rateLimiter && rateLimiterInfo.key) {
      await rateLimiterInfo.rateLimiter.recordSuccess(rateLimiterInfo.key)
    }

    return c.json({
      success: true,
      data: {
        id: scoreId,
        title: score.title,
        composer: score.composer,
        slug: score.slug,
        pageCount: score.page_count,
        instrument: score.instrument,
        difficulty: score.difficulty,
        aiExtracted: !!extractedMetadata.title,
        confidence: visualConfidence,
      },
    })
  } catch (error) {
    // Record failure with rate limiter
    if (rateLimiterInfo.rateLimiter && rateLimiterInfo.key) {
      await rateLimiterInfo.rateLimiter.recordFailure(rateLimiterInfo.key)
    }

    if (error instanceof HTTPException) {
      throw error
    }

    console.error('Import images error:', error)
    throw new HTTPException(500, {
      message: 'Failed to import images. Please try again.',
    })
  }
})

// Helper to add score to user's default collection
async function addToDefaultCollection(
  env: Env,
  userId: string,
  scoreId: string
) {
  try {
    // Find or create default collection
    const defaultCollection = await env.DB.prepare(
      `SELECT id FROM user_collections WHERE user_id = ? AND is_default = 1`
    )
      .bind(userId)
      .first()

    let collectionId: string

    if (!defaultCollection) {
      // Create default collection
      collectionId = generateId()
      await env.DB.prepare(
        `INSERT INTO user_collections (
          id, user_id, name, slug, is_default, collection_type, score_ids
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          collectionId,
          userId,
          'My Uploads',
          'my-uploads',
          1, // is_default = true
          'personal',
          JSON.stringify([scoreId])
        )
        .run()
    } else {
      collectionId = defaultCollection.id as string

      // Add score to collection
      await env.DB.prepare(
        `INSERT INTO collection_members (
          id, collection_id, score_id
        ) VALUES (?, ?, ?)`
      )
        .bind(generateId(), collectionId, scoreId)
        .run()

      // Update score_ids JSON array
      const currentScores = await env.DB.prepare(
        `SELECT score_ids FROM user_collections WHERE id = ?`
      )
        .bind(collectionId)
        .first()

      if (currentScores) {
        const scoreIds = JSON.parse(currentScores.score_ids as string)
        scoreIds.push(scoreId)

        await env.DB.prepare(
          `UPDATE user_collections SET score_ids = ? WHERE id = ?`
        )
          .bind(JSON.stringify(scoreIds), collectionId)
          .run()
      }
    }
  } catch (error) {
    console.error('Failed to add to default collection:', error)
    // Don't fail the import if collection update fails
  }
}

// Helper function to generate slug with opus information
function generateSlug(
  titleOrText: string,
  opus?: string,
  _composer?: string
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

export { importImagesHandler }
