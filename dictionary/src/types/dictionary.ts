/**
 * Core dictionary types and interfaces
 */

export type TermType =
  | 'instrument'
  | 'genre'
  | 'technique'
  | 'composer'
  | 'theory'
  | 'general'

export type CheckType =
  | 'ai_validation'
  | 'human_review'
  | 'enhancement'
  | 'user_feedback'

export type RelationshipType =
  | 'synonym'
  | 'antonym'
  | 'see_also'
  | 'broader'
  | 'narrower'
  | 'related'

export type SearchSource =
  | 'web'
  | 'api'
  | 'mobile'
  | 'extension'
  | 'api_search'
  | 'api_direct'

export type FeedbackType =
  | 'accuracy'
  | 'clarity'
  | 'completeness'
  | 'other'
  | 'incorrect'
  | 'offensive'
  | 'spam'
  | 'copyright'

export interface DictionaryEntry {
  id: string
  term: string
  normalized_term: string
  type: TermType
  definition: Definition
  references: References
  metadata: EntryMetadata
  quality_score: QualityScore
  created_at: string // ISO 8601
  updated_at: string // ISO 8601
  version: number
}

export interface Definition {
  concise: string // 1-2 sentence definition
  detailed: string // Comprehensive explanation
  etymology?: string // Word origin
  pronunciation?: Pronunciation
  usage_example?: string // Example sentence
  translations?: Record<string, string> // Language code -> translation
}

export interface Pronunciation {
  ipa: string // International Phonetic Alphabet
  audio_url?: string // Link to pronunciation audio
  syllables?: string[] // Syllable breakdown
  stress_pattern?: string // Primary and secondary stress
}

export interface References {
  wikipedia?: WikipediaReference
  books?: Book[]
  research_papers?: ResearchPaper[]
  media?: MediaReferences
  shopping?: ShoppingReferences
  educational?: EducationalResource[]
}

export interface WikipediaReference {
  url: string
  extract: string // First paragraph
  last_verified: string // ISO 8601
  page_id?: number
  categories?: string[]
}

export interface Book {
  title: string
  author: string
  isbn: string
  publisher?: string
  year?: number
  amazon_url: string
  affiliate_url?: string
  relevance_score: number // 0-1
  excerpt?: string // Relevant excerpt
}

export interface ResearchPaper {
  title: string
  authors: string[]
  doi: string
  url: string
  published_date: string
  journal?: string
  abstract_excerpt: string
  citations_count?: number
  relevance_score: number // 0-1
}

export interface MediaReferences {
  spotify?: SpotifyReference
  youtube_music?: YoutubeMusicReference
  youtube?: YoutubeVideos
  apple_music?: AppleMusicReference
  soundcloud?: SoundcloudReference
}

export interface SpotifyReference {
  artist_url?: string
  artist_id?: string
  track_urls?: string[]
  playlist_url?: string
  playlist_id?: string
  album_urls?: string[]
}

export interface YoutubeMusicReference {
  artist_url?: string
  artist_channel_id?: string
  playlist_url?: string
  album_urls?: string[]
}

export interface YoutubeVideos {
  educational_videos?: Video[]
  performances?: Video[]
  tutorials?: Video[]
  documentaries?: Video[]
}

export interface Video {
  title: string
  channel: string
  channel_id: string
  url: string
  video_id: string
  duration: number // seconds
  view_count: number
  published_date: string
  description?: string
  relevance_score: number // 0-1
}

export interface AppleMusicReference {
  artist_url?: string
  album_urls?: string[]
  playlist_url?: string
}

export interface SoundcloudReference {
  artist_url?: string
  track_urls?: string[]
  playlist_url?: string
}

export interface ShoppingReferences {
  instruments?: InstrumentStore[]
  sheet_music?: SheetMusicStore[]
  accessories?: AccessoryStore[]
  books?: BookStore[]
}

export interface InstrumentStore {
  store_name: string
  product_name?: string
  product_url: string
  affiliate_url?: string
  price_range: string
  price_value?: number
  currency?: string
  availability: 'in_stock' | 'limited' | 'out_of_stock' | 'pre_order'
  rating?: number
  review_count?: number
  trusted_seller: boolean
  ships_to?: string[] // Country codes
}

export interface SheetMusicStore {
  store_name: string
  title: string
  composer?: string
  arrangement?: string
  difficulty?: string
  url: string
  affiliate_url?: string
  price?: number
  currency?: string
  format: 'pdf' | 'print' | 'both'
  pages?: number
}

export interface AccessoryStore {
  store_name: string
  product_name: string
  category: string // strings, reeds, cases, etc.
  url: string
  affiliate_url?: string
  price_range: string
  brand?: string
  compatibility?: string[] // Compatible instruments
}

export interface BookStore {
  store_name: string
  book: Book // References the book details
  formats_available: ('hardcover' | 'paperback' | 'ebook' | 'audiobook')[]
  prices: Record<string, number> // format -> price
}

export interface EducationalResource {
  type: 'course' | 'lesson' | 'worksheet' | 'quiz' | 'app'
  title: string
  provider: string
  url: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'all'
  price?: string
  duration?: string
  rating?: number
  description?: string
}

export interface QualityScore {
  overall: number // 0-100
  definition_clarity: number // 0-100
  reference_completeness: number // 0-100
  accuracy_verification: number // 0-100
  user_satisfaction?: number // 0-100, based on feedback
  last_ai_check: string // ISO 8601
  last_human_review?: string // ISO 8601
  human_verified: boolean
  verified_by?: string // User ID
  improvement_suggestions?: string[]
  confidence_level: 'high' | 'medium' | 'low'
}

export interface EntryMetadata {
  search_frequency: number
  last_accessed: string // ISO 8601
  access_count: number
  related_terms: string[]
  categories: string[]
  tags?: string[]
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | 'professional'
  instruments?: string[] // Relevant instruments
  musical_period?: string // Baroque, Classical, Romantic, etc.
  cultural_origin?: string
  synonyms?: string[]
  antonyms?: string[]
  language?: string // Primary language of the term
  disambiguation?: string // For terms with multiple meanings
}

// Request/Response types
export interface SearchQuery {
  q: string
  type?: TermType
  limit?: number
  offset?: number
  sort_by?: 'relevance' | 'alphabetical' | 'quality' | 'popularity'
  filters?: SearchFilters
}

export interface SearchFilters {
  min_quality?: number
  max_quality?: number
  instruments?: string[]
  difficulty_level?: string
  has_audio?: boolean
  has_references?: boolean
  language?: string
}

export interface BatchQueryRequest {
  terms: string[]
  options?: BatchQueryOptions
}

export interface BatchQueryOptions {
  force_refresh?: boolean
  include_low_quality?: boolean
  min_quality_score?: number
  include_related?: boolean
  max_related?: number
}

export interface EnhancementRequest {
  mode: 'batch' | 'single'
  term?: string // For single mode
  criteria?: EnhancementCriteria // For batch mode
}

export interface EnhancementCriteria {
  min_age_days?: number
  max_quality_score?: number
  min_search_frequency?: number
  limit?: number
  priority?: 'quality' | 'popularity' | 'age'
}

// Analytics types
export interface SearchAnalytics {
  id: string
  term: string
  normalized_term: string
  found: boolean
  entry_id?: string
  response_time_ms: number
  searched_at: string
  user_session_id?: string
  user_id?: string
  search_source: SearchSource
}

export interface UserFeedback {
  id: string
  entry_id: string
  user_id?: string
  rating?: number // 1-5
  helpful?: boolean
  feedback_text?: string
  feedback_type?: FeedbackType
  created_at: string
}

export interface QualityCheckpoint {
  id: string
  entry_id: string
  check_type: CheckType
  score_before: number
  score_after: number
  improvements?: string[]
  model_used: string
  checked_at: string
  checked_by?: string // User ID for human reviews
}
