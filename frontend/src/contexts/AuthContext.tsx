import React, { createContext, useState, useEffect, useCallback } from 'react'
import { useApolloClient, useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import {
  VERIFY_MAGIC_LINK,
  REFRESH_TOKEN,
  LOGOUT,
} from '../graphql/queries/auth'
import { GET_CURRENT_USER } from '../graphql/queries/user'
import { SYNC_ANONYMOUS_DATA } from '../graphql/mutations/syncAnonymousData'
import { createLogger } from '../utils/logger'
import {
  setAuthTokens,
  clearAuthTokens,
  isAuthenticated as checkIsAuthenticated,
} from '../lib/apollo/client'
import { localStorageService, LocalUserData } from '../services/localStorage'
import { useModules } from './ModulesContext'
import type { LogbookEntry, Goal } from '../modules/logger/types'

const logger = createLogger('AuthContext')

interface User {
  id: string
  email?: string // Optional for anonymous users
  displayName: string | null
  primaryInstrument: 'PIANO' | 'GUITAR'
  isAnonymous: boolean
  hasCloudStorage: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  isAnonymous: boolean
  login: (token: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  syncToCloud: () => Promise<void>
  localUserData: LocalUserData | null
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [localUserData, setLocalUserData] = useState<LocalUserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [shouldSyncAfterLogin, setShouldSyncAfterLogin] = useState(false)
  const [lastLoginEventTimestamp, setLastLoginEventTimestamp] =
    useState<number>(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const apolloClient = useApolloClient()
  const navigate = useNavigate()
  const {
    eventBus,
    isInitialized: modulesInitialized,
    practiceLogger,
  } = useModules()

  const [verifyMagicLink] = useMutation(VERIFY_MAGIC_LINK)
  const [refreshTokenMutation] = useMutation(REFRESH_TOKEN)
  const [logoutMutation] = useMutation(LOGOUT)
  const [syncAnonymousData] = useMutation(SYNC_ANONYMOUS_DATA)

  // Helper function to emit auth:login events with deduplication
  const emitLoginEvent = useCallback(
    (user: User, isInitialLoad: boolean = false) => {
      const now = Date.now()
      // Prevent duplicate events within 1 second
      if (now - lastLoginEventTimestamp < 1000) {
        logger.info('Skipping duplicate auth:login event', {
          userId: user.id,
          timeSinceLastEvent: now - lastLoginEventTimestamp,
        })
        return
      }

      if (modulesInitialized && eventBus) {
        eventBus.publish({
          source: 'AuthContext',
          type: 'auth:login',
          data: {
            user,
            timestamp: now,
            isInitialLoad,
          },
          metadata: {
            userId: user.id,
            version: '1.0.0',
          },
        })
        setLastLoginEventTimestamp(now)
        logger.info('Published auth:login event', {
          userId: user.id,
          hasCloudStorage: user.hasCloudStorage,
          isInitialLoad,
        })
      }
    },
    [modulesInitialized, eventBus, lastLoginEventTimestamp]
  )

  const syncToCloud = useCallback(async () => {
    logger.info('syncToCloud: Starting sync process', {
      userId: user?.id,
      isAnonymous: user?.isAnonymous,
      hasCloudStorage: user?.hasCloudStorage,
    })

    // This function is now ONLY for one-time migration from anonymous to authenticated
    // It should NOT be used for ongoing sync of authenticated users
    if (!user || user.isAnonymous) {
      logger.warn(
        'syncToCloud called for anonymous user - redirecting to login'
      )
      navigate('/login')
      return
    }

    // Create timeout promise (30 seconds)
    const SYNC_TIMEOUT = 30000
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Sync operation timed out after ${SYNC_TIMEOUT / 1000} seconds`
          )
        )
      }, SYNC_TIMEOUT)
    })

    // Emit sync started event
    if (modulesInitialized && eventBus) {
      eventBus.publish({
        source: 'AuthContext',
        type: 'sync:progress',
        data: {
          stage: 'started',
          progress: 0,
          message: 'Starting data synchronization...',
        },
        metadata: {
          userId: user?.id,
          version: '1.0.0',
        },
      })
    }

    try {
      // Race between sync operation and timeout
      await Promise.race([
        (async () => {
          const pendingData = localStorageService.getPendingSyncData()

          // Emit progress for data collection
          if (modulesInitialized && eventBus) {
            eventBus.publish({
              source: 'AuthContext',
              type: 'sync:progress',
              data: {
                stage: 'collecting',
                progress: 10,
                message: 'Collecting local data...',
              },
              metadata: {
                userId: user?.id,
                version: '1.0.0',
              },
            })
          }

          // Get all unsynced data from PracticeLoggerModule
          let localEntries: LogbookEntry[] = []
          let localGoals: Goal[] = []

          if (practiceLogger) {
            // Get all entries and goals from PracticeLoggerModule
            const allEntries = await practiceLogger.getLogEntries({})
            const allGoals = await practiceLogger.getGoals({})

            // Filter for unsynced items (those without a synced flag in metadata)
            // Also check for duplicates by comparing timestamps and content
            localEntries = allEntries.filter(entry => {
              // Skip already synced entries
              if (
                entry.metadata &&
                'isSynced' in entry.metadata &&
                entry.metadata.isSynced
              ) {
                return false
              }

              // Skip potential duplicates by checking if we have similar entries
              // within a small time window (helps prevent double-sync issues)
              const potentialDuplicate = allEntries.find(
                otherEntry =>
                  otherEntry.id !== entry.id &&
                  Math.abs(otherEntry.timestamp - entry.timestamp) < 5000 && // 5 second window
                  otherEntry.duration === entry.duration &&
                  otherEntry.type === entry.type &&
                  otherEntry.userId === entry.userId &&
                  otherEntry.metadata &&
                  'isSynced' in otherEntry.metadata &&
                  otherEntry.metadata.isSynced
              )

              return !potentialDuplicate
            })

            localGoals = allGoals.filter(
              goal => !('isSynced' in goal && goal.isSynced)
            )
          }

          logger.info('syncToCloud: Data to sync', {
            sessionCount: pendingData.sessions.length,
            logCount: pendingData.logs.length,
            entryCount: localEntries.length,
            goalCount: localGoals.length,
            firstEntry: localEntries[0],
            hasUnsynced: localEntries.length > 0 || localGoals.length > 0,
          })

          // Emit progress for data preparation
          if (modulesInitialized && eventBus) {
            const totalItems =
              pendingData.sessions.length +
              pendingData.logs.length +
              localEntries.length +
              localGoals.length
            eventBus.publish({
              source: 'AuthContext',
              type: 'sync:progress',
              data: {
                stage: 'preparing',
                progress: 30,
                message: `Preparing ${totalItems} items for sync...`,
                totalItems,
              },
              metadata: {
                userId: user?.id,
                version: '1.0.0',
              },
            })
          }

          // Call the sync mutation
          logger.info('syncToCloud: Calling syncAnonymousData mutation')
          const { data } = await syncAnonymousData({
            variables: {
              input: {
                sessions: pendingData.sessions.map(session => {
                  // Calculate duration in minutes from timestamps
                  const startTime = new Date(session.startedAt).getTime()
                  const endTime = session.completedAt
                    ? new Date(session.completedAt).getTime()
                    : startTime
                  const durationMs =
                    endTime - startTime - session.pausedDuration * 1000
                  const durationMinutes = Math.round(durationMs / 60000)

                  return {
                    sheetMusicId: session.sheetMusicId,
                    tempo: undefined, // Tempo not available in LocalPracticeSession
                    instrument: session.instrument,
                    durationMinutes,
                    accuracy: session.accuracyPercentage,
                    notes: `Attempted: ${session.notesAttempted}, Correct: ${session.notesCorrect}`,
                    createdAt: session.startedAt,
                    completedAt: session.completedAt,
                  }
                }),
                logs: pendingData.logs.map(log => ({
                  sessionId: log.sessionId,
                  measureNumber: undefined, // Not available in PracticeLog
                  mistakeType: undefined, // Not available in PracticeLog
                  mistakeDetails: undefined, // Not available in PracticeLog
                  tempoAchievement: log.tempoPracticed,
                  notes: log.notes,
                  createdAt: log.createdAt,
                })),
                entries: localEntries.map(entry => ({
                  // Map from PracticeLoggerModule format to GraphQL format
                  timestamp: new Date(entry.timestamp).toISOString(), // Convert number to ISO string
                  duration: entry.duration, // Already in seconds
                  type: entry.type.toUpperCase() as
                    | 'PRACTICE'
                    | 'PERFORMANCE'
                    | 'LESSON'
                    | 'REHEARSAL',
                  instrument: entry.instrument,
                  pieces: entry.pieces.map(piece => ({
                    id:
                      piece.id ||
                      `piece_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    title: piece.title,
                    composer: piece.composer,
                    measures: piece.measures,
                    tempo: piece.tempo,
                  })),
                  techniques: entry.techniques,
                  goalIds: entry.goals, // Map 'goals' to 'goalIds'
                  notes: entry.notes,
                  mood: entry.mood?.toUpperCase() as
                    | 'FRUSTRATED'
                    | 'NEUTRAL'
                    | 'SATISFIED'
                    | 'EXCITED'
                    | undefined,
                  tags: entry.tags,
                  metadata: entry.metadata
                    ? {
                        source:
                          ((entry.metadata as Record<string, unknown>)
                            .source as string) || 'manual',
                        accuracy: (entry.metadata as Record<string, unknown>)
                          .accuracy as number | undefined,
                        notesPlayed: (entry.metadata as Record<string, unknown>)
                          .notesPlayed as number | undefined,
                        mistakeCount: (
                          entry.metadata as Record<string, unknown>
                        ).mistakeCount as number | undefined,
                      }
                    : undefined,
                })),
                goals: localGoals.map(goal => ({
                  title: goal.title,
                  description: goal.description,
                  targetDate: goal.targetDate
                    ? new Date(goal.targetDate).toISOString()
                    : undefined,
                  milestones: goal.milestones.map(milestone => ({
                    id: milestone.id,
                    title: milestone.title,
                    completed: milestone.completed,
                  })),
                })),
              },
            },
          })

          // Emit progress for sync completion
          if (modulesInitialized && eventBus) {
            eventBus.publish({
              source: 'AuthContext',
              type: 'sync:progress',
              data: {
                stage: 'syncing',
                progress: 70,
                message: 'Uploading data to cloud...',
              },
              metadata: {
                userId: user?.id,
                version: '1.0.0',
              },
            })
          }

          logger.info('syncToCloud: Mutation response', {
            success: data?.syncAnonymousData?.success,
            syncedSessions: data?.syncAnonymousData?.syncedSessions,
            syncedLogs: data?.syncAnonymousData?.syncedLogs,
            syncedEntries: data?.syncAnonymousData?.syncedEntries,
            syncedGoals: data?.syncAnonymousData?.syncedGoals,
            errors: data?.syncAnonymousData?.errors,
          })

          if (data.syncAnonymousData.success) {
            // Mark all items as synced
            const sessionIds = pendingData.sessions.map(s => s.id)
            const logIds = pendingData.logs.map(l => l.id)

            // Mark sessions and logs as synced in localStorage service
            localStorageService.markAsSynced(sessionIds, logIds)

            // Mark entries and goals as synced in PracticeLoggerModule
            if (practiceLogger) {
              // Update entries to mark as synced
              for (const entry of localEntries) {
                await practiceLogger.updateLogEntry(entry.id, {
                  metadata: { ...entry.metadata, isSynced: true },
                })
              }

              // Mark goals as synced by updating metadata
              // Note: PracticeLoggerModule doesn't have a generic updateGoal method,
              // so we'll need to handle this differently in the future
            }

            // Update last sync time
            localStorage.setItem('lastSyncTime', new Date().toISOString())

            logger.info('syncToCloud: Sync completed successfully', {
              syncedSessions: data.syncAnonymousData.syncedSessions,
              syncedLogs: data.syncAnonymousData.syncedLogs,
              syncedEntries: data.syncAnonymousData.syncedEntries,
              syncedGoals: data.syncAnonymousData.syncedGoals,
              lastSyncTime: new Date().toISOString(),
            })

            // Emit progress for completion
            if (modulesInitialized && eventBus) {
              eventBus.publish({
                source: 'AuthContext',
                type: 'sync:progress',
                data: {
                  stage: 'completed',
                  progress: 100,
                  message: 'Sync completed successfully!',
                },
                metadata: {
                  userId: user?.id,
                  version: '1.0.0',
                },
              })
            }

            // Publish sync complete event
            if (modulesInitialized && eventBus) {
              eventBus.publish({
                source: 'AuthContext',
                type: 'sync:complete',
                data: {
                  syncedItems: {
                    sessions: data.syncAnonymousData.syncedSessions,
                    logs: data.syncAnonymousData.syncedLogs,
                    entries: data.syncAnonymousData.syncedEntries,
                    goals: data.syncAnonymousData.syncedGoals,
                  },
                  timestamp: Date.now(),
                },
                metadata: {
                  userId: user?.id,
                  version: '1.0.0',
                },
              })
            }
          } else {
            logger.error('syncToCloud: Sync failed with errors', {
              errors: data.syncAnonymousData.errors,
              rawData: data,
            })

            // Emit error progress
            if (modulesInitialized && eventBus) {
              eventBus.publish({
                source: 'AuthContext',
                type: 'sync:progress',
                data: {
                  stage: 'error',
                  progress: 0,
                  message: 'Sync failed. Please try again.',
                  error: data.syncAnonymousData.errors,
                },
                metadata: {
                  userId: user?.id,
                  version: '1.0.0',
                },
              })
            }
          }
        })(), // Close the async function
        timeoutPromise,
      ])
    } catch (error) {
      logger.error('syncToCloud: Exception during sync', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        userId: user?.id,
      })

      // Check if it's a timeout error
      if (error instanceof Error && error.message.includes('timed out')) {
        // Emit timeout error
        if (modulesInitialized && eventBus) {
          eventBus.publish({
            source: 'AuthContext',
            type: 'sync:progress',
            data: {
              stage: 'timeout',
              progress: 0,
              message:
                'Sync timed out. Please check your connection and try again.',
              error: error.message,
            },
            metadata: {
              userId: user?.id,
              version: '1.0.0',
            },
          })
        }
      } else {
        // Emit general error
        if (modulesInitialized && eventBus) {
          eventBus.publish({
            source: 'AuthContext',
            type: 'sync:progress',
            data: {
              stage: 'error',
              progress: 0,
              message: 'An error occurred during sync.',
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            metadata: {
              userId: user?.id,
              version: '1.0.0',
            },
          })
        }
      }

      throw error
    }
  }, [
    user,
    navigate,
    syncAnonymousData,
    practiceLogger,
    eventBus,
    modulesInitialized,
  ])

  // Initialize user (authenticated or anonymous) on mount
  useEffect(() => {
    if (isInitialized) return // Prevent repeated initialization

    const initAuth = async () => {
      // First, check for authenticated user
      if (checkIsAuthenticated()) {
        try {
          const { data } = await apolloClient.query({
            query: GET_CURRENT_USER,
            fetchPolicy: 'network-only',
          })
          if (data?.me) {
            const authenticatedUser = {
              ...data.me,
              isAnonymous: false,
              hasCloudStorage: data.me.hasCloudStorage ?? true, // Default to true for existing users
            }
            setUser(authenticatedUser)
            // Also load local data for authenticated user
            const localData = localStorageService.getUserData()
            setLocalUserData(localData)

            // Emit auth:login event for already authenticated users on mount
            emitLoginEvent(authenticatedUser, true)
          }
        } catch (error) {
          logger.error('Failed to fetch current user:', error)
          // Token might be invalid, clear it
          clearAuthTokens()
        }
      }

      // If no authenticated user, check for anonymous user
      if (!user) {
        let localData = localStorageService.getUserData()

        // Create anonymous user if none exists
        if (!localData) {
          localData = localStorageService.createAnonymousUser()
        }

        setLocalUserData(localData)

        // Create user object from local data
        if (localData.isAnonymous) {
          setUser({
            id: localData.id,
            displayName: localData.displayName || null,
            primaryInstrument: localData.primaryInstrument,
            isAnonymous: true,
            hasCloudStorage: false, // Anonymous users don't have cloud storage
          })
        }
      }

      setLoading(false)
      setIsInitialized(true)
    }

    initAuth()
  }, [apolloClient, emitLoginEvent, isInitialized])

  // Handle sync after login
  useEffect(() => {
    if (
      shouldSyncAfterLogin &&
      user &&
      !user.isAnonymous &&
      user.hasCloudStorage
    ) {
      logger.info('useEffect: Triggering post-login sync', {
        userId: user.id,
        shouldSyncAfterLogin,
      })

      setShouldSyncAfterLogin(false)

      // Add a small delay to ensure state is settled
      setTimeout(() => {
        syncToCloud().catch(error => {
          logger.error('useEffect: Failed to sync data after login', {
            error: error instanceof Error ? error.message : error,
            userId: user.id,
          })
        })
      }, 500)
    }
  }, [shouldSyncAfterLogin, user, syncToCloud])

  const login = useCallback(
    async (token: string) => {
      logger.info('login: Starting login process with magic link')
      try {
        setLoading(true)
        const { data } = await verifyMagicLink({
          variables: { token },
        })

        if (data?.verifyMagicLink) {
          const {
            accessToken,
            refreshToken,
            user: authenticatedUser,
          } = data.verifyMagicLink

          setAuthTokens(accessToken, refreshToken)

          // Check if user has cloud storage access
          if (authenticatedUser.hasCloudStorage) {
            // Migrate anonymous user data to authenticated user
            if (localUserData?.isAnonymous) {
              logger.info('login: Migrating anonymous user data', {
                anonymousId: localUserData.id,
                authenticatedId: authenticatedUser.id,
                email: authenticatedUser.email,
              })

              localStorageService.migrateToAuthenticatedUser(
                authenticatedUser.id,
                authenticatedUser.email
              )

              // Set flag to trigger sync after state updates
              logger.info('login: Setting shouldSyncAfterLogin flag')
              setShouldSyncAfterLogin(true)
            } else {
              logger.info(
                'login: User already authenticated, no migration needed'
              )
            }
          } else {
            // User authenticated but no cloud storage - continue with localStorage
            logger.warn(
              'login: Authenticated user without cloud storage, using localStorage'
            )
          }

          const newUser = {
            ...authenticatedUser,
            isAnonymous: false,
          }
          setUser(newUser)

          // Update local user data
          const updatedLocalData = localStorageService.getUserData()
          setLocalUserData(updatedLocalData)

          // Emit auth:login event to EventBus
          emitLoginEvent(newUser, false)

          logger.info('login: Login successful', {
            userId: newUser.id,
            hasCloudStorage: newUser.hasCloudStorage,
            shouldSync: shouldSyncAfterLogin,
          })

          navigate('/practice')
        }
      } catch (error) {
        logger.error('login: Login failed', {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
        })
        throw error
      } finally {
        setLoading(false)
      }
    },
    [verifyMagicLink, navigate, localUserData, emitLoginEvent]
  )

  const logout = useCallback(async () => {
    try {
      if (!user?.isAnonymous) {
        await logoutMutation()
      }
    } catch (error) {
      logger.error('Logout error:', error)
    } finally {
      // Emit auth:logout event before clearing state
      if (modulesInitialized && eventBus && user) {
        eventBus.publish({
          source: 'AuthContext',
          type: 'auth:logout',
          data: {
            user: user,
            timestamp: Date.now(),
          },
          metadata: {
            userId: user.id,
            version: '1.0.0',
          },
        })
        logger.info('Published auth:logout event', { userId: user.id })
      }

      clearAuthTokens()

      // Create new anonymous user after logout
      const newAnonymousUser = localStorageService.createAnonymousUser()
      setLocalUserData(newAnonymousUser)
      setUser({
        id: newAnonymousUser.id,
        displayName: null,
        primaryInstrument: newAnonymousUser.primaryInstrument,
        isAnonymous: true,
        hasCloudStorage: false,
      })

      navigate('/')
    }
  }, [logoutMutation, navigate, user, eventBus, modulesInitialized])

  const refreshAuth = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh-token')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const { data } = await refreshTokenMutation({
        variables: { refreshToken },
      })

      if (data?.refreshToken) {
        const { accessToken, refreshToken: newRefreshToken } = data.refreshToken
        setAuthTokens(accessToken, newRefreshToken)
      }
    } catch (error) {
      logger.error('Token refresh failed:', error)
      clearAuthTokens()
      setUser(null)
      navigate('/login')
      throw error
    }
  }, [refreshTokenMutation, navigate])

  const value = {
    user,
    loading,
    isAuthenticated: !!user && !user.isAnonymous,
    isAnonymous: !!user?.isAnonymous,
    login,
    logout,
    refreshAuth,
    syncToCloud,
    localUserData,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
