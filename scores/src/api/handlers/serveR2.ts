import { Context } from 'hono'

/**
 * Serves files from R2 storage
 * Works with both Miniflare (local) and production R2
 */
export async function serveR2File(c: Context) {
  const filename = c.req.param('filename')

  // Security: Only allow specific test PDFs
  const allowedFiles = ['score_01.pdf', 'score_02.pdf']
  if (!allowedFiles.includes(filename)) {
    return c.json({ success: false, error: 'File not found' }, 404)
  }

  try {
    const env = c.env as any
    const key = `test-data/${filename}`

    // Get the file from R2 (works with both Miniflare and production)
    const object = await env.SCORES_BUCKET.get(key)

    if (!object) {
      return c.json(
        {
          success: false,
          error: 'File not found in R2',
          message: 'Please seed the test data first',
          key,
        },
        404
      )
    }

    // Set appropriate headers
    const headers = new Headers()
    headers.set('Content-Type', 'application/pdf')
    headers.set('Content-Disposition', `inline; filename="${filename}"`)
    headers.set('Cache-Control', 'public, max-age=3600')
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type')

    // Return the file
    return new Response(object.body, { headers })
  } catch (error) {
    console.error('Error serving file from R2:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to serve file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
}
