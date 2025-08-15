import { create } from 'zustand'
import { scoreService, type Score } from '../services/scoreService'
import type { Collection } from '../types/collections'

interface MetronomeSettings {
  tempo: number
  isActive: boolean
  volume: number
  accentBeats: boolean
}

interface ScoreStore {
  // Current score
  currentScore: Score | null
  currentPage: number
  totalPages: number
  isLoading: boolean
  error: string | null

  // Collections and library
  collections: Collection[]
  userCollections: Collection[]
  featuredCollections: Collection[]
  userLibrary: Score[]

  // Metronome
  metronomeSettings: MetronomeSettings

  // UI state
  showManagement: boolean
  autoScrollEnabled: boolean
  scrollSpeed: number

  // Actions
  loadScore: (id: string) => Promise<void>
  setPage: (page: number) => void
  setCurrentPage: (page: number) => void
  setTotalPages: (pages: number) => void
  nextPage: () => void
  previousPage: () => void

  // Metronome actions
  setTempo: (tempo: number) => void
  toggleMetronome: () => void
  setMetronomeVolume: (volume: number) => void

  // UI actions
  toggleManagement: () => void
  toggleAutoScroll: () => void
  setScrollSpeed: (speed: number) => void

  // Collection actions
  loadCollections: () => Promise<void>
  loadUserCollections: () => Promise<void>
  loadFeaturedCollections: () => Promise<void>
  loadUserLibrary: () => Promise<void>
  createCollection: (
    name: string,
    description?: string,
    visibility?: 'private' | 'public'
  ) => Promise<void>
  deleteCollection: (id: string) => Promise<void>
  addScoreToCollection: (collectionId: string, scoreId: string) => Promise<void>
  removeScoreFromCollection: (
    collectionId: string,
    scoreId: string
  ) => Promise<void>

  // Error handling
  clearError: () => void
}

export const useScoreStore = create<ScoreStore>((set, get) => ({
  // Initial state
  currentScore: null,
  currentPage: 1,
  totalPages: 1,
  isLoading: false,
  error: null,

  collections: [],
  userCollections: [],
  featuredCollections: [],
  userLibrary: [],

  metronomeSettings: {
    tempo: 120,
    isActive: false,
    volume: 0.7,
    accentBeats: true,
  },

  showManagement: false,
  autoScrollEnabled: false,
  scrollSpeed: 1,

  // Actions
  loadScore: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const score = await scoreService.getScore(id)

      // Normalize score data to ensure tags is always an array
      const normalizedScore = {
        ...score,
        tags: score.tags || [],
      }

      // Don't set totalPages here - let the PDF viewer report the actual count
      // This prevents conflicts between hardcoded values and actual PDF pages
      set({
        currentScore: normalizedScore,
        currentPage: 1,
        totalPages: 1, // Default to 1, will be updated when PDF loads
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load score',
        isLoading: false,
      })
    }
  },

  setPage: (page: number) => {
    const { totalPages } = get()
    if (page >= 1 && page <= totalPages) {
      set({ currentPage: page })
    }
  },

  setCurrentPage: (page: number) => {
    const { totalPages } = get()
    if (page >= 1 && page <= totalPages) {
      set({ currentPage: page })
    }
  },

  setTotalPages: (pages: number) => {
    if (pages >= 1) {
      set({ totalPages: pages })
      // Ensure current page is valid
      const { currentPage } = get()
      if (currentPage > pages) {
        set({ currentPage: 1 })
      }
    }
  },

  nextPage: () => {
    const { currentPage, totalPages } = get()
    if (currentPage < totalPages) {
      set({ currentPage: currentPage + 1 })
    }
  },

  previousPage: () => {
    const { currentPage } = get()
    if (currentPage > 1) {
      set({ currentPage: currentPage - 1 })
    }
  },

  // Metronome actions
  setTempo: (tempo: number) => {
    if (tempo >= 40 && tempo <= 240) {
      set({
        metronomeSettings: {
          ...get().metronomeSettings,
          tempo,
        },
      })
    }
  },

  toggleMetronome: () => {
    set({
      metronomeSettings: {
        ...get().metronomeSettings,
        isActive: !get().metronomeSettings.isActive,
      },
    })
  },

  setMetronomeVolume: (volume: number) => {
    if (volume >= 0 && volume <= 1) {
      set({
        metronomeSettings: {
          ...get().metronomeSettings,
          volume,
        },
      })
    }
  },

  // UI actions
  toggleManagement: () => {
    set({ showManagement: !get().showManagement })
  },

  toggleAutoScroll: () => {
    set({ autoScrollEnabled: !get().autoScrollEnabled })
  },

  setScrollSpeed: (speed: number) => {
    if (speed >= 0.5 && speed <= 3) {
      set({ scrollSpeed: speed })
    }
  },

  // Collection actions
  loadCollections: async () => {
    try {
      const collections = await scoreService.getCollections()
      set({ collections })
    } catch (error) {
      console.error('Failed to load collections:', error)
    }
  },

  loadUserCollections: async () => {
    try {
      const userCollections = await scoreService.getUserCollections()
      set({ userCollections })
    } catch (error) {
      console.error('Failed to load user collections:', error)
    }
  },

  loadFeaturedCollections: async () => {
    try {
      const featuredCollections = await scoreService.getFeaturedCollections()
      set({ featuredCollections })
    } catch (error) {
      console.error('Failed to load featured collections:', error)
    }
  },

  loadUserLibrary: async () => {
    try {
      // Try to load user's specific scores first (for authenticated users)
      const response = await scoreService.getUserScores()
      // Normalize scores to ensure tags is always an array
      const normalizedScores = response.items.map(score => ({
        ...score,
        tags: score.tags || [],
      }))
      set({ userLibrary: normalizedScores })
    } catch (error) {
      // Check if this is a network error (scores service not running)
      if (
        error instanceof Error &&
        (error.message.includes('Network Error') ||
          error.message.includes('ERR_CONNECTION_REFUSED'))
      ) {
        // Silently handle - scores service is not running
        console.log('Scores service not available, continuing without scores')
        set({ userLibrary: [] })
        return
      }

      // If getUserScores fails (likely due to authentication), fall back to public scores
      if (
        error instanceof Error &&
        error.message.includes('Authentication required')
      ) {
        try {
          const publicResponse = await scoreService.getScores()
          // Normalize public scores as well
          const normalizedPublicScores = publicResponse.items.map(score => ({
            ...score,
            tags: score.tags || [],
          }))
          set({ userLibrary: normalizedPublicScores })
        } catch (publicError) {
          // Also check for network errors in public fallback
          if (
            publicError instanceof Error &&
            (publicError.message.includes('Network Error') ||
              publicError.message.includes('ERR_CONNECTION_REFUSED'))
          ) {
            console.log(
              'Scores service not available, continuing without scores'
            )
          } else {
            console.error('Failed to load public library:', publicError)
          }
          set({ userLibrary: [] })
        }
      } else {
        console.error('Failed to load user library:', error)
        set({ userLibrary: [] })
      }
    }
  },

  createCollection: async (
    name: string,
    description?: string,
    visibility: 'private' | 'public' = 'private'
  ) => {
    try {
      await scoreService.createCollection({
        name,
        description,
        visibility,
      })
      // Reload collections
      const userCollections = await scoreService.getUserCollections()
      set({ userCollections })
    } catch (error) {
      console.error('Failed to create collection:', error)
      throw error
    }
  },

  deleteCollection: async (id: string) => {
    try {
      await scoreService.deleteCollection(id)
      // Reload collections
      const userCollections = await scoreService.getUserCollections()
      set({ userCollections })
    } catch (error) {
      console.error('Failed to delete collection:', error)
      throw error
    }
  },

  addScoreToCollection: async (collectionId: string, scoreId: string) => {
    try {
      await scoreService.addScoreToCollection(collectionId, scoreId)
    } catch (error) {
      console.error('Failed to add score to collection:', error)
      throw error
    }
  },

  removeScoreFromCollection: async (collectionId: string, scoreId: string) => {
    try {
      await scoreService.removeScoreFromCollection(collectionId, scoreId)
    } catch (error) {
      console.error('Failed to remove score from collection:', error)
      throw error
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))
