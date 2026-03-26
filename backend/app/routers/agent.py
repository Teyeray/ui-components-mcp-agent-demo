"""Agent API router."""

import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from ..models.agent import AgentMessageRequest, AgentResponse

router = APIRouter()


@router.post("/agent/stream")
async def stream_agent_message(message_data: AgentMessageRequest, request: Request):
    """Stream agent events as SSE."""
    agent_service = request.app.state.agent_service

    async def generate():
        try:
            async for event in agent_service.stream(
                message=message_data.message,
                session_id=message_data.sessionId or "default",
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/agent/message", response_model=AgentResponse)
async def send_message_to_agent(message_data: AgentMessageRequest, request: Request):
    """Non-streaming fallback — collects all events and returns at once."""
    agent_service = request.app.state.agent_service
    events = []
    async for event in agent_service.stream(
        message=message_data.message,
        session_id=message_data.sessionId or "default",
    ):
        events.append(event)
    return AgentResponse(success=True, response=events)


@router.get("/agent/health")
async def agent_health(request: Request):
    has_runner = request.app.state.agent_service._runner is not None
    return {"status": "ready" if has_runner else "idle"}
