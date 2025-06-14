export async function logRequest(request: Request): Promise<void> {
  // Request logging disabled in production
  // Enable only for debugging by uncommenting the lines below

  // === Incoming Request ===
  // URL: request.url
  // Method: request.method
  // Headers: Object.fromEntries(request.headers.entries())

  if (
    request.method === 'POST' &&
    request.headers.get('content-type')?.includes('application/json')
  ) {
    try {
      const clonedRequest = request.clone()
      const body = await clonedRequest.text()
      // Body: body

      // Try to parse as JSON to check GraphQL query
      try {
        JSON.parse(body)
        // Parsed GraphQL successfully
      } catch (e) {
        // Body is not valid JSON
      }
    } catch (e) {
      // Could not read body: e
    }
  }
  // ======================
}
