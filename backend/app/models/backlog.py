"""Backlog data models."""

from typing import Optional
from pydantic import BaseModel, Field


class BacklogBase(BaseModel):
    """Base backlog model."""
    title: str
    description: Optional[str] = ""


class BacklogCreate(BacklogBase):
    """Backlog creation model."""
    pass


class BacklogUpdate(BaseModel):
    """Backlog update model."""
    title: Optional[str] = None
    description: Optional[str] = None


class Backlog(BacklogBase):
    """Complete backlog model."""
    id: str
    created_at: int
    updated_at: int
    
    class Config:
        from_attributes = True
