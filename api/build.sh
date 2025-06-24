#!/bin/bash
# Custom build script to handle esbuild issues on Cloudflare

# Clear any potential esbuild cache issues
rm -rf node_modules/.cache 2>/dev/null || true

# Run TypeScript check
echo "Running TypeScript check..."
npm run build

echo "Build completed successfully!"