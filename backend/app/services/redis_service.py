"""Redis service for message handling."""

import asyncio
import json
import time
from typing import Optional

from redis.asyncio import Redis


class RedisService:
    """Redis service for handling pub/sub messages."""
    # TODO 封装成 BaseRedisService 放到 dp.agent.ui.mq.redis.consumer
    
    def __init__(self):
        self.redis: Optional[Redis] = None
        self.pubsub = None
        
    async def connect(self, redis_url: str):
        """Connect to Redis."""
        print(f"Connecting to Redis at: {redis_url}")
        self.redis = Redis.from_url(redis_url)
        self.pubsub = self.redis.pubsub()
        
        print("Subscribing to Redis channels...")
        await self.pubsub.subscribe("todo:actions")
        await self.pubsub.subscribe("backlog:actions")
        await self.pubsub.subscribe("terminal:actions")
        print("Successfully subscribed to todo:actions, backlog:actions, and terminal:actions")
        
    async def disconnect(self):
        """Disconnect from Redis."""
        if self.pubsub:
            await self.pubsub.unsubscribe()
            await self.pubsub.close()
        if self.redis:
            await self.redis.close()
            
    async def listen_for_messages(self):
        """Listen for Redis messages and process them."""
        if not self.pubsub:
            print("No pubsub connection available")
            return
            
        print("Starting to listen for Redis messages...")
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                try:
                    print(f"Received Redis message: {message}")
                    data = json.loads(message["data"])
                    await self._process_message(data)
                except Exception as e:
                    print(f"Error processing message: {e}")
                    
    async def _process_message(self, message: dict):
        """Process a received message."""
        # TODO class BaseRedisService 中把这个作为 abstractmethod,然后让子类实现
        message_type = message.get("type")
        component = message.get("component")
        
        if component:
            await self._send_component_switch(component)
        
        if message_type == "todo_action":
            await self._handle_todo_action(message)
        elif message_type == "backlog_action":
            await self._handle_backlog_action(message)
        elif message_type == "terminal_action":
            await self._handle_terminal_action(message)
        else:
            print(f"Unknown message type: {message_type}")
            
    async def _handle_todo_action(self, message: dict):
        """Handle todo action messages."""
        from ..main import todo_service, sse_service
        
        payload = message.get("payload", {})
        action = payload.get("action")
        
        try:
            if action == "add":
                data = payload.get("data", {})
                todo = await todo_service.create_todo(
                    title=data.get("title", ""),
                    description=data.get("description", "")
                )
                await sse_service.send_event("todo_added", {"todo": todo.dict()})
                
            elif action == "delete":
                todo_id = payload.get("todoId")
                if todo_id:
                    await todo_service.delete_todo(todo_id)
                    await sse_service.send_event("todo_deleted", {"todoId": todo_id})
                    
            elif action == "update":
                todo_id = payload.get("todoId")
                data = payload.get("data", {})
                if todo_id:
                    todo = await todo_service.update_todo(todo_id, **data)
                    if todo:
                        await sse_service.send_event("todo_updated", {"todo": todo.dict()})
                        
            elif action == "toggle":
                todo_id = payload.get("todoId")
                if todo_id:
                    todo = await todo_service.toggle_todo(todo_id)
                    if todo:
                        await sse_service.send_event("todo_updated", {"todo": todo.dict()})
                        
            elif action == "list":
                todos = await todo_service.get_all_todos()
                todos_data = [todo.dict() for todo in todos]
                await sse_service.send_event("todo_list", {"todos": todos_data})
                        
        except Exception as e:
            print(f"Error handling todo action: {e}")
            
    async def _handle_backlog_action(self, message: dict):
        """Handle backlog action messages."""
        from ..main import backlog_service, sse_service
        
        payload = message.get("payload", {})
        action = payload.get("action")
        
        try:
            if action == "add":
                data = payload.get("data", {})
                backlog = await backlog_service.create_backlog(
                    title=data.get("title", ""),
                    description=data.get("description", "")
                )
                await sse_service.send_event("backlog_added", {"backlog": backlog.dict()})
                
            elif action == "delete":
                backlog_id = payload.get("backlogId")
                if backlog_id:
                    await backlog_service.delete_backlog(backlog_id)
                    await sse_service.send_event("backlog_deleted", {"backlogId": backlog_id})
                    
            elif action == "update":
                backlog_id = payload.get("backlogId")
                data = payload.get("data", {})
                if backlog_id:
                    backlog = await backlog_service.update_backlog(backlog_id, **data)
                    if backlog:
                        await sse_service.send_event("backlog_updated", {"backlog": backlog.dict()})
                        
            elif action == "send_to_todo":
                backlog_id = payload.get("backlogId")
                if backlog_id:
                    result = await backlog_service.send_to_todo(backlog_id)
                    if result:
                        await sse_service.send_event("backlog_sent_to_todo", result)
                        await sse_service.send_event("todo_added", {"todo": result["todo"]})
                        await sse_service.send_event("backlog_deleted", {"backlogId": backlog_id})
                        
            elif action == "list":
                backlogs = await backlog_service.get_all_backlogs()
                backlogs_data = [backlog.dict() for backlog in backlogs]
                await sse_service.send_event("backlog_list", {"backlogs": backlogs_data})
                        
        except Exception as e:
            print(f"Error handling backlog action: {e}")
            
    async def _send_component_switch(self, component: str):
        """Send component switch event via SSE."""
        from ..main import sse_service
        
        await sse_service.send_event("component_switch", {
            "component": component,
            "timestamp": int(time.time() * 1000)
        })
            
    async def _handle_terminal_action(self, message: dict):
        """Handle terminal action messages."""
        from ..main import sse_service
        
        payload = message.get("payload", {})
        action = payload.get("action")
        
        try:
            if action in ["ls", "cat", "bash"]:
                await sse_service.send_event("terminal_command_executed", {
                    "action": action,
                    "command": payload.get("command", ""),
                    "output": payload.get("output", ""),
                    "file": payload.get("file", ""),
                    "timestamp": int(time.time() * 1000)
                })
                        
        except Exception as e:
            print(f"Error handling terminal action: {e}")
