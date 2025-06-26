import { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'

interface InteractivePianoProps {
  showCMinorChord?: boolean
}

export default function InteractivePiano({
  showCMinorChord = true,
}: InteractivePianoProps) {
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
      release: 1,
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
      samplerRef.current.triggerAttackRelease(note, '8n')
    }
  }

  // C minor chord notes
  const cMinorNotes = ['C4', 'Eb4', 'G4']

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
        <h3 className="text-lg font-light text-morandi-stone-700 mb-4">
          Play the notes shown below
        </h3>
        <p className="text-sm text-morandi-stone-600 mb-6">
          {!isAudioStarted
            ? 'First click enables audio'
            : 'Click the keys to play'}
        </p>

        {/* Music Notation */}
        <div className="bg-morandi-sage-100/30 rounded-lg p-6 mb-6">
          <svg className="w-full h-24" viewBox="0 0 320 96">
            {/* Staff lines */}
            <g
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.5"
              className="text-morandi-stone-600"
            >
              <line x1="10" y1="24" x2="310" y2="24" />
              <line x1="10" y1="36" x2="310" y2="36" />
              <line x1="10" y1="48" x2="310" y2="48" />
              <line x1="10" y1="60" x2="310" y2="60" />
              <line x1="10" y1="72" x2="310" y2="72" />
            </g>

            {/* Treble Clef (simplified) */}
            <text
              x="20"
              y="55"
              fontSize="36"
              fill="currentColor"
              className="text-morandi-stone-600"
            >
              𝄞
            </text>

            {showCMinorChord ? (
              <>
                {/* C minor chord notation */}
                {/* C4 - on the third line */}
                <circle
                  cx="100"
                  cy="60"
                  r="5"
                  fill="currentColor"
                  className="text-morandi-stone-700"
                />
                <line
                  x1="105"
                  y1="60"
                  x2="105"
                  y2="35"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-morandi-stone-700"
                />

                {/* Eb4 - between third and fourth line */}
                <circle
                  cx="130"
                  cy="54"
                  r="5"
                  fill="currentColor"
                  className="text-morandi-stone-700"
                />
                <line
                  x1="135"
                  y1="54"
                  x2="135"
                  y2="29"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-morandi-stone-700"
                />
                <text
                  x="142"
                  y="58"
                  fontSize="14"
                  fill="currentColor"
                  className="text-morandi-stone-700"
                >
                  ♭
                </text>

                {/* G4 - on the second line */}
                <circle
                  cx="160"
                  cy="36"
                  r="5"
                  fill="currentColor"
                  className="text-morandi-stone-700"
                />
                <line
                  x1="165"
                  y1="36"
                  x2="165"
                  y2="11"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-morandi-stone-700"
                />

                {/* Chord label */}
                <text
                  x="115"
                  y="90"
                  fontSize="12"
                  fill="currentColor"
                  className="text-morandi-stone-600"
                >
                  C minor
                </text>
              </>
            ) : (
              <>
                {/* Single C note */}
                <circle
                  cx="160"
                  cy="60"
                  r="5"
                  fill="currentColor"
                  className="text-morandi-stone-700"
                />
                <line
                  x1="165"
                  y1="60"
                  x2="165"
                  y2="35"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-morandi-stone-700"
                />
              </>
            )}
          </svg>
        </div>

        {/* Piano Keys */}
        <div className="relative flex justify-center mb-4">
          {/* White keys */}
          <div className="flex gap-[2px]">
            {whiteKeys.map(({ note, label }) => {
              const isChordNote =
                showCMinorChord && (note === 'C4' || note === 'G4')
              return (
                <button
                  key={note}
                  onClick={() => playNote(note)}
                  disabled={!isLoaded}
                  className={`
                    relative w-10 h-32 border rounded-b-md transition-all cursor-pointer
                    ${
                      isChordNote
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
              const isChordNote = showCMinorChord && note === 'D#4' // Eb4
              return (
                <button
                  key={note}
                  onClick={() => playNote(note)}
                  disabled={!isLoaded}
                  className={`
                    w-6 h-20 rounded-b-sm transition-all cursor-pointer
                    ${
                      isChordNote
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

        <div className="space-y-2">
          <p className="text-sm text-morandi-stone-600">
            {showCMinorChord ? 'C minor chord' : 'C major scale'}
          </p>
          {!isLoaded && (
            <p className="text-xs text-morandi-stone-500">
              Loading piano sounds...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
