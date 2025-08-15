export const DEFAULT_TECHNIQUES = [
  'scale',
  'arpeggio',
  'octave',
  'rhythm',
] as const

export const TECHNIQUE_COLORS = {
  scale: 'blue',
  arpeggio: 'green',
  octave: 'purple',
  rhythm: 'orange',
  custom: 'gray',
} as const

export type TechniqueType = (typeof DEFAULT_TECHNIQUES)[number] | 'custom'
