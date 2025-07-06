import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CounterSetup, { CounterMode } from './CounterSetup'
import CounterActive, { RepetitionData } from './CounterActive'
import CounterSummary from './CounterSummary'
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

  const handleStart = (mode: CounterMode, initialValue = 0) => {
    setSessionData({
      mode,
      initialValue,
      repetitions: [],
      totalTime: 0,
    })
    setState('active')
  }

  const handleFinish = (repetitions: RepetitionData[], totalTime: number) => {
    if (sessionData) {
      setSessionData({
        ...sessionData,
        repetitions,
        totalTime,
      })
      setState('summary')
    }
  }

  const handleSaveToLog = async () => {
    if (!sessionData) return

    const { repetitions, totalTime } = sessionData
    const totalReps = repetitions.length

    // Format the summary for the log entry
    const summary = t('counter.log_summary', {
      reps: totalReps,
      time: formatTime(totalTime),
    })

    // Create detailed breakdown
    const breakdown = repetitions
      .map(
        rep =>
          `${t('counter.summary.rep_column')} ${rep.repNumber}: ${formatDuration(rep.duration)}`
      )
      .join('\n')

    const description = `${summary}\n\n${breakdown}`

    // Calculate practice duration in minutes
    const durationMinutes = Math.ceil(totalTime / 60000)

    try {
      // Create a new logbook entry
      await createEntry({
        timestamp: new Date().toISOString(),
        duration: durationMinutes,
        type: 'PRACTICE',
        instrument: 'PIANO', // Default to piano, could be made configurable
        pieces: [
          {
            title: t('counter.practice_title'),
            composer: '',
          },
        ],
        techniques: [],
        goalIds: [],
        notes: description,
        mood: null,
        tags: ['practice-counter', `${totalReps}-reps`],
      })

      // Navigate to logbook after successful save
      navigate('/logbook')
    } catch (error) {
      console.error('Failed to save to log:', error)
      // Could show error in UI if needed
    }
  }

  const handleStartNew = () => {
    setSessionData(null)
    setState('setup')
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}m ${seconds}s`
  }

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {state === 'setup' && <CounterSetup onStart={handleStart} />}

      {state === 'active' && sessionData && (
        <CounterActive
          mode={sessionData.mode}
          initialValue={sessionData.initialValue}
          onFinish={handleFinish}
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
  )
}

export default PracticeCounter
