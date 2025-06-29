import { Context } from 'hono'
import { cors } from 'hono/cors'

// Handler to serve test PDFs for development
export async function serveTestPdf(c: Context) {
  const filename = c.req.param('filename')

  // Only allow specific test PDFs
  const allowedFiles = ['score_01.pdf', 'score_02.pdf']
  if (!allowedFiles.includes(filename)) {
    return c.json({ success: false, error: 'File not found' }, 404)
  }

  try {
    // In development, serve from the file system
    // In production, these would be served from R2
    const env = c.env as any

    // For Cloudflare Workers in local development, we need to use a different approach
    // since fs module is not available. We'll use the R2 binding if available
    if (env.SCORES_BUCKET) {
      // Try to get from R2 bucket
      const object = await env.SCORES_BUCKET.get(`test-data/${filename}`)
      if (object) {
        const headers = new Headers()
        headers.set('Content-Type', 'application/pdf')
        headers.set('Content-Disposition', `inline; filename="${filename}"`)
        headers.set('Cache-Control', 'public, max-age=3600')
        headers.set('Access-Control-Allow-Origin', '*')
        headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        headers.set('Access-Control-Allow-Headers', 'Content-Type')

        return new Response(object.body, { headers })
      }
    }

    // For local development without R2, we need to return a proper error
    // The frontend should handle this by showing a message to upload the PDFs
    return new Response(
      JSON.stringify({
        success: false,
        error:
          'Test PDFs not found. Please upload them to R2 or use production URLs.',
        message:
          'In local development, PDFs must be uploaded to R2 bucket first.',
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    )
  } catch (error) {
    console.error('Error serving PDF:', error)
    return c.json({ success: false, error: 'Failed to serve PDF' }, 500)
  }
}

// Middleware to handle CORS for PDF endpoints
export const pdfCors = cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://*.mirubato.com',
  ],
  allowMethods: ['GET'],
  allowHeaders: ['Content-Type'],
  exposeHeaders: ['Content-Disposition'],
  maxAge: 86400,
})
