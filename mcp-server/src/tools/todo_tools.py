"""Todo component MCP tools."""

import time
import uuid
from typing import Optional

from fastmcp import FastMCP

from ..redis_client import RedisClient

def register_todo_tools(mcp: FastMCP, redis_client: RedisClient):
    """Register todo-related MCP tools."""
    
    @mcp.tool()
    async def add_todo(title: str, description: str = "") -> dict:
        """添加新的 todo 项
        
        Args:
            title: Todo 标题
            description: Todo 描述 (可选)
            
        Returns:
            操作结果
        """
        message = {
            "id": str(uuid.uuid4()),
            "type": "todo_action",
            "timestamp": int(time.time() * 1000),
            "source": "mcp",
            "target": "todo_component",
            "component": "todo",
            "payload": {
                "action": "add",
                "data": {
                    "title": title,
                    "description": description
                }
            }
        }
        
        await redis_client.publish_message("todo:actions", message)
        return {"success": True, "message": f"Todo '{title}' added successfully"}
    
    @mcp.tool()
    async def delete_todo(todo_id: str) -> dict:
        """删除指定的 todo 项
        
        Args:
            todo_id: Todo 项的 ID
            
        Returns:
            操作结果
        """
        message = {
            "id": str(uuid.uuid4()),
            "type": "todo_action",
            "timestamp": int(time.time() * 1000),
            "source": "mcp",
            "target": "todo_component",
            "component": "todo",
            "payload": {
                "action": "delete",
                "todoId": todo_id
            }
        }
        
        await redis_client.publish_message("todo:actions", message)
        return {"success": True, "message": f"Todo {todo_id} deleted successfully"}
    
    @mcp.tool()
    async def update_todo(
        todo_id: str, 
        title: str = "", 
        description: str = ""
    ) -> dict:
        """更新 todo 项内容
        
        Args:
            todo_id: Todo 项的 ID
            title: 新的标题 (可选)
            description: 新的描述 (可选)
            
        Returns:
            操作结果
        """
        data = {}
        if title and title.strip():
            data["title"] = title
        if description and description.strip():
            data["description"] = description
            
        message = {
            "id": str(uuid.uuid4()),
            "type": "todo_action",
            "timestamp": int(time.time() * 1000),
            "source": "mcp",
            "target": "todo_component",
            "component": "todo",
            "payload": {
                "action": "update",
                "todoId": todo_id,
                "data": data
            }
        }
        
        await redis_client.publish_message("todo:actions", message)
        return {"success": True, "message": f"Todo {todo_id} updated successfully"}
    
    @mcp.tool()
    async def toggle_todo(todo_id: str) -> dict:
        """切换 todo 完成状态
        
        Args:
            todo_id: Todo 项的 ID
            
        Returns:
            操作结果
        """
        message = {
            "id": str(uuid.uuid4()),
            "type": "todo_action",
            "timestamp": int(time.time() * 1000),
            "source": "mcp",
            "target": "todo_component",
            "component": "todo",
            "payload": {
                "action": "toggle",
                "todoId": todo_id
            }
        }
        
        await redis_client.publish_message("todo:actions", message)
        return {"success": True, "message": f"Todo {todo_id} status toggled successfully"}
    
    @mcp.tool()
    async def list_todo() -> dict:
        """获取所有 todo 项列表
        
        Returns:
            包含所有 todo 项的列表
        """
        import httpx
        
        message = {
            "id": str(uuid.uuid4()),
            "type": "todo_action",
            "timestamp": int(time.time() * 1000),
            "source": "mcp",
            "target": "todo_component",
            "component": "todo",
            "payload": {
                "action": "list"
            }
        }
        
        await redis_client.publish_message("todo:actions", message)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get("http://backend:8000/api/todos")
                response.raise_for_status()
                todos_data = response.json()
                
                return {
                    "success": True,
                    "todos": todos_data,
                    "count": len(todos_data)
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get todos: {str(e)}",
                "todos": []
            }
