"""Message models for Redis communication."""

from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel


class BaseMessage(BaseModel):
    """Base message structure."""
    id: str
    type: str
    timestamp: int
    source: Literal["mcp", "backend", "frontend"]
    target: str
    component: Optional[Literal["todo", "backlog", "terminal"]] = None
    payload: Dict[str, Any]


class TodoActionMessage(BaseMessage):
    """Todo action message."""
    type: Literal["todo_action"] = "todo_action"
    target: Literal["todo_component"] = "todo_component"


class SSEEvent(BaseModel):
    """SSE event structure."""
    event: str
    data: Dict[str, Any]
