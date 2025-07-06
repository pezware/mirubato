import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useScoreStore } from '../../stores/scoreStore'
import { useAuthStore } from '../../stores/authStore'
import { cn } from '../../utils/cn'
import {
  getMetronome,
  type VisualCallback,
} from '../../services/metronomeService'
import CollapsibleMetronome from '../metronome/CollapsibleMetronome'
import Button from '../ui/Button'
import {
  ChevronUp,
  ChevronDown,
  Clock,
  Scroll,
  MoreVertical,
} from 'lucide-react'
import {
  usePracticeTracking,
  PracticeSummaryModal,
} from '../../modules/auto-logging'

export default function ScoreControls() {
  const { t } = useTranslation(['scorebook', 'common'])
  const { isAuthenticated } = useAuthStore()
  const {
    isRecording,
    metronomeSettings,
    autoScrollEnabled,
    practiceSession,
    startPractice: originalStartPractice,
    stopPractice: originalStopPractice,
    setTempo,
    toggleMetronome,
    setMetronomeVolume,
    toggleAutoScroll,
    toggleManagement,
    currentPage,
    totalPages,
    setCurrentPage,
    currentScore,
  } = useScoreStore()

  const [elapsedTime, setElapsedTime] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [visualPulse, setVisualPulse] = useState(false)
  const [showAdvancedMetronome, setShowAdvancedMetronome] = useState(false)
  const [clickCount, setClickCount] = useState(0)
  const metronome = getMetronome()
  const pulseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Practice tracking with auto-logging
  const {
    isTracking,
    formattedTime,
    showSummary,
    pendingSession,
    start: startTracking,
    stop: stopTracking,
    update: updateTracking,
    confirmSave,
    dismissSummary,
  } = usePracticeTracking({
    type: 'score',
    metadata: currentScore
      ? {
          scoreId: currentScore.id,
          scoreTitle: currentScore.title,
          scoreComposer: currentScore.composer,
          instrument: 'PIANO', // Could be made configurable
          pagesViewed: [currentPage],
        }
      : {},
  })

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
    if (metronomeSettings.isActive && !showAdvancedMetronome) {
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
  }, [metronomeSettings.isActive, showAdvancedMetronome])

  // Handle tempo changes while playing
  useEffect(() => {
    if (metronomeSettings.isActive && !showAdvancedMetronome) {
      metronome.setTempo(metronomeSettings.tempo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metronomeSettings.tempo])

  // Handle volume changes
  useEffect(() => {
    if (!showAdvancedMetronome) {
      metronome.setVolume(metronomeSettings.volume)
    }
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

  // Update tracking when page changes
  useEffect(() => {
    if (isTracking && currentPage) {
      updateTracking({
        pagesViewed: [
          ...(pendingSession?.metadata.pagesViewed || []),
          currentPage,
        ],
      })
    }
  }, [currentPage, isTracking, updateTracking])

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

  // Handle triple-click on metronome button
  const handleMetronomeClick = () => {
    if (clickCount === 2) {
      setShowAdvancedMetronome(!showAdvancedMetronome)
      setClickCount(0)
    } else {
      toggleMetronome()
      setClickCount(clickCount + 1)
      setTimeout(() => setClickCount(0), 500)
    }
  }

  // Handle triple-click from advanced metronome
  const handleAdvancedMetronomeTripleClick = () => {
    setShowAdvancedMetronome(false)
  }

  // Wrapper functions for practice tracking with auto-logging
  const startPractice = useCallback(() => {
    originalStartPractice()
    if (!isTracking) {
      startTracking()
    }
  }, [originalStartPractice, isTracking, startTracking])

  const stopPractice = useCallback(() => {
    originalStopPractice()
    if (isTracking) {
      stopTracking()
    }
  }, [originalStopPractice, isTracking, stopTracking])

  // Mobile: Right side vertical layout with semi-transparency
  if (isMobile) {
    return (
      <>
        <div className="fixed right-4 bottom-20 flex flex-col items-center gap-2 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-morandi-stone-200/50 p-3 z-40">
          {/* Practice Tracking Toggle - Compact */}
          {isAuthenticated && (
            <Button
              onClick={() => (isRecording ? stopPractice() : startPractice())}
              variant={isRecording ? 'danger' : 'secondary'}
              size="sm"
              className="flex flex-col items-center gap-1"
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
                    {t('scorebook:recording', 'Rec')}
                    <div className="text-xs">
                      {isTracking ? formattedTime : formatTime(elapsedTime)}
                    </div>
                  </>
                ) : (
                  t('scorebook:practice', 'Practice')
                )}
              </span>
            </Button>
          )}

          {/* Metronome Controls - Vertical */}
          {!showAdvancedMetronome && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <Button
                  onClick={handleMetronomeClick}
                  variant={metronomeSettings.isActive ? 'primary' : 'secondary'}
                  size="icon-lg"
                  className="relative"
                  title={t('scorebook:metronome', 'Metronome')}
                >
                  <Clock className="w-5 h-5 relative z-10" />
                </Button>
                {/* Subtle visual pulse overlay */}
                {metronomeSettings.isActive && (
                  <div
                    className={cn(
                      'absolute inset-0 rounded-lg bg-white pointer-events-none',
                      'transition-opacity duration-100',
                      visualPulse ? 'opacity-20' : 'opacity-0'
                    )}
                  />
                )}
              </div>

              {metronomeSettings.isActive && (
                <div className="flex flex-col items-center gap-2 bg-morandi-stone-50/80 rounded-lg p-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1">
                      <Button
                        onClick={() =>
                          setTempo(Math.min(240, metronomeSettings.tempo + 1))
                        }
                        variant="ghost"
                        size="icon-sm"
                        title={t('scorebook:increaseTempo', 'Increase tempo')}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={() =>
                          setTempo(Math.min(240, metronomeSettings.tempo + 10))
                        }
                        variant="ghost"
                        size="icon-sm"
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
                      </Button>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-lg font-mono font-medium text-morandi-stone-800">
                        {metronomeSettings.tempo}
                      </span>
                      <span className="text-xs text-morandi-stone-500">
                        BPM
                      </span>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        onClick={() =>
                          setTempo(Math.max(40, metronomeSettings.tempo - 1))
                        }
                        variant="ghost"
                        size="icon-sm"
                        title={t('scorebook:decreaseTempo', 'Decrease tempo')}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={() =>
                          setTempo(Math.max(40, metronomeSettings.tempo - 10))
                        }
                        variant="ghost"
                        size="icon-sm"
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
                      </Button>
                    </div>
                  </div>

                  <div className="h-px w-full bg-morandi-stone-200" />

                  <div className="flex flex-col items-center gap-1">
                    <Button
                      onClick={() =>
                        setMetronomeVolume(
                          Math.min(1, metronomeSettings.volume + 0.1)
                        )
                      }
                      variant="ghost"
                      size="icon-sm"
                      title={t('scorebook:increaseVolume', 'Increase volume')}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>

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

                    <Button
                      onClick={() =>
                        setMetronomeVolume(
                          Math.max(0, metronomeSettings.volume - 0.1)
                        )
                      }
                      variant="ghost"
                      size="icon-sm"
                      title={t('scorebook:decreaseVolume', 'Decrease volume')}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auto-scroll Toggle */}
          <Button
            onClick={toggleAutoScroll}
            variant={autoScrollEnabled ? 'primary' : 'secondary'}
            size="icon-lg"
            title={t('scorebook:autoScroll', 'Auto-scroll')}
          >
            <Scroll className="w-5 h-5" />
          </Button>

          {/* Management Menu Toggle */}
          <Button
            onClick={toggleManagement}
            variant="ghost"
            size="icon-lg"
            title={t('scorebook:menu', 'Menu')}
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>

        {/* Show advanced metronome if enabled */}
        {showAdvancedMetronome && (
          <CollapsibleMetronome
            position="corner"
            onTripleClick={handleAdvancedMetronomeTripleClick}
          />
        )}
      </>
    )
  }

  // Desktop: Right side vertical layout with all controls
  return (
    <>
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-morandi-stone-200">
        <div className="flex flex-col items-center gap-3">
          {/* Page Navigation Controls */}
          {totalPages > 1 && (
            <>
              <Button
                onClick={() => changePage(-1)}
                disabled={currentPage <= 1}
                variant="secondary"
                size="icon-lg"
                title={t('scorebook:previousPage', 'Previous page')}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>

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

              <Button
                onClick={() => changePage(1)}
                disabled={currentPage >= totalPages}
                variant="secondary"
                size="icon-lg"
                title={t('scorebook:nextPage', 'Next page')}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>

              <div className="h-px w-full bg-morandi-stone-200" />
            </>
          )}
          {/* Practice Tracking Toggle */}
          {isAuthenticated && (
            <div className="w-full">
              <Button
                onClick={() => (isRecording ? stopPractice() : startPractice())}
                variant={isRecording ? 'danger' : 'secondary'}
                fullWidth
                className="flex flex-col items-center gap-1 py-2"
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
                      <div className="text-xs">
                        {isTracking ? formattedTime : formatTime(elapsedTime)}
                      </div>
                    </>
                  ) : (
                    t('scorebook:practice', 'Practice')
                  )}
                </span>
              </Button>
            </div>
          )}

          <div className="h-px w-full bg-morandi-stone-200" />

          {/* Metronome Controls */}
          {!showAdvancedMetronome && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <Button
                  onClick={handleMetronomeClick}
                  variant={metronomeSettings.isActive ? 'primary' : 'secondary'}
                  size="icon-lg"
                  className="relative"
                  title={t('scorebook:metronome', 'Metronome')}
                >
                  <Clock className="w-5 h-5 relative z-10" />
                </Button>
                {/* Subtle visual pulse overlay */}
                {metronomeSettings.isActive && (
                  <div
                    className={cn(
                      'absolute inset-0 rounded-lg bg-white pointer-events-none',
                      'transition-opacity duration-100',
                      visualPulse ? 'opacity-20' : 'opacity-0'
                    )}
                  />
                )}
              </div>

              {metronomeSettings.isActive && (
                <div className="flex flex-col items-center gap-2 bg-morandi-stone-50 rounded-lg p-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1">
                      <Button
                        onClick={() =>
                          setTempo(Math.min(240, metronomeSettings.tempo + 1))
                        }
                        variant="ghost"
                        size="icon-sm"
                        title={t('scorebook:increaseTempo', 'Increase tempo')}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={() =>
                          setTempo(Math.min(240, metronomeSettings.tempo + 10))
                        }
                        variant="ghost"
                        size="icon-sm"
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
                      </Button>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-lg font-mono font-medium text-morandi-stone-800">
                        {metronomeSettings.tempo}
                      </span>
                      <span className="text-xs text-morandi-stone-500">
                        BPM
                      </span>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        onClick={() =>
                          setTempo(Math.max(40, metronomeSettings.tempo - 1))
                        }
                        variant="ghost"
                        size="icon-sm"
                        title={t('scorebook:decreaseTempo', 'Decrease tempo')}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={() =>
                          setTempo(Math.max(40, metronomeSettings.tempo - 10))
                        }
                        variant="ghost"
                        size="icon-sm"
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
                      </Button>
                    </div>
                  </div>

                  <div className="h-px w-full bg-morandi-stone-200" />

                  <div className="flex flex-col items-center gap-1">
                    <Button
                      onClick={() =>
                        setMetronomeVolume(
                          Math.min(1, metronomeSettings.volume + 0.1)
                        )
                      }
                      variant="ghost"
                      size="icon-sm"
                      title={t('scorebook:increaseVolume', 'Increase volume')}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>

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

                    <Button
                      onClick={() =>
                        setMetronomeVolume(
                          Math.max(0, metronomeSettings.volume - 0.1)
                        )
                      }
                      variant="ghost"
                      size="icon-sm"
                      title={t('scorebook:decreaseVolume', 'Decrease volume')}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="h-px w-full bg-morandi-stone-200" />

          {/* Auto-scroll Toggle */}
          <Button
            onClick={toggleAutoScroll}
            variant={autoScrollEnabled ? 'primary' : 'secondary'}
            size="icon-lg"
            title={t('scorebook:autoScroll', 'Auto-scroll')}
          >
            <Scroll className="w-5 h-5" />
          </Button>

          {/* Management Menu Toggle */}
          <Button
            onClick={toggleManagement}
            variant="ghost"
            size="icon-lg"
            title={t('scorebook:menu', 'Menu')}
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Show advanced metronome if enabled */}
      {showAdvancedMetronome && (
        <CollapsibleMetronome
          position="corner"
          onTripleClick={handleAdvancedMetronomeTripleClick}
        />
      )}

      {/* Practice Summary Modal */}
      <PracticeSummaryModal
        isOpen={showSummary}
        onClose={dismissSummary}
        onSave={confirmSave}
        onDiscard={dismissSummary}
        duration={pendingSession?.duration || 0}
        metadata={pendingSession?.metadata || {}}
        title={t('common:practice.practiceSummary')}
      />
    </>
  )
}
