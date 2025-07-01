export interface MetronomePattern {
  id: string
  name: string
  beats: number
  value: number
  description: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  pattern: {
    accent: boolean[]
    click: boolean[]
    woodblock: boolean[]
    shaker: boolean[]
    triangle: boolean[]
  }
}

export interface MetronomeCategory {
  name: string
  description: string
}

export interface MetronomeSoundLayer {
  name: string
  description: string
  color: string
}

export interface MetronomeData {
  patterns: MetronomePattern[]
  categories: Record<string, MetronomeCategory>
  soundLayers: Record<string, MetronomeSoundLayer>
}
