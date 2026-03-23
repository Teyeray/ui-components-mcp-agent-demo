"""Database configuration and initialization."""

import aiosqlite
import os
from typing import Optional


class Database:
    """SQLite database manager."""
    
    def __init__(self, db_path: str = "/app/data/todos.db"):
        import os
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.db_path = db_path
        self.connection: Optional[aiosqlite.Connection] = None
    
    async def connect(self):
        """Connect to the database and create tables if they don't exist."""
        self.connection = await aiosqlite.connect(self.db_path)
        await self.create_tables()
    
    async def disconnect(self):
        """Disconnect from the database."""
        if self.connection:
            await self.connection.close()
            self.connection = None
    
    async def create_tables(self):
        """Create the todos and backlog tables if they don't exist."""
        if not self.connection:
            raise RuntimeError("Database not connected")
        
        await self.connection.execute("""
            CREATE TABLE IF NOT EXISTS todos (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                completed BOOLEAN DEFAULT FALSE,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        """)
        
        await self.connection.execute("""
            CREATE TABLE IF NOT EXISTS backlog (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        """)
        await self.connection.commit()
    
    async def get_connection(self) -> aiosqlite.Connection:
        """Get the database connection."""
        if not self.connection:
            await self.connect()
        return self.connection


database = Database()
