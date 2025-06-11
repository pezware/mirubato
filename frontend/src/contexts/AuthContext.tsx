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
  const apolloClient = useApolloClient()
  const navigate = useNavigate()
  const { eventBus, isInitialized: modulesInitialized } = useModules()

  const [verifyMagicLink] = useMutation(VERIFY_MAGIC_LINK)
  const [refreshTokenMutation] = useMutation(REFRESH_TOKEN)
  const [logoutMutation] = useMutation(LOGOUT)
  const [syncAnonymousData] = useMutation(SYNC_ANONYMOUS_DATA)

  // Initialize user (authenticated or anonymous) on mount
  useEffect(() => {
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
            if (modulesInitialized && eventBus) {
              eventBus.publish({
                source: 'AuthContext',
                type: 'auth:login',
                data: {
                  user: authenticatedUser,
                  timestamp: Date.now(),
                  isInitialLoad: true,
                },
                metadata: {
                  userId: authenticatedUser.id,
                  version: '1.0.0',
                },
              })
              logger.info('Published auth:login event for existing session', {
                userId: authenticatedUser.id,
                hasCloudStorage: authenticatedUser.hasCloudStorage,
              })
            }
          }
        } catch (error) {
          console.error('Failed to fetch current user:', error)
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
    }

    initAuth()
  }, [apolloClient, user, eventBus, modulesInitialized])

  const login = useCallback(
    async (token: string) => {
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
              localStorageService.migrateToAuthenticatedUser(
                authenticatedUser.id,
                authenticatedUser.email
              )
              // Trigger sync to cloud after login completes
              logger.info('Migrating local data to cloud storage')
              // Use setTimeout to avoid circular dependency
              setTimeout(() => {
                syncToCloud()
              }, 1000)
            }
          } else {
            // User authenticated but no cloud storage - continue with localStorage
            logger.warn(
              'Authenticated user without cloud storage, using localStorage'
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
          if (modulesInitialized && eventBus) {
            eventBus.publish({
              source: 'AuthContext',
              type: 'auth:login',
              data: {
                user: newUser,
                timestamp: Date.now(),
              },
              metadata: {
                userId: newUser.id,
                version: '1.0.0',
              },
            })
            logger.info('Published auth:login event', {
              userId: newUser.id,
              hasCloudStorage: newUser.hasCloudStorage,
            })
          }

          navigate('/practice')
        }
      } catch (error) {
        console.error('Login failed:', error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [verifyMagicLink, navigate, localUserData, eventBus, modulesInitialized]
  )

  const logout = useCallback(async () => {
    try {
      if (!user?.isAnonymous) {
        await logoutMutation()
      }
    } catch (error) {
      console.error('Logout error:', error)
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
      console.error('Token refresh failed:', error)
      clearAuthTokens()
      setUser(null)
      navigate('/login')
      throw error
    }
  }, [refreshTokenMutation, navigate])

  const syncToCloud = useCallback(async () => {
    if (!user || user.isAnonymous) {
      // Redirect to login if anonymous
      navigate('/login')
      return
    }

    try {
      const pendingData = localStorageService.getPendingSyncData()

      // Get all unsynced data
      const allEntries = localStorageService
        .getLogbookEntries()
        .filter(entry => !entry.isSynced)
      const allGoals = localStorageService
        .getGoals()
        .filter(goal => !goal.isSynced)

      logger.info('Syncing to cloud', {
        sessionCount: pendingData.sessions.length,
        logCount: pendingData.logs.length,
        entryCount: allEntries.length,
        goalCount: allGoals.length,
      })

      // Call the sync mutation
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
            entries: allEntries.map(entry => ({
              title: entry.title,
              content: entry.content,
              category: entry.category,
              mood: entry.mood,
              energyLevel: entry.energyLevel,
              focusLevel: entry.focusLevel,
              progressRating: entry.progressRating,
              createdAt: entry.timestamp,
            })),
            goals: allGoals.map(goal => ({
              title: goal.title,
              description: goal.description,
              targetValue: goal.targetValue,
              currentValue: goal.currentValue,
              unit: goal.unit,
              deadline: goal.deadline,
              status: goal.status,
            })),
          },
        },
      })

      if (data.syncAnonymousData.success) {
        // Mark all items as synced
        const sessionIds = pendingData.sessions.map(s => s.id)
        const logIds = pendingData.logs.map(l => l.id)
        const entryIds = allEntries.map(e => e.id)
        const goalIds = allGoals.map(g => g.id)
        localStorageService.markAsSynced(sessionIds, logIds, entryIds, goalIds)

        // Update last sync time
        localStorage.setItem('lastSyncTime', new Date().toISOString())

        logger.info('Sync completed successfully', {
          syncedSessions: data.syncAnonymousData.syncedSessions,
          syncedLogs: data.syncAnonymousData.syncedLogs,
          syncedEntries: data.syncAnonymousData.syncedEntries,
          syncedGoals: data.syncAnonymousData.syncedGoals,
        })
      } else {
        logger.error('Sync failed with errors', data.syncAnonymousData.errors)
      }
    } catch (error) {
      logger.error('Sync failed', error)
      throw error
    }
  }, [user, navigate, syncAnonymousData])

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
