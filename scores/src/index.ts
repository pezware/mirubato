import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { api } from './api/routes'
import { healthHandler } from './api/handlers/health'
import { docsHandler } from './api/handlers/docs'
import {
  addCacheHeaders,
  getCachedResponse,
  cacheResponse,
  handleConditionalRequest,
} from './utils/cache'

const app = new Hono<{ Bindings: Env }>()

// Middleware
app.use('*', logger())

// CORS configuration
app.use(
  '*',
  cors({
    origin: origin => {
      // Allow requests from mirubato domains and localhost
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:8787',
        'https://mirubato.com',
        'https://www.mirubato.com',
        'https://api.mirubato.com',
        'https://mirubato.pezware.workers.dev',
        'https://api.mirubato.pezware.workers.dev',
      ]

      if (!origin) return null
      if (allowedOrigins.includes(origin)) return origin
      if (origin.endsWith('.mirubato.com')) return origin
      if (origin.includes('localhost')) return origin

      return null
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
    credentials: true,
  })
)

// Health check endpoints (mount the routes properly)
app.route('/', healthHandler)

// Documentation routes
app.route('/docs', docsHandler)

// API documentation endpoints
app.get('/api/openapi.json', async c => {
  // Re-route to docs handler
  return docsHandler.request('/openapi.json', c.req.raw, c.env)
})

app.get('/api/docs', c => c.redirect('/docs'))

// Mount API routes
app.route('/api', api)

// Default route
app.get('/', c => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mirubato Scores Service</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      max-width: 600px;
      width: 90%;
    }
    h1 {
      color: #333;
      margin: 0 0 1rem;
      font-size: 2.5rem;
    }
    .version {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }
    .links {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 2rem;
    }
    .link {
      display: block;
      padding: 1rem;
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      text-decoration: none;
      color: #4a5568;
      transition: all 0.3s;
    }
    .link:hover {
      background: #667eea;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    .link h3 {
      margin: 0 0 0.5rem;
      font-size: 1.1rem;
    }
    .link p {
      margin: 0;
      font-size: 0.9rem;
      opacity: 0.8;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: #10b981;
      color: white;
      border-radius: 20px;
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }
    .status::before {
      content: '';
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎼 Mirubato Scores Service</h1>
    <div class="version">Version 1.0.0</div>
    <div class="status">Service Operational</div>
    
    <p>Welcome to the Mirubato Scores API. This service handles sheet music storage, processing, and delivery.</p>
    
    <div class="links">
      <a href="/docs" class="link">
        <h3>📚 API Documentation</h3>
        <p>Interactive API docs with Stoplight Elements</p>
      </a>
      
      <a href="/health" class="link">
        <h3>🏥 Health Status</h3>
        <p>Check service health and dependencies</p>
      </a>
      
      <a href="/api/openapi.json" class="link">
        <h3>📄 OpenAPI Spec</h3>
        <p>Download the OpenAPI specification</p>
      </a>
      
      <a href="/metrics" class="link">
        <h3>📊 Metrics</h3>
        <p>Prometheus-compatible metrics</p>
      </a>
      
      <a href="/docs/swagger" class="link">
        <h3>🔧 Swagger UI</h3>
        <p>Alternative API documentation</p>
      </a>
      
      <a href="/docs/rapidoc" class="link">
        <h3>⚡ RapiDoc</h3>
        <p>Modern API documentation</p>
      </a>
    </div>
    
    <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #e2e8f0; text-align: center; color: #718096; font-size: 0.9rem;">
      <p>Environment: ${c.env.ENVIRONMENT}</p>
      <p>© 2025 Mirubato. MIT License.</p>
    </div>
  </div>
</body>
</html>
  `

  return c.html(html)
})

// Serve temporary HTML for browser rendering
app.get('/render/:key', async c => {
  const key = c.req.param('key')
  const html = await c.env.CACHE.get(key)

  if (!html) {
    return c.text('Not found', 404)
  }

  return c.html(html)
})

// Serve files from R2 (for PDF viewing)
app.get('/files/*', async c => {
  try {
    // Check edge cache first
    const cachedResponse = await getCachedResponse(c.req.raw, c)
    if (cachedResponse) {
      return cachedResponse
    }

    const path = c.req.path.replace('/files/', '')
    const object = await c.env.SCORES_BUCKET.get(path)

    if (!object) {
      return c.text('Not found', 404)
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)

    // Determine content type from file extension
    const ext = path.split('.').pop()?.toLowerCase() || ''
    const contentType = getFileContentType(ext)
    if (contentType) {
      headers.set('Content-Type', contentType)
    }

    // Create response
    let response = new Response(object.body, { headers })

    // Add cache headers based on content type
    const isVersioned = path.includes('/versions/') || path.includes('/v')
    response = addCacheHeaders(
      response,
      contentType || 'application/octet-stream',
      {
        isVersioned,
        isPublic: true,
      }
    )

    // Handle conditional requests
    const conditionalResponse = handleConditionalRequest(c.req.raw, response)
    if (conditionalResponse) {
      return conditionalResponse
    }

    // Cache response at edge
    await cacheResponse(c.req.raw, response.clone(), c)

    return response
  } catch (error) {
    console.error('Error serving file:', error)
    return c.text('Internal server error', 500)
  }
})

// Helper function to determine content type
function getFileContentType(ext: string): string | null {
  const contentTypes: Record<string, string> = {
    pdf: 'application/pdf',
    xml: 'application/vnd.recordare.musicxml+xml',
    musicxml: 'application/vnd.recordare.musicxml+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
    json: 'application/json',
    txt: 'text/plain',
    abc: 'text/vnd.abc',
    ly: 'text/x-lilypond',
  }
  return contentTypes[ext] || null
}

// Error handling
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: err.message,
        code: err.status,
      },
      err.status
    )
  }

  console.error('Unhandled error:', err)
  return c.json(
    {
      success: false,
      error: 'Internal server error',
      code: 500,
    },
    500
  )
})

// 404 handler
app.notFound(c => {
  return c.json(
    {
      success: false,
      error: 'Not found',
      code: 404,
    },
    404
  )
})

// Export for Cloudflare Workers
export default app

// Export for testing
export { app }
