#!/bin/bash

# Start Scorebook Development Services

echo "🎵 Starting Mirubato Scorebook Services..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "⏹️  Stopping services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Start scores service
echo "📚 Starting Scores Service (port 8787)..."
cd scores && npm run dev &
SCORES_PID=$!

# Wait a moment for scores service to start
sleep 3

# Start frontend
echo "🎨 Starting Frontend (port 3000)..."
cd frontendv2 && npm run dev &
FRONTEND_PID=$!

# Wait a moment for services to start
sleep 5

echo ""
echo "✅ Services are starting..."
echo ""
echo "📍 URLs:"
echo "   - Scorebook: http://localhost:3000/scorebook"
echo "   - Score 1:   http://localhost:3000/scorebook/test_aire_sureno"
echo "   - Score 2:   http://localhost:3000/scorebook/test_romance_anonimo"
echo "   - API:       http://localhost:8787/api/scores"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for background processes
wait