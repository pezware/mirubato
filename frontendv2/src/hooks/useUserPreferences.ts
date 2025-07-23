import { useState, useEffect, useCallback } from 'react'

interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto'
  notificationSettings?: Record<string, unknown>
  primaryInstrument?: string
  customInstruments?: string[]
}

const USER_PREFERENCES_KEY = 'mirubato:user-preferences'

const DEFAULT_PREFERENCES: UserPreferences = {
  primaryInstrument: 'piano',
  customInstruments: [],
}

// Helper to load from localStorage
const loadFromStorage = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(USER_PREFERENCES_KEY)
    if (stored) {
      const preferences = JSON.parse(stored)
      return { ...DEFAULT_PREFERENCES, ...preferences }
    }
  } catch (error) {
    console.error('Failed to load user preferences:', error)
  }
  return DEFAULT_PREFERENCES
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    loadFromStorage()
  )

  // Save to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.error('Failed to save user preferences:', error)
    }
  }, [preferences])

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }))
  }, [])

  const setPrimaryInstrument = useCallback(
    (instrument: string) => {
      updatePreferences({ primaryInstrument: instrument })
    },
    [updatePreferences]
  )

  const getPrimaryInstrument = useCallback((): string => {
    return preferences.primaryInstrument || 'piano'
  }, [preferences.primaryInstrument])

  const addCustomInstrument = useCallback((instrument: string) => {
    const normalized = instrument.trim().toLowerCase()
    if (normalized) {
      setPreferences(prev => {
        const customInstruments = prev.customInstruments || []
        // Case-insensitive duplicate check
        const alreadyExists = customInstruments.some(
          i => i.toLowerCase() === normalized
        )
        if (!alreadyExists) {
          return {
            ...prev,
            customInstruments: [...customInstruments, normalized],
          }
        }
        return prev
      })
    }
  }, [])

  const removeCustomInstrument = useCallback((instrument: string) => {
    setPreferences(prev => ({
      ...prev,
      customInstruments: (prev.customInstruments || []).filter(
        i => i !== instrument
      ),
    }))
  }, [])

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES)
    localStorage.removeItem(USER_PREFERENCES_KEY)
  }, [])

  return {
    preferences,
    updatePreferences,
    setPrimaryInstrument,
    getPrimaryInstrument,
    addCustomInstrument,
    removeCustomInstrument,
    resetPreferences,
  }
}
