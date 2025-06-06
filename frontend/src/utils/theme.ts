// Design system theme configuration
// This centralizes our design tokens for easy maintenance and consistency

export const theme = {
  colors: {
    primary: {
      light: '#bef264', // mirubato-leaf-300
      DEFAULT: '#a3e635', // mirubato-leaf-400
      dark: '#65a30d', // mirubato-leaf-600
    },
    secondary: {
      light: '#e4e4e7', // mirubato-wood-200
      DEFAULT: '#d4d4d8', // mirubato-wood-300
      dark: '#71717a', // mirubato-wood-500
    },
    background: {
      primary: '#fafafa', // mirubato-wood-50
      secondary: '#f4f4f5', // mirubato-wood-100
      overlay: 'rgba(255, 255, 255, 0.8)',
    },
    text: {
      primary: '#27272a', // mirubato-wood-800
      secondary: '#52525b', // mirubato-wood-600
      light: '#71717a', // mirubato-wood-500
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
      instant: '75ms',
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slowest: '1000ms',
    },
    delay: {
      short: '300ms',
      medium: '500ms',
    },
    easing: {
      default: 'ease-out',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
  modal: {
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
    },
    animation: {
      slideIn: 'modalSlideIn 0.2s ease-out',
    },
  },
  zIndex: {
    modal: 100000,
    dropdown: 1000,
    tooltip: 2000,
    overlay: 50,
  },
  opacity: {
    ghost: 0.05,
    disabled: 0.5,
    hover: 0.7,
    pressed: 0.15,
    muted: 0.8,
  },
  sizes: {
    control: {
      small: 50,
      medium: 60,
      large: 70,
    },
    piano: {
      key: {
        small: { width: 48, height: 144 }, // w-12 h-36
        large: { width: 64, height: 192 }, // w-16 h-48
      },
      canvas: { width: 150, height: 80 },
    },
    button: {
      small: { padding: 'px-4 py-2' },
      medium: { padding: 'px-6 py-3' },
      large: { padding: 'px-8 py-3' },
    },
  },
  piano: {
    blackKeys: {
      positions: {
        'C#': '36px', // 9*4 = 36px (left-9 equivalent)
        'D#': '60px', // 15*4 = 60px
      },
    },
    notation: {
      staffTop: 20,
      lineSpacing: 8,
      noteX: 60,
      notePositions: {
        C: 40,
        E: 32,
        G: 24,
      },
    },
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const

// Type definitions for the theme
export type Theme = typeof theme
export type ColorKey = keyof Theme['colors']
export type SpacingKey = keyof Theme['spacing']
