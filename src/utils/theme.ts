// Design system theme configuration
// This centralizes our design tokens for easy maintenance and consistency

export const theme = {
  colors: {
    primary: {
      light: '#bef264', // rubato-leaf-300
      DEFAULT: '#a3e635', // rubato-leaf-400
      dark: '#65a30d', // rubato-leaf-600
    },
    secondary: {
      light: '#e4e4e7', // rubato-wood-200
      DEFAULT: '#d4d4d8', // rubato-wood-300
      dark: '#71717a', // rubato-wood-500
    },
    background: {
      primary: '#fafafa', // rubato-wood-50
      secondary: '#f4f4f5', // rubato-wood-100
      overlay: 'rgba(255, 255, 255, 0.8)',
    },
    text: {
      primary: '#27272a', // rubato-wood-800
      secondary: '#52525b', // rubato-wood-600
      light: '#71717a', // rubato-wood-500
    },
    accent: {
      warm: '#fbbf24',
      cool: '#60a5fa',
      earth: '#92400e',
    },
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      default: 'ease-out',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Type definitions for the theme
export type Theme = typeof theme;
export type ColorKey = keyof Theme['colors'];
export type SpacingKey = keyof Theme['spacing'];