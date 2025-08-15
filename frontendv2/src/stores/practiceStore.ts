import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Score } from '../services/scoreService'

export interface PracticeSession {
  scoreId: string
  scoreTitle: string
  scoreComposer: string
  startTime: Date
  endTime?: Date
  pausedTime?: Date
  totalPausedDuration: number // in milliseconds
  pageViews: number[]
  instrument: 'piano' | 'guitar'
  isActive: boolean
  isPaused: boolean
}

interface PracticeState {
  // Current practice session
  currentSession: PracticeSession | null

  // Actions
  startPractice: (score: Score, instrument?: 'piano' | 'guitar') => void
  stopPractice: () => {
    duration: number
    scoreId: string
    scoreTitle: string
    scoreComposer: string
  } | null
  pausePractice: () => void
  resumePractice: () => void
  updatePageView: (pageNumber: number) => void
  clearSession: () => void

  // Computed
  getCurrentDuration: () => number
}

// Helper to calculate duration including pauses
const calculateDuration = (session: PracticeSession): number => {
  if (!session) return 0

  const now = new Date()
  const endTime = session.endTime || now

  // Ensure dates are Date objects (defensive programming)
  const startTime =
    session.startTime instanceof Date
      ? session.startTime
      : new Date(session.startTime)

  // If paused, use pausedTime instead of current time
  const effectiveEndTime =
    session.isPaused && session.pausedTime
      ? session.pausedTime instanceof Date
        ? session.pausedTime
        : new Date(session.pausedTime)
      : endTime instanceof Date
        ? endTime
        : new Date(endTime)

  const totalDuration = effectiveEndTime.getTime() - startTime.getTime()
  const activeDuration = totalDuration - session.totalPausedDuration

  // Return duration in minutes
  return Math.round(activeDuration / 1000 / 60)
}

export const usePracticeStore = create<PracticeState>()(
  persist(
    (set, get) => ({
      currentSession: null,

      startPractice: (score, instrument = 'piano') => {
        // End any existing session first
        const existing = get().currentSession
        if (existing?.isActive) {
          get().stopPractice()
        }

        const session: PracticeSession = {
          scoreId: score.id,
          scoreTitle: score.title,
          scoreComposer: score.composer || 'Unknown',
          startTime: new Date(),
          totalPausedDuration: 0,
          pageViews: [],
          instrument,
          isActive: true,
          isPaused: false,
        }

        set({ currentSession: session })
      },

      stopPractice: () => {
        const session = get().currentSession
        if (!session || !session.isActive) return null

        // If paused, resume first to get accurate end time
        if (session.isPaused) {
          get().resumePractice()
        }

        const endTime = new Date()
        const updatedSession = {
          ...session,
          endTime,
          isActive: false,
          isPaused: false,
        }

        const duration = calculateDuration(updatedSession)

        // Clear session after extracting data
        set({ currentSession: null })

        return {
          duration,
          scoreId: session.scoreId,
          scoreTitle: session.scoreTitle,
          scoreComposer: session.scoreComposer,
        }
      },

      pausePractice: () => {
        const session = get().currentSession
        if (!session || !session.isActive || session.isPaused) return

        set({
          currentSession: {
            ...session,
            pausedTime: new Date(),
            isPaused: true,
          },
        })
      },

      resumePractice: () => {
        const session = get().currentSession
        if (!session || !session.isActive || !session.isPaused) return

        const pausedTime = session.pausedTime
        if (pausedTime) {
          // Ensure pausedTime is a Date object
          const pausedTimeDate =
            pausedTime instanceof Date ? pausedTime : new Date(pausedTime)
          const pauseDuration = new Date().getTime() - pausedTimeDate.getTime()
          set({
            currentSession: {
              ...session,
              totalPausedDuration: session.totalPausedDuration + pauseDuration,
              pausedTime: undefined,
              isPaused: false,
            },
          })
        }
      },

      updatePageView: pageNumber => {
        const session = get().currentSession
        if (!session || !session.isActive) return

        // Add page to views if not already tracked
        if (!session.pageViews.includes(pageNumber)) {
          set({
            currentSession: {
              ...session,
              pageViews: [...session.pageViews, pageNumber],
            },
          })
        }
      },

      clearSession: () => {
        set({ currentSession: null })
      },

      getCurrentDuration: () => {
        const session = get().currentSession
        if (!session || !session.isActive) return 0
        return calculateDuration(session)
      },
    }),
    {
      name: 'practice-session',
      // Only persist active sessions, clear completed ones
      partialize: state => ({
        currentSession: state.currentSession?.isActive
          ? state.currentSession
          : null,
      }),
      // Handle Date serialization/deserialization
      serialize: state => {
        return JSON.stringify(state)
      },
      deserialize: str => {
        const parsed = JSON.parse(str)
        if (parsed.state?.currentSession) {
          const session = parsed.state.currentSession
          // Convert string dates back to Date objects
          if (session.startTime) {
            session.startTime = new Date(session.startTime)
          }
          if (session.endTime) {
            session.endTime = new Date(session.endTime)
          }
          if (session.pausedTime) {
            session.pausedTime = new Date(session.pausedTime)
          }
        }
        return parsed
      },
    }
  )
)
