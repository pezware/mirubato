import React from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw } from 'lucide-react'
import { Button } from '../ui'
import { RepetitionData } from './CounterActive'

interface CounterSummaryProps {
  repetitions: RepetitionData[]
  totalTime: number
  onSaveToLog: () => void
  onStartNew: () => void
}

export const CounterSummary: React.FC<CounterSummaryProps> = ({
  repetitions,
  totalTime,
  onSaveToLog,
  onStartNew,
}) => {
  const { t } = useTranslation('toolbox')

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  const formatTotalTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
  }

  return (
    <div className="flex flex-col space-y-6 p-6 w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-morandi-stone-900 text-center">
        {t('counter.summary.title')}
      </h2>

      {/* Overall Summary */}
      <div className="grid grid-cols-2 gap-4 bg-morandi-stone-50 rounded-lg p-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-morandi-stone-900">
            {repetitions.length}
          </div>
          <div className="text-sm text-morandi-stone-600">
            {t('counter.summary.total_reps')}
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-morandi-stone-900">
            {formatTotalTime(totalTime)}
          </div>
          <div className="text-sm text-morandi-stone-600">
            {t('counter.summary.total_time')}
          </div>
        </div>
      </div>

      {/* Repetition Breakdown */}
      {repetitions.length > 0 && (
        <div className="bg-white rounded-lg border border-morandi-stone-200">
          <div className="grid grid-cols-2 gap-4 p-3 border-b border-morandi-stone-200 bg-morandi-stone-50">
            <div className="text-sm font-medium text-morandi-stone-700">
              {t('counter.summary.rep_column')}
            </div>
            <div className="text-sm font-medium text-morandi-stone-700 text-right">
              {t('counter.summary.duration_column')}
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {repetitions.map(rep => (
              <div
                key={rep.repNumber}
                className="grid grid-cols-2 gap-4 p-3 border-b border-morandi-stone-100 last:border-b-0 hover:bg-morandi-stone-50"
              >
                <div className="text-sm text-morandi-stone-700">
                  {t('counter.summary.rep_column')} {rep.repNumber}
                </div>
                <div className="text-sm text-morandi-stone-700 text-right">
                  {formatDuration(rep.duration)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={onSaveToLog}
          className="flex-1"
        >
          {t('counter.button.save_to_log')}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={onStartNew}
          className="flex-1"
          leftIcon={<RotateCcw size={20} />}
        >
          {t('counter.button.start_new')}
        </Button>
      </div>
    </div>
  )
}

export default CounterSummary
