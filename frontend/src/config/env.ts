/**
 * Environment variables wrapper
 * This provides a mockable interface for import.meta.env
 */

export const env = {
  VITE_GRAPHQL_ENDPOINT: import.meta.env.VITE_GRAPHQL_ENDPOINT as
    | string
    | undefined,
  MODE: import.meta.env.MODE as string,
  DEV: import.meta.env.DEV as boolean,
  PROD: import.meta.env.PROD as boolean,
  SSR: import.meta.env.SSR as boolean,
}
