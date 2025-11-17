// Mirubato brand colors and typography
// Based on actual Morandi color palette from frontendv2/tailwind.config.js
export const theme = {
  colors: {
    // Primary colors - Morandi Sage (brand green)
    primary: '#9ca888', // morandi-sage-400
    primaryDark: '#818f6d', // morandi-sage-500
    primaryLight: '#b8c2a9', // morandi-sage-300

    // Background colors - Morandi Stone (warm grays)
    background: '#f8f7f6', // morandi-stone-50 (light theme)
    backgroundLight: '#f0efec', // morandi-stone-100
    backgroundLighter: '#e2dfd9', // morandi-stone-200
    backgroundDark: '#3a3632', // morandi-stone-900 (for dark sections)

    // Text colors - Morandi Stone tones
    textPrimary: '#3a3632', // morandi-stone-900
    textSecondary: '#5c5850', // morandi-stone-700
    textMuted: '#7a756b', // morandi-stone-600

    // Accent colors - Morandi Purple for interactions
    accent: '#b8a6c9', // morandi-purple-400
    accentLight: '#d0c2db', // morandi-purple-300
    accentAlt: '#a8bccb', // morandi-sky-400

    // Status colors - Morandi palette
    success: '#9ca888', // morandi-sage-400
    error: '#d8a594', // morandi-blush-400
    warning: '#c1a68b', // morandi-sand-400

    // Music-specific
    musicTitle: '#3a3632', // morandi-stone-900
    musicComposer: '#5c5850', // morandi-stone-700

    // Additional Morandi colors for variety
    blush: '#d8a594', // morandi-blush-400
    sky: '#a8bccb', // morandi-sky-400
    sand: '#c1a68b', // morandi-sand-400
    purple: '#b8a6c9', // morandi-purple-400
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
    text: '0 2px 4px rgba(58, 54, 50, 0.1)',
    box: '0 4px 12px rgba(58, 54, 50, 0.08)',
    glow: '0 0 20px rgba(156, 168, 136, 0.3)', // Sage glow
  },
} as const

export type Theme = typeof theme
