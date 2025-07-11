import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CounterSetup, { CounterMode } from './CounterSetup'
import CounterActive, { RepetitionData } from './CounterActive'
import CounterSummary from './CounterSummary'
import {
  usePracticeTracking,
  PracticeSummaryModal,
  useAutoLogging,
} from '../../modules/auto-logging'

type CounterState = 'setup' | 'active' | 'summary'

interface SessionData {
  mode: CounterMode
  initialValue: number
  repetitions: RepetitionData[]
  totalTime: number
}

export const PracticeCounter: React.FC = () => {
  const { t } = useTranslation('toolbox')
  const navigate = useNavigate()

  const [state, setState] = useState<CounterState>('setup')
  const [sessionData, setSessionData] = useState<SessionData | null>(null)

  // Get direct access to saveSessionToLogbook
  const { saveSessionToLogbook } = useAutoLogging()

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
    type: 'counter',
    metadata: {
      title: t('counter.practice_title'),
      instrument: 'piano', // Could be made configurable
    },
    onSessionEnd: useCallback(() => {
      // Navigate to logbook after saving
      navigate('/logbook')
    }, [navigate]),
  })

  const handleStart = (mode: CounterMode, initialValue = 0) => {
    setSessionData({
      mode,
      initialValue,
      repetitions: [],
      totalTime: 0,
    })
    setState('active')

    // Start practice tracking
    startTracking()

    // Update metadata with mode info
    updateTracking({
      mode,
      totalReps: mode === 'down' ? initialValue : undefined,
    })
  }

  const handleFinish = (repetitions: RepetitionData[], totalTime: number) => {
    if (sessionData) {
      setSessionData({
        ...sessionData,
        repetitions,
        totalTime,
      })

      // Update tracking with final data
      updateTracking({
        repetitions: repetitions.map(rep => ({
          repNumber: rep.repNumber,
          duration: rep.duration,
          timestamp: rep.timestamp,
        })),
        totalReps: repetitions.length,
      })

      // Don't stop tracking here - let the user decide via the summary screen
      setState('summary')

      // If the auto-logging modal is showing, dismiss it
      // We'll handle saving through our own summary screen
      if (showSummary) {
        dismissSummary()
      }
    }
  }

  // Handle save from CounterSummary
  const handleSaveToLog = async () => {
    if (isTracking) {
      // Stop tracking without showing modal (we're already in our summary)
      const session = await stopTracking()

      if (session) {
        // Save directly to logbook with a custom note
        const customNote = `Practice Counter Summary:\n${sessionData?.repetitions.length || 0} repetitions completed`
        await saveSessionToLogbook(session, customNote)

        // Navigate to logbook
        navigate('/logbook')
      }
    } else {
      // If not tracking (shouldn't happen), just navigate
      navigate('/logbook')
    }
  }

  const handleStartNew = () => {
    setSessionData(null)
    setState('setup')
    // Stop tracking if still active (user clicked "Start New" without saving)
    if (isTracking) {
      stopTracking()
    }
    // Dismiss any pending summary modal
    if (showSummary) {
      dismissSummary()
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm">
        {state === 'setup' && <CounterSetup onStart={handleStart} />}

        {state === 'active' && sessionData && (
          <CounterActive
            mode={sessionData.mode}
            initialValue={sessionData.initialValue}
            onFinish={handleFinish}
            practiceTime={formattedTime}
            isTracking={isTracking}
          />
        )}

        {state === 'summary' && sessionData && (
          <CounterSummary
            repetitions={sessionData.repetitions}
            totalTime={sessionData.totalTime}
            onSaveToLog={handleSaveToLog}
            onStartNew={handleStartNew}
          />
        )}
      </div>

      {/* Practice Summary Modal - Only show if we're not in our own summary state */}
      {state !== 'summary' && (
        <PracticeSummaryModal
          isOpen={showSummary}
          onClose={dismissSummary}
          onSave={confirmSave}
          onDiscard={dismissSummary}
          duration={pendingSession?.duration || 0}
          metadata={pendingSession?.metadata || {}}
          title={t('common:practice.practiceSummary')}
        />
      )}
    </>
  )
}

export default PracticeCounter
