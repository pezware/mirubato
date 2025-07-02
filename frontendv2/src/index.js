// Worker that serves static assets with SPA routing support
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    try {
      // Try to serve the exact path first
      let response = await env.ASSETS.fetch(request)

      // If it's a 404 and not a file with an extension, serve index.html for client-side routing
      if (response.status === 404 && !url.pathname.includes('.')) {
        // Create a new request for index.html but preserve the original URL
        // This is important for client-side routing to work with query parameters
        const indexRequest = new Request(request)
        const indexUrl = new URL('/index.html', request.url)

        // Fetch index.html but keep the original request URL for the browser
        response = await env.ASSETS.fetch(
          new Request(indexUrl.toString(), {
            ...indexRequest,
            headers: indexRequest.headers,
          })
        )

        // Clone the response to modify headers if needed
        response = new Response(response.body, response)
      }

      // Ensure proper Content-Type headers for CSS and JS files
      if (response.status === 200) {
        const headers = new Headers(response.headers)
        const ext = url.pathname.split('.').pop()?.toLowerCase()

        // Set Content-Type based on file extension
        if (ext === 'css' && !headers.get('content-type')) {
          headers.set('content-type', 'text/css; charset=utf-8')
        } else if (ext === 'js' && !headers.get('content-type')) {
          headers.set('content-type', 'application/javascript; charset=utf-8')
        } else if (ext === 'json' && !headers.get('content-type')) {
          headers.set('content-type', 'application/json; charset=utf-8')
        }

        // Set Content Security Policy to allow jsdelivr CDN
        if (
          url.pathname === '/' ||
          url.pathname === '/index.html' ||
          !url.pathname.includes('.')
        ) {
          headers.set(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://static.cloudflareinsights.com https://accounts.google.com https://apis.google.com https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://scores.mirubato.com https://scores-staging.mirubato.com http://scores-mirubato.localhost:* http://api-mirubato.localhost:*; connect-src 'self' https://api.mirubato.com https://api-staging.mirubato.com https://scores.mirubato.com https://scores-staging.mirubato.com https://accounts.google.com https://oauth2.googleapis.com https://cloudflareinsights.com https://tonejs.github.io; frame-src 'self' https://accounts.google.com https://scores.mirubato.com https://scores-staging.mirubato.com; object-src 'self' https://scores.mirubato.com https://scores-staging.mirubato.com; media-src 'self' blob: data: https://tonejs.github.io; worker-src 'self' blob: https://unpkg.com https://cdn.jsdelivr.net"
          )
        }

        // Create new response with updated headers
        response = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        })
      }

      return response
    } catch (e) {
      return new Response('Error serving request', { status: 500 })
    }
  },
}
