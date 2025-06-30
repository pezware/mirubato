import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import {
  ImportFromIMSLPSchema,
  ApiResponse,
  ImportResponse,
} from '../../types/api'
import { Instrument } from '../../types/score'
import { BrowserRenderingService } from '../../services/browser-rendering'

export const enhancedImportHandler = new Hono<{ Bindings: Env }>()

// Enhanced PDF import with preview generation
enhancedImportHandler.post('/pdf', async c => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as unknown as File
    const metadata = formData.get('metadata')

    if (!file) {
      throw new HTTPException(400, { message: 'No file provided' })
    }

    if (!file.type.includes('pdf')) {
      throw new HTTPException(400, { message: 'File must be a PDF' })
    }

    // Parse metadata
    let scoreData = {
      title: file.name.replace('.pdf', '') || 'Untitled Score',
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

    // Upload PDF to R2
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
      .bind(versionId, scoreId, 'pdf', r2Key, file.size, 'processing')
      .run()

    // Queue for preview generation
    if (c.env.PDF_QUEUE) {
      await c.env.PDF_QUEUE.send({
        scoreId,
        action: 'generate-previews',
        data: {
          pdfUrl: `https://scores.mirubato.com/api/scores/${scoreId}/download/pdf`,
          r2Key,
        },
      })
    } else {
      // Fallback: Generate preview synchronously (first page only)
      try {
        const browserService = new BrowserRenderingService(c.env as any)
        const pdfUrl = `https://scores.mirubato.com/files/${r2Key}`
        const preview = await browserService.pdfToImage(pdfUrl, 1)

        await c.env.SCORES_BUCKET.put(
          `previews/${scoreId}/page-1.png`,
          preview,
          {
            httpMetadata: { contentType: 'image/png' },
          }
        )
      } catch (error) {
        console.error('Preview generation failed:', error)
      }
    }

    const response: ApiResponse<ImportResponse> = {
      success: true,
      data: {
        scoreId,
        status: 'imported',
        message: 'PDF uploaded successfully. Preview generation in progress.',
      },
    }

    return c.json(response, 201)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error importing PDF:', error)
    throw new HTTPException(500, { message: 'Failed to import PDF' })
  }
})

// Enhanced IMSLP import with web scraping
enhancedImportHandler.post('/imslp', async c => {
  try {
    const body = await c.req.json()
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

    // Use Browser Rendering to scrape IMSLP
    const browserService = new BrowserRenderingService(c.env as any)
    let metadata: any = {}

    try {
      metadata = await browserService.scrapeIMSLP(validatedData.url)
    } catch (error) {
      console.error('IMSLP scraping failed:', error)
    }

    // Create score entry with scraped metadata
    const scoreId = nanoid()

    // Determine instrument from instrumentation
    let instrument: Instrument = 'PIANO'
    if (metadata.instrumentation?.toLowerCase().includes('guitar')) {
      instrument = 'GUITAR'
    }

    await c.env.DB.prepare(
      `
      INSERT INTO scores (
        id, title, composer, opus, instrument, difficulty, 
        source, imslp_url, tags, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        scoreId,
        metadata.title || metadata.workTitle || `IMSLP Score ${imslpId}`,
        metadata.composer || 'Unknown Composer',
        metadata.opus || null,
        instrument,
        'INTERMEDIATE', // Default difficulty
        'imslp',
        validatedData.url,
        JSON.stringify(['imslp', 'imported']),
        JSON.stringify({
          imslpId,
          ...metadata,
          autoProcess: validatedData.autoProcess,
        })
      )
      .run()

    // Queue for PDF download and processing
    if (
      c.env.PDF_QUEUE &&
      validatedData.autoProcess &&
      metadata.pdfLinks?.length > 0
    ) {
      await c.env.PDF_QUEUE.send({
        scoreId,
        action: 'download-imslp-pdf',
        data: {
          imslpUrl: validatedData.url,
          pdfLinks: metadata.pdfLinks,
        },
      })
    }

    const response: ApiResponse<ImportResponse> = {
      success: true,
      data: {
        scoreId,
        status: 'processing',
        message: 'IMSLP import successful. Processing PDF files.',
      },
    }

    return c.json(response, 201)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error importing from IMSLP:', error)
    throw new HTTPException(500, { message: 'Failed to import from IMSLP' })
  }
})

// Batch import endpoint
enhancedImportHandler.post('/batch', async c => {
  try {
    const { urls } = await c.req.json()

    if (!Array.isArray(urls) || urls.length === 0) {
      throw new HTTPException(400, { message: 'URLs array is required' })
    }

    if (urls.length > 10) {
      throw new HTTPException(400, { message: 'Maximum 10 URLs per batch' })
    }

    const results = []

    for (const url of urls) {
      try {
        // Determine if URL is IMSLP
        if (url.includes('imslp.org')) {
          const scoreId = nanoid()

          // Queue for processing
          if (c.env.PDF_QUEUE) {
            await c.env.PDF_QUEUE.send({
              scoreId,
              action: 'import-imslp',
              data: { url },
            })
          }

          results.push({
            url,
            scoreId,
            status: 'queued',
            message: 'Queued for import',
          })
        } else {
          results.push({
            url,
            status: 'failed',
            message: 'Only IMSLP URLs are supported for batch import',
          })
        }
      } catch (error) {
        results.push({
          url,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Import failed',
        })
      }
    }

    return c.json({
      success: true,
      data: results,
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error in batch import:', error)
    throw new HTTPException(500, { message: 'Failed to process batch import' })
  }
})
