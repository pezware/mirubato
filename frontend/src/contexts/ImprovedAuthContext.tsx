import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import { useApolloClient, useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import {
  VERIFY_MAGIC_LINK,
  REFRESH_TOKEN,
  LOGOUT,
} from '../graphql/queries/auth'
import { GET_CURRENT_USER } from '../graphql/queries/user'
import { createLogger } from '../utils/logger'
// import { removeUndefinedValues } from '../utils/graphqlHelpers'
import { clearAuthTokens } from '../lib/apollo/client'
import { localStorageService, LocalUserData } from '../services/localStorage'
import { useModules } from './ModulesContext'
// import { getGraphQLEndpoint } from '../utils/env'
// REMOVED: Sync imports - sync is now managed separately
import type { SyncState } from '../services/sync/types'
// import type { LogbookEntry, Goal } from '../modules/logger/types'
import type { User as GraphQLUser } from '../generated/graphql'
import { Instrument, Theme, NotationSize } from '@mirubato/shared/types'

const logger = createLogger('ImprovedAuthContext')

// Extend GraphQL User type with local fields
export interface User
  extends Omit<
    GraphQLUser,
    | '__typename'
    | 'preferences'
    | 'stats'
    | 'createdAt'
    | 'updatedAt'
    | 'email'
    | 'hasCloudStorage'
  > {
  email?: string // Optional for anonymous users
  isAnonymous: boolean
  primaryInstrument: Instrument
  hasCloudStorage?: boolean
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  isAnonymous: boolean
  login: (token: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  syncToCloud: () => Promise<void>
  localUserData: LocalUserData | null
  syncState: SyncState
  clearSyncError: () => void
  updateSyncState: (state: Partial<SyncState>) => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export const ImprovedAuthProvider: React.FC<AuthProviderProps> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [localUserData, setLocalUserData] = useState<LocalUserData | null>(null)
  const [loading, setLoading] = useState(true)
  // Default sync state - will be updated by external sync manager
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    lastSync: null,
    pendingOperations: 0,
    error: null,
  })

  const apolloClient = useApolloClient()
  const navigate = useNavigate()
  const {
    eventBus,
    isInitialized: modulesInitialized,
    // practiceLogger,
  } = useModules()

  const lastLoginEventTimestamp = useRef<number>(0)
  const checkingAuthRef = useRef<boolean>(false)

  const [verifyMagicLink] = useMutation(VERIFY_MAGIC_LINK)
  const [refreshTokenMutation] = useMutation(REFRESH_TOKEN)
  const [logoutMutation] = useMutation(LOGOUT)

  // Check if we should use GraphQL based on environment
  // const shouldUseGraphQL =
  //   typeof window !== 'undefined' && window.location.hostname !== 'localhost'

  // REMOVED: Sync orchestrator management
  // Sync should be managed by a separate service, not by AuthContext
  // This separation of concerns prevents circular dependencies

  // Helper function to emit auth events
  const emitLoginEvent = useCallback(
    (user: User, isInitialLoad: boolean = false) => {
      const now = Date.now()
      // Increase debounce time to 3 seconds to prevent rapid re-triggers
      if (now - lastLoginEventTimestamp.current < 3000) {
        logger.info('Skipping duplicate auth:login event', {
          timeSinceLastEvent: now - lastLoginEventTimestamp.current,
          userId: user.id,
        })
        return
      }

      if (modulesInitialized && eventBus) {
        lastLoginEventTimestamp.current = now
        eventBus.publish({
          source: 'AuthContext',
          type: 'auth:login',
          data: { user, timestamp: now, isInitialLoad },
          metadata: { userId: user.id, version: '1.0.0' },
        })
      }
    },
    [eventBus, modulesInitialized]
  )

  // Initialize anonymous user
  const initializeAnonymousUser = useCallback(() => {
    // Prevent re-initialization if user already exists
    if (user) {
      return
    }

    const existingLocalData = localStorageService.getUserData()

    if (existingLocalData?.id) {
      const anonymousUser: User = {
        id: existingLocalData.id,
        isAnonymous: true,
        primaryInstrument:
          existingLocalData.primaryInstrument || Instrument.PIANO,
        hasCloudStorage: false,
      }

      setUser(anonymousUser)
      setLocalUserData(existingLocalData)
      emitLoginEvent(anonymousUser, true)
      logger.info('Restored anonymous user', { userId: anonymousUser.id })
    } else {
      const newAnonymousUser: User = {
        id: `anon_${Array.from(crypto.getRandomValues(new Uint8Array(12)))
          .map(byte => byte.toString(36))
          .join('')}`,
        isAnonymous: true,
        primaryInstrument: Instrument.PIANO,
        hasCloudStorage: false,
      }

      const newLocalData: LocalUserData = {
        id: newAnonymousUser.id,
        email: '',
        isAnonymous: true,
        hasCloudStorage: false,
        primaryInstrument: Instrument.PIANO,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: {
          theme: Theme.AUTO,
          notationSize: NotationSize.MEDIUM,
          practiceReminders: false,
          dailyGoalMinutes: 30,
        },
        stats: {
          totalPracticeTime: 0,
          consecutiveDays: 0,
          piecesCompleted: 0,
          accuracyAverage: 0,
          lastPracticeDate: null,
        },
      }

      localStorageService.setUserData(newLocalData)
      setUser(newAnonymousUser)
      setLocalUserData(newLocalData)
      emitLoginEvent(newAnonymousUser, true)
      logger.info('Created new anonymous user', { userId: newAnonymousUser.id })
    }
  }, [emitLoginEvent, user])

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (!modulesInitialized || checkingAuthRef.current) return

      checkingAuthRef.current = true

      try {
        // Try to fetch the current user (server will check cookies)
        const { data } = await apolloClient.query({
          query: GET_CURRENT_USER,
          fetchPolicy: 'network-only',
        })

        if (data?.me) {
          const authenticatedUser: User = {
            id: data.me.id,
            email: data.me.email,
            isAnonymous: false,
            primaryInstrument: data.me.primaryInstrument || Instrument.PIANO,
            hasCloudStorage: data.me.hasCloudStorage ?? true,
          }

          setUser(authenticatedUser)
          emitLoginEvent(authenticatedUser, true)

          // Sync initialization removed
          // initializeSyncOrchestrator()
          // await syncOrchestratorRef.current?.initializeSync(authenticatedUser.id)

          logger.info('Authentication restored for user')
          return // Exit early on success
        }

        // Initialize anonymous user if not authenticated or if auth check failed
        initializeAnonymousUser()
      } catch (error) {
        logger.error('Auth check failed', error)
        initializeAnonymousUser()
      } finally {
        setLoading(false)
        checkingAuthRef.current = false
      }
    }

    checkAuth()
  }, [
    modulesInitialized,
    apolloClient,
    // Remove initializeAnonymousUser and emitLoginEvent from deps to prevent loops
  ])

  // Track ongoing login to prevent duplicates
  const loginInProgressRef = useRef<string | null>(null)

  // Login function
  const login = useCallback(
    async (token: string) => {
      // Prevent duplicate login attempts with the same token
      if (loginInProgressRef.current === token) {
        logger.info('Login already in progress for this token')
        return
      }

      try {
        loginInProgressRef.current = token
        setLoading(true)
        // const previousUser = user

        const { data } = await verifyMagicLink({
          variables: { token },
        })

        if (data?.verifyMagicLink?.success) {
          const { user: authUser } = data.verifyMagicLink

          logger.info('Login successful', {
            hasUser: !!authUser,
          })

          // Cookies are set by the server, reset Apollo cache
          await apolloClient.resetStore()

          const authenticatedUser: User = {
            id: authUser.id,
            email: authUser.email,
            isAnonymous: false,
            primaryInstrument: authUser.primaryInstrument || Instrument.PIANO,
            hasCloudStorage: authUser.hasCloudStorage ?? true,
          }

          // Initialize sync orchestrator for authenticated user
          // initializeSyncOrchestrator() - removed: sync managed separately

          setUser(authenticatedUser)
          localStorageService.clearAllData()
          emitLoginEvent(authenticatedUser)

          logger.info('User logged in successfully', {
            userId: authenticatedUser.id,
          })
          navigate('/logbook')
        }
      } catch (error) {
        logger.error('Login failed', error)
        throw error
      } finally {
        setLoading(false)
        loginInProgressRef.current = null
      }
    },
    [
      verifyMagicLink,
      apolloClient,
      navigate,
      verifyMagicLink,
      apolloClient,
      navigate,
      emitLoginEvent,
      // initializeSyncOrchestrator, - removed: sync managed separately
    ]
  )

  // Logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true)

      // Final sync before logout - removed: sync managed separately
      // if (syncOrchestratorRef.current && user && !user.isAnonymous) {
      //   await syncOrchestratorRef.current.attemptFinalSync(5000)
      // }

      await logoutMutation()
      clearAuthTokens()
      await apolloClient.clearStore()

      // Dispose sync orchestrator - removed: sync managed separately
      // if (syncOrchestratorRef.current) {
      //   syncOrchestratorRef.current.dispose()
      //   syncOrchestratorRef.current = null
      // }

      // Create new anonymous user
      initializeAnonymousUser()

      eventBus.publish({
        source: 'AuthContext',
        type: 'auth:logout',
        data: { timestamp: Date.now() },
        metadata: { version: '1.0.0' },
      })

      navigate('/')
    } catch (error) {
      logger.error('Logout failed', error)
    } finally {
      setLoading(false)
    }
  }, [
    logoutMutation,
    apolloClient,
    navigate,
    initializeAnonymousUser,
    eventBus,
    user,
  ])

  // Refresh auth function
  const refreshAuth = useCallback(async () => {
    try {
      const { data } = await refreshTokenMutation()

      if (data?.refreshToken?.success) {
        const { user: refreshedUser } = data.refreshToken

        // Update user if provided
        if (refreshedUser) {
          const authenticatedUser: User = {
            id: refreshedUser.id,
            email: refreshedUser.email,
            isAnonymous: false,
            primaryInstrument:
              refreshedUser.primaryInstrument || Instrument.PIANO,
            hasCloudStorage: refreshedUser.hasCloudStorage ?? true,
          }
          setUser(authenticatedUser)
        }

        logger.info('Token refreshed successfully')
      }
    } catch (error) {
      logger.error('Token refresh failed', error)
      await logout()
    }
  }, [refreshTokenMutation, logout])

  // Set up token refresh interval
  useEffect(() => {
    if (!user || user.isAnonymous) return

    // With HTTP-only cookies, we can't check expiration client-side
    // The server will handle token refresh automatically
    // We can optionally set up a periodic refresh to keep the session alive
    const refreshInterval = setInterval(
      async () => {
        try {
          await refreshAuth()
        } catch (error) {
          logger.error('Periodic refresh failed', error)
        }
      },
      30 * 60 * 1000
    ) // Refresh every 30 minutes

    return () => clearInterval(refreshInterval)
  }, [user, refreshAuth])

  // Manual sync function - simplified without sync orchestrator
  const syncToCloud = useCallback(async () => {
    if (!user || user.isAnonymous) {
      logger.warn('Cannot sync: anonymous user')
      return
    }

    try {
      setSyncState(prev => ({ ...prev, status: 'syncing', error: null }))
      // TODO: Implement direct sync without orchestrator
      // For now, just simulate success
      setTimeout(() => {
        setSyncState(prev => ({
          ...prev,
          status: 'idle',
          lastSync: Date.now(),
          pendingOperations: 0,
          error: null,
        }))
      }, 1000)
    } catch (error) {
      logger.error('Manual sync failed', error)
      setSyncState(prev => ({
        ...prev,
        status: 'error',
        error: {
          code: 'SYNC_FAILED',
          message: (error as Error).message,
          details: error,
        },
      }))
    }
  }, [user])

  const clearSyncError = useCallback(() => {
    setSyncState(prev => ({ ...prev, error: null }))
  }, [])

  const updateSyncState = useCallback((updates: Partial<SyncState>) => {
    setSyncState(prev => ({ ...prev, ...updates }))
  }, [])

  // Clean up on unmount - sync orchestrator removed
  // useEffect(() => {
  //   return () => {
  //     if (syncOrchestratorRef.current) {
  //       syncOrchestratorRef.current.dispose()
  //     }
  //   }
  // }, [])

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user && !user.isAnonymous,
    isAnonymous: !!user?.isAnonymous,
    login,
    logout,
    refreshAuth,
    syncToCloud,
    localUserData,
    syncState,
    clearSyncError,
    updateSyncState,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const AuthProvider = ImprovedAuthProvider

export const useAuth = () => {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
