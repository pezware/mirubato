import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { X, Shield, Settings, Check } from 'lucide-react'
import { Button } from '../ui'
import { Card } from '../ui'
import {
  PrivacyPreferences,
  PRIVACY_CONSENT_KEY,
  PRIVACY_VERSION,
} from './privacyUtils'

export function PrivacyBanner() {
  const { t } = useTranslation(['common', 'privacy'])
  const [showBanner, setShowBanner] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    essential: true, // Always required
    functional: true,
    consentDate: new Date().toISOString(),
    version: PRIVACY_VERSION,
  })

  useEffect(() => {
    // Check if user has already consented
    try {
      const stored = localStorage.getItem(PRIVACY_CONSENT_KEY)
      if (stored) {
        const consent = JSON.parse(stored) as PrivacyPreferences
        // Show banner if consent is for older version or missing
        if (consent.version !== PRIVACY_VERSION) {
          setShowBanner(true)
        }
      } else {
        // First time visitor
        setShowBanner(true)
      }
    } catch (error) {
      console.warn('Failed to read privacy consent:', error)
      setShowBanner(true)
    }
  }, [])

  const handleAcceptAll = () => {
    const newPreferences: PrivacyPreferences = {
      essential: true,
      functional: true,
      consentDate: new Date().toISOString(),
      version: PRIVACY_VERSION,
    }

    savePreferences(newPreferences)
    setShowBanner(false)
  }

  const handleAcceptSelected = () => {
    const newPreferences: PrivacyPreferences = {
      ...preferences,
      essential: true, // Always required
      consentDate: new Date().toISOString(),
      version: PRIVACY_VERSION,
    }

    savePreferences(newPreferences)
    setShowBanner(false)
    setShowPreferences(false)
  }

  const handleRejectOptional = () => {
    const newPreferences: PrivacyPreferences = {
      essential: true,
      functional: false,
      consentDate: new Date().toISOString(),
      version: PRIVACY_VERSION,
    }

    savePreferences(newPreferences)
    setShowBanner(false)
  }

  const savePreferences = (prefs: PrivacyPreferences) => {
    try {
      localStorage.setItem(PRIVACY_CONSENT_KEY, JSON.stringify(prefs))

      // Apply preferences to the app
      if (!prefs.functional) {
        // Clear functional cookies/storage if rejected
        localStorage.removeItem('mirubato:ui-preferences')
        localStorage.removeItem('mirubato:feature-flags')
      }

      console.log('[Privacy] Consent saved:', prefs)
    } catch (error) {
      console.error('[Privacy] Failed to save consent:', error)
    }
  }

  if (!showBanner) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm">
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6">
        <Card className="max-w-4xl mx-auto border-2 border-morandi-sage-300 shadow-xl">
          <div className="p-4 sm:p-6">
            {!showPreferences ? (
              // Main consent banner
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-6 w-6 text-morandi-sage-600 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-lexend text-lg font-medium text-morandi-stone-800 mb-2">
                      {t('privacy:banner.title', 'Privacy & Data Protection')}
                    </h3>
                    <p className="text-sm text-morandi-stone-600 leading-relaxed">
                      {t(
                        'privacy:banner.message',
                        'We use essential cookies for authentication and functionality, plus optional cookies for preferences and device sync. Your practice data stays local-first with optional cloud sync. We never sell your data or use tracking cookies.'
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBanner(false)}
                    className="text-morandi-stone-400 hover:text-morandi-stone-600 p-1"
                    aria-label="Close banner"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="flex gap-2 text-xs">
                    <Link
                      to="/about"
                      className="text-morandi-sage-600 hover:text-morandi-sage-700 underline"
                    >
                      {t('privacy:banner.readPolicy', 'Privacy Policy')}
                    </Link>
                    <span className="text-morandi-stone-400">•</span>
                    <button
                      onClick={() => setShowPreferences(true)}
                      className="text-morandi-sage-600 hover:text-morandi-sage-700 underline inline-flex items-center gap-1"
                    >
                      <Settings className="h-3 w-3" />
                      {t('privacy:banner.preferences', 'Cookie Preferences')}
                    </button>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleRejectOptional}
                      className="text-xs"
                    >
                      {t('privacy:banner.rejectOptional', 'Essential Only')}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAcceptAll}
                      className="text-xs"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {t('privacy:banner.acceptAll', 'Accept All')}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // Preferences panel
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Settings className="h-6 w-6 text-morandi-sage-600" />
                  <h3 className="font-lexend text-lg font-medium text-morandi-stone-800">
                    {t('privacy:preferences.title', 'Cookie Preferences')}
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Essential Cookies */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-morandi-stone-50">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled={true}
                      className="mt-1 opacity-50"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-morandi-stone-700 text-sm">
                        {t(
                          'privacy:preferences.essential.title',
                          'Essential Cookies'
                        )}
                      </h4>
                      <p className="text-xs text-morandi-stone-600 mt-1">
                        {t(
                          'privacy:preferences.essential.description',
                          'Required for authentication, security, and core functionality. Cannot be disabled.'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Functional Cookies */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-morandi-stone-200">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={e =>
                        setPreferences(prev => ({
                          ...prev,
                          functional: e.target.checked,
                        }))
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-morandi-stone-700 text-sm">
                        {t(
                          'privacy:preferences.functional.title',
                          'Functional Cookies'
                        )}
                      </h4>
                      <p className="text-xs text-morandi-stone-600 mt-1">
                        {t(
                          'privacy:preferences.functional.description',
                          'Store your language preference, UI settings, and device recognition for multi-device sync.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowPreferences(false)}
                    className="text-xs"
                  >
                    {t('common:cancel', 'Cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAcceptSelected}
                    className="text-xs"
                  >
                    {t('privacy:preferences.save', 'Save Preferences')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
