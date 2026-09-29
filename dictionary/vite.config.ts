import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'

// Build and dev server for the cf CLI (cf dev / cf build / cf deploy), driven
// by cloudflare.config.ts. wrangler ignores this file.
export default defineConfig({
  plugins: [cloudflare()],
  server: { port: 9799, strictPort: true },
})
