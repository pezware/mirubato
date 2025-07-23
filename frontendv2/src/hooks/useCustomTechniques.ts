import { useState, useCallback } from 'react'

const CUSTOM_TECHNIQUES_KEY = 'mirubato:custom-techniques'

// Helper to load from localStorage
const loadFromStorage = (): string[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_TECHNIQUES_KEY)
    if (stored) {
      const techniques = JSON.parse(stored)
      if (Array.isArray(techniques)) {
        return techniques
      }
    }
  } catch (error) {
    console.error('Failed to load custom techniques:', error)
  }
  return []
}

export function useCustomTechniques() {
  const [customTechniques, setCustomTechniques] = useState<string[]>(() =>
    loadFromStorage()
  )

  const addCustomTechnique = useCallback((technique: string) => {
    const trimmed = technique.trim()
    if (trimmed) {
      setCustomTechniques(prev => {
        if (!prev.includes(trimmed)) {
          const newTechniques = [...prev, trimmed]
          try {
            localStorage.setItem(
              CUSTOM_TECHNIQUES_KEY,
              JSON.stringify(newTechniques)
            )
          } catch (error) {
            console.error('Failed to save custom techniques:', error)
          }
          return newTechniques
        }
        return prev
      })
    }
  }, [])

  const removeCustomTechnique = useCallback((technique: string) => {
    setCustomTechniques(prev => {
      const newTechniques = prev.filter(t => t !== technique)
      try {
        localStorage.setItem(
          CUSTOM_TECHNIQUES_KEY,
          JSON.stringify(newTechniques)
        )
      } catch (error) {
        console.error('Failed to save custom techniques:', error)
      }
      return newTechniques
    })
  }, [])

  return {
    customTechniques,
    addCustomTechnique,
    removeCustomTechnique,
  }
}
