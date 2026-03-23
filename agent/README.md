# Google ADK Agent Module

This module provides an AI agent powered by Google ADK that can control the todo list component through the existing MCP server.

## Features

- Connects to existing MCP server using MCPToolset
- Supports natural language commands for todo management
- Two startup modes: development (adk web) and production (API server)

## Startup Methods

### Development Mode (adk web)
```bash
./start_web.sh
```
Starts the agent with ADK's web interface for development and testing.

### Production Mode (API server)
```bash
./start_api.sh
```
Starts the agent as a FastAPI server with REST endpoints.

## Environment Variables

- `MCP_SERVER_URL`: URL of the MCP server (default: http://localhost:8001)
- `LLM_MODEL`: Language model to use (default: gemini-2.0-flash)
- `GOOGLE_API_KEY`: Required for Gemini models
