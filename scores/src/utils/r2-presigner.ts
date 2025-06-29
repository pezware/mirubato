import { AwsClient } from 'aws4fetch'

/**
 * Generates pre-signed URLs for R2 objects
 * This allows secure, time-limited access to private R2 objects
 */
export class R2Presigner {
  private client: AwsClient
  private bucketName: string

  constructor(private env: Env) {
    // For local development, we'll use the binding directly
    if (env.ENVIRONMENT === 'local') {
      // Local doesn't need pre-signed URLs
      this.bucketName = 'mirubato-scores-local'
    } else {
      // Production uses the actual bucket name from environment
      this.bucketName = this.getBucketName(env.ENVIRONMENT)
    }

    // Initialize AWS client for S3-compatible signing
    // Note: We're not using this yet, but keeping it for future pre-signed URL support
    this.client = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID || 'dummy',
      secretAccessKey: env.R2_SECRET_ACCESS_KEY || 'dummy',
      region: 'auto',
      service: 's3',
    })
  }

  private getBucketName(environment: string): string {
    switch (environment) {
      case 'production':
        return 'mirubato-scores-production'
      case 'staging':
        return 'mirubato-scores-staging'
      case 'development':
        return 'mirubato-scores-dev'
      default:
        return 'mirubato-scores-local'
    }
  }

  /**
   * Generate a pre-signed URL for an R2 object
   * For now, we'll use our existing serve endpoint since R2 pre-signed URLs
   * require additional setup with access keys
   * @param key The object key in R2
   * @returns URL to access the object
   */
  async generatePresignedUrl(key: string): Promise<string> {
    // Extract filename from key
    const filename = key.split('/').pop() || key

    // Use our existing serve endpoint which handles R2 access
    const baseUrl = this.getBaseUrl()
    return `${baseUrl}/api/serve/${filename}`
  }

  private getBaseUrl(): string {
    switch (this.env.ENVIRONMENT) {
      case 'local':
        return this.env.SCORES_URL || 'http://scores-mirubato.localhost:9788'
      case 'staging':
        return 'https://scores-staging.mirubato.com'
      case 'production':
        return 'https://scores.mirubato.com'
      default:
        return 'https://scores.mirubato.com'
    }
  }

  /**
   * For simpler cases where we have direct R2 access,
   * we can use the R2 binding's built-in URL generation
   */
  static async getDirectUrl(env: Env, key: string): Promise<string | null> {
    try {
      // Check if the object exists
      const object = await env.SCORES_BUCKET.head(key)
      if (!object) {
        return null
      }

      // For now, we'll construct a URL that goes through our serve endpoint
      // In production, you might want to use a CDN or direct R2 URLs
      const baseUrl = env.SCORES_URL || `https://scores.mirubato.com`

      // Extract filename from key
      const filename = key.split('/').pop()
      return `${baseUrl}/api/serve/${filename}`
    } catch (error) {
      console.error('Error getting direct URL:', error)
      return null
    }
  }
}
