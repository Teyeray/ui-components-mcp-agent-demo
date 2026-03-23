"""Backlog component MCP tools."""

import time
import uuid
from typing import Optional

from fastmcp import FastMCP

from ..redis_client import RedisClient

def register_backlog_tools(mcp: FastMCP, redis_client: RedisClient):
    """Register backlog-related MCP tools."""
    
    @mcp.tool()
    async def add_backlog(title: str, description: str = "") -> dict:
        """添加新的 backlog 项
        
        Args:
            title: Backlog 标题
            description: Backlog 描述 (可选)
            
        Returns:
            操作结果
        """
        message = {
            "id": str(uuid.uuid4()),
            "type": "backlog_action",
            "timestamp": int(time.time() * 1000),
            "source": "mcp",
            "target": "backlog_component",
            "component": "backlog",
            "payload": {
                "action": "add",
                "data": {
                    "title": title,
                    "description": description
                }
            }
        }
        
        await redis_client.publish_message("backlog:actions", message)
        return {"success": True, "message": f"Backlog '{title}' added successfully"}
    
    @mcp.tool()
    async def delete_backlog(backlog_id: str) -> dict:
        """删除指定的 backlog 项
        
        Args:
            backlog_id: Backlog 项的 ID
            
        Returns:
            操作结果
        """
        message = {
            "id": str(uuid.uuid4()),
            "type": "backlog_action",
            "timestamp": int(time.time() * 1000),
            "source": "mcp",
            "target": "backlog_component",
            "component": "backlog",
            "payload": {
                "action": "delete",
                "backlogId": backlog_id
            }
        }
        
        await redis_client.publish_message("backlog:actions", message)
        return {"success": True, "message": f"Backlog {backlog_id} deleted successfully"}
    
    @mcp.tool()
    async def update_backlog(
        backlog_id: str, 
        title: str = "", 
        description: str = ""
    ) -> dict:
        """更新 backlog 项内容
        
        Args:
            backlog_id: Backlog 项的 ID
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
            "type": "backlog_action",
            "timestamp": int(time.time() * 1000),
            "source": "mcp",
            "target": "backlog_component",
            "component": "backlog",
            "payload": {
                "action": "update",
                "backlogId": backlog_id,
                "data": data
            }
        }
        
        await redis_client.publish_message("backlog:actions", message)
        return {"success": True, "message": f"Backlog {backlog_id} updated successfully"}
    
    @mcp.tool()
    async def send_backlog_to_todo(backlog_id: str) -> dict:
        """将 backlog 项发送到 todo 列表
        
        Args:
            backlog_id: Backlog 项的 ID
            
        Returns:
            操作结果
        """
        message = {
            "id": str(uuid.uuid4()),
            "type": "backlog_action",
            "timestamp": int(time.time() * 1000),
            "source": "mcp",
            "target": "backlog_component",
            "component": "todo",
            "payload": {
                "action": "send_to_todo",
                "backlogId": backlog_id
            }
        }
        
        await redis_client.publish_message("backlog:actions", message)
        return {"success": True, "message": f"Backlog {backlog_id} sent to todo successfully"}
    
    @mcp.tool()
    async def list_backlog() -> dict:
        """获取所有 backlog 项列表
        
        Returns:
            包含所有 backlog 项的列表
        """
        import httpx
        
        message = {
            "id": str(uuid.uuid4()),
            "type": "backlog_action",
            "timestamp": int(time.time() * 1000),
            "source": "mcp",
            "target": "backlog_component",
            "component": "backlog",
            "payload": {
                "action": "list"
            }
        }
        
        await redis_client.publish_message("backlog:actions", message)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get("http://backend:8000/api/backlogs")
                response.raise_for_status()
                backlogs_data = response.json()
                
                return {
                    "success": True,
                    "backlogs": backlogs_data,
                    "count": len(backlogs_data)
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get backlogs: {str(e)}",
                "backlogs": []
            }
