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
  data?: Record<string, unknown>
}

// Dedicated message for thumbnail-only generation (more efficient than full reprocessing)
interface GenerateThumbnailMessage {
  type: 'generate-thumbnail'
  scoreId: string
  r2Key: string
}

// Union type for all queue messages
type QueueMessage = ProcessPdfMessage | GenerateThumbnailMessage

interface Env {
  // Environment variables
  ENVIRONMENT: 'local' | 'development' | 'staging' | 'production'
  API_SERVICE_URL: string
  JWT_SECRET?: string // Will be set as secret for staging/production
  FRONTEND_URL?: string
  SCORES_URL?: string
  ADMIN_TOKEN?: string // Admin API token for protected endpoints

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
  BROWSER?: { fetch: typeof fetch } // Browser Rendering API (BrowserWorker)
  AI?: Ai // Workers AI binding
  GEMINI_API_KEY?: string // Vertex AI/Gemini API key

  // Queue bindings
  PDF_QUEUE?: Queue<QueueMessage> // Queue producer for PDF processing

  // Rate limiting
  RATE_LIMITER?: unknown // Rate limiting API

  // Durable Objects (if needed later)
  // SCORE_PROCESSOR: DurableObjectNamespace
}
