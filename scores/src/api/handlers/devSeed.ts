import { Context } from 'hono'
import { UploadService } from '../../services/uploadService'

// Base64 encoded test PDFs (first 10KB of each file for demo)
// In a real implementation, you would:
// 1. Store these in a separate config file
// 2. Use a build script to generate them from actual PDFs
// 3. Or fetch them from a CDN/external source
const TEST_PDFS = {
  'score_01.pdf': {
    title: 'Aire Sureño',
    composer: 'Agustín Barrios',
    instrument: 'guitar',
    difficulty: 'advanced',
    // This is a minimal valid PDF that displays "Test Score 1"
    content: `JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA0IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDUgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhPj4KZW5kb2JqCjUgMCBvYmoKPDwvTGVuZ3RoIDg4Pj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRkCihUZXN0IFNjb3JlIDEgLSBBaXJlIFN1cmVubyBQbGFjZWhvbGRlcikgVGoKMTAwIDY1MCBUZAooVGhpcyBpcyBhIHBsYWNlaG9sZGVyIFBERiBmb3IgdGVzdGluZykgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago2IDAgb2JqCjw8L1R5cGUvWFJlZi9TaXplIDcvV1sxIDIgMl0vUm9vdCAxIDAgUi9JbmZvIDcgMCBSL0lEWzwxMjM0NTY3ODkwQUJDREVGMTIzNDU2Nzg5MEFCQ0RFRj48MTIzNDU2Nzg5MEFCQ0RFRjEyMzQ1Njc4OTBBQkNERUY+XT4+CnN0cmVhbQp4nGNgYGBgZGBgYAZiRgYQYAJiIMnAwAIkWaA0AxMDEwMbEDMzMDMwMjAxAAAAPAAECgplbmRzdHJlYW0KZW5kb2JqCnN0YXJ0eHJlZgo2NDYKJSVFT0Y=`,
  },
  'score_02.pdf': {
    title: 'Romance (Spanish Romance)',
    composer: 'Anonymous',
    instrument: 'guitar',
    difficulty: 'intermediate',
    // This is a minimal valid PDF that displays "Test Score 2"
    content: `JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA0IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDUgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhPj4KZW5kb2JqCjUgMCBvYmoKPDwvTGVuZ3RoIDk1Pj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRkCihUZXN0IFNjb3JlIDIgLSBTcGFuaXNoIFJvbWFuY2UgUGxhY2Vob2xkZXIpIFRqCjEwMCA2NTAgVGQKKFRoaXMgaXMgYSBwbGFjZWhvbGRlciBQREYgZm9yIHRlc3RpbmcpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKNiAwIG9iago8PC9UeXBlL1hSZWYvU2l6ZSA3L1dbMSAyIDJdL1Jvb3QgMSAwIFIvSW5mbyA3IDAgUi9JRFs8MTIzNDU2Nzg5MEFCQ0RFRjEyMzQ1Njc4OTBBQkNERUY+PDEyMzQ1Njc4OTBBQkNERUYxMjM0NTY3ODkwQUJDREVGPl0+PgpzdHJlYW0KeJxjYGBgYGRgYGAGYkYGEGACYiDJwMAMJFmgNAMTAxMDGxAzMzAzMDIwMQAAADwABAoKZW5kc3RyZWFtCmVuZG9iagpzdGFydHhyZWYKNjUzCiUlRU9G`,
  },
}

const uploadService = new UploadService()

/**
 * Development-only endpoint to seed test data into local R2
 * This only works with Miniflare (wrangler dev)
 */
export async function seedTestData(c: Context<{ Bindings: Env }>) {
  const env = c.env

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
    const results = []

    for (const [filename, data] of Object.entries(TEST_PDFS)) {
      const key = `test-data/${filename}`

      try {
        // Check if file already exists
        const exists = await uploadService.fileExists(key, env)
        if (exists) {
          results.push({ key, status: 'already exists' })
          continue
        }

        // Upload the test PDF
        const uploadResult = await uploadService.uploadFromBase64(
          data.content,
          filename,
          env,
          {
            customKey: key,
            metadata: {
              title: data.title,
              composer: data.composer,
              instrument: data.instrument,
              difficulty: data.difficulty,
              isTestData: 'true',
            },
          }
        )

        if (uploadResult.success) {
          results.push({ key, status: 'uploaded', url: uploadResult.url })
        } else {
          results.push({ key, status: 'failed', error: uploadResult.error })
        }
      } catch (error) {
        results.push({
          key,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return c.json({
      success: true,
      message: 'Test data seeding complete',
      results,
      note: 'These are placeholder PDFs with text. To use real sheet music PDFs, upload them via the /api/dev/upload endpoint.',
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to seed test data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
}

/**
 * Development endpoint to manually upload a file to R2
 */
export async function uploadToR2(c: Context<{ Bindings: Env }>) {
  const env = c.env

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
    const { key, content, contentType } = body

    if (!key || !content) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: key, content',
        },
        400
      )
    }

    // Decode base64 content if provided
    const fileContent = content.includes('base64,')
      ? atob(content.split('base64,')[1])
      : content

    // Upload to R2
    await env.SCORES_BUCKET.put(key, fileContent, {
      httpMetadata: {
        contentType: contentType || 'application/octet-stream',
      },
    })

    return c.json({
      success: true,
      message: `File uploaded to R2: ${key}`,
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
}
