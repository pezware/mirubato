import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

interface SaveProgressPromptProps {
  triggerAfterSessions?: number // Show prompt after N practice sessions
  triggerAfterMinutes?: number // Show prompt after N minutes of practice
}

export const SaveProgressPrompt: React.FC<SaveProgressPromptProps> = ({
  triggerAfterSessions = 3, // TODO: Implement session count trigger
  triggerAfterMinutes = 30,
}) => {
  void triggerAfterSessions // Temporary to avoid TS error
  const { isAnonymous, localUserData } = useAuth()
  const navigate = useNavigate()
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    // Initialize from sessionStorage
    return sessionStorage.getItem('mirubato_save_prompt_dismissed') === 'true'
  })

  useEffect(() => {
    if (!isAnonymous || dismissed) return

    // Check if we should show the prompt based on usage
    const checkShowPrompt = () => {
      if (!localUserData) return false

      // Check practice time
      const totalMinutes = localUserData.stats.totalPracticeTime / 60
      if (totalMinutes >= triggerAfterMinutes) return true

      // Check number of sessions (would need to be added to localStorage service)
      // For now, we'll just use practice time as the trigger

      return false
    }

    if (checkShowPrompt()) {
      setShowPrompt(true)
    }
  }, [isAnonymous, localUserData, triggerAfterMinutes, dismissed])

  const handleDismiss = () => {
    setDismissed(true)
    setShowPrompt(false)
    // Store dismissal in localStorage to not show again this session
    sessionStorage.setItem('mirubato_save_prompt_dismissed', 'true')
  }

  const handleSaveToCloud = () => {
    navigate('/login')
  }

  if (!showPrompt || !isAnonymous) return null

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 animate-slide-up">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Save Your Progress
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            You've been practicing as a guest. Create a free account to save
            your progress and access it from any device.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSaveToCloud}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Save to Cloud
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Maybe Later
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-500 focus:outline-none"
        >
          <span className="sr-only">Close</span>
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
