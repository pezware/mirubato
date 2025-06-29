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

# Start API service
echo "🔧 Starting API Service at http://api-mirubato.localhost:9797..."
cd api && wrangler dev --port 9797 --env local --local-protocol http &
API_PID=$!

# Start scores service
echo "📚 Starting Scores Service at http://scores-mirubato.localhost:9788..."
cd scores && wrangler dev --port 9788 --env local --local-protocol http &
SCORES_PID=$!

# Wait a moment for services to start
sleep 5

# Seed test PDFs into Miniflare R2
echo "📄 Uploading real test PDFs..."
cd scores && npm run upload:real-pdfs
cd ..

# Start frontend
echo "🎨 Starting Frontend at http://www-mirubato.localhost:4000..."
cd frontendv2 && npm run dev &
FRONTEND_PID=$!

# Wait a moment for services to start
sleep 5

echo ""
echo "✅ Services are running!"
echo ""
echo "📍 Service URLs:"
echo "   - Frontend:   http://www-mirubato.localhost:4000"
echo "   - API:        http://api-mirubato.localhost:9797"
echo "   - Scores:     http://scores-mirubato.localhost:9788"
echo ""
echo "📚 Scorebook URLs:"
echo "   - Landing:    http://www-mirubato.localhost:4000/scorebook"
echo "   - Score 1:    http://www-mirubato.localhost:4000/scorebook/test_aire_sureno"
echo "   - Score 2:    http://www-mirubato.localhost:4000/scorebook/test_romance_anonimo"
echo ""
echo "🎵 Scores API endpoints:"
echo "   - Landing:    http://scores-mirubato.localhost:9788/scorebook/"
echo "   - PDFs:       http://scores-mirubato.localhost:9788/files/test-data/*"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for background processes
wait
