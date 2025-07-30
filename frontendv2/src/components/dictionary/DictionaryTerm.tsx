import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { sanitizeOutput } from '@/utils/dictionarySecurity'
import {
  DictionaryTermProps,
  DictionaryEntry,
  SupportedLanguage,
  MultiLanguageTermResponse,
} from '@/types/dictionary'
import DictionaryReferences from './DictionaryReferences'
import { dictionaryAPI } from '@/api/dictionary'
import { Volume2, ArrowLeft } from 'lucide-react'

/**
 * Display a dictionary term with full details, references, and multi-language support
 */
const DictionaryTerm: React.FC<DictionaryTermProps> = ({
  entry,
  onFeedback,
  onBack,
}) => {
  const { t, i18n } = useTranslation(['toolbox'])
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [languageVersions, setLanguageVersions] =
    useState<MultiLanguageTermResponse | null>(null)
  const [loadingLanguages, setLoadingLanguages] = useState(false)
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(
    new Set([entry.lang])
  )
  const [additionalEntries, setAdditionalEntries] = useState<
    Record<string, DictionaryEntry>
  >({})

  const currentLanguage = i18n.language as SupportedLanguage
  const availableLanguages = React.useMemo<SupportedLanguage[]>(
    () => ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'],
    []
  )

  const fetchLanguageVersions = useCallback(async () => {
    try {
      setLoadingLanguages(true)
      const response = await dictionaryAPI.getTermInLanguages(
        entry.normalized_term,
        availableLanguages
      )
      setLanguageVersions(response)
    } catch (error) {
      console.error('Failed to fetch language versions:', error)
    } finally {
      setLoadingLanguages(false)
    }
  }, [entry.normalized_term, availableLanguages])

  const fetchSpecificLanguage = useCallback(
    async (lang: string) => {
      if (additionalEntries[lang] || lang === entry.lang) return

      try {
        const result = await dictionaryAPI.getTerm(entry.normalized_term, {
          lang,
          searchAllLanguages: false,
        })
        setAdditionalEntries(prev => ({ ...prev, [lang]: result }))
        setSelectedLanguages(prev => new Set([...prev, lang]))
      } catch (error) {
        console.error(`Failed to fetch ${lang} version:`, error)
      }
    },
    [additionalEntries, entry.lang, entry.normalized_term]
  )

  // Fetch available language versions on mount
  useEffect(() => {
    fetchLanguageVersions()
  }, [fetchLanguageVersions])

  // If UI language differs from term language, try to fetch UI language version
  useEffect(() => {
    if (entry.lang !== currentLanguage) {
      fetchSpecificLanguage(currentLanguage)
    }
  }, [entry.lang, currentLanguage, fetchSpecificLanguage])

  const toggleLanguage = async (lang: string) => {
    if (lang === entry.lang) return // Can't deselect primary language

    const newSelected = new Set(selectedLanguages)
    if (newSelected.has(lang)) {
      newSelected.delete(lang)
    } else {
      newSelected.add(lang)
      if (
        !additionalEntries[lang] &&
        languageVersions?.languages[lang as SupportedLanguage]
      ) {
        await fetchSpecificLanguage(lang)
      }
    }
    setSelectedLanguages(newSelected)
  }

  // Handle helpful/not helpful feedback
  const handleFeedback = async (helpful: boolean) => {
    try {
      await dictionaryAPI.submitFeedback(entry.id, { helpful })
      setFeedbackSent(true)
      onFeedback?.({ helpful })

      // Reset feedback state after 3 seconds
      setTimeout(() => setFeedbackSent(false), 3000)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  // Format quality score as percentage (already in 0-100 scale)
  const qualityPercentage = entry.quality_score
    ? Math.round(entry.quality_score.overall)
    : 0

  // Get quality color based on score
  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Get language display name
  const getLanguageName = (lang: string) => {
    const langNames: Record<string, string> = {
      en: 'English',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      'zh-CN': '简体中文',
      'zh-TW': '繁體中文',
      it: 'Italiano',
      la: 'Latin',
    }
    return langNames[lang] || lang.toUpperCase()
  }

  // Render a single term entry
  const renderTermEntry = (
    termEntry: DictionaryEntry,
    isAdditional = false
  ) => (
    <div
      key={termEntry.id}
      className={`bg-white rounded-lg p-6 border-l-4 ${isAdditional ? 'border-morandi-stone-300' : 'border-morandi-sage-300'}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className={`${isAdditional ? 'text-2xl' : 'text-3xl'} font-bold text-stone-800`}
            >
              {sanitizeOutput(termEntry.term)}
            </h1>
            <span className="px-3 py-1 bg-sage-100 text-sage-700 rounded-full text-sm font-medium">
              {getLanguageName(termEntry.lang)}
            </span>
            {(termEntry as DictionaryEntry & { wasAIGenerated?: boolean })
              .wasAIGenerated && (
              <span
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                title={t('toolbox:dictionary.aiGeneratedTooltip')}
              >
                🤖 {t('toolbox:dictionary.aiGenerated')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-stone-600 mt-2">
            <span className="capitalize">
              {t(`toolbox:dictionary.types.${termEntry.type}`)}
            </span>
            {termEntry.quality_score && (
              <span
                className={`font-medium ${getQualityColor(qualityPercentage)}`}
              >
                {t('toolbox:dictionary.qualityScore')}: {qualityPercentage}%
              </span>
            )}
            {termEntry.source_lang &&
              termEntry.source_lang !== termEntry.lang && (
                <span className="text-stone-500">
                  {t('toolbox:dictionary.originalLanguage', {
                    lang: getLanguageName(termEntry.source_lang),
                  })}
                </span>
              )}
          </div>
        </div>

        {/* Pronunciation audio button */}
        {termEntry.definition?.pronunciation?.audio_url && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const audio = new Audio(
                termEntry.definition?.pronunciation?.audio_url
              )
              audio.play().catch(console.error)
            }}
            aria-label={t('toolbox:dictionary.playPronunciation')}
          >
            <Volume2 className="w-4 h-4 mr-1" />
            {t('toolbox:dictionary.hear')}
          </Button>
        )}
      </div>

      {/* Definition section */}
      <div className="space-y-4">
        {/* Concise definition */}
        {termEntry.definition?.concise ? (
          <div>
            <p className="text-lg text-stone-700">
              {sanitizeOutput(termEntry.definition.concise)}
            </p>
          </div>
        ) : (
          <p className="text-stone-500 italic">
            {t('toolbox:dictionary.definitionGenerating')}
          </p>
        )}

        {/* Pronunciation */}
        {termEntry.definition?.pronunciation?.ipa && (
          <div className="text-sm text-stone-600">
            <span className="font-medium">
              {t('toolbox:dictionary.pronunciation')}:
            </span>{' '}
            <span className="font-inter">
              {sanitizeOutput(termEntry.definition.pronunciation.ipa)}
            </span>
          </div>
        )}

        {/* Etymology */}
        {termEntry.definition?.etymology && (
          <div className="text-sm text-stone-600">
            <span className="font-medium">
              {t('toolbox:dictionary.etymology')}:
            </span>{' '}
            {sanitizeOutput(termEntry.definition.etymology)}
          </div>
        )}

        {/* Detailed definition */}
        {termEntry.definition?.detailed && (
          <div className="mt-4">
            <div className="mt-2 text-stone-700 space-y-2">
              <p>{sanitizeOutput(termEntry.definition.detailed)}</p>

              {/* Usage example */}
              {termEntry.definition.usage_example && (
                <div className="mt-3 p-3 bg-stone-50 rounded-md">
                  <p className="text-sm font-medium text-stone-600 mb-1">
                    {t('toolbox:dictionary.example')}:
                  </p>
                  <p className="italic">
                    {sanitizeOutput(termEntry.definition.usage_example)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Metadata */}
      {termEntry.metadata && (
        <div className="mt-6 pt-6 border-t border-stone-200">
          <div className="flex flex-wrap gap-2">
            {termEntry.metadata.difficulty_level && (
              <span className="px-3 py-1 bg-stone-100 rounded-full text-sm">
                {t(
                  `toolbox:dictionary.difficulty.${termEntry.metadata.difficulty_level}`
                )}
              </span>
            )}
            {termEntry.metadata.instruments?.map(instrument => (
              <span
                key={instrument}
                className="px-3 py-1 bg-sage-100 rounded-full text-sm"
              >
                {sanitizeOutput(instrument)}
              </span>
            ))}
            {termEntry.metadata.cultural_origin && (
              <span className="px-3 py-1 bg-peach-100 rounded-full text-sm">
                {sanitizeOutput(termEntry.metadata.cultural_origin)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Back to Dictionary button */}
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4 text-morandi-stone-600 hover:text-morandi-stone-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t('toolbox:dictionary.backToDictionary')}
        </Button>
      )}
      {/* Language selection badges */}
      {languageVersions &&
        Object.keys(languageVersions.languages).length > 1 && (
          <div className="bg-white rounded-lg p-4 border-l-4 border-morandi-rose-300">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-stone-700">
                {t('toolbox:dictionary.availableInLanguages')}
              </h3>
              {selectedLanguages.size > 1 && (
                <span className="text-xs text-sage-600">
                  {t('toolbox:dictionary.compareLanguages')}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableLanguages.map(lang => {
                const hasVersion =
                  !!languageVersions.languages[lang] || lang === entry.lang
                const isSelected = selectedLanguages.has(lang)
                const isPrimary = lang === entry.lang
                const isCurrent = lang === currentLanguage

                if (!hasVersion) return null

                return (
                  <Button
                    key={lang}
                    variant={isSelected ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => toggleLanguage(lang)}
                    disabled={isPrimary || loadingLanguages}
                    className={`
                    ${isPrimary ? 'opacity-100 cursor-default' : 'cursor-pointer'}
                    ${isCurrent && !isPrimary ? 'ring-2 ring-sage-400' : ''}
                  `}
                  >
                    {getLanguageName(lang)}
                    {isPrimary && ' ✓'}
                    {isCurrent && !isPrimary && ' ★'}
                  </Button>
                )
              })}
            </div>
          </div>
        )}

      {/* Main term display */}
      {renderTermEntry(entry)}

      {/* Additional language versions */}
      {selectedLanguages.size > 1 && (
        <div className="space-y-4">
          {Array.from(selectedLanguages)
            .filter(lang => lang !== entry.lang)
            .map(lang => {
              const langEntry = additionalEntries[lang]
              if (!langEntry) {
                return (
                  <div
                    key={lang}
                    className="bg-white rounded-lg p-4 border-l-4 border-morandi-stone-300"
                  >
                    <div className="text-center py-8 text-stone-500">
                      {t('toolbox:dictionary.fetchingInLanguage', {
                        lang: getLanguageName(lang),
                      })}
                    </div>
                  </div>
                )
              }
              return renderTermEntry(langEntry, true)
            })}
        </div>
      )}

      {/* References section */}
      {entry.references && (
        <div className="bg-white rounded-lg p-6 border-l-4 border-morandi-peach-300">
          <h2 className="text-xl font-semibold mb-4 text-stone-800">
            {t('toolbox:dictionary.learnMore')}
          </h2>
          <DictionaryReferences
            references={entry.references}
            term={entry.term}
          />
        </div>
      )}

      {/* Related terms */}
      {entry.metadata?.related_terms &&
        entry.metadata.related_terms.length > 0 && (
          <div className="bg-white rounded-lg p-6 border-l-4 border-morandi-peach-300">
            <h2 className="text-xl font-semibold mb-4 text-stone-800">
              {t('toolbox:dictionary.relatedTerms')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {entry.metadata.related_terms.map(term => (
                <Button
                  key={term}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // This would typically trigger a new search
                    // The parent component should handle this
                    window.location.hash = `#search=${encodeURIComponent(term)}`
                  }}
                >
                  {sanitizeOutput(term)}
                </Button>
              ))}
            </div>
          </div>
        )}

      {/* Feedback section */}
      <div className="bg-white rounded-lg p-4 border-l-4 border-morandi-rose-300">
        {!feedbackSent ? (
          <div>
            <p className="text-stone-700 mb-3">
              {t('toolbox:dictionary.wasHelpful')}
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleFeedback(true)}
              >
                👍 {t('toolbox:dictionary.helpful')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleFeedback(false)}
              >
                👎 {t('toolbox:dictionary.notHelpful')}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-green-600 font-medium">
            ✓ {t('toolbox:dictionary.thanksFeedback')}
          </p>
        )}
      </div>
    </div>
  )
}

export default DictionaryTerm
