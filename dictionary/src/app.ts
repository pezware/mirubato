/**
 * Music Dictionary Service - Application Configuration
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { timing } from 'hono/timing'
import { swaggerUI } from '@hono/swagger-ui'
import { Env, Variables } from './types/env'
import { errorHandler } from './utils/errors'
import { tieredRateLimit } from './middleware/rate-limit'
import { requestId } from './middleware/request-id'
import { structuredLogger, accessLogger } from './middleware/logging'

// Import routes
import { healthRoutes } from './routes/health'
import { docsRoutes } from './routes/docs'
import { dictionaryRoutes } from './routes/dictionary'
import { adminPortal } from './routes/admin-portal'
import adminAuthRoutes from './routes/admin-auth'

/**
 * Create and configure Hono app
 */
export const app = new Hono<{ Bindings: Env; Variables: Variables }>()

/**
 * Global middleware
 */
// Add request ID first so it's available to all other middleware
app.use('*', requestId())

// Use structured logging in development, simple access logging in production
app.use('*', async (c, next) => {
  if (c.env.ENVIRONMENT === 'production' && c.env.LOG_LEVEL !== 'debug') {
    return accessLogger()(c, next)
  }
  return structuredLogger()(c, next)
})

// Timing middleware for performance monitoring
app.use('*', timing())

// CORS configuration with environment-based origins
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: origin => {
      // In production, use environment variable
      const allowedOrigins = c.env.CORS_ORIGIN
        ? c.env.CORS_ORIGIN.split(',').map(o => o.trim())
        : [
            'https://mirubato.com',
            'https://www.mirubato.com',
            'https://staging.mirubato.com',
            'https://www-staging.mirubato.com',
            'http://localhost:3000',
            'http://localhost:4000',
            'http://www-mirubato.localhost:4000',
          ]

      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
  return corsMiddleware(c, next)
})

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

/**
 * Routes
 */
// Health check endpoints
app.route('/', healthRoutes)

// Documentation endpoints
app.route('/docs', docsRoutes)
app.get('/swagger', swaggerUI({ url: '/docs/openapi.json' }))

// Admin portal and auth routes (must be before API routes)
app.route('/fredericchopin', adminPortal)
app.route('/fredericchopin/auth', adminAuthRoutes)

// Dictionary API routes
app.route('/', dictionaryRoutes)

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
            <a href="/swagger" class="link-card">
                <h4>🔨 Swagger UI</h4>
                <p>Explore API endpoints</p>
            </a>
            <a href="/health" class="link-card">
                <h4>🏥 Health Status</h4>
                <p>Service health information</p>
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

/**
 * 404 handler
 */
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

/**
 * Global error handler
 */
app.onError(errorHandler)

/**
 * Export configured app
 */
export default app
