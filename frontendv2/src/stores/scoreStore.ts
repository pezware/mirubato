import { create } from 'zustand'
import {
  scoreService,
  type Score,
  type Collection,
} from '../services/scoreService'

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
  loadUserLibrary: () => Promise<void>

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

      // For test scores, we know the page counts
      let totalPages = 1
      if (id === 'test_romance_anonimo') {
        totalPages = 3
      }
      // In production, this would come from the score metadata

      set({
        currentScore: score,
        currentPage: 1,
        totalPages,
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
    const { currentScore, metronomeSettings } = get()
    if (!currentScore) return

    const session: PracticeSession = {
      id: `practice_${Date.now()}`,
      scoreId: currentScore.id,
      startTime: new Date(),
      duration: 0,
      measuresCompleted: [],
      tempo: metronomeSettings.tempo,
    }

    set({ practiceSession: session, isRecording: true })
  },

  stopPractice: () => {
    const { practiceSession } = get()
    if (!practiceSession) return

    const endTime = new Date()
    const duration = Math.floor(
      (endTime.getTime() - practiceSession.startTime.getTime()) / 1000
    )

    set({
      practiceSession: {
        ...practiceSession,
        endTime,
        duration,
      },
      isRecording: false,
    })

    // Here we would save to logbook
    // For now, just log it
    console.log('Practice session completed:', {
      ...practiceSession,
      duration,
      endTime,
    })
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

  loadUserLibrary: async () => {
    // For now, load all scores
    // In production, this would be filtered by user
    try {
      const response = await scoreService.getScores()
      set({ userLibrary: response.items })
    } catch (error) {
      console.error('Failed to load user library:', error)
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))
