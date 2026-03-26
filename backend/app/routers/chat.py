"""Chat API router — session management + Redis-backed SSE streaming."""

import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

router = APIRouter()


def _chat_service(request: Request):
    return request.app.state.chat_service


# ── Sessions ───────────────────────────────────────────────────────────────

@router.get("/sessions")
async def list_sessions(request: Request):
    return await _chat_service(request).list_sessions()


@router.post("/sessions")
async def create_session(request: Request):
    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    name = body.get("name") if isinstance(body, dict) else None
    return await _chat_service(request).create_session(name)


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, request: Request):
    ok = await _chat_service(request).delete_session(session_id)
    return {"ok": ok}


@router.patch("/sessions/{session_id}")
async def rename_session(session_id: str, request: Request):
    body = await request.json()
    ok = await _chat_service(request).rename_session(session_id, body.get("name", ""))
    return {"ok": ok}


# ── History ────────────────────────────────────────────────────────────────

@router.get("/sessions/{session_id}/history")
async def get_history(session_id: str, request: Request):
    return await _chat_service(request).get_history(session_id)


# ── Message + SSE stream ───────────────────────────────────────────────────

@router.post("/sessions/{session_id}/message")
async def send_message(session_id: str, request: Request):
    body = await request.json()
    await _chat_service(request).send_message(session_id, body["message"])
    return {"ok": True}


@router.get("/sessions/{session_id}/stream")
async def stream_session(session_id: str, request: Request):
    """SSE endpoint — subscribe to the session's Redis channel."""
    chat_service = _chat_service(request)

    async def generate():
        async for raw in chat_service.stream_session(session_id, request):
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
