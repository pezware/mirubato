import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { AuthModal } from './AuthModal'
import { env } from '../config/env'

export const UserStatusIndicator: React.FC = () => {
  const { user, isAnonymous, syncToCloud, logout } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  if (!user) return null

  // Check if we're running on Cloudflare (production environment)
  const isCloudflareEnvironment =
    env.PROD && window.location.hostname !== 'localhost'
  const showCloudSaveOption = isAnonymous && isCloudflareEnvironment

  return (
    <div className="flex items-center gap-3">
      {isAnonymous ? (
        <>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Guest Mode
            </span>
          </div>
          {showCloudSaveOption && (
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Save Progress to Cloud
            </button>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-emerald-500 rounded-full" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user.email}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (isSyncing) return
                setIsSyncing(true)
                setSyncError(null)
                try {
                  await syncToCloud()
                } catch (error) {
                  setSyncError(
                    error instanceof Error ? error.message : 'Sync failed'
                  )
                  // Clear error after 5 seconds
                  setTimeout(() => setSyncError(null), 5000)
                } finally {
                  setIsSyncing(false)
                }
              }}
              className={`text-sm ${
                isSyncing
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              } ${syncError ? 'text-red-500' : ''}`}
              title={syncError || (isSyncing ? 'Syncing...' : 'Sync to cloud')}
              disabled={isSyncing}
            >
              <svg
                className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            </button>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              title="Logout"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </>
      )}

      {isCloudflareEnvironment && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            // Modal will stay open to show success message
            // User can close it manually after checking email
          }}
        />
      )}
    </div>
  )
}
