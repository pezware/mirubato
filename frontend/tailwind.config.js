/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Nature-inspired palette from mirubato-cover.jpeg
        mirubato: {
          // Vibrant greens from the leaves
          leaf: {
            50: '#f7fee7',
            100: '#ecfccb',
            200: '#d9f99d',
            300: '#bef264',
            400: '#a3e635', // Main leaf color
            500: '#84cc16',
            600: '#65a30d',
            700: '#4d7c0f',
            800: '#3f6212',
            900: '#365314',
          },
          // Weathered wood grays
          wood: {
            50: '#fafafa',
            100: '#f4f4f5',
            200: '#e4e4e7',
            300: '#d4d4d8', // Light weathered wood
            400: '#a1a1aa',
            500: '#71717a', // Medium weathered wood
            600: '#52525b',
            700: '#3f3f46',
            800: '#27272a', // Dark shadows
            900: '#18181b',
          },
          // Accent colors
          accent: {
            warm: '#fbbf24', // Warm sunlight
            cool: '#60a5fa', // Sky blue
            earth: '#92400e', // Brown earth tones
          },
        },
      },
      fontFamily: {
        lexend: ['Lexend', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'mirubato-cover': "url('/mirubato-cover.jpeg')",
      },
      animation: {
        'key-press': 'keyPress 0.15s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        keyPress: {
          '0%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(2px) scale(0.98)' },
          '100%': { transform: 'translateY(0px) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0px)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
