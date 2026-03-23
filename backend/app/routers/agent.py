"""Agent API router."""

import os
import httpx
from fastapi import APIRouter, HTTPException, Request

from ..models.agent import AgentMessageRequest, AgentResponse, AgentRequest, NewMessage, MessagePart

router = APIRouter()


@router.post("/agent/message", response_model=AgentResponse)
async def send_message_to_agent(message_data: AgentMessageRequest, request: Request):
    """Send message to Google ADK Agent."""
    try:
        agent_request = AgentRequest(
            appName="agent",
            userId="user",
            sessionId=message_data.sessionId or os.getenv("SESSION_ID", "demo"),
            newMessage=NewMessage(
                parts=[MessagePart(text=message_data.message)],
                role="user"
            ),
            streaming=False
        )
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://ui-mcp-agent:8002/run",
                json=agent_request.dict(),
                timeout=30.0
            )
            response.raise_for_status()
            result = response.json()
            
            return AgentResponse(
                success=True,
                response=result
            )
            
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to communicate with agent: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/agent/health")
async def check_agent_health():
    """Check agent health status."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "http://ui-mcp-agent:8002/health",
                timeout=5.0
            )
            return {"status": "healthy", "agent_status": response.status_code}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
