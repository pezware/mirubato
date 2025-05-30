import { SheetMusic } from '../../types/sheetMusic'

export const moonlightSonata3rdMovement: SheetMusic = {
  id: 'beethoven-moonlight-3rd',
  title: 'Piano Sonata No. 14 "Moonlight"',
  composer: 'Ludwig van Beethoven',
  opus: 'Op. 27, No. 2',
  movement: '3rd Movement (Presto agitato)',
  instrument: 'piano',
  difficulty: 'advanced',
  measures: [
    {
      number: 1,
      clef: 'treble',
      timeSignature: '4/4',
      keySignature: 'C#m',
      tempo: {
        bpm: 160,
        marking: 'Presto agitato'
      },
      notes: [
        // First beat - G# C# E pattern
        { keys: ['g#/4'], duration: '16', time: 0 },
        { keys: ['c#/5'], duration: '16', time: 0.0625 },
        { keys: ['e/5'], duration: '16', time: 0.125 },
        { keys: ['g#/4'], duration: '16', time: 0.1875 },
        
        // Second beat
        { keys: ['c#/5'], duration: '16', time: 0.25 },
        { keys: ['e/5'], duration: '16', time: 0.3125 },
        { keys: ['g#/4'], duration: '16', time: 0.375 },
        { keys: ['c#/5'], duration: '16', time: 0.4375 },
        
        // Third beat
        { keys: ['e/5'], duration: '16', time: 0.5 },
        { keys: ['g#/4'], duration: '16', time: 0.5625 },
        { keys: ['c#/5'], duration: '16', time: 0.625 },
        { keys: ['e/5'], duration: '16', time: 0.6875 },
        
        // Fourth beat
        { keys: ['g#/4'], duration: '16', time: 0.75 },
        { keys: ['c#/5'], duration: '16', time: 0.8125 },
        { keys: ['e/5'], duration: '16', time: 0.875 },
        { keys: ['g#/4'], duration: '16', time: 0.9375 },
      ]
    },
    {
      number: 2,
      notes: [
        // First beat - continuing C# minor pattern
        { keys: ['c#/5'], duration: '16', time: 1 },
        { keys: ['e/5'], duration: '16', time: 1.0625 },
        { keys: ['g#/4'], duration: '16', time: 1.125 },
        { keys: ['c#/5'], duration: '16', time: 1.1875 },
        
        // Second beat
        { keys: ['e/5'], duration: '16', time: 1.25 },
        { keys: ['g#/4'], duration: '16', time: 1.3125 },
        { keys: ['c#/5'], duration: '16', time: 1.375 },
        { keys: ['e/5'], duration: '16', time: 1.4375 },
        
        // Third beat - transition to B major (dominant)
        { keys: ['d#/5'], duration: '16', time: 1.5 },
        { keys: ['f#/4'], duration: '16', time: 1.5625 },
        { keys: ['b/4'], duration: '16', time: 1.625 },
        { keys: ['d#/5'], duration: '16', time: 1.6875 },
        
        // Fourth beat
        { keys: ['f#/4'], duration: '16', time: 1.75 },
        { keys: ['b/4'], duration: '16', time: 1.8125 },
        { keys: ['d#/5'], duration: '16', time: 1.875 },
        { keys: ['f#/4'], duration: '16', time: 1.9375 },
      ]
    }
  ],
  metadata: {
    source: 'IMSLP',
    license: 'Public Domain',
    year: 1801
  }
}

// Convert to playable format for audio
export function getPlayableNotes(sheetMusic: SheetMusic): Array<{ note: string; time: number }> {
  const playableNotes: Array<{ note: string; time: number }> = []
  
  sheetMusic.measures.forEach(measure => {
    measure.notes.forEach(note => {
      // Convert VexFlow key format to Tone.js note format
      const noteKey = note.keys[0] // For now, just handle single notes
      const [pitch, octave] = noteKey.split('/')
      const toneNote = pitch.toUpperCase() + octave
      
      playableNotes.push({
        note: toneNote,
        time: note.time
      })
    })
  })
  
  return playableNotes
}