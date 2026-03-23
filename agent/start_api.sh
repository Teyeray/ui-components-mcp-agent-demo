#!/bin/bash

set -e

echo "Starting Google ADK Agent API server..."

export MCP_SERVER_URL=${MCP_SERVER_URL:-"http://localhost:8001"}
export LLM_MODEL=${LLM_MODEL:-"deepseek/deepseek-chat"}
export DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
export OPENAI_API_KEY=${OPENAI_API_KEY}
export OPENAI_API_BASE_URL=${OPENAI_API_BASE_URL}
export SESSION_DB_URL=${SESSION_DB_URL}


cat > /app/api_server.py << 'EOF'
import os
import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from agent.main import root_agent

app = FastAPI(title="Todo Assistant Agent API")
session_service = InMemorySessionService()

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        session = await session_service.get_or_create_session(
            session_id=request.session_id,
            state={},
            app_name="todo_agent_api",
            user_id="api_user"
        )
        
        content = types.Content(
            role='user',
            parts=[types.Part(text=request.message)]
        )
        
        runner = Runner(
            app_name="todo_agent_api",
            agent=root_agent,
            session_service=session_service
        )
        
        events = []
        async for event in runner.run_async(
            session_id=session.id,
            user_id=session.user_id,
            new_message=content
        ):
            events.append(event)
        
        return {"response": events, "session_id": request.session_id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy"}
EOF

cd /app
uv run uvicorn api_server:app --host 0.0.0.0 --port 8002 --session_db_url $SESSION_DB_URL
