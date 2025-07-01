import React from 'react'
import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
// We'll import the actual Metronome component once it's built
// import { AdvancedMetronome } from '../components/metronome/AdvancedMetronome';

const MetronomeStandalone: React.FC = () => {
  return (
    <div className="min-h-screen bg-morandi-stone-100">
      {/* Simple Header */}
      <header className="bg-morandi-stone-50 border-b border-morandi-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-morandi-stone-600 hover:text-morandi-stone-900 transition-colors"
                title="Back to Mirubato"
              >
                <Home size={20} />
              </Link>
              <h1 className="text-xl font-semibold text-morandi-stone-900">
                Mirubato Metronome
              </h1>
            </div>
            <div className="text-sm text-morandi-stone-600">
              Free Online Metronome with Rhythm Patterns
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-morandi-stone-900 mb-4">
            Advanced Metronome for Musicians
          </h2>
          <p className="text-lg text-morandi-stone-600 max-w-2xl mx-auto">
            Practice with precision using our advanced metronome featuring
            multiple sound layers, common rhythm patterns, and visual feedback
            designed for sight-reading.
          </p>
        </div>

        {/* Metronome would be rendered here */}
        <div className="bg-morandi-stone-50 rounded-lg shadow-md p-8 mb-8">
          <p className="text-center text-morandi-stone-600">
            {/* <AdvancedMetronome standalone={true} /> */}
            [Advanced Metronome Component will be rendered here]
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-morandi-stone-900 mb-2">
              🎵 10 Rhythm Patterns
            </h3>
            <p className="text-sm text-morandi-stone-600">
              From basic beats to complex Latin rhythms, practice with patterns
              used by professionals.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-morandi-stone-900 mb-2">
              🥁 5 Sound Layers
            </h3>
            <p className="text-sm text-morandi-stone-600">
              Create rich rhythmic textures with accent, click, wood block,
              shaker, and triangle sounds.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-morandi-stone-900 mb-2">
              💾 Works Offline
            </h3>
            <p className="text-sm text-morandi-stone-600">
              All settings saved locally. Use anywhere, anytime, without
              internet connection.
            </p>
          </div>
        </div>

        {/* SEO Content */}
        <div className="prose prose-sm max-w-4xl mx-auto text-morandi-stone-600">
          <h3>How to Use the Mirubato Metronome</h3>
          <ol>
            <li>Set your tempo (BPM) using the slider or input field</li>
            <li>Choose a time signature or select from preset patterns</li>
            <li>Adjust volume and sound layers as needed</li>
            <li>
              Click play to start practicing with visual and audio feedback
            </li>
          </ol>

          <h3>Perfect for All Musicians</h3>
          <p>
            Whether you're practicing piano, guitar, drums, or any instrument,
            our metronome helps you develop solid timing and rhythm. The visual
            feedback system is especially helpful for sight-reading practice.
          </p>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="bg-morandi-stone-50 border-t border-morandi-stone-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-morandi-stone-600">
            <p>Part of the Mirubato Music Education Platform</p>
            <div className="mt-2 space-x-4">
              <Link to="/scorebook" className="hover:text-morandi-purple-600">
                Scorebook
              </Link>
              <span>•</span>
              <Link to="/logbook" className="hover:text-morandi-purple-600">
                Practice Log
              </Link>
              <span>•</span>
              <Link to="/tools" className="hover:text-morandi-purple-600">
                More Tools
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MetronomeStandalone
