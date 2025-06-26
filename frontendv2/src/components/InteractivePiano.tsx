import { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'

export default function InteractivePiano() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isAudioStarted, setIsAudioStarted] = useState(false)
  const samplerRef = useRef<Tone.Sampler | null>(null)

  useEffect(() => {
    // Create sampler with Salamander Grand Piano samples
    samplerRef.current = new Tone.Sampler({
      urls: {
        C4: 'C4.mp3',
        'D#4': 'Ds4.mp3',
        'F#4': 'Fs4.mp3',
        A4: 'A4.mp3',
        C5: 'C5.mp3',
        'D#5': 'Ds5.mp3',
        'F#5': 'Fs5.mp3',
        A5: 'A5.mp3',
      },
      release: 4,
      volume: -6,
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
    }).toDestination()

    // Load samples
    Tone.loaded().then(() => {
      setIsLoaded(true)
    })

    return () => {
      samplerRef.current?.dispose()
    }
  }, [])

  const startAudio = async () => {
    if (!isAudioStarted) {
      await Tone.start()
      setIsAudioStarted(true)
    }
  }

  const playNote = async (note: string) => {
    await startAudio()
    if (isLoaded && samplerRef.current) {
      samplerRef.current.triggerAttackRelease(note, '2n')
    }
  }

  // Two notes for the challenge
  const twoNoteChallenge = ['C4', 'G4']

  // Piano key definitions with note mappings
  const whiteKeys = [
    { note: 'C4', label: 'C' },
    { note: 'D4', label: 'D' },
    { note: 'E4', label: 'E' },
    { note: 'F4', label: 'F' },
    { note: 'G4', label: 'G' },
    { note: 'A4', label: 'A' },
    { note: 'B4', label: 'B' },
  ]

  const blackKeys = [
    { note: 'C#4', position: 'ml-7' },
    { note: 'D#4', position: 'ml-4' },
    { note: 'F#4', position: 'ml-14' },
    { note: 'G#4', position: 'ml-4' },
    { note: 'A#4', position: 'ml-4' },
  ]

  return (
    <div className="glass-panel p-8 max-w-md mx-auto mb-8 animate-slide-up">
      <div className="text-center">
        {/* Music Notation */}
        <div className="bg-morandi-sage-100/30 rounded-lg p-6 mb-6">
          <svg className="w-full h-32" viewBox="0 0 640 128">
            {/* Staff lines */}
            <g
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.5"
              className="text-morandi-stone-600"
            >
              <line x1="10" y1="32" x2="630" y2="32" />
              <line x1="10" y1="48" x2="630" y2="48" />
              <line x1="10" y1="64" x2="630" y2="64" />
              <line x1="10" y1="80" x2="630" y2="80" />
              <line x1="10" y1="96" x2="630" y2="96" />
            </g>

            {/* Treble Clef */}
            <text
              x="20"
              y="73"
              fontSize="48"
              fill="currentColor"
              className="text-morandi-stone-600"
            >
              𝄞
            </text>

            {/* Key signature - Eb, Bb, Ab for C minor */}
            <text
              x="70"
              y="53"
              fontSize="20"
              fill="currentColor"
              className="text-morandi-stone-600"
            >
              ♭
            </text>
            <text
              x="80"
              y="77"
              fontSize="20"
              fill="currentColor"
              className="text-morandi-stone-600"
            >
              ♭
            </text>
            <text
              x="90"
              y="45"
              fontSize="20"
              fill="currentColor"
              className="text-morandi-stone-600"
            >
              ♭
            </text>

            {/* 2 Note Challenge - C and G pattern from measures 3-10 */}
            {/* Measure 3-4: Half note C, Quarter C, Quarter G */}
            <circle
              cx="120"
              cy="80"
              r="4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-morandi-stone-700"
            />
            <line
              x1="124.5"
              y1="80"
              x2="124.5"
              y2="55"
              stroke="currentColor"
              strokeWidth="2"
              className="text-morandi-stone-700"
            />

            <circle
              cx="190"
              cy="80"
              r="5"
              fill="currentColor"
              className="text-morandi-stone-700"
            />
            <line
              x1="195"
              y1="80"
              x2="195"
              y2="55"
              stroke="currentColor"
              strokeWidth="2"
              className="text-morandi-stone-700"
            />

            <circle
              cx="220"
              cy="48"
              r="5"
              fill="currentColor"
              className="text-morandi-stone-700"
            />
            <line
              x1="225"
              y1="48"
              x2="225"
              y2="23"
              stroke="currentColor"
              strokeWidth="2"
              className="text-morandi-stone-700"
            />

            {/* Bar line */}
            <line
              x1="250"
              y1="32"
              x2="250"
              y2="96"
              stroke="currentColor"
              strokeWidth="1"
              className="text-morandi-stone-600"
            />

            {/* Measure 5-6: Half note C, G-C pattern */}
            <circle
              cx="280"
              cy="80"
              r="4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-morandi-stone-700"
            />
            <line
              x1="284.5"
              y1="80"
              x2="284.5"
              y2="55"
              stroke="currentColor"
              strokeWidth="2"
              className="text-morandi-stone-700"
            />

            <circle
              cx="350"
              cy="48"
              r="5"
              fill="currentColor"
              className="text-morandi-stone-700"
            />
            <line
              x1="355"
              y1="48"
              x2="355"
              y2="23"
              stroke="currentColor"
              strokeWidth="2"
              className="text-morandi-stone-700"
            />

            <circle
              cx="380"
              cy="80"
              r="5"
              fill="currentColor"
              className="text-morandi-stone-700"
            />
            <line
              x1="385"
              y1="80"
              x2="385"
              y2="55"
              stroke="currentColor"
              strokeWidth="2"
              className="text-morandi-stone-700"
            />

            {/* Bar line */}
            <line
              x1="410"
              y1="32"
              x2="410"
              y2="96"
              stroke="currentColor"
              strokeWidth="1"
              className="text-morandi-stone-600"
            />

            {/* Measure 7-8: Half note C, Quarter G, Quarter C */}
            <circle
              cx="440"
              cy="80"
              r="4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-morandi-stone-700"
            />
            <line
              x1="444.5"
              y1="80"
              x2="444.5"
              y2="55"
              stroke="currentColor"
              strokeWidth="2"
              className="text-morandi-stone-700"
            />

            <circle
              cx="510"
              cy="48"
              r="5"
              fill="currentColor"
              className="text-morandi-stone-700"
            />
            <line
              x1="515"
              y1="48"
              x2="515"
              y2="23"
              stroke="currentColor"
              strokeWidth="2"
              className="text-morandi-stone-700"
            />

            <circle
              cx="540"
              cy="80"
              r="5"
              fill="currentColor"
              className="text-morandi-stone-700"
            />
            <line
              x1="545"
              y1="80"
              x2="545"
              y2="55"
              stroke="currentColor"
              strokeWidth="2"
              className="text-morandi-stone-700"
            />

            {/* Double bar line */}
            <line
              x1="570"
              y1="32"
              x2="570"
              y2="96"
              stroke="currentColor"
              strokeWidth="1"
              className="text-morandi-stone-600"
            />
            <line
              x1="574"
              y1="32"
              x2="574"
              y2="96"
              stroke="currentColor"
              strokeWidth="3"
              className="text-morandi-stone-600"
            />
          </svg>
        </div>

        {/* Piano Keys */}
        <div className="relative flex justify-center mb-4">
          {/* White keys */}
          <div className="flex gap-[2px]">
            {whiteKeys.map(({ note, label }) => {
              const isHighlighted = twoNoteChallenge.includes(note)
              return (
                <button
                  key={note}
                  onClick={() => playNote(note)}
                  disabled={!isLoaded}
                  className={`
                    relative w-10 h-32 border rounded-b-md transition-all cursor-pointer
                    ${
                      isHighlighted
                        ? 'bg-morandi-sage-200 border-morandi-sage-400 hover:bg-morandi-sage-300'
                        : 'bg-white border-morandi-stone-300 hover:bg-morandi-stone-100'
                    }
                    ${!isLoaded ? 'opacity-50 cursor-not-allowed' : ''}
                    active:scale-95 active:shadow-inner
                  `}
                  aria-label={`Play ${label}`}
                >
                  <span className="text-xs text-morandi-stone-600 absolute bottom-2 left-1/2 -translate-x-1/2">
                    {label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Black keys positioned absolutely */}
          <div className="absolute flex top-0">
            {blackKeys.map(({ note, position }) => {
              const isHighlighted = false // No black keys in 2-note challenge
              return (
                <button
                  key={note}
                  onClick={() => playNote(note)}
                  disabled={!isLoaded}
                  className={`
                    w-6 h-20 rounded-b-sm transition-all cursor-pointer
                    ${
                      isHighlighted
                        ? 'bg-morandi-sage-600 hover:bg-morandi-sage-500'
                        : 'bg-morandi-stone-700 hover:bg-morandi-stone-600'
                    }
                    ${!isLoaded ? 'opacity-50 cursor-not-allowed' : ''}
                    active:scale-95 active:shadow-inner
                    ${position}
                  `}
                  aria-label={`Play ${note}`}
                />
              )
            })}
          </div>
        </div>

        {!isLoaded && (
          <p className="text-xs text-morandi-stone-500 mt-2">
            Loading piano sounds...
          </p>
        )}
      </div>
    </div>
  )
}
