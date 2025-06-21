export type Instrument = 'PIANO' | 'GUITAR' | 'BOTH'
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
export type StylePeriod =
  | 'BAROQUE'
  | 'CLASSICAL'
  | 'ROMANTIC'
  | 'MODERN'
  | 'CONTEMPORARY'
export type ScoreSource = 'imslp' | 'upload' | 'generated' | 'manual'
export type ScoreFormat = 'pdf' | 'musicxml' | 'vexflow' | 'image' | 'abc'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Score {
  id: string
  title: string
  composer: string
  opus?: string
  movement?: string
  instrument: Instrument
  difficulty: Difficulty
  difficultyLevel?: number // 1-10
  gradeLevel?: string // e.g., 'RCM 5', 'ABRSM 4'
  durationSeconds?: number
  timeSignature?: string
  keySignature?: string
  tempoMarking?: string
  suggestedTempo?: number
  stylePeriod?: StylePeriod
  source: ScoreSource
  imslpUrl?: string
  tags: string[]
  metadata?: ScoreMetadata
  createdAt: Date
  updatedAt: Date
}

export interface ScoreMetadata {
  arrangedBy?: string
  year?: number
  publisher?: string
  edition?: string
  license?: string
  catalogNumber?: string
  dedication?: string
  musicalForm?: string
  language?: string // For vocal music
  instrumentation?: string[] // Detailed instrumentation
  technicalNotes?: string
}

export interface ScoreVersion {
  id: string
  scoreId: string
  format: ScoreFormat
  r2Key: string
  fileSizeBytes?: number
  pageCount?: number
  resolution?: string // For images
  processingStatus: ProcessingStatus
  processingError?: string
  createdAt: Date
}

export interface Collection {
  id: string
  name: string
  slug: string
  description?: string
  instrument?: Instrument
  difficulty?: Difficulty
  scoreIds: string[]
  displayOrder: number
  isFeatured: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ScoreAnalytics {
  scoreId: string
  viewCount: number
  downloadCount: number
  renderCount: number
  lastViewedAt?: Date
}

// Search and filter types
export interface ScoreSearchParams {
  query?: string
  instrument?: Instrument
  difficulty?: Difficulty
  minDifficultyLevel?: number
  maxDifficultyLevel?: number
  stylePeriod?: StylePeriod
  composer?: string
  tags?: string[]
  maxDuration?: number
  gradeLevel?: string
  limit?: number
  offset?: number
  sortBy?: 'title' | 'composer' | 'difficulty' | 'createdAt' | 'popularity'
  sortOrder?: 'asc' | 'desc'
}

export interface ScoreSearchResult {
  scores: Score[]
  total: number
  limit: number
  offset: number
}

// Render options for score display
export interface RenderOptions {
  format: 'svg' | 'png' | 'pdf'
  scale?: number
  pageNumber?: number // For multi-page scores
  width?: number
  height?: number
  theme?: 'light' | 'dark'
  showFingerings?: boolean
  showNoteNames?: boolean
}

export interface RenderedScore {
  format: string
  data: string | ArrayBuffer // Base64 for images, SVG string, or binary for PDF
  pageCount?: number
  dimensions?: {
    width: number
    height: number
  }
}
