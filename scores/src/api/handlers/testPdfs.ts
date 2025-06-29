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

    // For local development, we'll return a placeholder response
    // In a real implementation, you'd read the file from R2 or local storage

    // Create a proper PDF response
    return new Response('PDF content would be here', {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*', // For development only
      },
    })
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
