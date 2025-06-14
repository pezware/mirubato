import type { D1Database, KVNamespace } from '@cloudflare/workers-types'

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    DB: D1Database
    MIRUBATO_MAGIC_LINKS: KVNamespace
    JWT_SECRET: string
  }
}
