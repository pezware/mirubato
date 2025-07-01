#!/bin/bash
# Build script for Cloudflare Pages

# Increase file descriptor limit to handle lucide-react icons
ulimit -n 4096

# Ensure we're in the right directory
cd frontendv2

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing frontendv2 dependencies..."
  npm install
fi

# Build the project
echo "Building frontendv2..."
npm run build