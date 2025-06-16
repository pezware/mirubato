import type {
  D1Database,
  KVNamespace,
  DurableObjectNamespace,
} from '@cloudflare/workers-types'
import type { BackendUser } from './shared'

export interface Env {
  DB: D1Database
  MIRUBATO_MAGIC_LINKS: KVNamespace
  RATE_LIMITER?: DurableObjectNamespace
  JWT_SECRET: string
  ENVIRONMENT: 'development' | 'production'
  RESEND_API_KEY?: string
  CF_VERSION_METADATA?: {
    id: string
    tag?: string
    timestamp?: string
  }
}

export interface GraphQLContext {
  env: Env
  user?: BackendUser
  requestId: string
  ip?: string
  db: D1Database
  request: Request
  cookies?: string[]
}
