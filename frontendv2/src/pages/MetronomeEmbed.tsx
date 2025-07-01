import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
// import { AdvancedMetronome } from '../components/metronome/AdvancedMetronome';

const MetronomeEmbed: React.FC = () => {
  const [searchParams] = useSearchParams()

  // Parse URL parameters
  const initialBpm = parseInt(searchParams.get('bpm') || '120')
  const initialPattern = searchParams.get('pattern') || 'basic'
  const minimal = searchParams.get('minimal') === 'true'
  const theme = searchParams.get('theme') || 'light'

  useEffect(() => {
    // Send height updates to parent window
    const sendHeight = () => {
      const height = document.body.scrollHeight
      window.parent.postMessage({ type: 'metronome-resize', height }, '*')
    }

    // Initial height
    sendHeight()

    // Watch for changes
    const observer = new ResizeObserver(sendHeight)
    observer.observe(document.body)

    return () => observer.disconnect()
  }, [])

  // Handle messages from parent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'metronome-command') {
        // Handle commands like play, pause, setBpm, etc.
        console.log('Received command:', event.data)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div className={`metronome-embed ${theme === 'dark' ? 'dark' : ''}`}>
      <style>{`
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        .metronome-embed {
          min-height: 100vh;
          background: transparent;
        }
        .metronome-embed.dark {
          background: #1a1a1a;
        }
      `}</style>

      {/* The actual metronome component would go here */}
      <div className="p-4">
        {/* <AdvancedMetronome 
          initialBpm={initialBpm}
          initialPattern={initialPattern}
          startMinimal={minimal}
          embedMode={true}
        /> */}
        <div className="bg-morandi-stone-50 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-morandi-stone-900 mb-4">
            Metronome Embed Mode
          </h2>
          <p className="text-morandi-stone-600">
            Initial BPM: {initialBpm}
            <br />
            Pattern: {initialPattern}
            <br />
            Minimal: {minimal ? 'Yes' : 'No'}
            <br />
            Theme: {theme}
          </p>
        </div>
      </div>
    </div>
  )
}

export default MetronomeEmbed
