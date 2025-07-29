import { create } from 'zustand'
import { authApi, type User } from '../api/auth'
import { useLogbookStore } from './logbookStore'
import { userApi } from '../api/user'

// Type for repertoire store to avoid circular imports
interface RepertoireStoreType {
  repertoire: Map<string, unknown>
  goals: Map<string, unknown>
  scoreMetadataCache: Map<string, unknown>
  syncLocalData: () => Promise<void>
}

// Safe dynamic import helper to avoid circular dependency issues
const getRepertoireStore = async (): Promise<RepertoireStoreType | null> => {
  try {
    const storeModule = await Promise.race([
      import('./repertoireStore'),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Repertoire store import timeout')),
          3000
        )
      ),
    ])

    const repertoireStore = (
      storeModule as {
        useRepertoireStore?: { getState: () => RepertoireStoreType }
      }
    ).useRepertoireStore?.getState()

    if (!repertoireStore) {
      console.warn('Repertoire store not initialized after import')
      return null
    }
    return repertoireStore
  } catch (error) {
    console.warn('Failed to import repertoire store:', error)
    return null
  }
}

// Helper function to backup all user data before auth transitions
const backupUserDataBeforeAuth = async (): Promise<boolean> => {
  let backupSuccess = true

  try {
    // Backup logbook data
    const logbookStore = useLogbookStore.getState()
    if (logbookStore) {
      const { entriesMap, goalsMap, scoreMetadata } = logbookStore

      if (entriesMap && entriesMap.size > 0) {
        const entries = Array.from(entriesMap.values())
        localStorage.setItem(
          'mirubato:logbook:entries:backup',
          JSON.stringify(entries)
        )
        localStorage.setItem(
          'mirubato:logbook:entries',
          JSON.stringify(entries)
        )
      }

      if (goalsMap && goalsMap.size > 0) {
        const goals = Array.from(goalsMap.values())
        localStorage.setItem(
          'mirubato:logbook:goals:backup',
          JSON.stringify(goals)
        )
        localStorage.setItem('mirubato:logbook:goals', JSON.stringify(goals))
      }

      if (scoreMetadata && Object.keys(scoreMetadata).length > 0) {
        localStorage.setItem(
          'mirubato:logbook:scoreMetadata:backup',
          JSON.stringify(scoreMetadata)
        )
        localStorage.setItem(
          'mirubato:logbook:scoreMetadata',
          JSON.stringify(scoreMetadata)
        )
      }
    }

    // Backup repertoire data
    try {
      const repertoireStore = await getRepertoireStore()

      if (repertoireStore) {
        const {
          repertoire,
          goals: repertoireGoals,
          scoreMetadataCache,
        } = repertoireStore

        if (repertoire && repertoire.size > 0) {
          const repertoireItems = Array.from(repertoire.values())
          localStorage.setItem(
            'mirubato:repertoire:items:backup',
            JSON.stringify(repertoireItems)
          )
          localStorage.setItem(
            'mirubato:repertoire:items',
            JSON.stringify(repertoireItems)
          )
        }

        if (repertoireGoals && repertoireGoals.size > 0) {
          const repertoireGoalsArray = Array.from(repertoireGoals.values())
          localStorage.setItem(
            'mirubato:repertoire:goals:backup',
            JSON.stringify(repertoireGoalsArray)
          )
          localStorage.setItem(
            'mirubato:repertoire:goals',
            JSON.stringify(repertoireGoalsArray)
          )
        }

        if (scoreMetadataCache && scoreMetadataCache.size > 0) {
          const scoreMetadataArray = Array.from(scoreMetadataCache.values())
          localStorage.setItem(
            'mirubato:repertoire:scoreMetadata:backup',
            JSON.stringify(scoreMetadataArray)
          )
          localStorage.setItem(
            'mirubato:repertoire:scoreMetadata',
            JSON.stringify(scoreMetadataArray)
          )
        }
      }
    } catch (error) {
      console.warn('Could not backup repertoire data:', error)
      backupSuccess = false
    }

    console.log(
      'User data backup completed',
      backupSuccess ? 'successfully' : 'with warnings'
    )
    return backupSuccess
  } catch (error) {
    console.error('Failed to backup user data before auth:', error)
    return false
  }
}

// Helper function to restore data from backup if auth fails
const restoreUserDataFromBackup = (): boolean => {
  try {
    // Restore logbook data
    const logbookEntriesBackup = localStorage.getItem(
      'mirubato:logbook:entries:backup'
    )
    if (logbookEntriesBackup) {
      localStorage.setItem('mirubato:logbook:entries', logbookEntriesBackup)
    }

    const logbookGoalsBackup = localStorage.getItem(
      'mirubato:logbook:goals:backup'
    )
    if (logbookGoalsBackup) {
      localStorage.setItem('mirubato:logbook:goals', logbookGoalsBackup)
    }

    const logbookMetadataBackup = localStorage.getItem(
      'mirubato:logbook:scoreMetadata:backup'
    )
    if (logbookMetadataBackup) {
      localStorage.setItem(
        'mirubato:logbook:scoreMetadata',
        logbookMetadataBackup
      )
    }

    // Restore repertoire data
    const repertoireItemsBackup = localStorage.getItem(
      'mirubato:repertoire:items:backup'
    )
    if (repertoireItemsBackup) {
      localStorage.setItem('mirubato:repertoire:items', repertoireItemsBackup)
    }

    const repertoireGoalsBackup = localStorage.getItem(
      'mirubato:repertoire:goals:backup'
    )
    if (repertoireGoalsBackup) {
      localStorage.setItem('mirubato:repertoire:goals', repertoireGoalsBackup)
    }

    const repertoireMetadataBackup = localStorage.getItem(
      'mirubato:repertoire:scoreMetadata:backup'
    )
    if (repertoireMetadataBackup) {
      localStorage.setItem(
        'mirubato:repertoire:scoreMetadata',
        repertoireMetadataBackup
      )
    }

    console.log('User data restored from backup successfully')
    return true
  } catch (error) {
    console.error('Failed to restore user data from backup:', error)
    return false
  }
}

// Helper function to clear backups after successful auth
const clearDataBackups = (): void => {
  try {
    localStorage.removeItem('mirubato:logbook:entries:backup')
    localStorage.removeItem('mirubato:logbook:goals:backup')
    localStorage.removeItem('mirubato:logbook:scoreMetadata:backup')
    localStorage.removeItem('mirubato:repertoire:items:backup')
    localStorage.removeItem('mirubato:repertoire:goals:backup')
    localStorage.removeItem('mirubato:repertoire:scoreMetadata:backup')
    console.log('Data backups cleared after successful auth')
  } catch (error) {
    console.warn('Failed to clear data backups:', error)
  }
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isAuthInitialized: boolean // Track if auth check is complete
  error: string | null
  refreshPromise: Promise<void> | null

  // Actions
  login: (email: string) => Promise<void>
  verifyMagicLink: (token: string) => Promise<void>
  googleLogin: (credential: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  clearError: () => void
  syncUserPreferences: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isAuthInitialized: false,
  error: null,
  refreshPromise: null,

  login: async (email: string) => {
    set({ isLoading: true, error: null })
    try {
      await authApi.requestMagicLink(email)
      set({ isLoading: false })
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Failed to send magic link',
        isLoading: false,
      })
      throw error
    }
  },

  verifyMagicLink: async (token: string) => {
    set({ isLoading: true, error: null })

    // Backup user data before authentication
    console.log('Backing up user data before magic link verification...')
    await backupUserDataBeforeAuth()

    try {
      const response = await authApi.verifyMagicLink(token)
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      })

      // Set to online mode and trigger sync after successful authentication
      try {
        // Defensive store access
        const logbookStore = useLogbookStore.getState()
        if (!logbookStore) {
          throw new Error('Logbook store not initialized')
        }

        const { setLocalMode, loadEntries } = logbookStore
        if (!setLocalMode || !loadEntries) {
          throw new Error('Logbook store methods not available')
        }

        // Get repertoire store using deferred import
        const repertoireStore = await getRepertoireStore()
        if (!repertoireStore) {
          console.warn(
            'Repertoire store not available during magic link verification'
          )
        }

        setLocalMode(false) // Switch to online mode when authenticated

        // Prepare sync operations with error boundaries
        const syncOperations = [loadEntries()]

        if (repertoireStore?.syncLocalData) {
          syncOperations.push(
            repertoireStore.syncLocalData().catch((error: unknown) => {
              console.warn('Initial repertoire sync failed:', error)
              // Don't throw - continue with other operations
            })
          )
        }

        const authStore = useAuthStore.getState()
        if (authStore?.syncUserPreferences) {
          syncOperations.push(
            authStore.syncUserPreferences().catch((error: unknown) => {
              console.warn('Initial preferences sync failed:', error)
              // Don't throw - continue with other operations
            })
          )
        }

        // Execute all sync operations
        await Promise.allSettled(syncOperations)

        // Clear backups after successful auth and sync
        clearDataBackups()
      } catch (syncError) {
        console.error(
          'Store sync error after magic link verification:',
          syncError
        )
        // Continue - login was successful even if sync failed
      }
    } catch (error: unknown) {
      const err = error as Error & { response?: { data?: { error?: string } } }
      set({
        error: err.response?.data?.error || 'Invalid or expired token',
        isLoading: false,
      })

      // Restore data from backup if auth failed
      console.log(
        'Restoring user data from backup after magic link verification failure...'
      )
      restoreUserDataFromBackup()

      throw error
    }
  },

  googleLogin: async (credential: string) => {
    set({ isLoading: true, error: null })

    // Backup user data before authentication
    console.log('Backing up user data before Google login...')
    await backupUserDataBeforeAuth()

    try {
      const response = await authApi.googleLogin(credential)
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      })

      // Set to online mode and sync logbook after successful Google login
      try {
        // Defensive store access with proper error handling
        const logbookStore = useLogbookStore.getState()
        if (!logbookStore) {
          throw new Error('Logbook store not initialized')
        }

        const { loadEntries, setLocalMode } = logbookStore
        if (!loadEntries || !setLocalMode) {
          throw new Error('Logbook store methods not available')
        }

        // Get repertoire store using deferred import
        const repertoireStore = await getRepertoireStore()
        if (!repertoireStore) {
          console.warn('Repertoire store not available during Google login')
        }

        setLocalMode(false) // Switch to online mode when authenticated

        // Prepare sync operations with proper error boundaries
        const syncOperations = [loadEntries()]

        if (repertoireStore?.syncLocalData) {
          syncOperations.push(
            repertoireStore.syncLocalData().catch((error: unknown) => {
              console.warn('Repertoire sync failed during login:', error)
              // Don't throw - continue with other operations
            })
          )
        }

        const authStore = useAuthStore.getState()
        if (authStore?.syncUserPreferences) {
          syncOperations.push(
            authStore.syncUserPreferences().catch((error: unknown) => {
              console.warn('User preferences sync failed during login:', error)
              // Don't throw - continue with other operations
            })
          )
        }

        // Execute all sync operations
        await Promise.allSettled(syncOperations)

        // Clear backups after successful auth and sync
        clearDataBackups()
      } catch (syncError) {
        console.error('Store sync error after Google login:', syncError)
        // Continue - login was successful even if sync failed
        // The user is now authenticated, but sync failed - they can retry manually
        // Don't clear backups yet in case sync failed due to data corruption
      }
    } catch (error: unknown) {
      let errorMessage = 'Google login failed'
      const err = error as Error & {
        response?: { status?: number; data?: { error?: string } }
        message?: string
      }

      // Handle specific error cases
      if (err.response?.status === 401) {
        errorMessage = 'Invalid Google credentials. Please try again.'
      } else if (err.response?.status === 403) {
        errorMessage =
          'Access denied. Please check your Google account permissions.'
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.'
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.message) {
        errorMessage = err.message
      }

      set({
        error: errorMessage,
        isLoading: false,
      })

      // Restore data from backup if auth failed
      console.log(
        'Restoring user data from backup after Google login failure...'
      )
      restoreUserDataFromBackup()

      throw error
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      // Save current logbook data to localStorage before logout
      try {
        const logbookStore = useLogbookStore.getState()
        if (!logbookStore) {
          console.warn('Logbook store not available during logout')
        } else {
          const { entriesMap, goalsMap, scoreMetadata } = logbookStore

          if (entriesMap && entriesMap.size > 0) {
            const entries = Array.from(entriesMap.values())
            localStorage.setItem(
              'mirubato:logbook:entries',
              JSON.stringify(entries)
            )
          }

          if (goalsMap && goalsMap.size > 0) {
            const goals = Array.from(goalsMap.values())
            localStorage.setItem(
              'mirubato:logbook:goals',
              JSON.stringify(goals)
            )
          }

          // Also save score metadata if present
          if (scoreMetadata && Object.keys(scoreMetadata).length > 0) {
            localStorage.setItem(
              'mirubato:logbook:scoreMetadata',
              JSON.stringify(scoreMetadata)
            )
          }
        }
      } catch (error) {
        console.warn('Could not save logbook data before logout:', error)
      }

      // Save repertoire data before logout with improved error handling
      try {
        const repertoireStore = await getRepertoireStore()

        if (!repertoireStore) {
          console.warn('Repertoire store not available during logout')
        } else {
          const {
            repertoire,
            goals: repertoireGoals,
            scoreMetadataCache,
          } = repertoireStore

          if (repertoire && repertoire.size > 0) {
            const repertoireItems = Array.from(repertoire.values())
            localStorage.setItem(
              'mirubato:repertoire:items',
              JSON.stringify(repertoireItems)
            )
          }

          if (repertoireGoals && repertoireGoals.size > 0) {
            const repertoireGoalsArray = Array.from(repertoireGoals.values())
            localStorage.setItem(
              'mirubato:repertoire:goals',
              JSON.stringify(repertoireGoalsArray)
            )
          }

          if (scoreMetadataCache && scoreMetadataCache.size > 0) {
            const scoreMetadataArray = Array.from(scoreMetadataCache.values())
            localStorage.setItem(
              'mirubato:repertoire:scoreMetadata',
              JSON.stringify(scoreMetadataArray)
            )
          }
        }
      } catch (error) {
        console.warn('Could not save repertoire data before logout:', error)
      }

      await authApi.logout()
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isAuthInitialized: true,
        error: null,
      })

      // Set back to local mode after logout
      try {
        const logbookStore = useLogbookStore.getState()
        if (!logbookStore) {
          console.warn('Logbook store not available after logout')
        } else {
          const { setLocalMode } = logbookStore
          if (setLocalMode) {
            setLocalMode(true)
          } else {
            console.warn('setLocalMode method not available after logout')
          }
        }
      } catch (error) {
        console.warn('Could not set local mode after logout:', error)
      }
    }
  },

  refreshAuth: async () => {
    // If there's already a refresh in progress, return the existing promise
    const existingPromise = get().refreshPromise
    if (existingPromise) {
      return existingPromise
    }

    const token = localStorage.getItem('auth-token')
    if (!token) {
      set({ isAuthenticated: false, user: null, isAuthInitialized: true })
      return
    }

    // Create a new refresh promise
    const refreshPromise = (async () => {
      set({ isLoading: true })
      try {
        const user = await authApi.getCurrentUser()
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isAuthInitialized: true,
          refreshPromise: null,
        })

        // Set to online mode when authenticated
        try {
          // Defensive store access
          const logbookStore = useLogbookStore.getState()
          if (!logbookStore) {
            throw new Error('Logbook store not initialized')
          }

          const { setLocalMode, loadEntries } = logbookStore
          if (!setLocalMode || !loadEntries) {
            throw new Error('Logbook store methods not available')
          }

          // Get repertoire store using deferred import
          const repertoireStore = await getRepertoireStore()
          if (!repertoireStore) {
            console.warn('Repertoire store not available during refresh auth')
          }

          setLocalMode(false)

          // Prepare sync operations with error boundaries
          const syncOperations = [loadEntries()]

          if (repertoireStore?.syncLocalData) {
            syncOperations.push(
              repertoireStore.syncLocalData().catch((error: unknown) => {
                console.warn('Background repertoire sync failed:', error)
                // Don't throw - continue with other operations
              })
            )
          }

          const authStore = useAuthStore.getState()
          if (authStore?.syncUserPreferences) {
            syncOperations.push(
              authStore.syncUserPreferences().catch((error: unknown) => {
                console.warn('Background preferences sync failed:', error)
                // Don't throw - continue with other operations
              })
            )
          }

          // Execute all sync operations
          await Promise.allSettled(syncOperations)

          // Clear any existing backups after successful auth refresh and sync
          clearDataBackups()
        } catch (syncError) {
          console.error('Store sync error after refresh auth:', syncError)
          // Continue - auth refresh was successful even if sync failed
        }
      } catch {
        // Token is invalid, clear auth state
        localStorage.removeItem('auth-token')
        localStorage.removeItem('refresh-token')
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isAuthInitialized: true,
          refreshPromise: null,
        })

        // Set back to local mode when auth fails
        try {
          const logbookStore = useLogbookStore.getState()
          if (!logbookStore) {
            console.warn('Logbook store not available when auth fails')
          } else {
            const { setLocalMode } = logbookStore
            if (setLocalMode) {
              setLocalMode(true)
            } else {
              console.warn('setLocalMode method not available when auth fails')
            }
          }
        } catch (error) {
          console.warn('Could not set local mode when auth fails:', error)
        }
      }
    })()

    set({ refreshPromise })
    return refreshPromise
  },

  clearError: () => set({ error: null }),

  syncUserPreferences: async () => {
    try {
      // Get server preferences
      const serverPreferences = await userApi.getPreferences()

      // Get local preferences
      const localStorageKey = 'mirubato:user-preferences'
      const localPreferencesStr = localStorage.getItem(localStorageKey)
      let localPreferences = {}

      if (localPreferencesStr) {
        try {
          localPreferences = JSON.parse(localPreferencesStr)
        } catch (e) {
          console.warn('Failed to parse local preferences:', e)
        }
      }

      // Merge preferences (server takes precedence)
      const mergedPreferences = {
        ...localPreferences,
        ...serverPreferences,
      }

      // Save merged preferences to localStorage
      localStorage.setItem(localStorageKey, JSON.stringify(mergedPreferences))
    } catch (error) {
      console.warn('Failed to sync user preferences:', error)
      // Don't throw - preference sync failure shouldn't break auth flow
    }
  },
}))
