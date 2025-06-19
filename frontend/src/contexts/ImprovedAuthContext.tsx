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
import {
  SYNC_ANONYMOUS_DATA,
  GET_LOGBOOK_ENTRIES,
  GET_GOALS,
} from '../graphql/queries/practice'
import { GET_CURRENT_USER } from '../graphql/queries/user'
import { createLogger } from '../utils/logger'
// import { removeUndefinedValues } from '../utils/graphqlHelpers'
import { clearAuthTokens } from '../lib/apollo/client'
import { localStorageService, LocalUserData } from '../services/localStorage'
import { useModules } from './ModulesContext'
// import { getGraphQLEndpoint } from '../utils/env'
// REMOVED: Sync imports - sync is now managed separately
import type { SyncState } from '../services/sync/types'
import type {
  LogbookEntry,
  Goal,
  PieceReference,
  GoalMilestone,
} from '../modules/logger/types'
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
    practiceLogger,
    storageModule,
  } = useModules()

  const lastLoginEventTimestamp = useRef<number>(0)
  const checkingAuthRef = useRef<boolean>(false)

  const [verifyMagicLink] = useMutation(VERIFY_MAGIC_LINK)
  const [refreshTokenMutation] = useMutation(REFRESH_TOKEN)
  const [logoutMutation] = useMutation(LOGOUT)
  const [syncAnonymousDataMutation] = useMutation(SYNC_ANONYMOUS_DATA)

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
    // Don't check for existing user - this function should always create a new anonymous user
    // This fixes the race condition during logout where user might not be fully cleared

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
          // Don't clear localStorage - preserve local-first data
          // Instead, trigger sync to merge local data with cloud
          emitLoginEvent(authenticatedUser)

          // Note: Sync will be triggered automatically by auth:login event
          // The sync logic is handled separately to avoid circular dependencies

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
    [verifyMagicLink, apolloClient, navigate, emitLoginEvent]
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

      // Clear authenticated user state first
      setUser(null)
      setLocalUserData(null)

      // Small delay to ensure React processes the state update
      await new Promise(resolve => setTimeout(resolve, 50))

      // Create new anonymous user after state is cleared
      initializeAnonymousUser()

      // Wait for the anonymous user to be created
      await new Promise(resolve => setTimeout(resolve, 100))

      eventBus.publish({
        source: 'AuthContext',
        type: 'auth:logout',
        data: { timestamp: Date.now() },
        metadata: { version: '1.0.0' },
      })

      // Don't navigate - let user stay on current page
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

  // Manual sync function - bidirectional sync between localStorage and D1
  const syncToCloud = useCallback(async () => {
    // Define types for cloud data
    interface LogbookEntryEdge {
      node: {
        id: string
        timestamp: string
        duration: number
        type: string
        instrument: string
        pieces: PieceReference[]
        techniques: string[]
        goalIds: string[]
        notes: string
        mood?: string
        tags: string[]
        metadata?: Record<string, unknown>
      }
    }

    interface GoalEdge {
      node: {
        id: string
        title: string
        description: string
        targetDate?: string
        milestones: GoalMilestone[]
      }
    }

    if (!user || user.isAnonymous) {
      logger.warn('Cannot sync: anonymous user')
      return
    }

    if (!practiceLogger) {
      logger.warn('Cannot sync: PracticeLoggerModule not initialized')
      return
    }

    try {
      setSyncState(prev => ({ ...prev, status: 'syncing', error: null }))
      logger.info('Starting bidirectional sync', { userId: user.id })

      // Step 1: Get ALL local entries that need syncing (not filtered by userId)
      // This ensures all anonymous entries are synced to the cloud
      const localEntries = await practiceLogger.getLogEntries({})
      const localGoals = await practiceLogger.getGoals({})

      // Step 2: Update anonymous entries with authenticated userId before syncing
      const updatedEntries = localEntries.map(entry => ({
        ...entry,
        userId: user.id, // Assign authenticated user's ID
      }))

      // Step 3: Sync local data to cloud (UP: local→cloud)
      if (updatedEntries.length > 0 || localGoals.length > 0) {
        logger.info('Syncing local data to cloud', {
          entries: updatedEntries.length,
          goals: localGoals.length,
        })

        const { data } = await syncAnonymousDataMutation({
          variables: {
            input: {
              sessions: [], // We don't have practice sessions in current MVP
              logs: [], // We don't have practice logs in current MVP
              entries: updatedEntries.map(entry => ({
                id: entry.id, // Include the original ID to prevent duplicates
                timestamp: new Date(entry.timestamp).toISOString(),
                duration: entry.duration,
                type: entry.type.toUpperCase(),
                instrument: entry.instrument,
                pieces: entry.pieces.map(piece => ({
                  id: piece.id,
                  title: piece.title,
                  composer: piece.composer || null,
                  measures: piece.measures || null,
                  tempo: piece.tempo || null,
                })),
                techniques: entry.techniques,
                goalIds: entry.goals || [],
                notes: entry.notes || '',
                mood: entry.mood?.toUpperCase(),
                tags: entry.tags,
                metadata: entry.metadata
                  ? {
                      source: entry.metadata.source,
                      accuracy: entry.metadata.accuracy,
                      notesPlayed: entry.metadata.notesPlayed,
                      mistakeCount: entry.metadata.mistakeCount,
                    }
                  : {
                      source: 'manual',
                    },
              })),
              goals: localGoals.map(goal => ({
                title: goal.title,
                description: goal.description || '',
                targetDate: goal.targetDate
                  ? new Date(goal.targetDate).toISOString()
                  : undefined,
                milestones: goal.milestones.map(milestone => ({
                  id: milestone.id,
                  title: milestone.title,
                  completed: milestone.completed || false,
                })),
              })),
            },
          },
        })

        if (data?.syncAnonymousData?.success) {
          logger.info(
            'Successfully synced local data to cloud',
            data.syncAnonymousData
          )

          // Update local entries with authenticated userId after successful sync
          for (const entry of updatedEntries) {
            await practiceLogger.updateLogEntry(entry.id, { userId: user.id })
          }
        } else {
          logger.error('Failed to sync local data to cloud', {
            data: data?.syncAnonymousData,
            errors: data?.syncAnonymousData?.errors,
            sampleEntry: updatedEntries[0], // Log a sample entry to see the data format
          })
          throw new Error(data?.syncAnonymousData?.errors?.[0] || 'Sync failed')
        }
      }

      // Step 4: Fetch latest cloud data (DOWN: cloud→local)
      logger.info('Fetching cloud data for bidirectional sync')

      // Query cloud data with pagination
      const BATCH_SIZE = 100
      let allCloudEntries: LogbookEntryEdge[] = []
      let allCloudGoals: GoalEdge[] = []

      // Fetch entries in batches
      let hasMoreEntries = true
      let entriesOffset = 0

      while (hasMoreEntries) {
        const { data: batchData } = await apolloClient.query({
          query: GET_LOGBOOK_ENTRIES,
          variables: { limit: BATCH_SIZE, offset: entriesOffset },
          fetchPolicy: 'network-only',
        })

        if (batchData?.myLogbookEntries?.edges?.length > 0) {
          allCloudEntries = [
            ...allCloudEntries,
            ...batchData.myLogbookEntries.edges,
          ]
          entriesOffset += BATCH_SIZE
          hasMoreEntries = batchData.myLogbookEntries.pageInfo.hasNextPage

          // Update sync progress
          const totalCount = batchData.myLogbookEntries.totalCount || 0
          setSyncState(prev => ({
            ...prev,
            pendingOperations: totalCount - entriesOffset,
          }))
        } else {
          hasMoreEntries = false
        }
      }

      // Fetch goals in batches
      let hasMoreGoals = true
      let goalsOffset = 0

      while (hasMoreGoals) {
        const { data: batchData } = await apolloClient.query({
          query: GET_GOALS,
          variables: { limit: BATCH_SIZE, offset: goalsOffset },
          fetchPolicy: 'network-only',
        })

        if (batchData?.myGoals?.edges?.length > 0) {
          allCloudGoals = [...allCloudGoals, ...batchData.myGoals.edges]
          goalsOffset += BATCH_SIZE
          hasMoreGoals = batchData.myGoals.pageInfo.hasNextPage
        } else {
          hasMoreGoals = false
        }
      }

      const cloudEntriesData = { myLogbookEntries: { edges: allCloudEntries } }
      const cloudGoalsData = { myGoals: { edges: allCloudGoals } }

      // Merge cloud data into local storage
      if (cloudEntriesData?.myLogbookEntries?.edges) {
        const cloudEntries = cloudEntriesData.myLogbookEntries.edges.map(
          (edge: LogbookEntryEdge) => edge.node
        )
        logger.info('Merging cloud entries to local', {
          count: cloudEntries.length,
        })

        for (const cloudEntry of cloudEntries) {
          // Check if entry already exists locally
          const localEntry = localEntries.find(e => e.id === cloudEntry.id)
          if (!localEntry) {
            // Add cloud entry to local storage with the same ID to prevent duplicates
            const entryForLocal: LogbookEntry = {
              id: cloudEntry.id,
              userId: user.id,
              timestamp: new Date(cloudEntry.timestamp).getTime(),
              duration: cloudEntry.duration,
              type: cloudEntry.type.toLowerCase() as LogbookEntry['type'],
              instrument: cloudEntry.instrument as Instrument,
              pieces: cloudEntry.pieces,
              techniques: cloudEntry.techniques,
              goals: cloudEntry.goalIds,
              notes: cloudEntry.notes || '',
              mood: cloudEntry.mood?.toLowerCase() as LogbookEntry['mood'],
              tags: cloudEntry.tags,
              metadata: cloudEntry.metadata,
            }

            // Use the storage module directly to preserve the cloud ID
            // This ensures we don't create duplicates
            if (storageModule) {
              await storageModule.saveLocal(
                `logbook:${cloudEntry.id}`,
                entryForLocal
              )
            }

            // Emit event for UI updates
            eventBus.publish({
              source: 'AuthContext',
              type: 'logger:entry:created',
              data: { entry: entryForLocal },
              metadata: { userId: user.id, version: '1.0.0' },
            })
          }
        }
      }

      if (cloudGoalsData?.myGoals?.edges) {
        const cloudGoals = cloudGoalsData.myGoals.edges.map(
          (edge: GoalEdge) => edge.node
        )
        logger.info('Merging cloud goals to local', {
          count: cloudGoals.length,
        })

        for (const cloudGoal of cloudGoals) {
          // Check if goal already exists locally
          const localGoal = localGoals.find(g => g.id === cloudGoal.id)
          if (!localGoal) {
            // Add cloud goal to local storage with the same ID to prevent duplicates
            const now = Date.now()
            const goalForLocal: Goal = {
              id: cloudGoal.id,
              userId: user.id,
              title: cloudGoal.title,
              description: cloudGoal.description,
              targetDate: cloudGoal.targetDate
                ? new Date(cloudGoal.targetDate).getTime()
                : now + 30 * 24 * 60 * 60 * 1000, // Default to 30 days from now
              progress: 0,
              milestones: cloudGoal.milestones,
              status: 'active',
              linkedEntries: [],
              createdAt: now,
              updatedAt: now,
            }

            // Use the storage module directly to preserve the cloud ID
            // This ensures we don't create duplicates
            if (storageModule) {
              await storageModule.saveLocal(
                `goal:${cloudGoal.id}`,
                goalForLocal
              )
            }

            // Emit event for UI updates
            eventBus.publish({
              source: 'AuthContext',
              type: 'logger:goal:created',
              data: { goal: goalForLocal },
              metadata: { userId: user.id, version: '1.0.0' },
            })
          }
        }
      }

      setSyncState(prev => ({
        ...prev,
        status: 'idle',
        lastSync: Date.now(),
        pendingOperations: 0,
        error: null,
      }))

      logger.info('Bidirectional sync completed successfully')

      // Emit sync complete event for UI updates
      eventBus.publish({
        source: 'AuthContext',
        type: 'sync:complete',
        data: { timestamp: Date.now() },
        metadata: { userId: user.id, version: '1.0.0' },
      })
    } catch (error) {
      logger.error('Bidirectional sync failed', error)
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
  }, [
    user,
    practiceLogger,
    syncAnonymousDataMutation,
    apolloClient,
    eventBus,
    storageModule,
  ])

  const clearSyncError = useCallback(() => {
    setSyncState(prev => ({ ...prev, error: null }))
  }, [])

  const updateSyncState = useCallback((updates: Partial<SyncState>) => {
    setSyncState(prev => ({ ...prev, ...updates }))
  }, [])

  // Auto-sync on login
  useEffect(() => {
    if (!eventBus || !modulesInitialized) return

    const subscriptionId = eventBus.subscribe('auth:login', event => {
      // Only auto-sync for non-anonymous users
      const userData = (event.data as { user?: User })?.user
      if (userData && !userData.isAnonymous) {
        logger.info('Auto-triggering sync after login')
        setTimeout(() => {
          syncToCloud().catch(error => {
            logger.error('Auto-sync after login failed', error)
          })
        }, 2000) // Give UI time to update
      }
    })

    return () => {
      if (eventBus && typeof eventBus.unsubscribe === 'function') {
        eventBus.unsubscribe(subscriptionId)
      }
    }
  }, [eventBus, modulesInitialized, syncToCloud])

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
