// Worker that serves static assets with SPA routing support
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    try {
      // Try to serve the exact path first
      let response = await env.ASSETS.fetch(request)

      // If it's a 404 and not a file with an extension, serve index.html for client-side routing
      if (response.status === 404 && !url.pathname.includes('.')) {
        const indexRequest = new Request(
          new URL('/index.html', request.url).toString(),
          request
        )
        response = await env.ASSETS.fetch(indexRequest)
      }

      return response
    } catch (e) {
      return new Response('Error serving request', { status: 500 })
    }
  },
}
