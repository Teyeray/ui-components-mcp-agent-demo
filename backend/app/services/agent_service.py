"""Agent service — runs ADK LlmAgent directly inside the backend process."""

import os
from typing import Any

# Force local connections to bypass any system HTTP proxy
for _var in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY",
             "http_proxy", "https_proxy", "all_proxy"):
    os.environ.pop(_var, None)
os.environ["NO_PROXY"] = "localhost,127.0.0.1,::1"
os.environ["no_proxy"] = "localhost,127.0.0.1,::1"

from google.adk.agents import LlmAgent
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import FunctionTool
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, SseConnectionParams
from google.genai import types


async def deep_research(query: str) -> str:
    """Deep research placeholder — not yet implemented."""
    return f"[deep_research] This tool is not yet implemented. Query received: {query}"


def _serialize_event(event: Any) -> dict:
    """Convert an ADK Event to a plain dict the frontend can parse."""
    result: dict = {
        "author": getattr(event, "author", None),
        "partial": getattr(event, "partial", False),
        "error_message": getattr(event, "error_message", None),
    }

    content = getattr(event, "content", None)
    if content:
        parts = []
        for part in getattr(content, "parts", None) or []:
            p: dict = {}

            text = getattr(part, "text", None)
            if text:
                p["text"] = text

            thought = getattr(part, "thought", None)
            if thought:
                p["thought"] = thought

            fc = getattr(part, "function_call", None)
            if fc:
                p["functionCall"] = {
                    "name": fc.name,
                    "args": dict(fc.args or {}),
                    "id": getattr(fc, "id", None),
                }

            fr = getattr(part, "function_response", None)
            if fr:
                resp = fr.response
                if hasattr(resp, "items"):        # dict-like
                    resp = dict(resp)
                elif not isinstance(resp, (str, int, float, bool, list, type(None))):
                    resp = str(resp)
                p["functionResponse"] = {
                    "name": fr.name,
                    "response": resp,
                    "id": getattr(fr, "id", None),
                }

            if p:
                parts.append(p)

        result["content"] = {
            "role": getattr(content, "role", None),
            "parts": parts,
        }

    return result


class AgentService:
    """Lazy-initialised agent runner. Created once, reused across requests."""

    APP_NAME = "backend_agent"
    USER_ID = "user"

    def __init__(self):
        self._session_service = InMemorySessionService()
        self._runner: Runner | None = None

    def _build_runner(self) -> Runner:
        mcp_url = os.getenv("MCP_SERVER_URL", "http://127.0.0.1:8001")
        mcp_toolset = MCPToolset(
            connection_params=SseConnectionParams(
                url=f"{mcp_url}/sse",
                headers={},
            ),
            tool_filter=["ls", "cat_run_sh", "bash_run_sh"],
        )

        agent = LlmAgent(
            model=LiteLlm(
                model=os.getenv("LLM_MODEL", "deepseek/deepseek-chat"),
                api_key=os.getenv("DEEPSEEK_API_KEY", "sk-21860843e2d74e5eb52060b6a04880f4"),
                api_base=os.getenv("LLM_API_BASE", "https://api.deepseek.com/v1"),
            ),
            name="assistant",
            instruction=(
                "You are a helpful assistant that can manage todo items. "
                "You can add, update, delete, and toggle todo items using the available MCP tools. "
                "Always be helpful and provide clear feedback about the actions you take."
            ),
            tools=[mcp_toolset, FunctionTool(deep_research)],
        )

        return Runner(
            app_name=self.APP_NAME,
            agent=agent,
            session_service=self._session_service,
        )

    async def _ensure_session(self, session_id: str) -> None:
        existing = await self._session_service.get_session(
            app_name=self.APP_NAME,
            user_id=self.USER_ID,
            session_id=session_id,
        )
        if existing is None:
            await self._session_service.create_session(
                app_name=self.APP_NAME,
                user_id=self.USER_ID,
                session_id=session_id,
                state={},
            )

    async def stream(self, message: str, session_id: str = "default"):
        """Yield serialised ADK events one by one as they arrive."""
        if self._runner is None:
            self._runner = self._build_runner()
        await self._ensure_session(session_id)

        content = types.Content(role="user", parts=[types.Part(text=message)])
        run_config = RunConfig(streaming_mode=StreamingMode.SSE)
        async for event in self._runner.run_async(
            session_id=session_id,
            user_id=self.USER_ID,
            new_message=content,
            run_config=run_config,
        ):
            yield _serialize_event(event)
