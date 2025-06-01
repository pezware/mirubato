export async function logRequest(request: Request): Promise<void> {
  console.log('=== Incoming Request ===')
  console.log('URL:', request.url)
  console.log('Method:', request.method)
  console.log('Headers:', Object.fromEntries(request.headers.entries()))

  if (
    request.method === 'POST' &&
    request.headers.get('content-type')?.includes('application/json')
  ) {
    try {
      const clonedRequest = request.clone()
      const body = await clonedRequest.text()
      console.log('Body:', body)

      // Try to parse as JSON to check GraphQL query
      try {
        const parsed = JSON.parse(body)
        console.log('Parsed GraphQL:', {
          query: parsed.query,
          variables: parsed.variables,
          operationName: parsed.operationName,
        })
      } catch (e) {
        console.log('Body is not valid JSON')
      }
    } catch (e) {
      console.log('Could not read body:', e)
    }
  }
  console.log('======================')
}
