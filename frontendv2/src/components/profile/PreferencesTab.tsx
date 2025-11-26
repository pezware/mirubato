import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Music, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Select } from '../ui'
import Button from '../ui/Button'
import { Input } from '../ui'
import { useUserPreferences } from '../../hooks/useUserPreferences'
import { showToast } from '../../utils/toastManager'

const languages = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  { value: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
]

const instruments = [
  { value: 'piano', labelKey: 'common:instruments.piano' },
  { value: 'guitar', labelKey: 'common:instruments.guitar' },
  { value: 'violin', labelKey: 'common:instruments.violin' },
  { value: 'viola', labelKey: 'common:instruments.viola' },
  { value: 'cello', labelKey: 'common:instruments.cello' },
  { value: 'double-bass', labelKey: 'common:instruments.double-bass' },
  { value: 'flute', labelKey: 'common:instruments.flute' },
  { value: 'oboe', labelKey: 'common:instruments.oboe' },
  { value: 'clarinet', labelKey: 'common:instruments.clarinet' },
  { value: 'bassoon', labelKey: 'common:instruments.bassoon' },
  { value: 'french-horn', labelKey: 'common:instruments.french-horn' },
  { value: 'trumpet', labelKey: 'common:instruments.trumpet' },
  { value: 'trombone', labelKey: 'common:instruments.trombone' },
  { value: 'tuba', labelKey: 'common:instruments.tuba' },
  { value: 'percussion', labelKey: 'common:instruments.percussion' },
  { value: 'harp', labelKey: 'common:instruments.harp' },
  { value: 'saxophone', labelKey: 'common:instruments.saxophone' },
  { value: 'voice', labelKey: 'common:instruments.voice' },
  { value: 'organ', labelKey: 'common:instruments.organ' },
  { value: 'accordion', labelKey: 'common:instruments.accordion' },
]

export function PreferencesTab() {
  const { t, i18n } = useTranslation(['profile', 'common'])
  const {
    preferences,
    setPrimaryInstrument,
    addCustomInstrument,
    removeCustomInstrument,
  } = useUserPreferences()

  const [customInstrumentInput, setCustomInstrumentInput] = useState('')

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode)
    showToast(t('profile:languageChanged', 'Language updated'), 'success')
  }

  const handleInstrumentChange = (instrument: string) => {
    setPrimaryInstrument(instrument)
    showToast(
      t('profile:instrumentChanged', 'Primary instrument updated'),
      'success'
    )
  }

  const handleAddCustomInstrument = () => {
    if (customInstrumentInput.trim()) {
      addCustomInstrument(customInstrumentInput.trim())
      setCustomInstrumentInput('')
      showToast(
        t('profile:customInstrumentAdded', 'Custom instrument added'),
        'success'
      )
    }
  }

  const handleRemoveCustomInstrument = (instrument: string) => {
    removeCustomInstrument(instrument)
    // If the removed instrument was the primary, reset to piano
    if (preferences.primaryInstrument === instrument) {
      setPrimaryInstrument('piano')
    }
    showToast(
      t('profile:customInstrumentRemoved', 'Custom instrument removed'),
      'success'
    )
  }

  // Build instrument options including custom ones
  const instrumentOptions = [
    ...instruments.map(inst => ({
      value: inst.value,
      label: t(inst.labelKey, inst.value),
    })),
    ...(preferences.customInstruments || []).map(inst => ({
      value: inst,
      label: inst.charAt(0).toUpperCase() + inst.slice(1),
    })),
  ]

  const currentLanguage =
    languages.find(lang => lang.value === i18n.language) || languages[0]

  return (
    <div className="space-y-6">
      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-lexend text-morandi-stone-700">
            <Globe className="h-5 w-5" />
            {t('profile:sections.language', 'Language')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-morandi-stone-600">
            {t(
              'profile:languageDescription',
              'Choose your preferred language for the interface.'
            )}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {languages.map(lang => (
              <button
                key={lang.value}
                onClick={() => handleLanguageChange(lang.value)}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                  i18n.language === lang.value
                    ? 'bg-morandi-sage-100 border-morandi-sage-400 text-morandi-sage-700'
                    : 'border-morandi-stone-200 hover:bg-morandi-stone-50 text-morandi-stone-600'
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.label}</span>
                {i18n.language === lang.value && (
                  <Check className="h-4 w-4 ml-auto text-morandi-sage-600" />
                )}
              </button>
            ))}
          </div>

          <p className="text-xs text-morandi-stone-500">
            {t('profile:currentLanguage', 'Current')}: {currentLanguage.flag}{' '}
            {currentLanguage.label}
          </p>
        </CardContent>
      </Card>

      {/* Instrument Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-lexend text-morandi-stone-700">
            <Music className="h-5 w-5" />
            {t('profile:sections.instrument', 'Primary Instrument')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-morandi-stone-600">
            {t(
              'profile:instrumentDescription',
              'Set your primary instrument for practice tracking and recommendations.'
            )}
          </p>

          <Select
            value={preferences.primaryInstrument || 'piano'}
            onChange={e => handleInstrumentChange(e.target.value)}
            className="max-w-xs"
          >
            {instrumentOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          {/* Custom Instruments Section */}
          <div className="pt-4 border-t border-morandi-stone-200">
            <h4 className="text-sm font-medium text-morandi-stone-700 mb-3">
              {t('profile:customInstruments', 'Custom Instruments')}
            </h4>

            <div className="flex gap-2 mb-3">
              <Input
                type="text"
                value={customInstrumentInput}
                onChange={e => setCustomInstrumentInput(e.target.value)}
                placeholder={t(
                  'common:instruments.customPlaceholder',
                  'Instrument name'
                )}
                className="max-w-xs"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleAddCustomInstrument()
                  }
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddCustomInstrument}
                disabled={!customInstrumentInput.trim()}
              >
                {t('common:add', 'Add')}
              </Button>
            </div>

            {preferences.customInstruments &&
              preferences.customInstruments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {preferences.customInstruments.map(inst => (
                    <span
                      key={inst}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-morandi-stone-100 rounded-full text-sm text-morandi-stone-700"
                    >
                      {inst.charAt(0).toUpperCase() + inst.slice(1)}
                      <button
                        onClick={() => handleRemoveCustomInstrument(inst)}
                        className="ml-1 text-morandi-stone-400 hover:text-morandi-stone-600"
                        aria-label={t('common:remove', 'Remove')}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

            {(!preferences.customInstruments ||
              preferences.customInstruments.length === 0) && (
              <p className="text-xs text-morandi-stone-500">
                {t(
                  'profile:noCustomInstruments',
                  'No custom instruments added yet.'
                )}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
