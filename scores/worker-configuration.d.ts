// Queue message types
interface ProcessPdfMessage {
  type?: 'process-new-score'
  scoreId: string
  r2Key?: string
  uploadedAt?: string
  // Legacy fields from import-enhanced
  action?:
    | 'generate-previews'
    | 'download-imslp-pdf'
    | 'analyze-imslp'
    | 'import-imslp'
  data?: any
}

interface Env {
  // Environment variables
  ENVIRONMENT: 'local' | 'development' | 'staging' | 'production'
  API_SERVICE_URL: string
  JWT_SECRET?: string // Will be set as secret for staging/production
  FRONTEND_URL?: string
  SCORES_URL?: string

  // R2 Configuration
  CLOUDFLARE_ACCOUNT_ID?: string
  R2_ACCESS_KEY_ID?: string
  R2_SECRET_ACCESS_KEY?: string

  // D1 Database
  DB: D1Database

  // R2 Storage
  SCORES_BUCKET: R2Bucket

  // KV Cache
  CACHE: KVNamespace

  // Optional enhanced features (from wrangler-enhanced.toml)
  BROWSER?: any // Browser Rendering API
  AI?: Ai // Workers AI binding
  GEMINI_API_KEY?: string // Vertex AI/Gemini API key

  // Queue bindings
  PDF_QUEUE?: Queue<ProcessPdfMessage> // Queue producer for PDF processing

  // Rate limiting
  RATE_LIMITER?: any // Rate limiting API

  // Durable Objects (if needed later)
  // SCORE_PROCESSOR: DurableObjectNamespace
}
