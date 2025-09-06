import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from './ui/Modal'
import Button from './ui/Button'
import { Play, Pause, Square, RotateCcw, ChevronDown, X } from 'lucide-react'
import { formatTime as formatTimeUtil } from '@/utils/dateUtils'
import { useGlobalTimer, formatTime } from '@/hooks/useGlobalTimer'
import { TimerSettings, TimerSettingsButton } from './timer/TimerSettings'

interface TimerEntryProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (duration: number, startTime?: Date) => void
}

export default function TimerEntry({
  isOpen,
  onClose,
  onComplete,
}: TimerEntryProps) {
  const { t } = useTranslation(['logbook', 'common'])
  const [showSettings, setShowSettings] = useState(false)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const {
    seconds,
    isRunning,
    startTime,
    wasRunningInBackground,
    start,
    pause,
    stop,
    reset,
    minimizeModal,
    closeModal,
  } = useGlobalTimer()

  // Handle modal close
  const handleClose = () => {
    if (isRunning) {
      const confirm = window.confirm(t('logbook:timer.confirmClose'))
      if (!confirm) return
    }
    closeModal()
    onClose()
  }

  // Handle stop - call the onComplete callback
  const handleStop = () => {
    stop((duration, sessionStartTime) => {
      onComplete(duration, sessionStartTime)
      // Ensure focus returns to a valid element before modal closes
      // This prevents the aria-hidden warning
      setTimeout(() => {
        const activeElement = document.activeElement as HTMLElement
        if (activeElement && activeElement.blur) {
          activeElement.blur()
        }
      }, 0)
    })
  }

  // Handle minimize
  const handleMinimize = () => {
    minimizeModal()
    onClose()
  }

  // Capture focus when modal opens and restore when it closes
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element when modal opens
      previousFocusRef.current = document.activeElement as HTMLElement
    } else {
      // Restore focus when modal closes
      closeModal()
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        setTimeout(() => {
          previousFocusRef.current?.focus()
        }, 0)
      }
    }
  }, [isOpen, closeModal])

  // Determine if timer has started (running or has accumulated time)
  const timerActive = isRunning || seconds > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('logbook:timer.title')}
      showCloseButton={false} // We'll handle close button ourselves
      isMobileOptimized
    >
      {/* Position control buttons in the modal's existing header */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-1">
        {/* Settings button - always visible */}
        <TimerSettingsButton onClick={() => setShowSettings(true)} />

        {/* Conditional buttons based on timer state */}
        {timerActive ? (
          // Timer is active: show minimize button
          <button
            onClick={handleMinimize}
            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
            title={t('logbook:timer.minimize', 'Minimize timer')}
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        ) : (
          // Timer is inactive: show close button
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded transition-colors"
            title={t('common:close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="text-center py-8">
        {/* Timer Display */}
        <div className="text-6xl md:text-7xl font-inter font-light text-stone-800 mb-2">
          {formatTime(seconds)}
        </div>

        {/* Start time display */}
        {startTime && (
          <div className="text-xs text-stone-500 mb-6">
            {t('logbook:timer.startedAt')} {formatTimeUtil(startTime)}
            {wasRunningInBackground && (
              <span className="ml-2 text-green-600">
                ✓{' '}
                {t(
                  'logbook:timer.continuedInBackground',
                  'Continued in background'
                )}
              </span>
            )}
          </div>
        )}

        {/* Control Buttons - Vertical layout for better mobile UX */}
        <div className="flex flex-col justify-center gap-3 mb-8 max-w-xs mx-auto">
          {!isRunning ? (
            <Button
              onClick={start}
              variant="primary"
              size="lg"
              className="flex items-center justify-center gap-2 w-full"
            >
              <Play className="w-5 h-5" />
              {seconds > 0
                ? t('logbook:timer.resume')
                : t('logbook:timer.start')}
            </Button>
          ) : (
            <Button
              onClick={pause}
              variant="secondary"
              size="lg"
              className="flex items-center justify-center gap-2 w-full"
            >
              <Pause className="w-5 h-5" />
              {t('logbook:timer.pause')}
            </Button>
          )}

          {seconds > 0 && (
            <>
              <Button
                onClick={handleStop}
                variant="primary"
                size="lg"
                className="flex items-center justify-center gap-2 w-full"
              >
                <Square className="w-5 h-5" />
                {t('logbook:timer.stop')}
              </Button>

              <Button
                onClick={reset}
                variant="ghost"
                size="lg"
                className="flex items-center justify-center gap-2 w-full"
              >
                <RotateCcw className="w-5 h-5" />
                {t('logbook:timer.reset')}
              </Button>
            </>
          )}
        </div>

        {/* Instructions - Mobile optimized */}
        <p className="text-sm text-stone-600 sm:hidden">
          {isRunning
            ? t('logbook:timer.runningHintMobile')
            : seconds > 0
              ? t('logbook:timer.stopHintMobile')
              : t('logbook:timer.startHintMobile')}
        </p>

        {/* Instructions - Desktop */}
        <p className="text-sm text-stone-600 hidden sm:block">
          {isRunning
            ? t('logbook:timer.runningHint')
            : seconds > 0
              ? t('logbook:timer.stopHint')
              : t('logbook:timer.startHint')}
        </p>

        {/* Hint about minimizing */}
        <p className="text-xs text-stone-500 mt-4">
          {t(
            'logbook:timer.minimizeHint',
            'You can minimize this timer to continue practicing while it runs in the background.'
          )}
        </p>
      </div>

      {/* Settings Modal */}
      <TimerSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </Modal>
  )
}
