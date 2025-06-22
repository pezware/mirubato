import { Hono } from 'hono'
import { openAPISpec } from '../openapi'

export const docsHandler = new Hono<{ Bindings: Env }>()

// Serve OpenAPI spec as JSON
docsHandler.get('/openapi.json', c => {
  return c.json(openAPISpec)
})

// Serve Stoplight Elements documentation
docsHandler.get('/', c => {
  const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Mirubato Scores API Documentation</title>
    <meta name="description" content="Interactive API documentation for Mirubato Scores Service">
    
    <!-- Stoplight Elements CSS -->
    <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
    
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      
      /* Custom theme overrides */
      .sl-elements {
        --color-primary: #4F46E5;
        --color-primary-dark: #4338CA;
        --color-primary-light: #6366F1;
        --color-success: #10B981;
        --color-warning: #F59E0B;
        --color-danger: #EF4444;
      }
      
      /* Header styling */
      .api-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 2rem;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .api-header h1 {
        margin: 0;
        font-size: 2.5rem;
        font-weight: 700;
      }
      
      .api-header p {
        margin: 0.5rem 0 0;
        opacity: 0.9;
        font-size: 1.1rem;
      }
      
      .api-links {
        margin-top: 1.5rem;
      }
      
      .api-links a {
        color: white;
        text-decoration: none;
        margin: 0 1rem;
        padding: 0.5rem 1rem;
        border: 2px solid white;
        border-radius: 4px;
        display: inline-block;
        transition: all 0.3s;
      }
      
      .api-links a:hover {
        background: white;
        color: #764ba2;
      }
      
      /* Elements container */
      #elements-container {
        height: calc(100vh - 200px);
      }
    </style>
  </head>
  <body>
    <div class="api-header">
      <h1>🎼 Mirubato Scores API</h1>
      <p>Interactive API Documentation</p>
      <div class="api-links">
        <a href="/">Home</a>
        <a href="/health">Health Check</a>
        <a href="/api/openapi.json" target="_blank">OpenAPI Spec</a>
        <a href="https://github.com/pezware/mirubato" target="_blank">GitHub</a>
      </div>
    </div>
    
    <div id="elements-container"></div>
    
    <!-- Stoplight Elements JS -->
    <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
    
    <script>
      // Initialize Stoplight Elements
      const container = document.getElementById('elements-container');
      
      // Create the API documentation component
      const docs = document.createElement('elements-api');
      docs.setAttribute('apiDescriptionUrl', '/api/openapi.json');
      docs.setAttribute('router', 'hash');
      docs.setAttribute('layout', 'sidebar');
      docs.setAttribute('hideTryIt', 'false');
      docs.setAttribute('hideSchemas', 'false');
      docs.setAttribute('hideInternal', 'true');
      docs.setAttribute('hideExport', 'false');
      docs.setAttribute('logo', '');
      
      container.appendChild(docs);
    </script>
  </body>
</html>
  `

  return c.html(html)
})

// Alternative: Serve with RapiDoc
docsHandler.get('/rapidoc', c => {
  const html = `
<!doctype html>
<html>
  <head>
    <title>Mirubato Scores API - RapiDoc</title>
    <meta charset="utf-8">
    <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
  </head>
  <body>
    <rapi-doc
      spec-url="/api/openapi.json"
      theme="dark"
      render-style="view"
      style="height:100vh; width:100%"
      show-header="true"
      allow-try="true"
      allow-authentication="true"
      allow-server-selection="true"
      show-info="true"
      show-components="true"
      nav-bg-color="#2d3748"
      primary-color="#4299e1"
    >
      <div slot="logo" style="display: flex; align-items: center; padding: 10px;">
        <span style="font-size: 24px; color: white;">🎼 Mirubato Scores</span>
      </div>
    </rapi-doc>
  </body>
</html>
  `

  return c.html(html)
})

// Alternative: Serve with Swagger UI
docsHandler.get('/swagger', c => {
  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mirubato Scores API - Swagger UI</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '/api/openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIBundle.SwaggerUIStandalonePreset
          ],
          layout: "StandaloneLayout",
          theme: "dark"
        });
      };
    </script>
  </body>
</html>
  `

  return c.html(html)
})
