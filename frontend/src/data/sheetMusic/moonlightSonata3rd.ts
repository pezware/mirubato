import { convertOldSheetMusicToNew } from '../../utils/sheetMusicTypeConverters'
import type { SheetMusic } from '../../modules/sheetMusic/types'

// Define the old format data
const oldFormatData = {
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
        bpm: 40, // Default practice tempo
        marking: 'Presto agitato',
        originalMarking: '♩ = 160', // The actual performance tempo
        practiceTempos: {
          slow: 30,
          medium: 50,
          target: 80,
          performance: 160,
        },
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
      ],
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
      ],
    },
    // Measures 3-20 to be added
    {
      number: 3,
      notes: [
        // Similar pattern continuing
        { keys: ['b/4'], duration: '16', time: 2 },
        { keys: ['d#/5'], duration: '16', time: 2.0625 },
        { keys: ['f#/4'], duration: '16', time: 2.125 },
        { keys: ['b/4'], duration: '16', time: 2.1875 },
        { keys: ['d#/5'], duration: '16', time: 2.25 },
        { keys: ['f#/4'], duration: '16', time: 2.3125 },
        { keys: ['b/4'], duration: '16', time: 2.375 },
        { keys: ['d#/5'], duration: '16', time: 2.4375 },
        { keys: ['e/5'], duration: '16', time: 2.5 },
        { keys: ['g#/4'], duration: '16', time: 2.5625 },
        { keys: ['c#/5'], duration: '16', time: 2.625 },
        { keys: ['e/5'], duration: '16', time: 2.6875 },
        { keys: ['g#/4'], duration: '16', time: 2.75 },
        { keys: ['c#/5'], duration: '16', time: 2.8125 },
        { keys: ['e/5'], duration: '16', time: 2.875 },
        { keys: ['g#/4'], duration: '16', time: 2.9375 },
      ],
    },
    {
      number: 4,
      notes: [
        // Return to C# minor pattern
        { keys: ['c#/5'], duration: '16', time: 3 },
        { keys: ['e/5'], duration: '16', time: 3.0625 },
        { keys: ['g#/4'], duration: '16', time: 3.125 },
        { keys: ['c#/5'], duration: '16', time: 3.1875 },
        { keys: ['e/5'], duration: '16', time: 3.25 },
        { keys: ['g#/4'], duration: '16', time: 3.3125 },
        { keys: ['c#/5'], duration: '16', time: 3.375 },
        { keys: ['e/5'], duration: '16', time: 3.4375 },
        // New pattern
        { keys: ['a/4'], duration: '16', time: 3.5 },
        { keys: ['c#/5'], duration: '16', time: 3.5625 },
        { keys: ['f#/5'], duration: '16', time: 3.625 },
        { keys: ['a/4'], duration: '16', time: 3.6875 },
        { keys: ['c#/5'], duration: '16', time: 3.75 },
        { keys: ['f#/5'], duration: '16', time: 3.8125 },
        { keys: ['a/4'], duration: '16', time: 3.875 },
        { keys: ['c#/5'], duration: '16', time: 3.9375 },
      ],
    },
    {
      number: 5,
      notes: [
        // F# minor pattern
        { keys: ['f#/5'], duration: '16', time: 4 },
        { keys: ['a/4'], duration: '16', time: 4.0625 },
        { keys: ['c#/5'], duration: '16', time: 4.125 },
        { keys: ['f#/5'], duration: '16', time: 4.1875 },
        { keys: ['a/4'], duration: '16', time: 4.25 },
        { keys: ['c#/5'], duration: '16', time: 4.3125 },
        { keys: ['f#/5'], duration: '16', time: 4.375 },
        { keys: ['a/4'], duration: '16', time: 4.4375 },
        // G# diminished
        { keys: ['b/4'], duration: '16', time: 4.5 },
        { keys: ['d/5'], duration: '16', time: 4.5625 },
        { keys: ['g#/5'], duration: '16', time: 4.625 },
        { keys: ['b/4'], duration: '16', time: 4.6875 },
        { keys: ['d/5'], duration: '16', time: 4.75 },
        { keys: ['g#/5'], duration: '16', time: 4.8125 },
        { keys: ['b/4'], duration: '16', time: 4.875 },
        { keys: ['d/5'], duration: '16', time: 4.9375 },
      ],
    },
    {
      number: 6,
      notes: [
        // Continuing arpeggiated patterns - modulating through E major
        { keys: ['g#/5'], duration: '16', time: 5 },
        { keys: ['b/4'], duration: '16', time: 5.0625 },
        { keys: ['e/5'], duration: '16', time: 5.125 },
        { keys: ['g#/5'], duration: '16', time: 5.1875 },
        { keys: ['b/4'], duration: '16', time: 5.25 },
        { keys: ['e/5'], duration: '16', time: 5.3125 },
        { keys: ['g#/5'], duration: '16', time: 5.375 },
        { keys: ['b/4'], duration: '16', time: 5.4375 },
        // Transition to A major
        { keys: ['a/4'], duration: '16', time: 5.5 },
        { keys: ['c#/5'], duration: '16', time: 5.5625 },
        { keys: ['e/5'], duration: '16', time: 5.625 },
        { keys: ['a/4'], duration: '16', time: 5.6875 },
        { keys: ['c#/5'], duration: '16', time: 5.75 },
        { keys: ['e/5'], duration: '16', time: 5.8125 },
        { keys: ['a/4'], duration: '16', time: 5.875 },
        { keys: ['c#/5'], duration: '16', time: 5.9375 },
      ],
    },
    {
      number: 7,
      notes: [
        // A major pattern continuing
        { keys: ['e/5'], duration: '16', time: 6 },
        { keys: ['a/4'], duration: '16', time: 6.0625 },
        { keys: ['c#/5'], duration: '16', time: 6.125 },
        { keys: ['e/5'], duration: '16', time: 6.1875 },
        { keys: ['a/4'], duration: '16', time: 6.25 },
        { keys: ['c#/5'], duration: '16', time: 6.3125 },
        { keys: ['e/5'], duration: '16', time: 6.375 },
        { keys: ['a/4'], duration: '16', time: 6.4375 },
        // D major transition
        { keys: ['d/5'], duration: '16', time: 6.5 },
        { keys: ['f#/4'], duration: '16', time: 6.5625 },
        { keys: ['a/4'], duration: '16', time: 6.625 },
        { keys: ['d/5'], duration: '16', time: 6.6875 },
        { keys: ['f#/4'], duration: '16', time: 6.75 },
        { keys: ['a/4'], duration: '16', time: 6.8125 },
        { keys: ['d/5'], duration: '16', time: 6.875 },
        { keys: ['f#/4'], duration: '16', time: 6.9375 },
      ],
    },
    {
      number: 8,
      notes: [
        // D major to G# diminished
        { keys: ['a/4'], duration: '16', time: 7 },
        { keys: ['d/5'], duration: '16', time: 7.0625 },
        { keys: ['f#/4'], duration: '16', time: 7.125 },
        { keys: ['a/4'], duration: '16', time: 7.1875 },
        { keys: ['d/5'], duration: '16', time: 7.25 },
        { keys: ['f#/4'], duration: '16', time: 7.3125 },
        { keys: ['a/4'], duration: '16', time: 7.375 },
        { keys: ['d/5'], duration: '16', time: 7.4375 },
        // G# diminished preparation
        { keys: ['g#/4'], duration: '16', time: 7.5 },
        { keys: ['b/4'], duration: '16', time: 7.5625 },
        { keys: ['d/5'], duration: '16', time: 7.625 },
        { keys: ['g#/4'], duration: '16', time: 7.6875 },
        { keys: ['b/4'], duration: '16', time: 7.75 },
        { keys: ['d/5'], duration: '16', time: 7.8125 },
        { keys: ['f/5'], duration: '16', time: 7.875 },
        { keys: ['g#/4'], duration: '16', time: 7.9375 },
      ],
    },
    {
      number: 9,
      notes: [
        // Resolution and return to C# minor theme
        { keys: ['c#/5'], duration: '16', time: 8 },
        { keys: ['e/5'], duration: '16', time: 8.0625 },
        { keys: ['g#/4'], duration: '16', time: 8.125 },
        { keys: ['c#/5'], duration: '16', time: 8.1875 },
        { keys: ['e/5'], duration: '16', time: 8.25 },
        { keys: ['g#/4'], duration: '16', time: 8.3125 },
        { keys: ['c#/5'], duration: '16', time: 8.375 },
        { keys: ['e/5'], duration: '16', time: 8.4375 },
        // Second half with variation
        { keys: ['g#/4'], duration: '16', time: 8.5 },
        { keys: ['c#/5'], duration: '16', time: 8.5625 },
        { keys: ['e/5'], duration: '16', time: 8.625 },
        { keys: ['g#/5'], duration: '16', time: 8.6875 },
        { keys: ['c#/5'], duration: '16', time: 8.75 },
        { keys: ['e/5'], duration: '16', time: 8.8125 },
        { keys: ['g#/5'], duration: '16', time: 8.875 },
        { keys: ['c#/5'], duration: '16', time: 8.9375 },
      ],
    },
    {
      number: 10,
      notes: [
        // Continuing variation with higher octave
        { keys: ['e/5'], duration: '16', time: 9 },
        { keys: ['g#/5'], duration: '16', time: 9.0625 },
        { keys: ['c#/5'], duration: '16', time: 9.125 },
        { keys: ['e/5'], duration: '16', time: 9.1875 },
        { keys: ['g#/5'], duration: '16', time: 9.25 },
        { keys: ['c#/5'], duration: '16', time: 9.3125 },
        { keys: ['e/5'], duration: '16', time: 9.375 },
        { keys: ['g#/5'], duration: '16', time: 9.4375 },
        // Transition to next section
        { keys: ['f#/5'], duration: '16', time: 9.5 },
        { keys: ['a/4'], duration: '16', time: 9.5625 },
        { keys: ['c#/5'], duration: '16', time: 9.625 },
        { keys: ['f#/5'], duration: '16', time: 9.6875 },
        { keys: ['a/4'], duration: '16', time: 9.75 },
        { keys: ['c#/5'], duration: '16', time: 9.8125 },
        { keys: ['f#/5'], duration: '16', time: 9.875 },
        { keys: ['a/4'], duration: '16', time: 9.9375 },
      ],
    },
    // Additional measures for demonstration
    {
      number: 11,
      notes: [
        { keys: ['g#/4'], duration: '16', time: 10 },
        { keys: ['c#/5'], duration: '16', time: 10.0625 },
        { keys: ['e/5'], duration: '16', time: 10.125 },
        { keys: ['g#/4'], duration: '16', time: 10.1875 },
        { keys: ['c#/5'], duration: '16', time: 10.25 },
        { keys: ['e/5'], duration: '16', time: 10.3125 },
        { keys: ['g#/4'], duration: '16', time: 10.375 },
        { keys: ['c#/5'], duration: '16', time: 10.4375 },
        { keys: ['e/5'], duration: '16', time: 10.5 },
        { keys: ['g#/4'], duration: '16', time: 10.5625 },
        { keys: ['c#/5'], duration: '16', time: 10.625 },
        { keys: ['e/5'], duration: '16', time: 10.6875 },
        { keys: ['g#/4'], duration: '16', time: 10.75 },
        { keys: ['c#/5'], duration: '16', time: 10.8125 },
        { keys: ['e/5'], duration: '16', time: 10.875 },
        { keys: ['g#/4'], duration: '16', time: 10.9375 },
      ],
    },
    {
      number: 12,
      notes: [
        { keys: ['c#/5'], duration: '16', time: 11 },
        { keys: ['e/5'], duration: '16', time: 11.0625 },
        { keys: ['g#/4'], duration: '16', time: 11.125 },
        { keys: ['c#/5'], duration: '16', time: 11.1875 },
        { keys: ['e/5'], duration: '16', time: 11.25 },
        { keys: ['g#/4'], duration: '16', time: 11.3125 },
        { keys: ['c#/5'], duration: '16', time: 11.375 },
        { keys: ['e/5'], duration: '16', time: 11.4375 },
        { keys: ['d#/5'], duration: '16', time: 11.5 },
        { keys: ['f#/4'], duration: '16', time: 11.5625 },
        { keys: ['b/4'], duration: '16', time: 11.625 },
        { keys: ['d#/5'], duration: '16', time: 11.6875 },
        { keys: ['f#/4'], duration: '16', time: 11.75 },
        { keys: ['b/4'], duration: '16', time: 11.8125 },
        { keys: ['d#/5'], duration: '16', time: 11.875 },
        { keys: ['f#/4'], duration: '16', time: 11.9375 },
      ],
    },
    {
      number: 13,
      notes: [
        { keys: ['b/4'], duration: '16', time: 12 },
        { keys: ['d#/5'], duration: '16', time: 12.0625 },
        { keys: ['f#/4'], duration: '16', time: 12.125 },
        { keys: ['b/4'], duration: '16', time: 12.1875 },
        { keys: ['d#/5'], duration: '16', time: 12.25 },
        { keys: ['f#/4'], duration: '16', time: 12.3125 },
        { keys: ['b/4'], duration: '16', time: 12.375 },
        { keys: ['d#/5'], duration: '16', time: 12.4375 },
        { keys: ['e/5'], duration: '16', time: 12.5 },
        { keys: ['g#/4'], duration: '16', time: 12.5625 },
        { keys: ['c#/5'], duration: '16', time: 12.625 },
        { keys: ['e/5'], duration: '16', time: 12.6875 },
        { keys: ['g#/4'], duration: '16', time: 12.75 },
        { keys: ['c#/5'], duration: '16', time: 12.8125 },
        { keys: ['e/5'], duration: '16', time: 12.875 },
        { keys: ['g#/4'], duration: '16', time: 12.9375 },
      ],
    },
    {
      number: 14,
      notes: [
        { keys: ['c#/5'], duration: '16', time: 13 },
        { keys: ['e/5'], duration: '16', time: 13.0625 },
        { keys: ['g#/4'], duration: '16', time: 13.125 },
        { keys: ['c#/5'], duration: '16', time: 13.1875 },
        { keys: ['e/5'], duration: '16', time: 13.25 },
        { keys: ['g#/4'], duration: '16', time: 13.3125 },
        { keys: ['c#/5'], duration: '16', time: 13.375 },
        { keys: ['e/5'], duration: '16', time: 13.4375 },
        { keys: ['a/4'], duration: '16', time: 13.5 },
        { keys: ['c#/5'], duration: '16', time: 13.5625 },
        { keys: ['f#/5'], duration: '16', time: 13.625 },
        { keys: ['a/4'], duration: '16', time: 13.6875 },
        { keys: ['c#/5'], duration: '16', time: 13.75 },
        { keys: ['f#/5'], duration: '16', time: 13.8125 },
        { keys: ['a/4'], duration: '16', time: 13.875 },
        { keys: ['c#/5'], duration: '16', time: 13.9375 },
      ],
    },
    {
      number: 15,
      notes: [
        { keys: ['f#/5'], duration: '16', time: 14 },
        { keys: ['a/4'], duration: '16', time: 14.0625 },
        { keys: ['c#/5'], duration: '16', time: 14.125 },
        { keys: ['f#/5'], duration: '16', time: 14.1875 },
        { keys: ['a/4'], duration: '16', time: 14.25 },
        { keys: ['c#/5'], duration: '16', time: 14.3125 },
        { keys: ['f#/5'], duration: '16', time: 14.375 },
        { keys: ['a/4'], duration: '16', time: 14.4375 },
        { keys: ['b/4'], duration: '16', time: 14.5 },
        { keys: ['d/5'], duration: '16', time: 14.5625 },
        { keys: ['g#/5'], duration: '16', time: 14.625 },
        { keys: ['b/4'], duration: '16', time: 14.6875 },
        { keys: ['d/5'], duration: '16', time: 14.75 },
        { keys: ['g#/5'], duration: '16', time: 14.8125 },
        { keys: ['b/4'], duration: '16', time: 14.875 },
        { keys: ['d/5'], duration: '16', time: 14.9375 },
      ],
    },
    {
      number: 16,
      notes: [
        { keys: ['g#/5'], duration: '16', time: 15 },
        { keys: ['b/4'], duration: '16', time: 15.0625 },
        { keys: ['e/5'], duration: '16', time: 15.125 },
        { keys: ['g#/5'], duration: '16', time: 15.1875 },
        { keys: ['b/4'], duration: '16', time: 15.25 },
        { keys: ['e/5'], duration: '16', time: 15.3125 },
        { keys: ['g#/5'], duration: '16', time: 15.375 },
        { keys: ['b/4'], duration: '16', time: 15.4375 },
        { keys: ['a/4'], duration: '16', time: 15.5 },
        { keys: ['c#/5'], duration: '16', time: 15.5625 },
        { keys: ['e/5'], duration: '16', time: 15.625 },
        { keys: ['a/4'], duration: '16', time: 15.6875 },
        { keys: ['c#/5'], duration: '16', time: 15.75 },
        { keys: ['e/5'], duration: '16', time: 15.8125 },
        { keys: ['a/4'], duration: '16', time: 15.875 },
        { keys: ['c#/5'], duration: '16', time: 15.9375 },
      ],
    },
    {
      number: 17,
      notes: [
        { keys: ['e/5'], duration: '16', time: 16 },
        { keys: ['a/4'], duration: '16', time: 16.0625 },
        { keys: ['c#/5'], duration: '16', time: 16.125 },
        { keys: ['e/5'], duration: '16', time: 16.1875 },
        { keys: ['a/4'], duration: '16', time: 16.25 },
        { keys: ['c#/5'], duration: '16', time: 16.3125 },
        { keys: ['e/5'], duration: '16', time: 16.375 },
        { keys: ['a/4'], duration: '16', time: 16.4375 },
        { keys: ['d/5'], duration: '16', time: 16.5 },
        { keys: ['f#/4'], duration: '16', time: 16.5625 },
        { keys: ['a/4'], duration: '16', time: 16.625 },
        { keys: ['d/5'], duration: '16', time: 16.6875 },
        { keys: ['f#/4'], duration: '16', time: 16.75 },
        { keys: ['a/4'], duration: '16', time: 16.8125 },
        { keys: ['d/5'], duration: '16', time: 16.875 },
        { keys: ['f#/4'], duration: '16', time: 16.9375 },
      ],
    },
    {
      number: 18,
      notes: [
        { keys: ['a/4'], duration: '16', time: 17 },
        { keys: ['d/5'], duration: '16', time: 17.0625 },
        { keys: ['f#/4'], duration: '16', time: 17.125 },
        { keys: ['a/4'], duration: '16', time: 17.1875 },
        { keys: ['d/5'], duration: '16', time: 17.25 },
        { keys: ['f#/4'], duration: '16', time: 17.3125 },
        { keys: ['a/4'], duration: '16', time: 17.375 },
        { keys: ['d/5'], duration: '16', time: 17.4375 },
        { keys: ['g#/4'], duration: '16', time: 17.5 },
        { keys: ['b/4'], duration: '16', time: 17.5625 },
        { keys: ['d/5'], duration: '16', time: 17.625 },
        { keys: ['g#/4'], duration: '16', time: 17.6875 },
        { keys: ['b/4'], duration: '16', time: 17.75 },
        { keys: ['d/5'], duration: '16', time: 17.8125 },
        { keys: ['f/5'], duration: '16', time: 17.875 },
        { keys: ['g#/4'], duration: '16', time: 17.9375 },
      ],
    },
    {
      number: 19,
      notes: [
        { keys: ['c#/5'], duration: '16', time: 18 },
        { keys: ['e/5'], duration: '16', time: 18.0625 },
        { keys: ['g#/4'], duration: '16', time: 18.125 },
        { keys: ['c#/5'], duration: '16', time: 18.1875 },
        { keys: ['e/5'], duration: '16', time: 18.25 },
        { keys: ['g#/4'], duration: '16', time: 18.3125 },
        { keys: ['c#/5'], duration: '16', time: 18.375 },
        { keys: ['e/5'], duration: '16', time: 18.4375 },
        { keys: ['g#/4'], duration: '16', time: 18.5 },
        { keys: ['c#/5'], duration: '16', time: 18.5625 },
        { keys: ['e/5'], duration: '16', time: 18.625 },
        { keys: ['g#/5'], duration: '16', time: 18.6875 },
        { keys: ['c#/5'], duration: '16', time: 18.75 },
        { keys: ['e/5'], duration: '16', time: 18.8125 },
        { keys: ['g#/5'], duration: '16', time: 18.875 },
        { keys: ['c#/5'], duration: '16', time: 18.9375 },
      ],
    },
    {
      number: 20,
      notes: [
        { keys: ['e/5'], duration: '16', time: 19 },
        { keys: ['g#/5'], duration: '16', time: 19.0625 },
        { keys: ['c#/5'], duration: '16', time: 19.125 },
        { keys: ['e/5'], duration: '16', time: 19.1875 },
        { keys: ['g#/5'], duration: '16', time: 19.25 },
        { keys: ['c#/5'], duration: '16', time: 19.3125 },
        { keys: ['e/5'], duration: '16', time: 19.375 },
        { keys: ['g#/5'], duration: '16', time: 19.4375 },
        { keys: ['c#/6'], duration: '8', time: 19.5 }, // Climactic high C#
        { keys: ['g#/5'], duration: '8', time: 19.75 },
        { keys: ['e/5'], duration: '8', time: 20 },
        { keys: ['c#/5'], duration: '8', time: 20.25 },
      ],
    },
  ],
  metadata: {
    source: 'IMSLP',
    license: 'Public Domain',
    year: 1801,
  },
}

// Convert to new format
export const moonlightSonata3rdMovement: SheetMusic =
  convertOldSheetMusicToNew(oldFormatData)

// Extract notes for audio playback (legacy function)
export function getMoonlightNotes() {
  // Get the first 4 measures of notes (64 notes)
  const notes = []
  for (let i = 0; i < Math.min(4, oldFormatData.measures.length); i++) {
    const measure = oldFormatData.measures[i]
    for (const note of measure.notes) {
      // Convert keys array to single note (take first key)
      const noteKey = note.keys[0].replace('/', '') // Convert 'c#/5' to 'c#5'
      notes.push({
        note: noteKey.toUpperCase(),
        time: note.time,
      })
    }
  }
  return notes
}
