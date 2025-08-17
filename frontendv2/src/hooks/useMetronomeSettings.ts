import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { userApi, type MetronomePreset } from '../api/user'

interface PatternData {
  accent: boolean[]
  click: boolean[]
  woodblock: boolean[]
  shaker: boolean[]
  triangle: boolean[]
}

interface MetronomeSettings {
  bpm: number
  beatsPerMeasure: number
  beatValue: number
  volume: number
  selectedPattern: string
  customPatterns?: Record<string, PatternData>
  currentCustomPattern?: PatternData
  position: 'side' | 'corner'
  isExpanded: boolean
}

const DEFAULT_SETTINGS: MetronomeSettings = {
  bpm: 120,
  beatsPerMeasure: 4,
  beatValue: 4,
  volume: 70,
  selectedPattern: 'basic',
  position: 'side',
  isExpanded: false,
}

export function useMetronomeSettings() {
  const [settings, setSettings] = useState<MetronomeSettings>(() => {
    // Load from localStorage on init
    try {
      const saved = localStorage.getItem('mirubato-metronome-settings')
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      }
    } catch (error) {
      console.error('Failed to load metronome settings:', error)
    }
    return DEFAULT_SETTINGS
  })

  // Save to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem(
        'mirubato-metronome-settings',
        JSON.stringify(settings)
      )
    } catch (error) {
      console.error('Failed to save metronome settings:', error)
    }
  }, [settings])

  const updateSettings = (updates: Partial<MetronomeSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
    localStorage.removeItem('mirubato-metronome-settings')
  }

  const saveCurrentPattern = (pattern: PatternData) => {
    setSettings(prev => ({ ...prev, currentCustomPattern: pattern }))
  }

  return {
    settings,
    updateSettings,
    resetSettings,
    saveCurrentPattern,
  }
}

// Hook for storing custom patterns (deprecated - use useMetronomePresets instead)
export function useCustomPatterns() {
  const [customPatterns, setCustomPatterns] = useState<
    Record<string, PatternData>
  >(() => {
    try {
      const saved = localStorage.getItem('mirubato-metronome-custom-patterns')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(
        'mirubato-metronome-custom-patterns',
        JSON.stringify(customPatterns)
      )
    } catch (error) {
      console.error('Failed to save custom patterns:', error)
    }
  }, [customPatterns])

  const savePattern = (name: string, pattern: PatternData) => {
    setCustomPatterns(prev => ({ ...prev, [name]: pattern }))
  }

  const deletePattern = (name: string) => {
    setCustomPatterns(prev => {
      const updated = { ...prev }
      delete updated[name]
      return updated
    })
  }

  return {
    customPatterns,
    savePattern,
    deletePattern,
  }
}

// Hook for managing metronome presets with cloud sync
export function useMetronomePresets() {
  const { isAuthenticated } = useAuthStore()
  const [presets, setPresets] = useState<Record<string, MetronomePreset>>(
    () => {
      try {
        const saved = localStorage.getItem('mirubato-metronome-presets')
        return saved ? JSON.parse(saved) : {}
      } catch {
        return {}
      }
    }
  )

  const [isLoading, setIsLoading] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Save to localStorage whenever presets change
  useEffect(() => {
    try {
      localStorage.setItem(
        'mirubato-metronome-presets',
        JSON.stringify(presets)
      )
    } catch (error) {
      console.error('Failed to save metronome presets to localStorage:', error)
    }
  }, [presets])

  // Sync to cloud when authenticated
  const syncToCloud = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      setIsLoading(true)
      setSyncError(null)

      await userApi.updatePreferences({
        metronomePresets: presets,
      })

      // Mark all presets as synced
      setPresets(prev => {
        const updated = { ...prev }
        Object.values(updated).forEach(preset => {
          preset.synced = true
        })
        return updated
      })
    } catch (error) {
      console.error('Failed to sync presets to cloud:', error)
      setSyncError('Failed to sync presets to cloud')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, presets])

  // Load presets from cloud on auth
  const loadFromCloud = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      setIsLoading(true)
      setSyncError(null)

      const preferences = await userApi.getPreferences()
      const cloudPresets = preferences.metronomePresets || {}

      // Merge cloud and local presets (cloud takes precedence for conflicts)
      setPresets(prev => {
        const merged = { ...prev }

        Object.entries(cloudPresets).forEach(([id, cloudPreset]) => {
          const localPreset = merged[id]

          // If no local preset or cloud is newer, use cloud version
          if (
            !localPreset ||
            new Date(cloudPreset.lastModified) >
              new Date(localPreset.lastModified)
          ) {
            merged[id] = { ...cloudPreset, synced: true }
          }
        })

        return merged
      })
    } catch (error) {
      console.error('Failed to load presets from cloud:', error)
      setSyncError('Failed to load presets from cloud')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  // Auto-sync when authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      loadFromCloud()
    }
  }, [isAuthenticated, loadFromCloud])

  const savePreset = useCallback(
    (
      name: string,
      settings: MetronomeSettings,
      customPattern?: PatternData
    ) => {
      const preset: MetronomePreset = {
        id: crypto.randomUUID(),
        name,
        bpm: settings.bpm,
        beatsPerMeasure: settings.beatsPerMeasure,
        beatValue: settings.beatValue,
        volume: settings.volume,
        selectedPattern: settings.selectedPattern,
        customPattern,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        synced: false,
      }

      setPresets(prev => ({ ...prev, [preset.id]: preset }))

      // Auto-sync to cloud if authenticated
      if (isAuthenticated) {
        setTimeout(syncToCloud, 100) // Debounce sync
      }

      return preset.id
    },
    [isAuthenticated, syncToCloud]
  )

  const updatePreset = useCallback(
    (
      id: string,
      updates: Partial<Omit<MetronomePreset, 'id' | 'createdAt'>>
    ) => {
      setPresets(prev => {
        const preset = prev[id]
        if (!preset) return prev

        const updated = {
          ...preset,
          ...updates,
          lastModified: new Date().toISOString(),
          synced: false,
        }

        return { ...prev, [id]: updated }
      })

      // Auto-sync to cloud if authenticated
      if (isAuthenticated) {
        setTimeout(syncToCloud, 100) // Debounce sync
      }
    },
    [isAuthenticated, syncToCloud]
  )

  const deletePreset = useCallback(
    (id: string) => {
      setPresets(prev => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })

      // Auto-sync to cloud if authenticated
      if (isAuthenticated) {
        setTimeout(syncToCloud, 100) // Debounce sync
      }
    },
    [isAuthenticated, syncToCloud]
  )

  const duplicatePreset = useCallback(
    (id: string, newName?: string) => {
      const preset = presets[id]
      if (!preset) return null

      const duplicate: MetronomePreset = {
        ...preset,
        id: crypto.randomUUID(),
        name: newName || `${preset.name} Copy`,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        synced: false,
      }

      setPresets(prev => ({ ...prev, [duplicate.id]: duplicate }))

      // Auto-sync to cloud if authenticated
      if (isAuthenticated) {
        setTimeout(syncToCloud, 100) // Debounce sync
      }

      return duplicate.id
    },
    [presets, isAuthenticated, syncToCloud]
  )

  const importPresets = useCallback(
    (importedPresets: Record<string, MetronomePreset>) => {
      setPresets(prev => {
        const updated = { ...prev }

        Object.entries(importedPresets).forEach(([_, preset]) => {
          const newPreset = {
            ...preset,
            id: crypto.randomUUID(), // Generate new ID to avoid conflicts
            lastModified: new Date().toISOString(),
            synced: false,
          }
          updated[newPreset.id] = newPreset
        })

        return updated
      })

      // Auto-sync to cloud if authenticated
      if (isAuthenticated) {
        setTimeout(syncToCloud, 100) // Debounce sync
      }
    },
    [isAuthenticated, syncToCloud]
  )

  const exportPresets = useCallback(() => {
    return JSON.stringify(presets, null, 2)
  }, [presets])

  return {
    presets: Object.values(presets),
    presetsMap: presets,
    isLoading,
    syncError,
    savePreset,
    updatePreset,
    deletePreset,
    duplicatePreset,
    importPresets,
    exportPresets,
    syncToCloud,
    loadFromCloud,
  }
}
