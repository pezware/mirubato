import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PianoChord from './PianoChord'
import { AuthModal } from './AuthModal'
import { useAuth } from '../hooks/useAuth'

const LandingPage: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { user, isAnonymous } = useAuth()

  useEffect(() => {
    // Trigger fade-in animation after component mounts
    setIsLoaded(true)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/mirubato-cover.jpeg')` }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-mirubato-wood-900/20 via-transparent to-mirubato-wood-900/40" />
      </div>

      {/* Auth Status - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        {isAnonymous ? (
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white border border-white/30 hover:border-white/50 rounded-lg backdrop-blur-sm bg-white/10 hover:bg-white/20 transition-all"
          >
            Sign In
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="text-sm text-white/90 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
              {user?.email}
            </div>
            <Link
              to="/logbook"
              className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white border border-white/30 hover:border-white/50 rounded-lg backdrop-blur-sm bg-white/10 hover:bg-white/20 transition-all"
            >
              Logbook
            </Link>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        {/* Title Section */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-lexend font-light text-white mb-6 tracking-wide">
            mirubato
          </h1>
          <p className="text-lg sm:text-xl text-mirubato-wood-200 font-light tracking-wide">
            play with me
          </p>
        </div>

        {/* Interactive Piano Key */}
        <div
          className={`transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <div className="glass-panel p-8 sm:p-12">
            <p className="text-mirubato-wood-600 text-center mb-2 text-sm">
              Play the notes shown below
            </p>
            <p className="text-mirubato-wood-400 text-center mb-6 text-xs">
              First click enables audio
            </p>
            <PianoChord />
          </div>
        </div>

        {/* Coming Soon Text */}
        <div
          className={`mt-16 text-center transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        >
          <p className="text-mirubato-wood-200 text-lg">
            Open-source practice journal for musicians
          </p>
          <Link
            to="/logbook"
            className="inline-block mt-6 px-8 py-3 bg-mirubato-leaf-400 hover:bg-mirubato-leaf-500 text-white font-medium rounded-lg transition-all transform hover:scale-105 shadow-lg"
          >
            Open Logbook
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
        <p className="text-mirubato-wood-300 text-xs">
          An open-source project • MIT License
        </p>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  )
}

export default LandingPage
