import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // For Cloudflare Workers deployments, we can set environment variables
  // based on the branch or deployment context
  const env = {
    VITE_GRAPHQL_ENDPOINT: process.env.VITE_GRAPHQL_ENDPOINT || undefined,
  }

  // Log the configuration for debugging
  console.log('Vite build configuration:', {
    mode,
    VITE_GRAPHQL_ENDPOINT: env.VITE_GRAPHQL_ENDPOINT,
  })

  return {
    plugins: [react()],
    define: {
      // Make environment variables available
      'import.meta.env.VITE_GRAPHQL_ENDPOINT': JSON.stringify(
        env.VITE_GRAPHQL_ENDPOINT
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/hooks': path.resolve(__dirname, './src/hooks'),
        '@/utils': path.resolve(__dirname, './src/utils'),
        '@/styles': path.resolve(__dirname, './src/styles'),
        '@/assets': path.resolve(__dirname, './src/assets'),
        '@/types': path.resolve(__dirname, './src/types'),
      },
    },
    server: {
      port: 3000,
      open: true,
    },
    optimizeDeps: {
      // Include Tone.js to ensure it's properly bundled
      include: ['tone'],
    },
    build: {
      // Ensure compatibility with older browsers if needed
      target: 'es2015',
    },
  }
})
