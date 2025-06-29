/**
 * PDF Validation utilities
 */

// Maximum file size: 50MB
export const MAX_PDF_SIZE = 50 * 1024 * 1024

export interface ValidationResult {
  valid: boolean
  error?: string
  fileSize?: number
}

/**
 * Validates a PDF file by checking magic bytes and size
 */
export async function validatePdfFile(
  stream: ReadableStream<Uint8Array>,
  contentLength?: number
): Promise<ValidationResult> {
  // Check file size if provided
  if (contentLength && contentLength > MAX_PDF_SIZE) {
    return {
      valid: false,
      error: `File size (${formatBytes(contentLength)}) exceeds maximum allowed size (${formatBytes(MAX_PDF_SIZE)})`,
      fileSize: contentLength,
    }
  }

  try {
    // Read the first 5 bytes to check magic bytes
    const reader = stream.getReader()
    const { value } = await reader.read()
    reader.releaseLock()

    if (!value || value.length < 5) {
      return {
        valid: false,
        error: 'File is too small to be a valid PDF',
      }
    }

    // Check PDF magic bytes: %PDF-
    const magicBytes = new TextDecoder().decode(value.slice(0, 5))
    if (magicBytes !== '%PDF-') {
      return {
        valid: false,
        error: 'Invalid PDF file format (missing PDF header)',
      }
    }

    return {
      valid: true,
      fileSize: contentLength,
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to read file for validation',
    }
  }
}

/**
 * Validates a PDF buffer
 */
export function validatePdfBuffer(buffer: ArrayBuffer): ValidationResult {
  // Check file size
  if (buffer.byteLength > MAX_PDF_SIZE) {
    return {
      valid: false,
      error: `File size (${formatBytes(buffer.byteLength)}) exceeds maximum allowed size (${formatBytes(MAX_PDF_SIZE)})`,
      fileSize: buffer.byteLength,
    }
  }

  // Check minimum size
  if (buffer.byteLength < 5) {
    return {
      valid: false,
      error: 'File is too small to be a valid PDF',
      fileSize: buffer.byteLength,
    }
  }

  // Check PDF magic bytes
  const view = new Uint8Array(buffer)
  const magicBytes = new TextDecoder().decode(view.slice(0, 5))

  if (magicBytes !== '%PDF-') {
    return {
      valid: false,
      error: 'Invalid PDF file format (missing PDF header)',
      fileSize: buffer.byteLength,
    }
  }

  return {
    valid: true,
    fileSize: buffer.byteLength,
  }
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
