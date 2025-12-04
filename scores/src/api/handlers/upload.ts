import { Context } from 'hono'
import { UploadService } from '../../services/uploadService'

const uploadService = new UploadService({
  maxFileSize: 50 * 1024 * 1024, // 50MB for sheet music PDFs
  allowedMimeTypes: ['application/pdf'],
  allowedExtensions: ['.pdf'],
})

/**
 * Handles multipart form upload of PDF scores
 */
export async function uploadScore(c: Context) {
  try {
    const env = c.env as any

    // Parse multipart form data
    const formData = await c.req.formData()
    const fileData = formData.get('file')
    if (!fileData || typeof fileData === 'string') {
      return c.json(
        {
          success: false,
          error: 'No file provided',
        },
        400
      )
    }
    const file = fileData as File
    const metadataStr = formData.get('metadata') as string

    // Parse metadata if provided
    interface ScoreMetadata {
      title?: string
      composer?: string
      instrument?: string
      difficulty?: string
      [key: string]: unknown
    }

    let metadata: ScoreMetadata = {}
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr) as ScoreMetadata
      } catch {
        return c.json(
          {
            success: false,
            error: 'Invalid metadata JSON',
          },
          400
        )
      }
    }

    // Get user info from auth context if available
    const userId = c.get('userId') || 'anonymous'

    // Upload the file
    const result = await uploadService.uploadToR2(file, env, {
      prefix: 'scores',
      metadata: {
        ...metadata,
        uploadedBy: userId,
      },
    })

    if (!result.success) {
      return c.json(result, 400)
    }

    // Store metadata in database
    if (metadata.title && result.key) {
      try {
        const scoreId = crypto.randomUUID()

        await env.DB.prepare(
          `INSERT INTO scores (id, title, composer, instrument, difficulty, pdf_url, created_by, processing_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            scoreId,
            metadata.title || 'Untitled Score',
            metadata.composer || 'Unknown',
            metadata.instrument || 'piano',
            metadata.difficulty || 'intermediate',
            result.key,
            userId,
            'pending'
          )
          .run()

        // Queue PDF processing if queue is available
        if (env.PDF_QUEUE) {
          await env.PDF_QUEUE.send({
            type: 'process-new-score',
            scoreId,
            r2Key: result.key,
            uploadedAt: new Date().toISOString(),
          })
        }

        return c.json({
          success: true,
          scoreId,
          key: result.key,
          url: result.url,
          message: 'Score uploaded successfully and queued for processing',
        })
      } catch (dbError) {
        // If DB insert fails, try to clean up the uploaded file
        await uploadService.deleteFile(result.key, env)

        return c.json(
          {
            success: false,
            error: 'Failed to save score metadata',
            details:
              dbError instanceof Error ? dbError.message : 'Unknown error',
          },
          500
        )
      }
    }

    return c.json({
      success: true,
      key: result.key,
      url: result.url,
      message: 'File uploaded successfully',
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
}

/**
 * Development endpoint for uploading files via base64
 */
export async function uploadBase64(c: Context) {
  const env = c.env as any

  // Only allow in local development
  if (env.ENVIRONMENT !== 'local') {
    return c.json(
      {
        success: false,
        error: 'This endpoint is only available in local development',
      },
      403
    )
  }

  try {
    const body = await c.req.json()
    const { filename, content, metadata, customKey } = body

    if (!filename || !content) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: filename, content',
        },
        400
      )
    }

    // Upload using the service
    const result = await uploadService.uploadFromBase64(
      content,
      filename,
      env,
      {
        prefix: 'test-data',
        metadata,
        customKey, // Pass through the custom key if provided
      }
    )

    return c.json(result)
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
}

/**
 * Check if a file exists
 */
export async function checkFile(c: Context) {
  const env = c.env as any
  const key = c.req.param('key')

  if (!key) {
    return c.json(
      {
        success: false,
        error: 'No key provided',
      },
      400
    )
  }

  const exists = await uploadService.fileExists(key, env)

  return c.json({
    success: true,
    exists,
    key,
  })
}

/**
 * Delete a file (authenticated users only)
 */
export async function deleteFile(c: Context) {
  const env = c.env as any
  const key = c.req.param('key')
  const userId = c.get('userId')

  if (!userId) {
    return c.json(
      {
        success: false,
        error: 'Authentication required',
      },
      401
    )
  }

  if (!key) {
    return c.json(
      {
        success: false,
        error: 'No key provided',
      },
      400
    )
  }

  // Check if user owns the file before deleting
  // First, try R2 metadata check (fast path)
  const fileHead = await env.SCORES_BUCKET.head(key)
  if (!fileHead) {
    return c.json(
      {
        success: false,
        error: 'File not found',
      },
      404
    )
  }

  const uploadedBy = fileHead.customMetadata?.uploadedBy
  if (uploadedBy && uploadedBy !== userId && uploadedBy !== 'anonymous') {
    return c.json(
      {
        success: false,
        error: 'You do not have permission to delete this file',
      },
      403
    )
  }

  // Also check database if file is linked to a score
  const scoreResult = (await env.DB.prepare(
    'SELECT created_by FROM scores WHERE pdf_url = ?'
  )
    .bind(key)
    .first()) as { created_by?: string } | null

  if (scoreResult?.created_by && scoreResult.created_by !== userId) {
    return c.json(
      {
        success: false,
        error: 'You do not have permission to delete this file',
      },
      403
    )
  }

  const deleted = await uploadService.deleteFile(key, env)

  return c.json({
    success: deleted,
    message: deleted ? 'File deleted successfully' : 'Failed to delete file',
  })
}
