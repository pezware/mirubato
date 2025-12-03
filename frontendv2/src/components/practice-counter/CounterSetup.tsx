import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input, cn } from '../ui'

export type CounterMode = 'up' | 'down'

interface CounterSetupProps {
  onStart: (mode: CounterMode, initialValue?: number) => void
}

export const CounterSetup: React.FC<CounterSetupProps> = ({ onStart }) => {
  const { t } = useTranslation('toolbox')
  const [mode, setMode] = React.useState<CounterMode>('up')
  const [startValue, setStartValue] = React.useState<string>('10')

  const handleStart = () => {
    if (mode === 'down') {
      const value = parseInt(startValue) || 10
      onStart(mode, Math.max(1, value))
    } else {
      onStart(mode)
    }
  }

  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      <h2 className="text-2xl font-bold text-morandi-stone-900">
        {t('counter.title')}
      </h2>

      {/* Mode Selection */}
      <div className="flex rounded-lg bg-morandi-stone-100 p-1">
        <button
          onClick={() => setMode('up')}
          className={cn(
            'px-6 py-2 rounded-md text-sm font-medium transition-colors',
            mode === 'up'
              ? 'bg-white text-morandi-stone-900 shadow-sm'
              : 'text-morandi-stone-600 hover:text-morandi-stone-900'
          )}
        >
          {t('counter.mode.up')}
        </button>
        <button
          onClick={() => setMode('down')}
          className={cn(
            'px-6 py-2 rounded-md text-sm font-medium transition-colors',
            mode === 'down'
              ? 'bg-white text-morandi-stone-900 shadow-sm'
              : 'text-morandi-stone-600 hover:text-morandi-stone-900'
          )}
        >
          {t('counter.mode.down')}
        </button>
      </div>

      {/* Initial Value Input (only for countdown) */}
      {mode === 'down' && (
        <div className="w-full max-w-xs">
          <Input
            type="number"
            value={startValue}
            onChange={e => setStartValue(e.target.value)}
            placeholder={t('counter.start_at.placeholder')}
            min="1"
            max="999"
            className="text-center text-2xl"
          />
        </div>
      )}

      {/* Start Button */}
      <Button
        variant="primary"
        size="lg"
        onClick={handleStart}
        className="w-full max-w-xs"
      >
        {t('counter.button.start')}
      </Button>
    </div>
  )
}

export default CounterSetup
