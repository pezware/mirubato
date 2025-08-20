import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'

interface LayoutPreferences {
  global: {
    splitRatio: number
    detailPanelOpen: boolean
  }
  pages: {
    [key: string]: {
      splitRatio?: number
      lastSelectedId?: string
      detailPanelOpen?: boolean
    }
  }
}

const DEFAULT_PREFERENCES: LayoutPreferences = {
  global: {
    splitRatio: 0.66,
    detailPanelOpen: false,
  },
  pages: {},
}

const STORAGE_KEY = 'layout-preferences'

export function useLayoutPreferences(pageKey?: string) {
  const { user } = useAuthStore()
  const [preferences, setPreferences] =
    useState<LayoutPreferences>(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)

  // Load preferences from localStorage on mount
  useEffect(() => {
    const loadPreferences = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...parsed,
            global: {
              ...DEFAULT_PREFERENCES.global,
              ...parsed.global,
            },
            pages: {
              ...parsed.pages,
            },
          })
        }
      } catch (error) {
        console.error('Failed to load layout preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPreferences()
  }, [])

  // Save preferences to localStorage
  const savePreferences = useCallback(
    (newPreferences: LayoutPreferences) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences))

        // If user is logged in, we could sync to D1 here
        // This would be an API call to save preferences
        if (user) {
          // TODO: Implement API call to save preferences to D1
          // api.saveUserPreferences(user.id, newPreferences)
        }
      } catch (error) {
        console.error('Failed to save layout preferences:', error)
      }
    },
    [user]
  )

  // Get split ratio for current page or global
  const getSplitRatio = useCallback((): number => {
    if (pageKey && preferences.pages[pageKey]?.splitRatio !== undefined) {
      return preferences.pages[pageKey].splitRatio!
    }
    return preferences.global.splitRatio
  }, [pageKey, preferences])

  // Set split ratio
  const setSplitRatio = useCallback(
    (ratio: number) => {
      setPreferences(prev => {
        const updated = { ...prev }

        if (pageKey) {
          // Update page-specific ratio
          updated.pages = {
            ...updated.pages,
            [pageKey]: {
              ...updated.pages[pageKey],
              splitRatio: ratio,
            },
          }
        } else {
          // Update global ratio
          updated.global = {
            ...updated.global,
            splitRatio: ratio,
          }
        }

        savePreferences(updated)
        return updated
      })
    },
    [pageKey, savePreferences]
  )

  // Get detail panel open state
  const getDetailPanelOpen = useCallback((): boolean => {
    if (pageKey && preferences.pages[pageKey]?.detailPanelOpen !== undefined) {
      return preferences.pages[pageKey].detailPanelOpen!
    }
    return preferences.global.detailPanelOpen
  }, [pageKey, preferences])

  // Set detail panel open state
  const setDetailPanelOpen = useCallback(
    (open: boolean) => {
      setPreferences(prev => {
        const updated = { ...prev }

        if (pageKey) {
          // Update page-specific state
          updated.pages = {
            ...updated.pages,
            [pageKey]: {
              ...updated.pages[pageKey],
              detailPanelOpen: open,
            },
          }
        } else {
          // Update global state
          updated.global = {
            ...updated.global,
            detailPanelOpen: open,
          }
        }

        savePreferences(updated)
        return updated
      })
    },
    [pageKey, savePreferences]
  )

  // Get last selected ID for a page
  const getLastSelectedId = useCallback((): string | undefined => {
    if (pageKey) {
      return preferences.pages[pageKey]?.lastSelectedId
    }
    return undefined
  }, [pageKey, preferences])

  // Set last selected ID for a page
  const setLastSelectedId = useCallback(
    (id: string | undefined) => {
      if (!pageKey) return

      setPreferences(prev => {
        const updated = {
          ...prev,
          pages: {
            ...prev.pages,
            [pageKey]: {
              ...prev.pages[pageKey],
              lastSelectedId: id,
            },
          },
        }

        savePreferences(updated)
        return updated
      })
    },
    [pageKey, savePreferences]
  )

  // Reset preferences to defaults
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES)
    savePreferences(DEFAULT_PREFERENCES)
  }, [savePreferences])

  // Reset page-specific preferences
  const resetPagePreferences = useCallback(() => {
    if (!pageKey) return

    setPreferences(prev => {
      const updated = { ...prev }
      delete updated.pages[pageKey]
      savePreferences(updated)
      return updated
    })
  }, [pageKey, savePreferences])

  return {
    // State
    isLoading,
    preferences,

    // Getters
    splitRatio: getSplitRatio(),
    detailPanelOpen: getDetailPanelOpen(),
    lastSelectedId: getLastSelectedId(),

    // Setters
    setSplitRatio,
    setDetailPanelOpen,
    setLastSelectedId,

    // Actions
    resetPreferences,
    resetPagePreferences,
  }
}

export default useLayoutPreferences
