// Silence Apollo Client warnings in tests
const originalWarn = console.warn

beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    // Filter out common Apollo testing warnings
    const message = args[0]
    if (typeof message === 'string') {
      if (
        message.includes('No more mocked responses') ||
        message.includes('Missing field') ||
        message.includes('MockLink') ||
        message.includes('ApolloClient')
      ) {
        return
      }
    }
    originalWarn.apply(console, args)
  }
})

afterAll(() => {
  console.warn = originalWarn
})
