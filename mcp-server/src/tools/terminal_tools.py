"""Terminal component MCP tools."""

import time
import uuid
from typing import Optional

from fastmcp import FastMCP

from ..redis_client import RedisClient

def register_terminal_tools(mcp: FastMCP, redis_client: RedisClient):
    """Register terminal-related MCP tools."""
    
    @mcp.tool()
    async def ls() -> dict:
        """列出当前目录的文件和文件夹
        
        Returns:
            操作结果和文件列表
        """
        message = {
            "id": str(uuid.uuid4()),
            "type": "terminal_action",
            "timestamp": int(time.time() * 1000),
            "source": "mcp",
            "target": "terminal_component",
            "component": "terminal",
            "payload": {
                "action": "ls",
                "command": "ls -la",
                "output": "total 24\ndrwxr-xr-x  3 user user 4096 Jun 23 13:52 .\ndrwxr-xr-x  5 user user 4096 Jun 23 13:50 ..\n-rw-r--r--  1 user user  156 Jun 23 13:52 run.sh\n-rw-r--r--  1 user user  245 Jun 23 13:51 README.md\ndrwxr-xr-x  2 user user 4096 Jun 23 13:52 logs"
            }
        }
        
        await redis_client.publish_message("terminal:actions", message)
        return {"success": True, "message": "ls command executed successfully", "output": message["payload"]["output"]}
    
    @mcp.tool()
    async def cat_run_sh() -> dict:
        """查看 run.sh 文件内容
        
        Returns:
            操作结果和文件内容
        """
        message = {
            "id": str(uuid.uuid4()),
            "type": "terminal_action",
            "timestamp": int(time.time() * 1000),
            "source": "mcp",
            "target": "terminal_component",
            "component": "terminal",
            "payload": {
                "action": "cat",
                "command": "cat run.sh",
                "file": "run.sh",
                "output": "#!/bin/bash\n\necho \"Starting application...\"\necho \"Current time: $(date)\"\necho \"Running environment checks...\"\n\n# Check if required services are running\nif pgrep -x \"redis-server\" > /dev/null; then\n    echo \"✓ Redis is running\"\nelse\n    echo \"✗ Redis is not running\"\nfi\n\necho \"Application started successfully!\""
            }
        }
        
        await redis_client.publish_message("terminal:actions", message)
        return {"success": True, "message": "cat run.sh executed successfully", "output": message["payload"]["output"]}
    
    @mcp.tool()
    async def bash_run_sh() -> dict:
        """执行 run.sh 脚本
        
        Returns:
            操作结果和执行输出
        """
        message = {
            "id": str(uuid.uuid4()),
            "type": "terminal_action",
            "timestamp": int(time.time() * 1000),
            "source": "mcp",
            "target": "terminal_component",
            "component": "terminal",
            "payload": {
                "action": "bash",
                "command": "bash run.sh",
                "file": "run.sh",
                "output": "Starting application...\nCurrent time: Mon Jun 23 13:52:24 UTC 2025\nRunning environment checks...\n✓ Redis is running\nApplication started successfully!\n\nProcess completed with exit code 0"
            }
        }
        
        await redis_client.publish_message("terminal:actions", message)
        return {"success": True, "message": "bash run.sh executed successfully", "output": message["payload"]["output"]}
