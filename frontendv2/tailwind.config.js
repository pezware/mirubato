/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // This prevents automatic dark mode based on system preference
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
        lexend: ['Lexend', 'system-ui', 'sans-serif'],
        serif: ['Noto Serif', 'Georgia', 'serif'],
      },
      colors: {
        'circle-border': '#262a2a',
        morandi: {
          sage: {
            50: '#f4f5f2',
            100: '#e8ebe4',
            200: '#d4d9cc',
            300: '#b8c2a9',
            400: '#9ca888',
            500: '#818f6d',
            600: '#6b7857',
            700: '#555e45',
          },
          navy: {
            100: '#e6f0f5',
            200: '#c2d9e6',
            300: '#9ec2d6',
            400: '#7aacc7',
            500: '#2c5282',
            600: '#1e3a5b',
            700: '#1a365d',
          },
          sand: {
            100: '#f5f2ed',
            200: '#e8e2d5',
            300: '#d4c4b0',
            400: '#c1a68b',
            500: '#ad8866',
          },
          stone: {
            50: '#f8f7f6',
            100: '#f0efec',
            200: '#e2dfd9',
            300: '#ccc7bd',
            400: '#b5afa1',
            500: '#9e9789',
            600: '#7a756b',
            700: '#5c5850',
            900: '#3a3632',
          },
          blush: {
            100: '#f9f0ed',
            200: '#f0ddd6',
            300: '#e4c1b5',
            400: '#d8a594',
            500: '#cc8973',
          },
          sky: {
            100: '#eef2f5',
            200: '#dde5eb',
            300: '#c2d1db',
            400: '#a8bccb',
            500: '#8ea7bb',
          },
          purple: {
            100: '#f3f0f5',
            200: '#e5dded',
            300: '#d0c2db',
            400: '#b8a6c9',
            500: '#9f8ab7',
          },
          rose: {
            50: '#fdf2f2',
            100: '#fce7e7',
            200: '#fbbcbc',
            300: '#f98a8a',
            400: '#f45252',
            500: '#ec2727',
          },
          peach: {
            50: '#fef5f0',
            100: '#fde8dd',
            200: '#fbccb8',
            300: '#f8a888',
            400: '#f47c52',
            500: '#ec5a2b',
          },
          red: {
            500: '#d63638', // Morandi red for root note font
          },
          'dusty-red': {
            500: '#a55a5a', // Morandi dusty red for chord note font
          },
          orange: {
            500: '#e08849', // Morandi orange for scale note font
          },
        },
        // Custom colors for piano keys
        piano: {
          'root-white': '#dbeeed',
          'root-black': '#3f4444',
          'chord-white': '#b4c4c3',
          'chord-black': '#666f6e',
          scale: '#8d9999',
        },
        mirubato: {
          leaf: '#9ca888', // Morandi sage
          wood: {
            300: '#e2dfd9',
            600: '#7a756b',
            800: '#5c5850',
          },
        },
        primary: {
          50: '#f9f0ed',
          100: '#f0ddd6',
          500: '#9ca888',
          600: '#818f6d',
          700: '#6b7757',
        },
        gray: {
          850: '#1a1d23',
        },
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
  safelist: [
    // Metronome sound layer colors
    'bg-morandi-purple-400',
    'bg-morandi-sky-400',
    'bg-morandi-sage-400',
    'bg-morandi-sand-400',
    'bg-morandi-blush-400',
    // Circle of Fifths piano keyboard colors
    'bg-morandi-rose-200',
    'bg-morandi-rose-300',
    'text-morandi-rose-500',
    'bg-morandi-peach-200',
    'text-morandi-peach-500',
    'bg-morandi-sage-400',
    'text-morandi-sage-500',
    'text-morandi-sage-600',
    'accent-morandi-sage-500',
    'bg-morandi-stone-400',
    'bg-morandi-stone-500',
    'bg-morandi-stone-600',
    'bg-morandi-stone-700',
    // Key details panel colors
    'bg-morandi-sage-100',
    'bg-morandi-sage-300',
    'bg-morandi-rose-300',
    'bg-morandi-peach-300',
    'bg-morandi-sky-300',
    'bg-morandi-sand-300',
    'bg-morandi-purple-50',
    'text-morandi-purple-500',
    'bg-morandi-purple-300',
    'text-morandi-purple-400',
    'border-morandi-purple-300',
    'border-morandi-sage-300',
    'border-morandi-rose-300',
    'border-morandi-peach-300',
    'border-morandi-sky-300',
    'border-morandi-sand-300',
    // Status bars for pieces and repertoire statuses
    'bg-morandi-navy-600', // Polished (darkest)
    'bg-morandi-navy-500', // (unused but kept for backward compatibility)
    'bg-morandi-navy-400', // Learning (medium)
    'bg-morandi-navy-300', // Planned (lightest)
    'bg-gray-300', // Dropped/default
    // Technique tag colors
    'bg-morandi-blush-100',
    'bg-morandi-peach-100',
    'bg-sand-100',
    'text-sand-800',
    // Summary stats colors
    'bg-morandi-stone-50',
    'bg-morandi-stone-100',
    'bg-morandi-rose-50',
    // Type badge colors for practice entry types
    'bg-morandi-purple-200',
    'text-morandi-purple-800',
    'bg-morandi-sage-100',
    'text-morandi-sage-700',
    'bg-morandi-sand-100',
    'text-morandi-sand-700',
    'bg-morandi-blush-100',
    'text-morandi-blush-700',
    'bg-morandi-stone-200',
    'text-morandi-stone-700',
    'bg-orange-200',
    'text-orange-800',
    // Timer button colors (warning and info variants)
    'bg-morandi-peach-100',
    'bg-morandi-peach-200',
    'text-morandi-peach-700',
    'border-morandi-peach-200',
    'hover:bg-morandi-peach-200',
    'focus:ring-morandi-peach-400',
    'bg-morandi-sky-200',
    'bg-morandi-sky-300',
    'text-morandi-sky-700',
    'hover:bg-morandi-sky-300',
    'focus:ring-morandi-sky-400',
  ],
}
