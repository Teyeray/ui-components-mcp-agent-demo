"""Backlog API router."""

from typing import List
from fastapi import APIRouter, HTTPException, Request

from ..models.backlog import Backlog, BacklogCreate, BacklogUpdate

router = APIRouter()


@router.get("/backlogs", response_model=List[Backlog])
async def get_backlogs(request: Request):
    """Get all backlog items."""
    backlog_service = request.app.state.backlog_service
    return await backlog_service.get_all_backlogs()


@router.post("/backlogs", response_model=Backlog)
async def create_backlog(backlog_data: BacklogCreate, request: Request):
    """Create a new backlog item."""
    backlog_service = request.app.state.backlog_service
    sse_service = request.app.state.sse_service
    
    backlog = await backlog_service.create_backlog(
        title=backlog_data.title,
        description=backlog_data.description
    )
    
    await sse_service.send_event("backlog_added", {"backlog": backlog.dict()})
    
    return backlog


@router.put("/backlogs/{backlog_id}", response_model=Backlog)
async def update_backlog(backlog_id: str, backlog_data: BacklogUpdate, request: Request):
    """Update a backlog item."""
    backlog_service = request.app.state.backlog_service
    sse_service = request.app.state.sse_service
    
    update_data = {k: v for k, v in backlog_data.dict().items() if v is not None}
    
    backlog = await backlog_service.update_backlog(backlog_id, **update_data)
    if not backlog:
        raise HTTPException(status_code=404, detail="Backlog not found")
    
    await sse_service.send_event("backlog_updated", {"backlog": backlog.dict()})
    
    return backlog


@router.delete("/backlogs/{backlog_id}")
async def delete_backlog(backlog_id: str, request: Request):
    """Delete a backlog item."""
    backlog_service = request.app.state.backlog_service
    sse_service = request.app.state.sse_service
    
    success = await backlog_service.delete_backlog(backlog_id)
    if not success:
        raise HTTPException(status_code=404, detail="Backlog not found")
    
    await sse_service.send_event("backlog_deleted", {"backlogId": backlog_id})
    
    return {"message": "Backlog deleted successfully"}


@router.post("/backlogs/{backlog_id}/send-to-todo")
async def send_backlog_to_todo(backlog_id: str, request: Request):
    """Send backlog item to todo list."""
    backlog_service = request.app.state.backlog_service
    sse_service = request.app.state.sse_service
    
    result = await backlog_service.send_to_todo(backlog_id)
    if not result:
        raise HTTPException(status_code=404, detail="Backlog not found")
    
    await sse_service.send_event("backlog_sent_to_todo", result)
    await sse_service.send_event("todo_added", {"todo": result["todo"]})
    await sse_service.send_event("backlog_deleted", {"backlogId": backlog_id})
    
    return {"message": "Backlog sent to todo successfully", "todo": result["todo"]}
