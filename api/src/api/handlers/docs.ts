import { Hono } from 'hono'
import { openAPISpec } from '../openapi'
import type { Env } from '../../index'

export const docsHandler = new Hono<{ Bindings: Env }>()

/**
 * Serve interactive API documentation using Stoplight Elements
 */
docsHandler.get('/', c => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <title>Mirubato API Documentation</title>
  <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
  <style>
    body {
      margin: 0;
      padding: 0;
      height: 100vh;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <elements-api
    apiDescriptionUrl="/openapi.json"
    router="hash"
    layout="sidebar"
    hideTryIt="false"
  />
</body>
</html>
  `
  return c.html(html)
})

/**
 * Serve OpenAPI specification
 */
docsHandler.get('/openapi.json', c => {
  return c.json(openAPISpec)
})

/**
 * Alternative: Swagger UI
 */
docsHandler.get('/swagger', c => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mirubato API - Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>
  `
  return c.html(html)
})

/**
 * Alternative: RapiDoc
 */
docsHandler.get('/rapidoc', c => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mirubato API - RapiDoc</title>
  <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
</head>
<body>
  <rapi-doc
    spec-url="/openapi.json"
    theme="light"
    render-style="view"
    style="width:100%; height:100vh;"
    show-header="true"
    allow-try="true"
    allow-authentication="true"
  />
</body>
</html>
  `
  return c.html(html)
})
