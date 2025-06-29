import { Context } from 'hono'

/**
 * Development-only endpoint to seed test data into local R2
 * This only works with Miniflare (wrangler dev)
 */
export async function seedTestData(c: Context) {
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
    const testFiles = [
      { key: 'test-data/score_01.pdf', filename: 'score_01.pdf' },
      { key: 'test-data/score_02.pdf', filename: 'score_02.pdf' },
    ]

    const results = []

    for (const { key, filename } of testFiles) {
      try {
        // In Miniflare, we can't read from the filesystem directly
        // Instead, we'll create placeholder content for testing
        // In a real scenario, you'd upload actual files through the API

        // For now, let's check if the file already exists
        const existing = await env.SCORES_BUCKET.get(key)
        if (existing) {
          results.push({ key, status: 'already exists' })
          continue
        }

        // Create a simple placeholder PDF
        const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
164
%%EOF`

        // Upload to R2
        await env.SCORES_BUCKET.put(key, pdfContent, {
          httpMetadata: {
            contentType: 'application/pdf',
          },
        })

        results.push({ key, status: 'uploaded' })
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
export async function uploadToR2(c: Context) {
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
