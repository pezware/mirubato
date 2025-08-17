import { apiClient } from './client'

export interface MetronomePreset {
  id: string
  name: string
  bpm: number
  beatsPerMeasure: number
  beatValue: number
  volume: number
  selectedPattern: string
  customPattern?: {
    accent: boolean[]
    click: boolean[]
    woodblock: boolean[]
    shaker: boolean[]
    triangle: boolean[]
  }
  createdAt: string
  lastModified: string
  synced?: boolean
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto'
  notificationSettings?: Record<string, unknown>
  primaryInstrument?: string
  customInstruments?: string[]
  metronomePresets?: Record<string, MetronomePreset>
}

export const userApi = {
  // Get user preferences
  getPreferences: async (): Promise<UserPreferences> => {
    const response = await apiClient.get<UserPreferences>(
      '/api/user/preferences'
    )
    return response.data
  },

  // Update user preferences
  updatePreferences: async (
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences> => {
    const response = await apiClient.put<UserPreferences>(
      '/api/user/preferences',
      preferences
    )
    return response.data
  },
}
