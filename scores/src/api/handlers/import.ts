import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import {
  ImportFromIMSLPSchema,
  ApiResponse,
  ImportResponse,
} from '../../types/api'

export const importHandler = new Hono<{ Bindings: Env }>()

// Import score from PDF upload
importHandler.post('/pdf', async c => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as unknown as File
    const metadata = formData.get('metadata')

    if (!file) {
      throw new HTTPException(400, { message: 'No file provided' })
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      throw new HTTPException(400, { message: 'File must be a PDF' })
    }

    // Parse metadata if provided
    let scoreData = {
      title: 'Untitled Score',
      composer: 'Unknown',
      instrument: 'PIANO' as const,
      difficulty: 'INTERMEDIATE' as const,
      source: 'upload' as const,
      tags: [] as string[],
    }

    if (metadata) {
      try {
        const parsedMetadata = JSON.parse(metadata as string)
        scoreData = { ...scoreData, ...parsedMetadata }
      } catch (error) {
        console.error('Error parsing metadata:', error)
      }
    }

    // Generate IDs
    const scoreId = nanoid()
    const versionId = nanoid()
    const r2Key = `scores/${scoreId}/original.pdf`

    // Upload to R2
    await c.env.SCORES_BUCKET.put(r2Key, file, {
      httpMetadata: {
        contentType: 'application/pdf',
      },
      customMetadata: {
        scoreId,
        versionId,
        uploadedAt: new Date().toISOString(),
      },
    })

    // Create score entry
    await c.env.DB.prepare(
      `
      INSERT INTO scores (
        id, title, composer, instrument, difficulty, source, tags, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        scoreId,
        scoreData.title,
        scoreData.composer,
        scoreData.instrument,
        scoreData.difficulty,
        scoreData.source,
        JSON.stringify(scoreData.tags),
        JSON.stringify({})
      )
      .run()

    // Create version entry
    await c.env.DB.prepare(
      `
      INSERT INTO score_versions (
        id, score_id, format, r2_key, file_size_bytes, processing_status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
    )
      .bind(versionId, scoreId, 'pdf', r2Key, file.size, 'completed')
      .run()

    // TODO: Queue for processing (extract metadata, generate preview, etc.)

    const response: ApiResponse<ImportResponse> = {
      success: true,
      data: {
        scoreId,
        status: 'imported',
        message: 'PDF uploaded successfully',
      },
    }

    return c.json(response, 201)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error importing PDF:', error)
    throw new HTTPException(500, { message: 'Failed to import PDF' })
  }
})

// Import score from IMSLP URL
importHandler.post('/imslp', async c => {
  try {
    const body = await c.req.json()

    // Validate input
    const validatedData = ImportFromIMSLPSchema.parse(body)

    // Extract IMSLP ID from URL
    const imslpMatch = validatedData.url.match(/imslp\.org\/wiki\/(.+)/)
    if (!imslpMatch) {
      throw new HTTPException(400, { message: 'Invalid IMSLP URL format' })
    }

    const imslpId = imslpMatch[1]

    // Check if already imported
    const existing = await c.env.DB.prepare(
      'SELECT id FROM scores WHERE imslp_url = ?'
    )
      .bind(validatedData.url)
      .first()

    if (existing) {
      const response: ApiResponse<ImportResponse> = {
        success: true,
        data: {
          scoreId: existing.id as string,
          status: 'imported',
          message: 'Score already imported',
        },
      }
      return c.json(response)
    }

    // TODO: Implement IMSLP scraping
    // For now, create a placeholder entry
    const scoreId = nanoid()

    await c.env.DB.prepare(
      `
      INSERT INTO scores (
        id, title, composer, instrument, difficulty, source, imslp_url, tags, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        scoreId,
        `IMSLP Score ${imslpId}`,
        'Unknown Composer',
        'PIANO',
        'INTERMEDIATE',
        'imslp',
        validatedData.url,
        JSON.stringify(['imslp', 'imported']),
        JSON.stringify({ imslpId, autoProcess: validatedData.autoProcess })
      )
      .run()

    const response: ApiResponse<ImportResponse> = {
      success: true,
      data: {
        scoreId,
        status: 'processing',
        message: 'IMSLP import queued for processing',
      },
    }

    return c.json(response, 201)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    if (error instanceof Error && error.name === 'ZodError') {
      throw new HTTPException(400, {
        message: 'Invalid input',
        cause: error,
      })
    }
    console.error('Error importing from IMSLP:', error)
    throw new HTTPException(500, { message: 'Failed to import from IMSLP' })
  }
})
