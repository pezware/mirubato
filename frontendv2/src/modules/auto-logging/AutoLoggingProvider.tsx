import React, { useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useLogbookStore } from '../../stores/logbookStore'
import { useAuthStore } from '../../stores/authStore'
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
  defaultInstrument: 'PIANO',
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
  const { isAuthenticated } = useAuthStore()

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

    // Auto-log if enabled (works for both authenticated and non-authenticated users)
    if (config.enabled) {
      try {
        // Calculate rounded duration in minutes
        const durationMinutes =
          Math.ceil(duration / 60000 / config.roundingInterval) *
          config.roundingInterval

        // Build description based on session type
        let description = ''
        const { metadata } = completedSession

        switch (completedSession.type) {
          case 'metronome':
            description = `Metronome Practice\n`
            if (metadata.averageTempo) {
              description += `Average Tempo: ${metadata.averageTempo} BPM\n`
            }
            if (metadata.patterns && metadata.patterns.length > 0) {
              description += `Patterns: ${metadata.patterns.join(', ')}\n`
            }
            break

          case 'score':
            description = `Score Practice: ${metadata.scoreTitle || 'Unknown'}`
            if (metadata.scoreComposer) {
              description += ` by ${metadata.scoreComposer}`
            }
            if (metadata.pagesViewed && metadata.pagesViewed.length > 0) {
              description += `\nPages viewed: ${metadata.pagesViewed.join(', ')}`
            }
            break

          case 'counter':
            description = `Practice Counter Session\n`
            if (metadata.totalReps) {
              description += `Total Repetitions: ${metadata.totalReps}\n`
            }
            if (metadata.mode) {
              description += `Mode: ${metadata.mode}\n`
            }
            break

          default:
            description = metadata.title || 'Practice Session'
        }

        await createEntry({
          timestamp: currentSession.startTime.toISOString(),
          duration: durationMinutes,
          type: 'PRACTICE',
          instrument: metadata.instrument || config.defaultInstrument,
          pieces: [
            {
              title: metadata.title || `${completedSession.type} Practice`,
              composer: metadata.composer || '',
            },
          ],
          techniques: [],
          goalIds: [],
          notes: description,
          mood: null,
          tags: metadata.tags || config.defaultTags,
          scoreId: metadata.scoreId,
        })
      } catch (error) {
        console.error('Failed to auto-log practice session:', error)
      }
    }

    setCurrentSession(null)
    return completedSession
  }, [currentSession, config, isAuthenticated, createEntry])

  const updateSession = useCallback(
    (updates: Partial<PracticeMetadata>) => {
      if (!currentSession) return

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
    },
    [currentSession]
  )

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
