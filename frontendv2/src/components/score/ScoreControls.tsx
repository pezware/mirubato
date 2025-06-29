import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useScoreStore } from '../../stores/scoreStore'
import { useAuthStore } from '../../stores/authStore'
import { cn } from '../../utils/cn'

export default function ScoreControls() {
  const { t } = useTranslation(['scorebook', 'common'])
  const { isAuthenticated } = useAuthStore()
  const {
    isRecording,
    metronomeSettings,
    autoScrollEnabled,
    practiceSession,
    startPractice,
    stopPractice,
    setTempo,
    toggleMetronome,
    toggleAutoScroll,
    toggleManagement,
  } = useScoreStore()

  const [elapsedTime, setElapsedTime] = useState(0)

  // Update elapsed time when recording
  useEffect(() => {
    if (!isRecording || !practiceSession) return

    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - practiceSession.startTime.getTime()) / 1000
      )
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRecording, practiceSession])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-morandi-stone-200 px-6 py-3">
      {/* Practice Tracking Toggle */}
      {isAuthenticated && (
        <button
          onClick={() => (isRecording ? stopPractice() : startPractice())}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full transition-all',
            isRecording
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-morandi-stone-100 text-morandi-stone-700 hover:bg-morandi-stone-200'
          )}
        >
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              isRecording ? 'bg-white animate-pulse' : 'bg-red-500'
            )}
          />
          <span className="text-sm font-medium">
            {isRecording ? (
              <>
                {t('scorebook:recording', 'Recording')}{' '}
                {formatTime(elapsedTime)}
              </>
            ) : (
              t('scorebook:startPractice', 'Start Practice')
            )}
          </span>
        </button>
      )}

      {/* Metronome Controls */}
      <div className="flex items-center gap-3 px-4 py-2 bg-morandi-stone-50 rounded-full">
        <button
          onClick={toggleMetronome}
          className={cn(
            'p-2 rounded-full transition-all',
            metronomeSettings.isActive
              ? 'bg-morandi-sage-500 text-white'
              : 'bg-morandi-stone-200 text-morandi-stone-600 hover:bg-morandi-stone-300'
          )}
          title={t('scorebook:metronome', 'Metronome')}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        {metronomeSettings.isActive && (
          <>
            <button
              onClick={() =>
                setTempo(Math.max(40, metronomeSettings.tempo - 10))
              }
              className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
              title={t('scorebook:decreaseTempo', 'Decrease tempo')}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              </svg>
            </button>

            <div className="flex items-center gap-1">
              <span className="text-lg font-mono font-medium text-morandi-stone-800 w-12 text-center">
                {metronomeSettings.tempo}
              </span>
              <span className="text-xs text-morandi-stone-500">BPM</span>
            </div>

            <button
              onClick={() =>
                setTempo(Math.min(240, metronomeSettings.tempo + 10))
              }
              className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
              title={t('scorebook:increaseTempo', 'Increase tempo')}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Auto-scroll Toggle */}
      <button
        onClick={toggleAutoScroll}
        className={cn(
          'p-2 rounded-full transition-all',
          autoScrollEnabled
            ? 'bg-morandi-sky-100 text-morandi-sky-700'
            : 'bg-morandi-stone-100 text-morandi-stone-600 hover:bg-morandi-stone-200'
        )}
        title={t('scorebook:autoScroll', 'Auto-scroll')}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      </button>

      {/* Management Menu Toggle */}
      <button
        onClick={toggleManagement}
        className="p-2 text-morandi-stone-600 hover:text-morandi-stone-800 rounded-full hover:bg-morandi-stone-100 transition-all"
        title={t('scorebook:menu', 'Menu')}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>
    </div>
  )
}
