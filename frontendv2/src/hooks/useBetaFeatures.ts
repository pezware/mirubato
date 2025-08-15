import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

interface BetaFeatures {
  scorebook: boolean
}

const BETA_STORAGE_KEY = 'mirubato:beta-features'

export function useBetaFeatures(): BetaFeatures {
  const location = useLocation()
  const [features, setFeatures] = useState<BetaFeatures>(() => {
    // Check sessionStorage for existing beta state
    const stored = sessionStorage.getItem(BETA_STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        // If parse fails, use default
      }
    }

    // Default state - all beta features OFF
    return {
      scorebook: false,
    }
  })

  useEffect(() => {
    // Check URL params for beta flag
    const params = new URLSearchParams(location.search)
    const betaParam = params.get('beta')

    if (betaParam !== null) {
      // If beta param is present, update state
      const isEnabled = betaParam === 'on'
      const newFeatures = {
        scorebook: isEnabled,
      }

      setFeatures(newFeatures)

      // Store in sessionStorage so it persists during navigation
      // but clears when browser/tab is closed
      if (isEnabled) {
        sessionStorage.setItem(BETA_STORAGE_KEY, JSON.stringify(newFeatures))
      } else {
        sessionStorage.removeItem(BETA_STORAGE_KEY)
      }

      // Remove the beta param from URL to keep it clean
      params.delete('beta')
      const newSearch = params.toString()
      const newUrl =
        location.pathname + (newSearch ? `?${newSearch}` : '') + location.hash

      // Replace current URL without the beta param
      window.history.replaceState({}, '', newUrl)
    }
  }, [location])

  return features
}

// Helper hook to check if a specific feature is enabled
export function useBetaFeature(feature: keyof BetaFeatures): boolean {
  const features = useBetaFeatures()
  return features[feature]
}
