import type { ApolloServerPlugin } from '@apollo/server'
import type { GraphQLContext } from '../types/context'

/**
 * Apollo Server plugin to handle setting cookies from the GraphQL context
 */
export const cookiePlugin: ApolloServerPlugin<GraphQLContext> = {
  async requestDidStart() {
    return {
      async willSendResponse(requestContext) {
        const { contextValue, response } = requestContext

        // Check if there are cookies to set from the context
        if (
          contextValue.cookies &&
          contextValue.cookies.length > 0 &&
          response.http
        ) {
          // For Cloudflare Workers and Apollo Server, we need to handle headers properly
          // Apollo Server v4 uses a Map-like interface
          contextValue.cookies.forEach(cookie => {
            // Use the set method which overwrites the previous value
            // To support multiple cookies, we need to combine them
            const existing = response.http.headers.get('Set-Cookie')
            if (existing) {
              // If there's already a Set-Cookie header, we need to combine them
              // This is a limitation of the Headers API
              response.http.headers.set('Set-Cookie', `${existing}, ${cookie}`)
            } else {
              response.http.headers.set('Set-Cookie', cookie)
            }
          })
        }
      },
    }
  },
}
