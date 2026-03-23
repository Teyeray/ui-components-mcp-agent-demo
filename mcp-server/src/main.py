"""
MCP Server for UI Component Demo

This server provides MCP tools for controlling UI components through Redis messaging.
"""

import asyncio
import json
import os
from typing import Optional

from fastmcp import FastMCP
from redis.asyncio import Redis
from mcp.server.session import ServerSession

from .redis_client import RedisClient
from .tools.todo_tools import register_todo_tools
from .tools.backlog_tools import register_backlog_tools
from .tools.terminal_tools import register_terminal_tools

old_received_request = ServerSession._received_request

async def _received_request_wrapper(self, *args, **kwargs):
    try:
        return await old_received_request(self, *args, **kwargs)
    except RuntimeError as e:
        if "Received request before initialization was complete" in str(e):
            print(f"WARNING: Ignoring initialization error: {e}")
            return
        raise

ServerSession._received_request = _received_request_wrapper


def main():
    """Main entry point for the MCP server."""
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    port = int(os.getenv("MCP_PORT", "8001"))
    
    mcp = FastMCP("ui-component-demo")
    
    redis_client = RedisClient(redis_url)
    register_todo_tools(mcp, redis_client)
    register_backlog_tools(mcp, redis_client)
    register_terminal_tools(mcp, redis_client)
    
    print(f"Starting MCP server on port {port} with SSE transport")
    
    mcp.run(transport="sse", host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
