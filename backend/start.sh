#!/bin/bash


echo "Starting UI Component Backend Server..."

if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed. Please install uv first."
    echo "Install uv with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

echo "Installing dependencies with uv..."
uv pip install -r requirements.txt

if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(cat .env | xargs)
fi

unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy
export NO_PROXY=localhost,127.0.0.1,::1
export no_proxy=localhost,127.0.0.1,::1

export REDIS_URL=${REDIS_URL:-"redis://localhost:6379"}
export CORS_ORIGINS=${CORS_ORIGINS:-"http://localhost:3000,http://localhost:5173"}
export AGENT_URL=${AGENT_URL:-"http://localhost:8002"}

echo "Starting FastAPI server on http://localhost:8000"
echo "API documentation available at http://localhost:8000/docs"
echo "Health check available at http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop the server"

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
