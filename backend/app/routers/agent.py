"""Agent API router."""

from fastapi import APIRouter, Request

from ..models.agent import AgentMessageRequest, AgentResponse

router = APIRouter()


@router.post("/agent/message", response_model=AgentResponse)
async def send_message_to_agent(message_data: AgentMessageRequest, request: Request):
    """Run the agent and return all events."""
    agent_service = request.app.state.agent_service
    events = await agent_service.run(
        message=message_data.message,
        session_id=message_data.sessionId or "default",
    )
    return AgentResponse(success=True, response=events)


@router.get("/agent/health")
async def agent_health(request: Request):
    """Simple health check — agent initialises lazily on first message."""
    has_runner = request.app.state.agent_service._runner is not None
    return {"status": "ready" if has_runner else "idle (not yet initialised)"}
