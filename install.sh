#!/bin/bash

echo "Installing mirubato dependencies..."
echo "Note: Due to npm workspace issues, installing each package separately"

# Install root dependencies
echo "Installing root dependencies..."
npm install --ignore-workspaces

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend && npm install --ignore-scripts
cd ..

# Install frontend dependencies  
echo "Installing frontend dependencies..."
cd frontend && npm install --ignore-scripts
cd ..

echo "Installation complete!"
echo ""
echo "To start development:"
echo "  Frontend: npm run dev"
echo "  Backend: npm run dev:backend"