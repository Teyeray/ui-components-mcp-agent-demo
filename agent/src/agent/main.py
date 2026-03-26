"""
Google ADK Agent for UI Component Demo

This agent connects to the existing MCP server and provides AI-powered
control of the todo list component.
"""

import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, SseConnectionParams
from dotenv import load_dotenv
from google.adk.models.lite_llm import LiteLlm

load_dotenv()

def create_agent():
    """Create and configure the ADK agent with MCP tools."""
    
    #mcp_server_url = os.getenv("MCP_SERVER_URL", "http://mcp-server:8001")
    mcp_server_url = 'http://localhost:50001'
    mcp_toolset = MCPToolset(
        connection_params=SseConnectionParams(
            url=f"{mcp_server_url}/sse",
            headers={}
        ),
        tool_filter=["add_todo", "delete_todo", "update_todo", "toggle_todo", "list_todo", 
                    "add_backlog", "delete_backlog", "update_backlog", "send_backlog_to_todo", "list_backlog",
                    "ls", "cat_run_sh", "bash_run_sh"]
    )
    print(f"model: {os.getenv('LLM_MODEL')}")
    # print(f"api_key: {os.getenv('OPENAI_API_KEY')}")
    # print(f"api_base: {os.getenv('OPENAI_API_BASE_URL')}")
    model_name = os.getenv("LLM_MODEL", "deepseek/deepseek-chat")
    api_key = os.getenv("DEEPSEEK_API_KEY")
    
    if not api_key:
        api_key = 'sk-01544962cea0408591555fd1d71d209d'
        print("Warning: DEEPSEEK_API_KEY not set in environment, using default key. Please set your own API key for production use.")
        #raise ValueError("DEEPSEEK_API_KEY environment variable is required")
    
    agent = LlmAgent(
        model=LiteLlm(
            model=os.getenv("LLM_MODEL", "deepseek/deepseek-chat"),
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            api_base="https://api.deepseek.com/v1"
        ),
        name="todo_assistant_agent",
        instruction="""You are a helpful assistant that can manage todo items. 
        You can add, update, delete, and toggle todo items using the available MCP tools.
        Always be helpful and provide clear feedback about the actions you take.""",
        tools=[mcp_toolset]
    )

    return agent

root_agent = create_agent()
