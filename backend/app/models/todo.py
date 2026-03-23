"""Todo data models."""

from typing import Optional
from pydantic import BaseModel, Field


class TodoBase(BaseModel):
    """Base todo model."""
    title: str
    description: Optional[str] = ""
    completed: bool = False


class TodoCreate(TodoBase):
    """Todo creation model."""
    pass


class TodoUpdate(BaseModel):
    """Todo update model."""
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None


class Todo(TodoBase):
    """Complete todo model."""
    id: str
    created_at: int
    updated_at: int
    
    class Config:
        from_attributes = True
