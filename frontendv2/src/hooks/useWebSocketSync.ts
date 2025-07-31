/**
 * React hook for WebSocket-based real-time sync
 */

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import {
  getWebSocketSync,
  type SyncEvent,
  type SyncEventHandler,
} from '../services/webSocketSync'

export interface UseWebSocketSyncOptions {
  autoConnect?: boolean
  enabledWhenAuthenticated?: boolean
}

export interface WebSocketSyncState {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting'
  isEnabled: boolean
  offlineQueueSize: number
  lastError: string | null
}

export function useWebSocketSync(options: UseWebSocketSyncOptions = {}) {
  const { autoConnect = true, enabledWhenAuthenticated = true } = options

  const { isAuthenticated, user } = useAuthStore()
  const webSocketSync = getWebSocketSync()

  const [syncState, setSyncState] = useState<WebSocketSyncState>({
    status: 'disconnected',
    isEnabled: false,
    offlineQueueSize: 0,
    lastError: null,
  })

  // Update sync state
  const updateSyncState = useCallback(() => {
    setSyncState(prev => ({
      ...prev,
      status: webSocketSync.getConnectionStatus(),
      offlineQueueSize: webSocketSync.getOfflineQueueSize(),
    }))
  }, [webSocketSync])

  // Connect to WebSocket
  const connect = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      setSyncState(prev => ({ ...prev, lastError: 'User not authenticated' }))
      return false
    }

    const authToken = localStorage.getItem('auth-token')
    if (!authToken) {
      setSyncState(prev => ({ ...prev, lastError: 'No auth token found' }))
      return false
    }

    try {
      setSyncState(prev => ({ ...prev, status: 'connecting', lastError: null }))
      const success = await webSocketSync.connect(user.id, authToken)

      if (success) {
        setSyncState(prev => ({
          ...prev,
          status: 'connected',
          isEnabled: true,
          lastError: null,
        }))
      } else {
        setSyncState(prev => ({
          ...prev,
          status: 'disconnected',
          lastError: 'Failed to connect',
        }))
      }

      return success
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Connection failed'
      setSyncState(prev => ({
        ...prev,
        status: 'disconnected',
        lastError: errorMessage,
      }))
      return false
    }
  }, [isAuthenticated, user, webSocketSync])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    webSocketSync.disconnect()
    setSyncState(prev => ({
      ...prev,
      status: 'disconnected',
      isEnabled: false,
      lastError: null,
    }))
  }, [webSocketSync])

  // Send sync event
  const sendSyncEvent = useCallback(
    (event: SyncEvent) => {
      webSocketSync.send(event)
      updateSyncState()
    },
    [webSocketSync, updateSyncState]
  )

  // Add event listener
  const addEventListener = useCallback(
    (eventType: string, handler: SyncEventHandler) => {
      webSocketSync.on(eventType, handler)
    },
    [webSocketSync]
  )

  // Remove event listener
  const removeEventListener = useCallback(
    (eventType: string, handler: SyncEventHandler) => {
      webSocketSync.off(eventType, handler)
    },
    [webSocketSync]
  )

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && enabledWhenAuthenticated && isAuthenticated && user) {
      // Small delay to allow other initialization to complete
      const timer = setTimeout(() => {
        connect()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [autoConnect, enabledWhenAuthenticated, isAuthenticated, user, connect])

  // Disconnect when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      disconnect()
    }
  }, [isAuthenticated, disconnect])

  // Update state periodically
  useEffect(() => {
    const interval = setInterval(updateSyncState, 5000)
    return () => clearInterval(interval)
  }, [updateSyncState])

  return {
    // State
    ...syncState,

    // Actions
    connect,
    disconnect,
    sendSyncEvent,
    addEventListener,
    removeEventListener,

    // Utilities
    isConnected: syncState.status === 'connected',
    canConnect: isAuthenticated && user !== null,
    updateSyncState,
  }
}

// Feature flag check
export function useWebSocketSyncFeature(): boolean {
  // For now, enable in development and for specific users
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  // Check localStorage for feature flag
  const featureEnabled =
    localStorage.getItem('mirubato:features:websocket-sync') === 'true'
  return featureEnabled
}
