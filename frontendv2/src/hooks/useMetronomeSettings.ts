import { useState, useEffect } from 'react'

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

  return {
    settings,
    updateSettings,
    resetSettings,
  }
}

// Hook for storing custom patterns
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
