"""SSE service for real-time events."""

import asyncio
import json
from typing import Any, Dict, Set
from fastapi import Request
from fastapi.responses import StreamingResponse


class SSEService:
    """Server-Sent Events service."""
    
    def __init__(self):
        self.connections: Set[asyncio.Queue] = set()
        
    async def add_connection(self) -> asyncio.Queue:
        """Add a new SSE connection."""
        queue = asyncio.Queue()
        self.connections.add(queue)
        return queue
        
    async def remove_connection(self, queue: asyncio.Queue):
        """Remove an SSE connection."""
        self.connections.discard(queue)
        
    async def send_event(self, event: str, data: Dict[str, Any]):
        """Send an event to all connected clients."""
        if not self.connections:
            return
            
        event_data = {
            "event": event,
            "data": data
        }
        
        disconnected = set()
        for queue in self.connections:
            try:
                await queue.put(event_data)
            except Exception:
                disconnected.add(queue)
                
        for queue in disconnected:
            self.connections.discard(queue)
            
    async def event_stream(self, request: Request):
        """Generate SSE event stream."""
        queue = await self.add_connection()
        
        try:
            while True:
                if await request.is_disconnected():
                    break
                    
                try:
                    event_data = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(event_data)}\n\n"
                except asyncio.TimeoutError:
                    yield "data: {\"event\": \"heartbeat\"}\n\n"
                    
        except Exception as e:
            print(f"SSE stream error: {e}")
        finally:
            await self.remove_connection(queue)
