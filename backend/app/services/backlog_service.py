"""Backlog business logic service."""

import time
import uuid
from typing import List, Optional

from ..database import database
from ..models.backlog import Backlog, BacklogCreate, BacklogUpdate


class BacklogService:
    """Backlog service for managing backlog items with SQLite storage."""
    
    def __init__(self):
        pass
        
    async def get_all_backlogs(self) -> List[Backlog]:
        """Get all backlog items."""
        conn = await database.get_connection()
        cursor = await conn.execute(
            "SELECT id, title, description, created_at, updated_at FROM backlog ORDER BY created_at DESC"
        )
        rows = await cursor.fetchall()
        
        backlogs = []
        for row in rows:
            backlog = Backlog(
                id=row[0],
                title=row[1],
                description=row[2] or "",
                created_at=row[3],
                updated_at=row[4]
            )
            backlogs.append(backlog)
        
        return backlogs
        
    async def get_backlog(self, backlog_id: str) -> Optional[Backlog]:
        """Get a specific backlog item."""
        conn = await database.get_connection()
        cursor = await conn.execute(
            "SELECT id, title, description, created_at, updated_at FROM backlog WHERE id = ?",
            (backlog_id,)
        )
        row = await cursor.fetchone()
        
        if not row:
            return None
            
        return Backlog(
            id=row[0],
            title=row[1],
            description=row[2] or "",
            created_at=row[3],
            updated_at=row[4]
        )
        
    async def create_backlog(self, title: str, description: str = "") -> Backlog:
        """Create a new backlog item."""
        backlog_id = str(uuid.uuid4())
        timestamp = int(time.time() * 1000)
        
        conn = await database.get_connection()
        await conn.execute(
            "INSERT INTO backlog (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (backlog_id, title, description, timestamp, timestamp)
        )
        await conn.commit()
        
        backlog = Backlog(
            id=backlog_id,
            title=title,
            description=description,
            created_at=timestamp,
            updated_at=timestamp
        )
        
        return backlog
        
    async def update_backlog(self, backlog_id: str, **kwargs) -> Optional[Backlog]:
        """Update a backlog item."""
        backlog = await self.get_backlog(backlog_id)
        if not backlog:
            return None
            
        timestamp = int(time.time() * 1000)
        
        update_fields = []
        update_values = []
        
        for field, value in kwargs.items():
            if hasattr(backlog, field) and value is not None:
                update_fields.append(f"{field} = ?")
                update_values.append(value)
                setattr(backlog, field, value)
        
        if update_fields:
            update_fields.append("updated_at = ?")
            update_values.append(timestamp)
            update_values.append(backlog_id)
            
            conn = await database.get_connection()
            await conn.execute(
                f"UPDATE backlog SET {', '.join(update_fields)} WHERE id = ?",
                update_values
            )
            await conn.commit()
            
            backlog.updated_at = timestamp
        
        return backlog
        
    async def delete_backlog(self, backlog_id: str) -> bool:
        """Delete a backlog item."""
        conn = await database.get_connection()
        cursor = await conn.execute("DELETE FROM backlog WHERE id = ?", (backlog_id,))
        await conn.commit()
        
        return cursor.rowcount > 0
        
    async def send_to_todo(self, backlog_id: str) -> Optional[dict]:
        """Move backlog item to todo and delete from backlog."""
        from .todo_service import TodoService
        
        backlog = await self.get_backlog(backlog_id)
        if not backlog:
            return None
            
        todo_service = TodoService()
        todo = await todo_service.create_todo(
            title=backlog.title,
            description=backlog.description
        )
        
        await self.delete_backlog(backlog_id)
        
        return {
            "backlog_id": backlog_id,
            "todo": todo.dict()
        }
