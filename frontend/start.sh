#!/bin/bash


echo "Starting UI Component Frontend Application..."

if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

echo "Installing dependencies..."
npm install

if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(cat .env | xargs)
fi

export VITE_API_URL=${VITE_API_URL:-"http://localhost:8000"}
export VITE_SSE_URL=${VITE_SSE_URL:-"http://localhost:8000/events"}

echo "Starting React development server on http://localhost:5173"
echo "Backend API URL: $VITE_API_URL"
echo "SSE URL: $VITE_SSE_URL"
echo ""
echo "Press Ctrl+C to stop the server"

npm run dev
