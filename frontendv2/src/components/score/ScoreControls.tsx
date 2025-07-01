import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useScoreStore } from '../../stores/scoreStore'
import { useAuthStore } from '../../stores/authStore'
import { cn } from '../../utils/cn'
import {
  getMetronome,
  type VisualCallback,
} from '../../services/metronomeService'

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
    setMetronomeVolume,
    toggleAutoScroll,
    toggleManagement,
    currentPage,
    totalPages,
    setCurrentPage,
  } = useScoreStore()

  const [elapsedTime, setElapsedTime] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [visualPulse, setVisualPulse] = useState(false)
  const metronome = getMetronome()
  const pulseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Visual callback for metronome beats
  const visualCallback: VisualCallback = {
    onBeat: (_beatNumber, _isAccent) => {
      // Clear any existing timeout
      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current)
      }

      // Start the pulse
      setVisualPulse(true)

      // End the pulse after 100ms for a subtle flash
      pulseTimeoutRef.current = setTimeout(() => {
        setVisualPulse(false)
      }, 100)
    },
  }

  // Handle metronome state changes
  useEffect(() => {
    if (metronomeSettings.isActive) {
      metronome.start(
        {
          tempo: metronomeSettings.tempo,
          volume: metronomeSettings.volume,
          accentBeats: metronomeSettings.accentBeats,
        },
        visualCallback
      )
    } else {
      metronome.stop()
      setVisualPulse(false)
      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current)
      }
    }

    return () => {
      metronome.stop()
      setVisualPulse(false)
      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metronomeSettings.isActive])

  // Handle tempo changes while playing
  useEffect(() => {
    if (metronomeSettings.isActive) {
      metronome.setTempo(metronomeSettings.tempo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metronomeSettings.tempo])

  // Handle volume changes
  useEffect(() => {
    metronome.setVolume(metronomeSettings.volume)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metronomeSettings.volume])

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  // Page navigation handlers
  const changePage = useCallback(
    (offset: number) => {
      const newPage = currentPage + offset
      if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage)
      }
    },
    [currentPage, totalPages, setCurrentPage]
  )

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page)
      }
    },
    [totalPages, setCurrentPage]
  )

  // Mobile: Bottom center horizontal layout
  if (isMobile) {
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
              'relative p-2 rounded-full transition-all',
              metronomeSettings.isActive
                ? 'bg-morandi-sage-500 text-white'
                : 'bg-morandi-stone-200 text-morandi-stone-600 hover:bg-morandi-stone-300'
            )}
            title={t('scorebook:metronome', 'Metronome')}
          >
            {/* Subtle visual pulse overlay */}
            {metronomeSettings.isActive && (
              <div
                className={cn(
                  'absolute inset-0 rounded-full bg-white pointer-events-none',
                  'transition-opacity duration-100',
                  visualPulse ? 'opacity-20' : 'opacity-0'
                )}
              />
            )}
            <svg
              className="w-5 h-5 relative z-10"
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
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setTempo(Math.max(40, metronomeSettings.tempo - 10))
                  }
                  className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
                  title={t('scorebook:decreaseTempo10', 'Decrease tempo by 10')}
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
                      d="M18 12H6"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12H9"
                    />
                  </svg>
                </button>

                <button
                  onClick={() =>
                    setTempo(Math.max(40, metronomeSettings.tempo - 1))
                  }
                  className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
                  title={t('scorebook:decreaseTempo', 'Decrease tempo')}
                >
                  <svg
                    className="w-3 h-3"
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
                    setTempo(Math.min(240, metronomeSettings.tempo + 1))
                  }
                  className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
                  title={t('scorebook:increaseTempo', 'Increase tempo')}
                >
                  <svg
                    className="w-3 h-3"
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

                <button
                  onClick={() =>
                    setTempo(Math.min(240, metronomeSettings.tempo + 10))
                  }
                  className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
                  title={t('scorebook:increaseTempo10', 'Increase tempo by 10')}
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
                      d="M12 6v12m6-6H6"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v6m3-3H9"
                    />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-morandi-stone-300">
                <button
                  onClick={() =>
                    setMetronomeVolume(
                      Math.max(0, metronomeSettings.volume - 0.1)
                    )
                  }
                  className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
                  title={t('scorebook:decreaseVolume', 'Decrease volume')}
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
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                </button>

                <div
                  className="w-2 h-2 rounded-full bg-morandi-stone-400"
                  style={{
                    transform: `scale(${0.5 + metronomeSettings.volume * 0.5})`,
                    opacity: 0.4 + metronomeSettings.volume * 0.6,
                  }}
                />

                <button
                  onClick={() =>
                    setMetronomeVolume(
                      Math.min(1, metronomeSettings.volume + 0.1)
                    )
                  }
                  className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
                  title={t('scorebook:increaseVolume', 'Increase volume')}
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
                      d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.314M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                </button>
              </div>
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

  // Desktop: Right side vertical layout with all controls
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-morandi-stone-200">
      <div className="flex flex-col items-center gap-3">
        {/* Page Navigation Controls */}
        {totalPages > 1 && (
          <>
            <button
              onClick={() => changePage(-1)}
              disabled={currentPage <= 1}
              className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={t('scorebook:previousPage', 'Previous page')}
            >
              <svg
                className="w-4 h-4 transform rotate-90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="flex flex-col items-center gap-1 py-2">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={e => goToPage(parseInt(e.target.value) || 1)}
                className="w-12 px-1 py-1 border rounded text-center text-xs"
              />
              <span className="text-xs text-gray-600">of {totalPages}</span>
            </div>

            <button
              onClick={() => changePage(1)}
              disabled={currentPage >= totalPages}
              className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={t('scorebook:nextPage', 'Next page')}
            >
              <svg
                className="w-4 h-4 transform -rotate-90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="h-px w-full bg-morandi-stone-200" />
          </>
        )}
        {/* Practice Tracking Toggle */}
        {isAuthenticated && (
          <div className="w-full">
            <button
              onClick={() => (isRecording ? stopPractice() : startPractice())}
              className={cn(
                'w-full flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all text-sm',
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
              <span className="text-xs font-medium">
                {isRecording ? (
                  <>
                    {t('scorebook:recording', 'Recording')}
                    <div className="text-xs">{formatTime(elapsedTime)}</div>
                  </>
                ) : (
                  t('scorebook:practice', 'Practice')
                )}
              </span>
            </button>
          </div>
        )}

        <div className="h-px w-full bg-morandi-stone-200" />

        {/* Metronome Controls */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={toggleMetronome}
            className={cn(
              'relative p-3 rounded-full transition-all',
              metronomeSettings.isActive
                ? 'bg-morandi-sage-500 text-white'
                : 'bg-morandi-stone-200 text-morandi-stone-600 hover:bg-morandi-stone-300'
            )}
            title={t('scorebook:metronome', 'Metronome')}
          >
            {/* Subtle visual pulse overlay */}
            {metronomeSettings.isActive && (
              <div
                className={cn(
                  'absolute inset-0 rounded-full bg-white pointer-events-none',
                  'transition-opacity duration-100',
                  visualPulse ? 'opacity-20' : 'opacity-0'
                )}
              />
            )}
            <svg
              className="w-5 h-5 relative z-10"
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
            <div className="flex flex-col items-center gap-2 bg-morandi-stone-50 rounded-lg p-2">
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      setTempo(Math.min(240, metronomeSettings.tempo + 1))
                    }
                    className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
                    title={t('scorebook:increaseTempo', 'Increase tempo')}
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      setTempo(Math.min(240, metronomeSettings.tempo + 10))
                    }
                    className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
                    title={t(
                      'scorebook:increaseTempo10',
                      'Increase tempo by 10'
                    )}
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
                        d="M5 15l7-7 7 7"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12l4-4 4 4"
                      />
                    </svg>
                  </button>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-lg font-mono font-medium text-morandi-stone-800">
                    {metronomeSettings.tempo}
                  </span>
                  <span className="text-xs text-morandi-stone-500">BPM</span>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      setTempo(Math.max(40, metronomeSettings.tempo - 1))
                    }
                    className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
                    title={t('scorebook:decreaseTempo', 'Decrease tempo')}
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      setTempo(Math.max(40, metronomeSettings.tempo - 10))
                    }
                    className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
                    title={t(
                      'scorebook:decreaseTempo10',
                      'Decrease tempo by 10'
                    )}
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
                        d="M19 9l-7 7-7-7"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 12l-4 4-4-4"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="h-px w-full bg-morandi-stone-200" />

              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() =>
                    setMetronomeVolume(
                      Math.min(1, metronomeSettings.volume + 0.1)
                    )
                  }
                  className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
                  title={t('scorebook:increaseVolume', 'Increase volume')}
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </button>

                <div className="relative w-8 h-8 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-morandi-stone-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.314M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      opacity: metronomeSettings.volume,
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-morandi-sage-500" />
                  </div>
                </div>

                <button
                  onClick={() =>
                    setMetronomeVolume(
                      Math.max(0, metronomeSettings.volume - 0.1)
                    )
                  }
                  className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
                  title={t('scorebook:decreaseVolume', 'Decrease volume')}
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-px w-full bg-morandi-stone-200" />

        {/* Auto-scroll Toggle */}
        <button
          onClick={toggleAutoScroll}
          className={cn(
            'p-3 rounded-full transition-all',
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
          className="p-3 text-morandi-stone-600 hover:text-morandi-stone-800 rounded-full hover:bg-morandi-stone-100 transition-all"
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
    </div>
  )
}
