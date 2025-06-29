import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000,
    strictPort: false,
    host: process.env.CI ? 'localhost' : 'www-mirubato.localhost',
  },
  publicDir: 'public',
  build: {
    copyPublicDir: true,
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split vendor chunks based on node_modules packages
          if (id.includes('node_modules')) {
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router')
            ) {
              return 'react-vendor'
            }
            if (
              id.includes('@headlessui') ||
              id.includes('@heroicons') ||
              id.includes('lucide-react')
            ) {
              return 'ui-vendor'
            }
            if (id.includes('vexflow') || id.includes('tone')) {
              return 'music-vendor'
            }
            if (
              id.includes('axios') ||
              id.includes('date-fns') ||
              id.includes('clsx') ||
              id.includes('tailwind-merge')
            ) {
              return 'utils-vendor'
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n-vendor'
            }
          }
        },
      },
    },
    // Increase chunk size warning limit slightly since we're splitting
    chunkSizeWarningLimit: 200,
    // Use default esbuild minification (faster than terser)
    minify: 'esbuild',
    // Generate source maps for production debugging
    sourcemap: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'vexflow', 'tone', 'pdfjs-dist'],
  },
  // Ensure PDF.js worker is properly handled
  worker: {
    format: 'es',
  },
})
