import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Button } from '@/components/ui'
import { sanitizeOutput } from '@/utils/dictionarySecurity'
import { DictionaryTermProps } from '@/types/dictionary'
import DictionaryReferences from './DictionaryReferences'
import { dictionaryAPI } from '@/api/dictionary'

/**
 * Display a dictionary term with full details and references
 */
const DictionaryTerm: React.FC<DictionaryTermProps> = ({
  entry,
  onFeedback,
  onReport,
}) => {
  const { t } = useTranslation(['toolbox'])
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  const [reportText, setReportText] = useState('')

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

  // Handle issue reporting
  const handleReport = async () => {
    if (!reportText.trim()) return

    try {
      await dictionaryAPI.reportIssue(entry.id, reportText)
      onReport?.(reportText)
      setIsReporting(false)
      setReportText('')

      // Show success message
      setFeedbackSent(true)
      setTimeout(() => setFeedbackSent(false), 3000)
    } catch (error) {
      console.error('Failed to report issue:', error)
    }
  }

  // Format quality score as percentage
  const qualityPercentage = entry.quality_score
    ? Math.round(entry.quality_score.overall * 100)
    : 0

  // Get quality color based on score
  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Main term card */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-stone-800 mb-2">
              {sanitizeOutput(entry.term)}
            </h1>
            <div className="flex items-center gap-4 text-sm text-stone-600">
              <span className="capitalize">
                {t(`toolbox:dictionary.types.${entry.type}`)}
              </span>
              {entry.quality_score && (
                <span
                  className={`font-medium ${getQualityColor(qualityPercentage)}`}
                >
                  {t('toolbox:dictionary.qualityScore')}: {qualityPercentage}%
                </span>
              )}
            </div>
          </div>

          {/* Pronunciation audio button */}
          {entry.definition?.pronunciation?.audio_url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const audio = new Audio(
                  entry.definition?.pronunciation?.audio_url
                )
                audio.play().catch(console.error)
              }}
              aria-label={t('toolbox:dictionary.playPronunciation')}
            >
              🔊 {t('toolbox:dictionary.hear')}
            </Button>
          )}
        </div>

        {/* Definition section */}
        <div className="space-y-4">
          {/* Concise definition */}
          {entry.definition?.concise ? (
            <div>
              <p className="text-lg text-stone-700">
                {sanitizeOutput(entry.definition.concise)}
              </p>
            </div>
          ) : (
            <p className="text-stone-500 italic">
              {t('toolbox:dictionary.definitionGenerating')}
            </p>
          )}

          {/* Pronunciation */}
          {entry.definition?.pronunciation?.ipa && (
            <div className="text-sm text-stone-600">
              <span className="font-medium">
                {t('toolbox:dictionary.pronunciation')}:
              </span>{' '}
              <span className="font-mono">
                {sanitizeOutput(entry.definition.pronunciation.ipa)}
              </span>
            </div>
          )}

          {/* Etymology */}
          {entry.definition?.etymology && (
            <div className="text-sm text-stone-600">
              <span className="font-medium">
                {t('toolbox:dictionary.etymology')}:
              </span>{' '}
              {sanitizeOutput(entry.definition.etymology)}
            </div>
          )}

          {/* Detailed definition */}
          {entry.definition?.detailed && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sage-600 hover:text-sage-700 font-medium">
                {t('toolbox:dictionary.readMore')}
              </summary>
              <div className="mt-2 text-stone-700 space-y-2">
                <p>{sanitizeOutput(entry.definition.detailed)}</p>

                {/* Usage example */}
                {entry.definition.usage_example && (
                  <div className="mt-3 p-3 bg-stone-50 rounded-md">
                    <p className="text-sm font-medium text-stone-600 mb-1">
                      {t('toolbox:dictionary.example')}:
                    </p>
                    <p className="italic">
                      {sanitizeOutput(entry.definition.usage_example)}
                    </p>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>

        {/* Metadata */}
        {entry.metadata && (
          <div className="mt-6 pt-6 border-t border-stone-200">
            <div className="flex flex-wrap gap-2">
              {entry.metadata.difficulty_level && (
                <span className="px-3 py-1 bg-stone-100 rounded-full text-sm">
                  {t(
                    `toolbox:dictionary.difficulty.${entry.metadata.difficulty_level}`
                  )}
                </span>
              )}
              {entry.metadata.instruments?.map(instrument => (
                <span
                  key={instrument}
                  className="px-3 py-1 bg-sage-100 rounded-full text-sm"
                >
                  {sanitizeOutput(instrument)}
                </span>
              ))}
              {entry.metadata.cultural_origin && (
                <span className="px-3 py-1 bg-peach-100 rounded-full text-sm">
                  {sanitizeOutput(entry.metadata.cultural_origin)}
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* References section */}
      {entry.references && (
        <Card>
          <h2 className="text-xl font-semibold mb-4 text-stone-800">
            {t('toolbox:dictionary.learnMore')}
          </h2>
          <DictionaryReferences
            references={entry.references}
            term={entry.term}
          />
        </Card>
      )}

      {/* Related terms */}
      {entry.metadata?.related_terms &&
        entry.metadata.related_terms.length > 0 && (
          <Card>
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
          </Card>
        )}

      {/* Feedback section */}
      <Card className="bg-stone-50">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReporting(true)}
              >
                🚩 {t('toolbox:dictionary.reportIssue')}
              </Button>
            </div>

            {/* Report form */}
            {isReporting && (
              <div className="mt-4 space-y-3">
                <textarea
                  value={reportText}
                  onChange={e => setReportText(e.target.value)}
                  placeholder={t('toolbox:dictionary.reportPlaceholder')}
                  className="w-full p-3 border border-stone-300 rounded-md resize-none"
                  rows={3}
                  maxLength={500}
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleReport}
                    disabled={!reportText.trim()}
                  >
                    {t('toolbox:dictionary.submitReport')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsReporting(false)
                      setReportText('')
                    }}
                  >
                    {t('toolbox:dictionary.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-green-600 font-medium">
            ✓ {t('toolbox:dictionary.thanksFeedback')}
          </p>
        )}
      </Card>
    </div>
  )
}

export default DictionaryTerm
