import React, { useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useLogbookStore } from '../../stores/logbookStore'
import { AutoLoggingContext } from './context'
import type {
  PracticeSession,
  PracticeType,
  PracticeMetadata,
  AutoLoggingConfig,
  AutoLoggingContextValue,
} from './types'

const DEFAULT_CONFIG: AutoLoggingConfig = {
  enabled: true,
  minDuration: 60, // 1 minute minimum
  roundingInterval: 1, // round to nearest minute
  showSummary: true,
  defaultTags: ['auto-logged'],
  defaultInstrument: 'piano',
}

interface AutoLoggingProviderProps {
  children: React.ReactNode
  defaultConfig?: Partial<AutoLoggingConfig>
}

export const AutoLoggingProvider: React.FC<AutoLoggingProviderProps> = ({
  children,
  defaultConfig,
}) => {
  const { createEntry } = useLogbookStore()

  // Load config from localStorage or use defaults
  const [config, setConfig] = useState<AutoLoggingConfig>(() => {
    try {
      const stored = localStorage.getItem('autoLoggingConfig')
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored), ...defaultConfig }
      }
    } catch (error) {
      console.error('Failed to load auto-logging config:', error)
    }
    return { ...DEFAULT_CONFIG, ...defaultConfig }
  })

  const [currentSession, setCurrentSession] = useState<PracticeSession | null>(
    null
  )
  const [elapsedTime, setElapsedTime] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Save config to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('autoLoggingConfig', JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save auto-logging config:', error)
    }
  }, [config])

  // Update elapsed time
  useEffect(() => {
    if (currentSession && !currentSession.endTime) {
      // Set initial elapsed time immediately
      const initialElapsed = Date.now() - currentSession.startTime.getTime()
      setElapsedTime(Math.floor(initialElapsed / 1000))

      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - currentSession.startTime.getTime()
        setElapsedTime(Math.floor(elapsed / 1000))
      }, 1000)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    } else {
      setElapsedTime(0)
    }
  }, [currentSession])

  const startSession = useCallback(
    (type: PracticeType, metadata: PracticeMetadata = {}) => {
      const session: PracticeSession = {
        id: uuidv4(),
        type,
        startTime: new Date(),
        duration: 0,
        metadata: {
          instrument: config.defaultInstrument,
          tags: [...config.defaultTags],
          ...metadata,
        },
        autoLogEnabled: config.enabled,
      }

      setCurrentSession(session)
    },
    [config]
  )

  const stopSession = useCallback(async (): Promise<PracticeSession | null> => {
    if (!currentSession) return null

    const endTime = new Date()
    const duration = endTime.getTime() - currentSession.startTime.getTime()

    // Check minimum duration
    if (duration < config.minDuration * 1000) {
      setCurrentSession(null)
      return null
    }

    const completedSession: PracticeSession = {
      ...currentSession,
      endTime,
      duration,
    }

    setCurrentSession(null)
    return completedSession
  }, [currentSession, config.minDuration])

  const saveSessionToLogbook = useCallback(
    async (session: PracticeSession, userNotes?: string): Promise<void> => {
      if (!config.enabled) return

      try {
        const { duration, metadata } = session

        // Calculate rounded duration in minutes
        const durationMinutes =
          Math.ceil(duration / 60000 / config.roundingInterval) *
          config.roundingInterval

        // Build auto-generated description based on session type
        let autoDescription = ''

        switch (session.type) {
          case 'metronome':
            autoDescription = `Metronome Practice`
            if (metadata.averageTempo) {
              autoDescription += `\nAverage Tempo: ${metadata.averageTempo} BPM`
            }
            if (metadata.patterns && metadata.patterns.length > 0) {
              autoDescription += `\nPatterns: ${metadata.patterns.join(', ')}`
            }
            break

          case 'score':
            autoDescription = `Score Practice: ${metadata.scoreTitle || 'Unknown'}`
            if (metadata.scoreComposer) {
              autoDescription += ` by ${metadata.scoreComposer}`
            }
            if (metadata.pagesViewed && metadata.pagesViewed.length > 0) {
              autoDescription += `\nPages viewed: ${metadata.pagesViewed.join(', ')}`
            }
            break

          case 'counter':
            autoDescription = `Practice Counter Session`
            if (metadata.totalReps) {
              autoDescription += `\nTotal Repetitions: ${metadata.totalReps}`
            }
            if (metadata.mode) {
              autoDescription += `\nMode: ${metadata.mode}`
            }
            break

          default:
            autoDescription = metadata.title || 'Practice Session'
        }

        // Combine auto-generated description with user notes
        let finalNotes = autoDescription
        if (userNotes && userNotes.trim()) {
          finalNotes = `${autoDescription}\n\n${userNotes}`
        }

        // For score practice, use the actual score title and composer
        // For other practice types (metronome, counter), don't include as pieces
        const pieces =
          session.type === 'score' && (metadata.scoreTitle || metadata.title)
            ? [
                {
                  title: metadata.scoreTitle || metadata.title || '',
                  composer: metadata.scoreComposer || metadata.composer || '',
                },
              ]
            : []

        // Add practice type to tags for non-score sessions
        const practiceTypeTags =
          session.type !== 'score' ? [`${session.type}-practice`] : []

        await createEntry({
          timestamp: session.startTime.toISOString(),
          duration: durationMinutes,
          type: 'practice',
          instrument: metadata.instrument || config.defaultInstrument,
          pieces,
          techniques: [],
          goalIds: [],
          notes: finalNotes,
          mood: null,
          tags: [...(metadata.tags || config.defaultTags), ...practiceTypeTags],
          scoreId: metadata.scoreId,
        })
      } catch (error) {
        console.error('Failed to save practice session to logbook:', error)
        throw error
      }
    },
    [config, createEntry]
  )

  const updateSession = useCallback((updates: Partial<PracticeMetadata>) => {
    setCurrentSession(prev =>
      prev
        ? {
            ...prev,
            metadata: {
              ...prev.metadata,
              ...updates,
            },
          }
        : null
    )
  }, [])

  const cancelSession = useCallback(() => {
    setCurrentSession(null)
  }, [])

  const updateConfig = useCallback((updates: Partial<AutoLoggingConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  const value: AutoLoggingContextValue = {
    currentSession,
    startSession,
    stopSession,
    saveSessionToLogbook,
    updateSession,
    cancelSession,
    config,
    updateConfig,
    isTracking: !!currentSession && !currentSession.endTime,
    elapsedTime,
  }

  return (
    <AutoLoggingContext.Provider value={value}>
      {children}
    </AutoLoggingContext.Provider>
  )
}

export default AutoLoggingProvider
