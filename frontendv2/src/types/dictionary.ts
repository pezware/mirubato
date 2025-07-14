import { z } from 'zod'
import { sanitizeOutput } from '@/utils/dictionarySecurity'

/**
 * Dictionary-related TypeScript types and Zod validation schemas
 */

// Enum types
export const TermType = z.enum([
  'tempo',
  'dynamics',
  'articulation',
  'form',
  'genre',
  'instrument',
  'technique',
  'theory',
  'composer',
  'period',
  'notation',
  'general',
])

export type TermType = z.infer<typeof TermType>

export const DifficultyLevel = z.enum([
  'beginner',
  'intermediate',
  'advanced',
  'professional',
])

export type DifficultyLevel = z.infer<typeof DifficultyLevel>

// Language types
export const SupportedLanguage = z.enum([
  'en',
  'es',
  'fr',
  'de',
  'zh-CN',
  'zh-TW',
])

export type SupportedLanguage = z.infer<typeof SupportedLanguage>

export const ExtendedLanguage = z.enum([
  'en',
  'es',
  'fr',
  'de',
  'zh-CN',
  'zh-TW',
  'it',
  'la',
])

export type ExtendedLanguage = z.infer<typeof ExtendedLanguage>

// Safe string schema that sanitizes output
const SafeString = z.string().transform(val => sanitizeOutput(val))

// Sub-schemas
export const PronunciationSchema = z
  .object({
    ipa: SafeString.optional(),
    audio_url: z.string().url().optional(),
  })
  .optional()

export const DefinitionSchema = z
  .object({
    concise: SafeString.optional(),
    detailed: SafeString.optional(),
    etymology: SafeString.optional(),
    pronunciation: PronunciationSchema,
    usage_example: SafeString.optional(),
  })
  .optional()

export const WikipediaReferenceSchema = z
  .object({
    url: z.string().url().optional(),
    extract: SafeString.optional(),
    last_verified: z.string().datetime().optional(),
  })
  .optional()

export const BookSchema = z.object({
  title: SafeString,
  author: SafeString,
  isbn: z.string().optional(),
  amazon_url: z.string().url().optional(),
  affiliate_url: z.string().url().optional(),
  relevance_score: z.number().min(0).max(100).optional(),
})

export const ResearchPaperSchema = z.object({
  title: SafeString,
  authors: z.array(SafeString),
  doi: z.string().optional(),
  url: z.string().url().optional(),
  published_date: z.string().optional(),
  abstract_excerpt: SafeString.optional(),
})

export const VideoSchema = z.object({
  title: SafeString,
  channel: SafeString.optional(),
  url: z.string().url(),
  duration: z.number().optional(),
  view_count: z.number().optional(),
  relevance_score: z.number().min(0).max(100).optional(),
})

export const MediaReferencesSchema = z
  .object({
    spotify: z
      .object({
        artist_url: z.string().url().optional(),
        track_urls: z.array(z.string().url()).optional(),
        playlist_url: z.string().url().optional(),
      })
      .optional(),
    youtube_music: z
      .object({
        artist_url: z.string().url().optional(),
        playlist_url: z.string().url().optional(),
      })
      .optional(),
    youtube: z
      .object({
        educational_videos: z.array(VideoSchema).optional(),
        performances: z.array(VideoSchema).optional(),
      })
      .optional(),
  })
  .optional()

export const InstrumentStoreSchema = z.object({
  store_name: SafeString,
  product_url: z.string().url(),
  affiliate_url: z.string().url().optional(),
  price_range: SafeString.optional(),
  availability: z.enum(['in_stock', 'limited', 'out_of_stock']).optional(),
  rating: z.number().min(0).max(5).optional(),
  trusted_seller: z.boolean().optional(),
})

export const ShoppingReferencesSchema = z
  .object({
    instruments: z.array(InstrumentStoreSchema).optional(),
    sheet_music: z
      .array(
        z.object({
          store_name: SafeString,
          product_url: z.string().url(),
          affiliate_url: z.string().url().optional(),
          price: SafeString.optional(),
        })
      )
      .optional(),
    accessories: z
      .array(
        z.object({
          store_name: SafeString,
          product_url: z.string().url(),
          affiliate_url: z.string().url().optional(),
          price_range: SafeString.optional(),
        })
      )
      .optional(),
  })
  .optional()

export const ReferencesSchema = z
  .object({
    wikipedia: WikipediaReferenceSchema,
    books: z.array(BookSchema).optional(),
    research_papers: z.array(ResearchPaperSchema).optional(),
    media: MediaReferencesSchema,
    shopping: ShoppingReferencesSchema,
  })
  .optional()

export const QualityScoreSchema = z
  .object({
    overall: z.number().min(0).max(100),
    definition_clarity: z.number().min(0).max(100).optional(),
    reference_completeness: z.number().min(0).max(100).optional(),
    accuracy_verification: z.number().min(0).max(100).optional(),
    last_ai_check: z.string().datetime().optional(),
    human_verified: z.boolean().optional(),
    improvement_suggestions: z.array(SafeString).optional(),
  })
  .optional()

export const EntryMetadataSchema = z
  .object({
    search_frequency: z.number().optional(),
    last_accessed: z.string().datetime().optional(),
    related_terms: z.array(SafeString).optional(),
    categories: z.array(SafeString).optional(),
    difficulty_level: DifficultyLevel.optional(),
    instruments: z.array(SafeString).optional(),
    historical_period: SafeString.optional(),
    cultural_origin: SafeString.optional(),
  })
  .optional()

export const AIMetadataSchema = z
  .object({
    generated_by: SafeString.optional(),
    generation_timestamp: z.string().datetime().optional(),
    model_version: SafeString.optional(),
    confidence_score: z.number().min(0).max(1).optional(),
    enhancement_count: z.number().optional(),
    last_enhanced: z.string().datetime().optional(),
  })
  .optional()

// Main dictionary entry schema
export const DictionaryEntrySchema = z.object({
  id: z.string().uuid(),
  term: SafeString,
  normalized_term: SafeString,
  lang: SupportedLanguage.default('en'),
  source_lang: ExtendedLanguage.nullable().optional(),
  lang_confidence: z.number().min(0).max(1).optional(),
  type: TermType,
  definition: DefinitionSchema,
  references: ReferencesSchema,
  metadata: EntryMetadataSchema,
  ai_metadata: AIMetadataSchema,
  quality_score: QualityScoreSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  version: z.number().int().positive(),
})

// API response schemas
export const SearchResultSchema = z.object({
  entries: z.array(DictionaryEntrySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  suggestedLanguages: z.array(SupportedLanguage).optional(),
  detectedTermLanguage: ExtendedLanguage.nullable().optional(),
})

export const BatchQueryResponseSchema = z.object({
  found: z.array(DictionaryEntrySchema),
  not_found: z.array(SafeString),
  processing: z.array(SafeString).optional(),
})

export const FeedbackSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  helpful: z.boolean().optional(),
  text: SafeString.optional(),
})

export const EnhancementJobSchema = z.object({
  job_id: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  terms_queued: z.number(),
  terms_processed: z.number().optional(),
  estimated_completion: z.string().datetime().optional(),
  error: SafeString.optional(),
})

// Multi-language response schema
export const MultiLanguageTermResponseSchema = z.object({
  term: SafeString,
  normalized_term: SafeString,
  languages: z.record(SupportedLanguage, DictionaryEntrySchema).partial(),
})

// API response wrapper schemas
export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    status: z.literal('success'),
    data: dataSchema,
    meta: z
      .object({
        timestamp: z.string().datetime(),
        request_id: z.string().optional(),
      })
      .optional(),
  })

export const ErrorResponseSchema = z.object({
  status: z.literal('error'),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
})

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([SuccessResponseSchema(dataSchema), ErrorResponseSchema])

// Type exports
export type Pronunciation = z.infer<typeof PronunciationSchema>
export type Definition = z.infer<typeof DefinitionSchema>
export type WikipediaReference = z.infer<typeof WikipediaReferenceSchema>
export type Book = z.infer<typeof BookSchema>
export type ResearchPaper = z.infer<typeof ResearchPaperSchema>
export type Video = z.infer<typeof VideoSchema>
export type MediaReferences = z.infer<typeof MediaReferencesSchema>
export type InstrumentStore = z.infer<typeof InstrumentStoreSchema>
export type ShoppingReferences = z.infer<typeof ShoppingReferencesSchema>
export type References = z.infer<typeof ReferencesSchema>
export type QualityScore = z.infer<typeof QualityScoreSchema>
export type EntryMetadata = z.infer<typeof EntryMetadataSchema>
export type AIMetadata = z.infer<typeof AIMetadataSchema>
export type DictionaryEntry = z.infer<typeof DictionaryEntrySchema>
export type SearchResult = z.infer<typeof SearchResultSchema>
export type BatchQueryResponse = z.infer<typeof BatchQueryResponseSchema>
export type Feedback = z.infer<typeof FeedbackSchema>
export type EnhancementJob = z.infer<typeof EnhancementJobSchema>
export type MultiLanguageTermResponse = z.infer<
  typeof MultiLanguageTermResponseSchema
>

// Search and filter types
export interface SearchFilters {
  type?: TermType[]
  difficulty_level?: DifficultyLevel[]
  instruments?: string[]
  min_quality_score?: number
  has_references?: boolean
  has_audio?: boolean
  languages?: SupportedLanguage[]
}

export interface SearchOptions {
  query: string
  lang?: SupportedLanguage
  searchAllLanguages?: boolean
  preferredLangs?: SupportedLanguage[]
  includeTranslations?: boolean
  filters?: SearchFilters
  sort_by?: 'relevance' | 'alphabetical' | 'quality' | 'popularity'
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// Component props types
export interface DictionaryTermProps {
  entry: DictionaryEntry
  onFeedback?: (feedback: Feedback) => void
  onReport?: (issue: string) => void
}

export interface DictionarySearchProps {
  onSearch: (query: string) => void
  onSuggestionSelect?: (suggestion: string) => void
  placeholder?: string
  maxLength?: number
}

export interface SafeExternalLinkProps {
  url: string
  children: React.ReactNode
  className?: string
  confirmBeforeOpen?: boolean
}

// State types
export interface DictionaryState {
  searchQuery: string
  searchResults: DictionaryEntry[]
  selectedTerm: DictionaryEntry | null
  popularTerms: string[]
  recentSearches: string[]
  searchHistory: string[]
  isLoading: boolean
  error: string | null
  filters: SearchFilters
  currentPage: number
  totalPages: number
  totalResults: number
}

// Validation helper functions
export const validateDictionaryEntry = (data: unknown): DictionaryEntry => {
  return DictionaryEntrySchema.parse(data)
}

export const validateSearchResult = (data: unknown): SearchResult => {
  return SearchResultSchema.parse(data)
}

export const validateBatchResponse = (data: unknown): BatchQueryResponse => {
  return BatchQueryResponseSchema.parse(data)
}

export const validateApiResponse = <T>(
  data: unknown,
  dataSchema: z.ZodType<T>
): { status: 'success'; data: T } | { status: 'error'; error: string } => {
  return ApiResponseSchema(dataSchema).parse(data) as
    | { status: 'success'; data: T }
    | { status: 'error'; error: string }
}

// Component prop types
export interface DictionaryPopularProps {
  terms: string[]
  recentSearches: string[]
  onTermSelect: (term: string) => void
}

export interface DictionaryReferencesProps {
  references: References
  term: string
}

export interface DictionaryCategoriesProps {
  onCategorySelect: (category: TermType) => void
}

export interface DictionaryResultsProps {
  results: DictionaryEntry[]
  totalResults: number
  currentPage: number
  totalPages: number
  onTermSelect: (term: DictionaryEntry) => void
  onPageChange: (page: number) => void
  isLoading: boolean
}
