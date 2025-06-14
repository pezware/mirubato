import React from 'react'
import { Link } from 'react-router-dom'
import { UserStatusIndicator } from './UserStatusIndicator'

export type PracticeMode = 'practice' | 'exercise'

interface PracticeHeaderProps {
  isMobile: boolean
}

export const PracticeHeader: React.FC<PracticeHeaderProps> = ({ isMobile }) => {
  return (
    <header className="bg-white/80 backdrop-blur shadow-sm border-b border-mirubato-wood-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isMobile && (
              <button className="text-mirubato-wood-600 hover:text-mirubato-wood-800">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            )}
            <Link
              to="/"
              className="text-xl sm:text-2xl font-lexend font-light text-mirubato-wood-800 hover:text-mirubato-wood-600 transition-colors"
            >
              mirubato
            </Link>

            {/* Navigation Links */}
            {!isMobile && (
              <nav className="flex items-center gap-6 ml-8">
                {/* Phase 2 - Practice mode temporarily phased out */}
                {/* <Link
                  to="/practice"
                  className="text-mirubato-wood-600 hover:text-mirubato-wood-800 font-medium transition-colors"
                >
                  Practice
                </Link> */}
                <Link
                  to="/logbook"
                  className="text-mirubato-wood-600 hover:text-mirubato-wood-800 font-medium transition-colors"
                >
                  Logbook
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* User Status */}
            <UserStatusIndicator />
          </div>
        </div>
      </div>
    </header>
  )
}
