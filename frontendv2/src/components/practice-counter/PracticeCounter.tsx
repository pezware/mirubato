import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CounterSetup, { CounterMode } from './CounterSetup'
import CounterActive, { RepetitionData } from './CounterActive'
import CounterSummary from './CounterSummary'
import {
  usePracticeTracking,
  PracticeSummaryModal,
} from '../../modules/auto-logging'
import { useLogbookStore } from '../../stores/logbookStore'

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
  const { createEntry } = useLogbookStore()

  const [state, setState] = useState<CounterState>('setup')
  const [sessionData, setSessionData] = useState<SessionData | null>(null)

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
      instrument: 'PIANO', // Could be made configurable
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
    }
  }

  // Handle save from CounterSummary
  const handleSaveToLog = async () => {
    if (isTracking) {
      // Stop tracking to get session data
      const session = await stopTracking()

      // Since auto-logging only works when authenticated, we need to manually save for non-auth users
      if (session) {
        const duration = session.endTime
          ? session.endTime.getTime() - session.startTime.getTime()
          : 0
        const durationMinutes = Math.ceil(duration / 60000)

        // Build description
        let description = `Practice Counter Session\n`
        if (session.metadata.totalReps) {
          description += `Total Repetitions: ${session.metadata.totalReps}\n`
        }
        if (session.metadata.mode) {
          description += `Mode: ${session.metadata.mode}\n`
        }

        // Create entry in logbook (works with local storage for non-auth users)
        await createEntry({
          timestamp: session.startTime.toISOString(),
          duration: durationMinutes,
          type: 'PRACTICE',
          instrument: session.metadata.instrument || 'PIANO',
          pieces: [
            {
              title: session.metadata.title || t('counter.practice_title'),
              composer: '',
            },
          ],
          techniques: [],
          goalIds: [],
          notes: description,
          mood: null,
          tags: ['practice-counter', 'auto-logged'],
        })
      }
    }

    // Navigate to logbook
    navigate('/logbook')
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

export default PracticeCounter
