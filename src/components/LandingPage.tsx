import React, { useEffect, useState } from 'react'
import PianoKey from './PianoKey'

const LandingPage: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Trigger fade-in animation after component mounts
    setIsLoaded(true)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/rubato-cover.jpeg')` }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-rubato-wood-900/20 via-transparent to-rubato-wood-900/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        {/* Title Section */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-lexend font-light text-white mb-6 tracking-wide">
            rubato
          </h1>
          <p className="text-xl sm:text-2xl text-rubato-wood-200 font-lexend font-extralight tracking-wider">
            Master the Art of Sight-Reading
          </p>
        </div>

        {/* Interactive Piano Key */}
        <div className={`transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="glass-panel p-8 sm:p-12">
            <p className="text-rubato-wood-600 text-center mb-2 text-sm">
              Click the key to play F#
            </p>
            <p className="text-rubato-wood-400 text-center mb-6 text-xs">
              First click enables audio
            </p>
            <PianoKey note="F#4" />
          </div>
        </div>

        {/* Coming Soon Text */}
        <div className={`mt-16 text-center transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-rubato-wood-200 text-lg">
            Open-source sight-reading platform for classical guitar and piano
          </p>
          <p className="text-rubato-leaf-400 text-sm mt-2 font-medium">
            Coming Soon
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
        <p className="text-rubato-wood-300 text-xs">
          An open-source project • MIT License
        </p>
      </div>
    </div>
  )
}

export default LandingPage