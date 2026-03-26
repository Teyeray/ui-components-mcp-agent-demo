"""Chat API router — session management + Redis-backed SSE streaming."""

import json
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from ..dependencies import get_current_user

router = APIRouter()

CurrentUser = Annotated[dict, Depends(get_current_user)]


def _chat(request: Request):
    return request.app.state.chat_service


# ── Sessions ───────────────────────────────────────────────────────────────

@router.get("/sessions")
async def list_sessions(request: Request, user: CurrentUser):
    return await _chat(request).list_sessions(user["user_id"])


@router.post("/sessions")
async def create_session(request: Request, user: CurrentUser):
    body = {}
    if request.headers.get("content-type", "").startswith("application/json"):
        body = await request.json()
    name = body.get("name") if isinstance(body, dict) else None
    return await _chat(request).create_session(user["user_id"], name)


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, request: Request, user: CurrentUser):
    ok = await _chat(request).delete_session(user["user_id"], session_id)
    return {"ok": ok}


@router.patch("/sessions/{session_id}")
async def rename_session(session_id: str, request: Request, user: CurrentUser):
    body = await request.json()
    ok = await _chat(request).rename_session(user["user_id"], session_id, body.get("name", ""))
    return {"ok": ok}


# ── History ────────────────────────────────────────────────────────────────

@router.get("/sessions/{session_id}/history")
async def get_history(session_id: str, request: Request, user: CurrentUser):
    return await _chat(request).get_history(user["user_id"], session_id)


# ── Message + SSE stream ───────────────────────────────────────────────────

@router.post("/sessions/{session_id}/stream")
async def stream_session(session_id: str, request: Request, user: CurrentUser):
    """Save user message, subscribe to Redis, start agent, then stream events.

    Combining these into one request eliminates the race condition where agent
    events could be published before the SSE subscription was established.
    """
    body = await request.json()
    message = body["message"]
    chat = _chat(request)

    # Save user message to history first
    await chat.send_message(user["user_id"], session_id, message)

    async def generate():
        async for raw in chat.stream_session(user["user_id"], session_id, message, request):
            payload = json.loads(raw)
            yield f"data: {json.dumps(payload)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "X-Accel-Buffering": "no",
        },
    )
