import { Context } from 'hono'

/**
 * Handles scorebook routes by redirecting to the frontend application
 */
export async function scorebookHandler(c: Context) {
  const env = c.env as any
  const path = c.req.path

  // Determine the frontend URL based on environment
  let frontendUrl = 'https://mirubato.com'

  if (env.ENVIRONMENT === 'staging') {
    // For staging, use the staging frontend
    frontendUrl = 'https://staging.mirubato.com'
  } else if (env.ENVIRONMENT === 'local') {
    frontendUrl = 'http://localhost:3000'
  }

  // Preserve the full path
  const redirectUrl = `${frontendUrl}${path}`

  // Temporary redirect (302) to the frontend
  return c.redirect(redirectUrl, 302)
}

/**
 * Serve a simple scorebook landing page
 */
export async function scorebookLandingHandler(c: Context) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mirubato Scorebook</title>
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
      text-align: center;
    }
    h1 {
      color: #333;
      margin: 0 0 1rem;
      font-size: 2.5rem;
    }
    .subtitle {
      color: #666;
      font-size: 1.2rem;
      margin-bottom: 2rem;
    }
    .scores-list {
      margin: 2rem 0;
      text-align: left;
    }
    .score-link {
      display: block;
      padding: 1rem;
      margin: 0.5rem 0;
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      text-decoration: none;
      color: #4a5568;
      transition: all 0.3s;
    }
    .score-link:hover {
      background: #667eea;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    .score-title {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .score-composer {
      font-size: 0.9rem;
      opacity: 0.8;
    }
    .info {
      background: #f0f4ff;
      border: 1px solid #667eea;
      border-radius: 8px;
      padding: 1rem;
      margin: 2rem 0;
      font-size: 0.9rem;
      color: #4a5568;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎼 Mirubato Scorebook</h1>
    <p class="subtitle">Practice sight-reading with our curated collection</p>
    
    <div class="info">
      📱 For the best experience, please access the scorebook through the main Mirubato app
    </div>
    
    <div class="scores-list">
      <h3>Featured Scores:</h3>
      <a href="/scorebook/test_aire_sureno" class="score-link">
        <div class="score-title">Aire Sureño</div>
        <div class="score-composer">Agustín Barrios Mangoré • Guitar • Advanced</div>
      </a>
      <a href="/scorebook/test_romance_anonimo" class="score-link">
        <div class="score-title">Romance (Spanish Romance)</div>
        <div class="score-composer">Anonymous (arr. Eythor Thorlaksson) • Guitar • Intermediate</div>
      </a>
    </div>
    
    <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #e2e8f0; text-align: center; color: #718096; font-size: 0.9rem;">
      <p>Scores API: <a href="/health" style="color: #667eea;">Health Status</a> | <a href="/docs" style="color: #667eea;">API Docs</a></p>
    </div>
  </div>
</body>
</html>
  `

  return c.html(html)
}
