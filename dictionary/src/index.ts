/**
 * Music Dictionary Service - Worker Entry Point
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { timing } from 'hono/timing'
import { Env, Variables } from './types/env'
import { MessageBatch } from '@cloudflare/workers-types'
import { errorHandler } from './utils/errors'
// import { cache, edgeCache } from './middleware/cache'
import { tieredRateLimit } from './middleware/rate-limit'
import { auth } from './middleware/auth'

// Import route handlers
import { healthHandler } from './api/handlers/health'
import { termsHandler } from './api/handlers/terms'
import { searchHandler } from './api/handlers/search'
import { docsHandler } from './api/handlers/docs'
import { batchHandler } from './api/handlers/batch'
import { exportHandler } from './api/handlers/export'
import { enhanceHandler } from './api/handlers/enhance'
import { adminHandler } from './api/handlers/admin'
import { analyticsHandler } from './api/handlers/analytics'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// Global middleware
app.use(
  '*',
  cors({
    origin: [
      'https://mirubato.com',
      'https://www.mirubato.com',
      'https://mirubato-staging.com',
      'http://localhost:3000',
      'http://localhost:4000',
      'http://www-mirubato.localhost:4000',
    ],
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
)

app.use('*', logger())
app.use('*', timing())

// Apply tiered rate limiting to API routes
app.use(
  '/api/*',
  tieredRateLimit({
    anonymous: {
      windowMs: 60000,
      max: 60,
      message: 'Too many requests from this IP, please try again later',
    },
    authenticated: {
      windowMs: 60000,
      max: 120,
    },
    premium: {
      windowMs: 60000,
      max: 600,
    },
  })
)

// Error handling
app.onError(errorHandler)

// Health check endpoints (mount the routes properly)
app.route('/', healthHandler)

// Documentation
app.route('/docs', docsHandler)

// API v1 routes
const v1 = new Hono<{ Bindings: Env }>()

// Public endpoints
v1.route('/terms', termsHandler)
v1.route('/search', searchHandler)
v1.route('/batch', batchHandler)
v1.route('/export', exportHandler)
v1.route('/analytics', analyticsHandler)

// Protected endpoints (require auth)
v1.use('/enhance/*', auth())
v1.route('/enhance', enhanceHandler)

v1.use('/admin/*', auth({ roles: ['admin'] }))
v1.route('/admin', adminHandler)

// Mount v1 routes
app.route('/api/v1', v1)

// Root endpoint - Landing page
app.get('/', c => {
  const environment = c.env.ENVIRONMENT || 'production'
  const isProduction = environment === 'production'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mirubato Music Dictionary Service</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            padding: 40px;
            max-width: 800px;
            width: 100%;
        }
        
        h1 {
            color: #333;
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-align: center;
        }
        
        .subtitle {
            color: #666;
            text-align: center;
            margin-bottom: 30px;
            font-size: 1.1rem;
        }
        
        .version-badge {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            margin-left: 10px;
        }
        
        .status {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #10b981;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 500;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .info-box {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .info-box h3 {
            color: #4b5563;
            margin-bottom: 10px;
        }
        
        .info-box p {
            color: #6b7280;
            line-height: 1.6;
        }
        
        .links-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .link-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            text-decoration: none;
            color: #333;
            transition: all 0.3s ease;
            text-align: center;
        }
        
        .link-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border-color: #667eea;
        }
        
        .link-card h4 {
            color: #667eea;
            margin-bottom: 8px;
        }
        
        .link-card p {
            color: #6b7280;
            font-size: 0.9rem;
        }
        
        .endpoints {
            background: #f9fafb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .endpoints h3 {
            color: #4b5563;
            margin-bottom: 15px;
        }
        
        .endpoint-list {
            list-style: none;
        }
        
        .endpoint-list li {
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            color: #374151;
        }
        
        .endpoint-list li:last-child {
            border-bottom: none;
        }
        
        .endpoint-list .auth-required {
            color: #ef4444;
            font-size: 0.8rem;
            margin-left: 8px;
        }
        
        .footer {
            text-align: center;
            color: #9ca3af;
            font-size: 0.9rem;
        }
        
        .environment-badge {
            display: inline-block;
            background: ${isProduction ? '#10b981' : '#f59e0b'};
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            margin-left: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>
            📖 Mirubato Music Dictionary Service
            <span class="version-badge">v1.0.0</span>
        </h1>
        <p class="subtitle">AI-powered music terminology dictionary</p>
        
        <div class="status">
            <span class="status-badge">
                <span class="status-dot"></span>
                Operational
            </span>
            <span class="environment-badge">${environment}</span>
        </div>
        
        <div class="info-box">
            <h3>About This Service</h3>
            <p>
                The Mirubato Music Dictionary provides comprehensive definitions and educational content
                for musical terms, powered by AI models with quality verification and continuous improvement.
            </p>
        </div>
        
        <div class="links-grid">
            <a href="/docs" class="link-card">
                <h4>📚 API Documentation</h4>
                <p>Interactive API documentation</p>
            </a>
            <a href="/health" class="link-card">
                <h4>🏥 Health Status</h4>
                <p>Service health information</p>
            </a>
            <a href="/api/openapi.json" class="link-card">
                <h4>📄 OpenAPI Spec</h4>
                <p>OpenAPI 3.0 specification</p>
            </a>
            <a href="/metrics" class="link-card">
                <h4>📊 Metrics</h4>
                <p>Prometheus metrics endpoint</p>
            </a>
        </div>
        
        <div class="endpoints">
            <h3>API Endpoints</h3>
            <ul class="endpoint-list">
                <li>GET /api/v1/terms/:term</li>
                <li>GET /api/v1/search?q=query</li>
                <li>POST /api/v1/search/semantic</li>
                <li>POST /api/v1/batch/query</li>
                <li>GET /api/v1/analytics/summary</li>
                <li>POST /api/v1/enhance <span class="auth-required">(auth required)</span></li>
                <li>* /api/v1/admin/* <span class="auth-required">(admin required)</span></li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Part of the Mirubato music education platform</p>
            <p>© 2025 Mirubato. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `

  return c.html(html)
})

// 404 handler
app.notFound(c => {
  return c.json(
    {
      status: 'error',
      error: {
        code: 'NOT_FOUND',
        message: 'The requested endpoint does not exist',
        timestamp: new Date().toISOString(),
      },
    },
    404
  )
})

// Export the worker with queue handler
export default {
  fetch: app.fetch,

  // Queue handler for batch processing
  async queue(batch: MessageBatch, _env: Env): Promise<void> {
    console.log(`Processing ${batch.messages.length} messages from queue`)

    for (const message of batch.messages) {
      try {
        // Process each message
        const data = message.body as any

        // Handle different message types
        switch (data.type) {
          case 'enhance_entry':
            // Enhancement logic would go here
            console.log(`Enhancing entry: ${data.entryId}`)
            break

          case 'batch_import':
            // Batch import logic would go here
            console.log(`Batch importing: ${data.entries?.length || 0} entries`)
            break

          default:
            console.log(`Unknown message type: ${data.type}`)
        }

        // Acknowledge the message
        message.ack()
      } catch (error) {
        console.error('Error processing queue message:', error)
        // Retry the message
        message.retry()
      }
    }
  },
}
