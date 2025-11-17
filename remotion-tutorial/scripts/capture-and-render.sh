#!/bin/bash
# Capture screenshots from Mirubato UI and render tutorial video
# Usage: ./scripts/capture-and-render.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_DIR/../frontendv2"

echo "==================================="
echo "Mirubato Tutorial Video Generator"
echo "==================================="
echo ""

# Check if frontendv2 dev server is running
if ! curl -s http://localhost:4000 > /dev/null 2>&1; then
  echo "Warning: Frontend dev server not running on port 4000"
  echo "Starting frontend dev server..."
  cd "$FRONTEND_DIR"
  pnpm run dev &
  FRONTEND_PID=$!

  # Wait for server to start
  echo "Waiting for server to start..."
  for i in {1..30}; do
    if curl -s http://localhost:4000 > /dev/null 2>&1; then
      echo "Server started!"
      break
    fi
    sleep 1
  done

  if ! curl -s http://localhost:4000 > /dev/null 2>&1; then
    echo "Error: Failed to start frontend server"
    exit 1
  fi

  SHOULD_STOP_SERVER=true
else
  echo "Frontend dev server already running on port 4000"
  SHOULD_STOP_SERVER=false
fi

# Step 1: Capture screenshots
echo ""
echo "Step 1: Capturing screenshots from UI..."
echo "----------------------------------------"
cd "$FRONTEND_DIR"

# Ensure Playwright browsers are installed
npx playwright install chromium --with-deps 2>/dev/null || true

# Run screenshot capture tests
npx playwright test --config=playwright-screenshots.config.ts

echo ""
echo "Screenshots captured successfully!"
ls -la "$PROJECT_DIR/public/screenshots/"

# Step 2: Render video
echo ""
echo "Step 2: Rendering tutorial video..."
echo "------------------------------------"
cd "$PROJECT_DIR"

# Create output directory
mkdir -p out

# Render the video
npx remotion render src/index.ts MirubatoIntro out/mirubato-tutorial.mp4

echo ""
echo "==================================="
echo "Video rendered successfully!"
echo "Output: $PROJECT_DIR/out/mirubato-tutorial.mp4"
echo "==================================="

# Stop server if we started it
if [ "$SHOULD_STOP_SERVER" = true ] && [ -n "$FRONTEND_PID" ]; then
  echo ""
  echo "Stopping frontend dev server..."
  kill $FRONTEND_PID 2>/dev/null || true
fi
