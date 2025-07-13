/**
 * Validation utilities
 */

import { z } from 'zod'
// Types will be imported when needed

// Term validation
export const termSchema = z
  .string()
  .min(1, 'Term cannot be empty')
  .max(200, 'Term is too long')
  .transform(term => term.trim())

// Normalize terms for consistent storage and searching
export function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/['']/g, "'") // Normalize quotes
    .replace(/[""]/g, '"') // Normalize double quotes
    .replace(/[–—]/g, '-') // Normalize dashes
}

// Type validators
export const termTypeSchema = z.enum([
  'instrument',
  'genre',
  'technique',
  'composer',
  'theory',
  'general',
] as const)

export const searchSourceSchema = z.enum([
  'web',
  'api',
  'mobile',
  'extension',
] as const)

export const feedbackTypeSchema = z.enum([
  'accuracy',
  'clarity',
  'completeness',
  'other',
] as const)

// Query parameter validators
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  type: termTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sort_by: z
    .enum(['relevance', 'alphabetical', 'quality', 'popularity'])
    .default('relevance'),
  min_quality: z.coerce.number().min(0).max(100).optional(),
  max_quality: z.coerce.number().min(0).max(100).optional(),
  instruments: z.array(z.string()).optional(),
  difficulty_level: z
    .enum(['beginner', 'intermediate', 'advanced', 'professional'])
    .optional(),
  has_audio: z.coerce.boolean().optional(),
  has_references: z.coerce.boolean().optional(),
  language: z.string().length(2).optional(),
})

export const batchQuerySchema = z.object({
  terms: z.array(termSchema).min(1).max(100),
  options: z
    .object({
      force_refresh: z.boolean().default(false),
      include_low_quality: z.boolean().default(false),
      min_quality_score: z.number().min(0).max(100).default(60),
      include_related: z.boolean().default(false),
      max_related: z.number().min(0).max(10).default(5),
    })
    .optional(),
})

export const enhancementRequestSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('single'),
    term: termSchema,
  }),
  z.object({
    mode: z.literal('batch'),
    criteria: z
      .object({
        min_age_days: z.number().min(1).default(30),
        max_quality_score: z.number().min(0).max(100).default(80),
        min_search_frequency: z.number().min(0).default(0),
        limit: z.number().min(1).max(1000).default(100),
        priority: z.enum(['quality', 'popularity', 'age']).default('quality'),
      })
      .optional(),
  }),
])

export const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv', 'sqlite']).default('json'),
  min_quality: z.coerce.number().min(0).max(100).optional(),
  types: z
    .string()
    .optional()
    .transform(val => val?.split(',').filter(Boolean)),
  include_embeddings: z.coerce.boolean().default(false),
})

// Utility functions
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function isValidIsbn(isbn: string): boolean {
  // Remove hyphens and spaces
  const cleaned = isbn.replace(/[-\s]/g, '')

  // Check ISBN-10
  if (cleaned.length === 10) {
    const sum = cleaned.split('').reduce((acc, digit, i) => {
      const value = digit === 'X' && i === 9 ? 10 : parseInt(digit, 10)
      return acc + value * (10 - i)
    }, 0)
    return sum % 11 === 0
  }

  // Check ISBN-13
  if (cleaned.length === 13) {
    const sum = cleaned.split('').reduce((acc, digit, i) => {
      const value = parseInt(digit, 10)
      return acc + value * (i % 2 === 0 ? 1 : 3)
    }, 0)
    return sum % 10 === 0
  }

  return false
}

export function sanitizeHtml(text: string): string {
  // Basic HTML sanitization - in production, use a proper library
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

export function truncateText(
  text: string,
  maxLength: number,
  suffix = '...'
): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - suffix.length) + suffix
}
