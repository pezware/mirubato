import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export const UserStatusIndicator: React.FC = () => {
  const { user, isAnonymous, syncToCloud } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

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
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Save Progress to Cloud
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-emerald-500 rounded-full" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user.email}
            </span>
          </div>
          <button
            onClick={syncToCloud}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Sync to cloud"
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
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
