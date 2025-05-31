// Types for sheet music data structure

export interface Note {
  keys: string[];      // e.g., ['g#/4'] for G# in 4th octave
  duration: string;    // e.g., '16' for sixteenth note
  time: number;        // Time in beats from start of piece
}

export interface Measure {
  number: number;
  notes: Note[];
  timeSignature?: string;  // e.g., '4/4'
  keySignature?: string;   // e.g., 'C#m'
  clef?: string;          // e.g., 'treble', 'bass'
  tempo?: {
    bpm: number;
    marking?: string;      // e.g., 'Presto agitato'
    originalMarking?: string;  // e.g., '♩ = 160'
    practiceTempos?: {
      slow: number;
      medium: number;
      target: number;
      performance: number;
    };
  };
}

export interface SheetMusic {
  id: string;
  title: string;
  composer: string;
  opus?: string;
  movement?: string;
  instrument: 'piano' | 'guitar';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  measures: Measure[];
  metadata?: {
    source?: string;
    license?: string;
    arrangedBy?: string;
    year?: number;
  };
}

// For audio playback
export interface PlayableNote {
  note: string;    // e.g., 'C#5'
  time: number;    // Time in seconds
  duration?: string;
  velocity?: number;
}