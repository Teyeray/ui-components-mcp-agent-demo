"""Todo API router."""

from typing import List
from fastapi import APIRouter, HTTPException, Request

from ..models.todo import Todo, TodoCreate, TodoUpdate

router = APIRouter()


@router.get("/todos", response_model=List[Todo])
async def get_todos(request: Request):
    """Get all todo items."""
    todo_service = request.app.state.todo_service
    return await todo_service.get_all_todos()


@router.post("/todos", response_model=Todo)
async def create_todo(todo_data: TodoCreate, request: Request):
    """Create a new todo item."""
    todo_service = request.app.state.todo_service
    sse_service = request.app.state.sse_service
    
    todo = await todo_service.create_todo(
        title=todo_data.title,
        description=todo_data.description
    )
    
    await sse_service.send_event("todo_added", {"todo": todo.dict()})
    
    return todo


@router.put("/todos/{todo_id}", response_model=Todo)
async def update_todo(todo_id: str, todo_data: TodoUpdate, request: Request):
    """Update a todo item."""
    todo_service = request.app.state.todo_service
    sse_service = request.app.state.sse_service
    
    update_data = {k: v for k, v in todo_data.dict().items() if v is not None}
    
    todo = await todo_service.update_todo(todo_id, **update_data)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    await sse_service.send_event("todo_updated", {"todo": todo.dict()})
    
    return todo


@router.delete("/todos/{todo_id}")
async def delete_todo(todo_id: str, request: Request):
    """Delete a todo item."""
    todo_service = request.app.state.todo_service
    sse_service = request.app.state.sse_service
    
    success = await todo_service.delete_todo(todo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    await sse_service.send_event("todo_deleted", {"todoId": todo_id})
    
    return {"message": "Todo deleted successfully"}


@router.patch("/todos/{todo_id}/toggle", response_model=Todo)
async def toggle_todo(todo_id: str, request: Request):
    """Toggle todo completion status."""
    todo_service = request.app.state.todo_service
    sse_service = request.app.state.sse_service
    
    todo = await todo_service.toggle_todo(todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    await sse_service.send_event("todo_updated", {"todo": todo.dict()})
    
    return todo
