"""Todo business logic service."""

import time
import uuid
from typing import List, Optional

from ..database import database
from ..models.todo import Todo, TodoCreate, TodoUpdate


class TodoService:
    """Todo service for managing todo items with SQLite storage."""
    
    def __init__(self):
        pass
        
    async def get_all_todos(self) -> List[Todo]:
        """Get all todo items."""
        conn = await database.get_connection()
        cursor = await conn.execute(
            "SELECT id, title, description, completed, created_at, updated_at FROM todos ORDER BY created_at DESC"
        )
        rows = await cursor.fetchall()
        
        todos = []
        for row in rows:
            todo = Todo(
                id=row[0],
                title=row[1],
                description=row[2] or "",
                completed=bool(row[3]),
                created_at=row[4],
                updated_at=row[5]
            )
            todos.append(todo)
        
        return todos
        
    async def get_todo(self, todo_id: str) -> Optional[Todo]:
        """Get a specific todo item."""
        conn = await database.get_connection()
        cursor = await conn.execute(
            "SELECT id, title, description, completed, created_at, updated_at FROM todos WHERE id = ?",
            (todo_id,)
        )
        row = await cursor.fetchone()
        
        if not row:
            return None
            
        return Todo(
            id=row[0],
            title=row[1],
            description=row[2] or "",
            completed=bool(row[3]),
            created_at=row[4],
            updated_at=row[5]
        )
        
    async def create_todo(self, title: str, description: str = "") -> Todo:
        """Create a new todo item."""
        todo_id = str(uuid.uuid4())
        timestamp = int(time.time() * 1000)
        
        conn = await database.get_connection()
        await conn.execute(
            "INSERT INTO todos (id, title, description, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (todo_id, title, description, False, timestamp, timestamp)
        )
        await conn.commit()
        
        todo = Todo(
            id=todo_id,
            title=title,
            description=description,
            completed=False,
            created_at=timestamp,
            updated_at=timestamp
        )
        
        return todo
        
    async def update_todo(self, todo_id: str, **kwargs) -> Optional[Todo]:
        """Update a todo item."""
        todo = await self.get_todo(todo_id)
        if not todo:
            return None
            
        timestamp = int(time.time() * 1000)
        
        update_fields = []
        update_values = []
        
        for field, value in kwargs.items():
            if hasattr(todo, field) and value is not None:
                update_fields.append(f"{field} = ?")
                update_values.append(value)
                setattr(todo, field, value)
        
        if update_fields:
            update_fields.append("updated_at = ?")
            update_values.append(timestamp)
            update_values.append(todo_id)
            
            conn = await database.get_connection()
            await conn.execute(
                f"UPDATE todos SET {', '.join(update_fields)} WHERE id = ?",
                update_values
            )
            await conn.commit()
            
            todo.updated_at = timestamp
        
        return todo
        
    async def delete_todo(self, todo_id: str) -> bool:
        """Delete a todo item."""
        conn = await database.get_connection()
        cursor = await conn.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
        await conn.commit()
        
        return cursor.rowcount > 0
        
    async def toggle_todo(self, todo_id: str) -> Optional[Todo]:
        """Toggle todo completion status."""
        todo = await self.get_todo(todo_id)
        if not todo:
            return None
            
        new_completed = not todo.completed
        timestamp = int(time.time() * 1000)
        
        conn = await database.get_connection()
        await conn.execute(
            "UPDATE todos SET completed = ?, updated_at = ? WHERE id = ?",
            (new_completed, timestamp, todo_id)
        )
        await conn.commit()
        
        todo.completed = new_completed
        todo.updated_at = timestamp
        return todo
