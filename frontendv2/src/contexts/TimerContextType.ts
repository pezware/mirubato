import { createContext } from 'react'

export interface TimerCheckpoint {
  startTimestamp: number | null
  accumulatedSeconds: number
  isRunning: boolean
  lastCheckpoint: number
  sessionStartTime: string | null
}

export interface TimerSettings {
  enableReminders: boolean
  reminderType: 'visual' | 'sound' | 'both'
  reminderInterval: number // in minutes
}

export interface TimerContextType {
  // Timer state
  seconds: number
  isRunning: boolean
  startTime: Date | null
  wasRunningInBackground: boolean

  // Modal state
  isModalOpen: boolean
  isMinimized: boolean

  // Timer controls
  start: () => void
  pause: () => void
  stop: (callback?: (duration: number, startTime?: Date) => void) => void
  reset: () => void

  // Modal controls
  openModal: () => void
  closeModal: () => void
  minimizeModal: () => void

  // Settings
  settings: TimerSettings
  updateSettings: (settings: Partial<TimerSettings>) => void
}

export const defaultSettings: TimerSettings = {
  enableReminders: false,
  reminderType: 'visual',
  reminderInterval: 30, // 30 minutes
}

export const TIMER_STORAGE_KEY = 'mirubato_timer_state'
export const SETTINGS_STORAGE_KEY = 'mirubato_timer_settings'

export const TimerContext = createContext<TimerContextType | undefined>(
  undefined
)
