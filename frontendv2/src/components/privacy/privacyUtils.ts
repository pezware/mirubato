import { useState, useEffect } from 'react'

export interface PrivacyPreferences {
  essential: boolean
  functional: boolean
  consentDate: string
  version: string
}

export const PRIVACY_CONSENT_KEY = 'mirubato:privacy-consent'
export const PRIVACY_VERSION = '2025-01'

/**
 * Hook to get current privacy preferences
 */
export function usePrivacyConsent() {
  const [consent, setConsent] = useState<PrivacyPreferences | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRIVACY_CONSENT_KEY)
      if (stored) {
        setConsent(JSON.parse(stored))
      }
    } catch (error) {
      console.warn('Failed to read privacy consent:', error)
    }
  }, [])

  const hasConsent = consent?.version === PRIVACY_VERSION
  const functionalEnabled = consent?.functional || false

  return {
    hasConsent,
    functionalEnabled,
    consent,
  }
}

/**
 * Utility to check if we can use functional features
 */
export function canUseFunctionalFeatures(): boolean {
  try {
    const stored = localStorage.getItem(PRIVACY_CONSENT_KEY)
    if (stored) {
      const consent = JSON.parse(stored) as PrivacyPreferences
      return consent.functional && consent.version === PRIVACY_VERSION
    }
  } catch (error) {
    console.warn('Failed to check functional consent:', error)
  }
  return false
}
