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

      return response
    } catch (e) {
      return new Response('Error serving request', { status: 500 })
    }
  },
}
