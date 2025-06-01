import type {
  D1Database,
  KVNamespace,
  DurableObjectNamespace,
} from '@cloudflare/workers-types'
import type { User } from './shared'

export interface Env {
  DB: D1Database
  CACHE?: KVNamespace
  RATE_LIMITER?: DurableObjectNamespace
  JWT_SECRET: string
  ENVIRONMENT: 'development' | 'production'
  RESEND_API_KEY?: string
}

export interface GraphQLContext {
  env: Env
  user?: User
  requestId: string
  ip?: string
}
