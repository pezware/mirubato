// Mirubato brand colors and typography
export const theme = {
  colors: {
    // Primary colors
    primary: '#6366f1', // Indigo
    primaryDark: '#4f46e5',
    primaryLight: '#818cf8',

    // Background colors
    background: '#0f172a', // Dark slate
    backgroundLight: '#1e293b',
    backgroundLighter: '#334155',

    // Text colors
    textPrimary: '#ffffff',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',

    // Accent colors
    accent: '#fbbf24', // Amber for highlights
    accentAlt: '#22d3ee', // Cyan for tech elements
    success: '#10b981',
    error: '#ef4444',

    // Music-specific
    musicTitle: '#f1f5f9',
    musicComposer: '#e2e8f0',
  },

  fonts: {
    // Based on Mirubato's typography system
    music: '"Noto Serif", serif', // For music titles
    ui: '"Inter", sans-serif', // For UI text
    headers: '"Lexend", sans-serif', // For headers
  },

  fontSizes: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem', // 72px
  },

  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },

  transitions: {
    fast: 15, // frames at 30fps (0.5s)
    normal: 30, // frames at 30fps (1s)
    slow: 45, // frames at 30fps (1.5s)
  },

  shadows: {
    text: '0 4px 8px rgba(0, 0, 0, 0.3)',
    box: '0 4px 12px rgba(0, 0, 0, 0.2)',
    glow: '0 0 20px rgba(99, 102, 241, 0.5)',
  },
} as const

export type Theme = typeof theme
