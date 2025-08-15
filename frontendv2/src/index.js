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

        // Add CORS headers for all responses
        headers.set('Access-Control-Allow-Origin', '*')
        headers.set(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, DELETE, OPTIONS'
        )
        headers.set(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization, X-Device-ID, X-Idempotency-Key'
        )
        headers.set('Access-Control-Max-Age', '86400')

        // Set Cross-Origin-Opener-Policy for OAuth flows
        headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')

        // Add security headers
        headers.set('X-Frame-Options', 'DENY')
        headers.set('X-Content-Type-Options', 'nosniff')
        headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

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
