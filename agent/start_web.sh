#!/bin/bash

set -e

echo "Starting Google ADK Agent in development mode..."

export MCP_SERVER_URL=${MCP_SERVER_URL:-"http://localhost:8001"}
export LLM_MODEL=${LLM_MODEL:-"deepseek/deepseek-chat"}
export DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
export OPENAI_API_BASE_URL=${OPENAI_API_BASE_URL}
export SESSION_DB_URL=${SESSION_DB_URL}

cd /app/src

# Check if SESSION_DB_URL is set and not empty
if [ -n "${SESSION_DB_URL}" ]; then
  echo "1111111111111111111111111111 ${SESSION_DB_URL}"
  uv run adk web --host 0.0.0.0 --port 8002 --session_service_uri $SESSION_DB_URL
else
  echo "222222222222222222222222222222"
  uv run adk web --host 0.0.0.0 --port 8002
fi
