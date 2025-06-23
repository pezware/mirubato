/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        morandi: {
          sage: {
            100: '#e8ebe4',
            200: '#d4d9cc',
            300: '#b8c2a9',
            400: '#9ca888',
            500: '#818f6d',
          },
          sand: {
            100: '#f5f2ed',
            200: '#e8e2d5',
            300: '#d4c4b0',
            400: '#c1a68b',
            500: '#ad8866',
          },
          stone: {
            100: '#f0efec',
            200: '#e2dfd9',
            300: '#ccc7bd',
            400: '#b5afa1',
            500: '#9e9789',
            600: '#7a756b',
            700: '#5c5850',
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
            400: '#a7bdcb',
            500: '#8ca9bb',
          },
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
}
