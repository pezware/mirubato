import { create } from 'zustand'
import { scoreService, type Score } from '../services/scoreService'
import type { Collection } from '../types/collections'
import { usePracticeStore } from './practiceStore'
import { useLogbookStore } from './logbookStore'
import { useAuthStore } from './authStore'

interface PracticeSession {
  id: string
  scoreId: string
  startTime: Date
  endTime?: Date
  duration: number // in seconds
  measuresCompleted: number[]
  tempo: number
  notes?: string
}

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

  // Practice session
  practiceSession: PracticeSession | null
  isRecording: boolean

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

  // Practice actions
  startPractice: () => void
  stopPractice: () => void
  updatePracticeProgress: (measure: number) => void

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

  practiceSession: null,
  isRecording: false,

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

      // Don't set totalPages here - let the PDF viewer report the actual count
      // This prevents conflicts between hardcoded values and actual PDF pages
      set({
        currentScore: score,
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

  // Practice actions
  startPractice: () => {
    const { currentScore } = get()
    if (!currentScore) return

    // Get user's instrument preference
    const user = useAuthStore.getState().user
    const instrument = user?.primaryInstrument || 'PIANO'

    // Start practice in practiceStore
    usePracticeStore.getState().startPractice(currentScore, instrument)

    // Mark as recording in scoreStore for UI
    set({ isRecording: true })
  },

  stopPractice: () => {
    const { currentScore } = get()
    if (!currentScore) return

    // Stop practice and get session data
    const sessionData = usePracticeStore.getState().stopPractice()
    if (!sessionData) {
      set({ isRecording: false })
      return
    }

    // Create logbook entry
    const logbookStore = useLogbookStore.getState()
    logbookStore.createEntry({
      timestamp: new Date().toISOString(),
      duration: sessionData.duration,
      type: 'PRACTICE',
      instrument: useAuthStore.getState().user?.primaryInstrument || 'PIANO',
      pieces: [
        {
          title: sessionData.scoreTitle,
          composer: sessionData.scoreComposer || undefined,
        },
      ],
      techniques: [],
      goalIds: [],
      tags: [],
      metadata: {
        source: 'score-viewer',
      },
      // Score integration fields
      scoreId: sessionData.scoreId,
      scoreTitle: sessionData.scoreTitle,
      scoreComposer: sessionData.scoreComposer,
      autoTracked: true,
    })

    set({ isRecording: false })
  },

  updatePracticeProgress: (measure: number) => {
    const { practiceSession } = get()
    if (
      !practiceSession ||
      !practiceSession.measuresCompleted.includes(measure)
    ) {
      set({
        practiceSession: practiceSession
          ? {
              ...practiceSession,
              measuresCompleted: [
                ...practiceSession.measuresCompleted,
                measure,
              ],
            }
          : null,
      })
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
      set({ userLibrary: response.items })
    } catch (error) {
      // If getUserScores fails (likely due to authentication), fall back to public scores
      if (
        error instanceof Error &&
        error.message.includes('Authentication required')
      ) {
        try {
          const publicResponse = await scoreService.getScores()
          set({ userLibrary: publicResponse.items })
        } catch (publicError) {
          console.error('Failed to load public library:', publicError)
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
