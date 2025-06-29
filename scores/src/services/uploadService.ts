export interface UploadConfig {
  maxFileSize: number // in bytes
  allowedMimeTypes: string[]
  allowedExtensions: string[]
}

export interface UploadResult {
  success: boolean
  key?: string
  url?: string
  error?: string
  details?: any
}

export interface FileMetadata {
  filename: string
  size: number
  mimeType: string
  uploadedAt: string
  uploadedBy?: string
}

// Default configuration
const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['application/pdf'],
  allowedExtensions: ['.pdf'],
}

export class UploadService {
  private config: UploadConfig

  constructor(config: Partial<UploadConfig> = {}) {
    this.config = { ...DEFAULT_UPLOAD_CONFIG, ...config }
  }

  /**
   * Validates file before upload
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      return {
        valid: false,
        error: `File size ${this.formatBytes(file.size)} exceeds maximum allowed size of ${this.formatBytes(this.config.maxFileSize)}`,
      }
    }

    // Check MIME type
    if (!this.config.allowedMimeTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${this.config.allowedMimeTypes.join(', ')}`,
      }
    }

    // Check file extension
    const extension = this.getFileExtension(file.name)
    if (!this.config.allowedExtensions.includes(extension.toLowerCase())) {
      return {
        valid: false,
        error: `File extension ${extension} is not allowed. Allowed extensions: ${this.config.allowedExtensions.join(', ')}`,
      }
    }

    return { valid: true }
  }

  /**
   * Validates PDF magic bytes
   */
  private validatePdfMagicBytes(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 5) return false

    const view = new Uint8Array(buffer)
    const magicBytes = new TextDecoder().decode(view.slice(0, 5))

    return magicBytes === '%PDF-'
  }

  /**
   * Generates a unique key for storing the file
   */
  private generateStorageKey(
    filename: string,
    prefix: string = 'scores'
  ): string {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 9)
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    return `${prefix}/${timestamp}-${randomId}-${sanitizedFilename}`
  }

  /**
   * Uploads a file to R2 storage
   */
  async uploadToR2(
    file: File,
    env: any,
    options: {
      prefix?: string
      metadata?: Record<string, string>
      customKey?: string
    } = {}
  ): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        }
      }

      // Generate storage key
      const key =
        options.customKey || this.generateStorageKey(file.name, options.prefix)

      // Read file content
      const arrayBuffer = await file.arrayBuffer()

      // Validate PDF magic bytes
      if (!this.validatePdfMagicBytes(arrayBuffer)) {
        return {
          success: false,
          error: 'Invalid PDF file format (missing or incorrect PDF header)',
        }
      }

      // Create metadata
      const metadata: FileMetadata = {
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
      }

      // Upload to R2
      await env.SCORES_BUCKET.put(key, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
        customMetadata: {
          ...metadata,
          ...options.metadata,
        },
      })

      this.log('info', `File uploaded successfully: ${key}`, {
        key,
        filename: file.name,
        size: file.size,
      })

      return {
        success: true,
        key,
        url: this.getPublicUrl(key, env),
      }
    } catch (error) {
      this.log('error', 'File upload failed', { error, filename: file.name })

      return {
        success: false,
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Uploads a file from base64 content (useful for development)
   */
  async uploadFromBase64(
    base64Content: string,
    filename: string,
    env: any,
    options: {
      prefix?: string
      metadata?: Record<string, string>
      customKey?: string
    } = {}
  ): Promise<UploadResult> {
    try {
      // Extract actual base64 data if it includes data URL prefix
      const base64Data = base64Content.includes('base64,')
        ? base64Content.split('base64,')[1]
        : base64Content

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const arrayBuffer = bytes.buffer

      // Create a File object for validation
      const file = new File([arrayBuffer], filename, {
        type: 'application/pdf',
      })

      // Use the regular upload method
      return this.uploadToR2(file, env, options)
    } catch (error) {
      this.log('error', 'Base64 upload failed', { error, filename })

      return {
        success: false,
        error: 'Failed to process base64 content',
        details: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Copies a file from local filesystem (development only)
   */
  async uploadFromLocal(
    _localPath: string,
    _env: any,
    _options: {
      prefix?: string
      metadata?: Record<string, string>
      customKey?: string
    } = {}
  ): Promise<UploadResult> {
    // This method would need to be implemented differently
    // In Cloudflare Workers, we can't access the local filesystem
    // This is just a placeholder for the structure

    return {
      success: false,
      error:
        'Local file upload not supported in Cloudflare Workers environment',
    }
  }

  /**
   * Gets the public URL for a stored file
   */
  private getPublicUrl(key: string, env: any): string {
    // In development, serve through the files endpoint
    if (env.ENVIRONMENT === 'local') {
      return `http://localhost:8787/files/${key}`
    }

    // In production, you might use a CDN or direct R2 URL
    return `/files/${key}`
  }

  /**
   * Formats bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Gets file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.')
    return lastDot === -1 ? '' : filename.substring(lastDot)
  }

  /**
   * Simple logging function (can be extended with proper logging service)
   */
  private log(
    _level: 'info' | 'error' | 'warn',
    _message: string,
    _data?: any
  ) {
    // In production, this could send to a logging service
    // Logging disabled for now to avoid console pollution
  }

  /**
   * Checks if a file exists in R2
   */
  async fileExists(key: string, env: any): Promise<boolean> {
    try {
      const file = await env.SCORES_BUCKET.head(key)
      return file !== null
    } catch {
      return false
    }
  }

  /**
   * Deletes a file from R2
   */
  async deleteFile(key: string, env: any): Promise<boolean> {
    try {
      await env.SCORES_BUCKET.delete(key)
      this.log('info', `File deleted: ${key}`)
      return true
    } catch (error) {
      this.log('error', 'File deletion failed', { error, key })
      return false
    }
  }
}
