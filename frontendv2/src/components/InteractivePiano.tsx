import { useEffect, useRef, useState } from 'react'

// Dynamically import Tone.js types
type ToneType = typeof import('tone')
type SamplerType = import('tone').Sampler

export default function InteractivePiano() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isAudioStarted, setIsAudioStarted] = useState(false)
  const [Tone, setTone] = useState<ToneType | null>(null)
  const samplerRef = useRef<SamplerType | null>(null)

  useEffect(() => {
    // Dynamically import Tone.js when component mounts
    const loadTone = async () => {
      const ToneModule = await import('tone')
      setTone(ToneModule)

      // Create sampler with Salamander Grand Piano samples
      samplerRef.current = new ToneModule.Sampler({
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
      ToneModule.loaded().then(() => {
        setIsLoaded(true)
      })
    }

    loadTone()

    return () => {
      samplerRef.current?.dispose()
    }
  }, [])

  const startAudio = async () => {
    if (!isAudioStarted && Tone) {
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

  const pianoKeys = [
    { note: 'C4', label: 'C', white: true },
    { note: 'C#4', label: 'C#', white: false },
    { note: 'D4', label: 'D', white: true },
    { note: 'D#4', label: 'D#', white: false },
    { note: 'E4', label: 'E', white: true },
    { note: 'F4', label: 'F', white: true },
    { note: 'F#4', label: 'F#', white: false },
    { note: 'G4', label: 'G', white: true },
    { note: 'G#4', label: 'G#', white: false },
    { note: 'A4', label: 'A', white: true },
    { note: 'A#4', label: 'A#', white: false },
    { note: 'B4', label: 'B', white: true },
    { note: 'C5', label: 'C', white: true },
  ]

  const whiteKeys = pianoKeys.filter(key => key.white)
  const blackKeys = pianoKeys.filter(key => !key.white)

  if (!Tone) {
    return (
      <div className="mb-12 flex justify-center">
        <div className="animate-pulse text-white/60">Loading piano...</div>
      </div>
    )
  }

  return (
    <div className="mb-12 flex justify-center">
      <div className="relative inline-flex bg-white/10 backdrop-blur-sm rounded-lg p-4">
        {/* White keys */}
        <div className="flex gap-1">
          {whiteKeys.map(key => (
            <button
              key={key.note}
              disabled={!isLoaded}
              onClick={() => playNote(key.note)}
              className={`
                relative w-10 h-32 bg-white hover:bg-gray-100 
                active:bg-gray-200 rounded-b-md shadow-md 
                transition-colors cursor-pointer
                ${!isLoaded ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              aria-label={`Play ${key.label} note`}
            ></button>
          ))}
        </div>

        {/* Black keys */}
        <div className="absolute top-4 left-0 flex pointer-events-none">
          {blackKeys.map(key => {
            // Calculate position based on note
            // White key width: 40px (w-10), gap: 4px (gap-1)
            // Black key width: 28px (w-7)
            // Black keys should be centered between white keys
            const whiteKeyWidth = 40
            const gap = 4
            const blackKeyWidth = 28

            // Position index for each black key (which gap it sits in)
            const positionIndex =
              {
                'C#4': 0.5, // Between C and D
                'D#4': 1.5, // Between D and E
                'F#4': 3.5, // Between F and G
                'G#4': 4.5, // Between G and A
                'A#4': 5.5, // Between A and B
              }[key.note] || 0

            // Calculate left position: padding + (white key width + gap) * position - half black key width
            const position =
              16 +
              Math.ceil(positionIndex) * (whiteKeyWidth + gap) -
              blackKeyWidth / 2 -
              gap

            return (
              <button
                key={key.note}
                disabled={!isLoaded}
                onClick={() => playNote(key.note)}
                className={`
                  absolute w-7 h-20 bg-gray-900 hover:bg-gray-800 
                  active:bg-gray-700 rounded-b-md shadow-lg 
                  transition-colors cursor-pointer pointer-events-auto
                  ${!isLoaded ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                style={{ left: `${position}px` }}
                aria-label={`Play ${key.label} note`}
              ></button>
            )
          })}
        </div>

        {/* Loading overlay */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
            <div className="text-white font-medium animate-pulse">
              Loading samples...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
