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
          // Vendor chunk splitting - keep React ecosystem together
          if (id.includes('node_modules')) {
            // Keep React and React-DOM together to avoid conflicts
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router')
            ) {
              return 'react-vendor'
            }
            if (id.includes('zustand')) {
              return 'state-management'
            }

            // Split UI libraries
            if (
              id.includes('@headlessui') ||
              id.includes('@heroicons') ||
              id.includes('lucide-react')
            ) {
              return 'ui-vendor'
            }

            // Split music libraries separately
            if (id.includes('vexflow')) {
              return 'vexflow-vendor'
            }
            if (id.includes('tone')) {
              return 'tone-vendor'
            }

            // PDF.js should be loaded separately
            if (id.includes('pdfjs-dist')) {
              return 'pdf-vendor'
            }

            // Utilities
            if (id.includes('axios')) {
              return 'http-vendor'
            }
            if (id.includes('date-fns')) {
              return 'date-vendor'
            }
            if (id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'style-utils'
            }

            // i18n
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n-vendor'
            }
          }
        },
        // Optimize chunk names for better caching
        chunkFileNames: chunkInfo => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()
            : 'chunk'
          return `assets/${chunkInfo.name || facadeModuleId}-[hash].js`
        },
      },
    },
    // Increase chunk size warning limit for PDF.js worker
    chunkSizeWarningLimit: 500,
    // Use esbuild for faster builds
    minify: 'esbuild',
    // Generate source maps for production debugging
    sourcemap: true,
    // Target modern browsers for smaller builds
    target: 'es2020',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'vexflow',
      'tone',
      'pdfjs-dist',
      'zustand',
      'axios',
      'date-fns',
    ],
    exclude: ['pdfjs-dist/build/pdf.worker.mjs'],
  },
  // Ensure PDF.js worker is properly handled
  worker: {
    format: 'es',
  },
})
