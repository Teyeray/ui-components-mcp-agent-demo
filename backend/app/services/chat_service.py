"""Chat service — routes agent events through Redis per session."""

import asyncio
import json
import uuid
from datetime import datetime
from typing import AsyncIterator

from fastapi import Request


def _new_id() -> str:
    return uuid.uuid4().hex[:8]


class ChatService:
    """Manages chat sessions and routes agent events via Redis Pub/Sub."""

    SESSIONS_KEY = "chat:sessions"

    def __init__(self, redis_service, agent_service):
        self._redis = redis_service
        self._agent = agent_service

    # ── Redis helper ───────────────────────────────────────────────────────

    @property
    def _r(self):
        return self._redis.redis

    def _channel(self, session_id: str) -> str:
        return f"chat:{session_id}:events"

    def _history_key(self, session_id: str) -> str:
        return f"chat:{session_id}:history"

    # ── Session CRUD ───────────────────────────────────────────────────────

    async def create_session(self, name: str | None = None) -> dict:
        sid = _new_id()
        now = datetime.now().isoformat()
        meta = {"id": sid, "name": name or "新对话", "created_at": now}
        await self._r.hset(self.SESSIONS_KEY, sid, json.dumps(meta))
        return meta

    async def list_sessions(self) -> list[dict]:
        raw = await self._r.hgetall(self.SESSIONS_KEY)
        sessions = [json.loads(v) for v in raw.values()]
        return sorted(sessions, key=lambda s: s["created_at"])

    async def rename_session(self, session_id: str, name: str) -> bool:
        raw = await self._r.hget(self.SESSIONS_KEY, session_id)
        if not raw:
            return False
        meta = json.loads(raw)
        meta["name"] = name
        await self._r.hset(self.SESSIONS_KEY, session_id, json.dumps(meta))
        return True

    async def delete_session(self, session_id: str) -> bool:
        deleted = await self._r.hdel(self.SESSIONS_KEY, session_id)
        await self._r.delete(self._history_key(session_id))
        return bool(deleted)

    # ── History ────────────────────────────────────────────────────────────

    async def get_history(self, session_id: str) -> list[dict]:
        items = await self._r.lrange(self._history_key(session_id), 0, -1)
        return [json.loads(i) for i in items]

    async def _save_to_history(self, session_id: str, role: str, content: str):
        entry = json.dumps({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
        })
        await self._r.rpush(self._history_key(session_id), entry)

    # ── Message handling ───────────────────────────────────────────────────

    async def send_message(self, session_id: str, message: str):
        """Save user message and kick off agent in background."""
        await self._save_to_history(session_id, "user", message)
        asyncio.create_task(self._run_agent(session_id, message))

    async def _run_agent(self, session_id: str, message: str):
        channel = self._channel(session_id)
        response_text = ""

        async def pub(payload: dict):
            await self._r.publish(channel, json.dumps(payload))

        try:
            async for event in self._agent.stream(message, session_id):
                await pub({"type": "event", "data": event})
                # accumulate plain text for history
                for part in event.get("content", {}).get("parts", []):
                    if part.get("text") and not part.get("thought"):
                        response_text += part["text"]
        except Exception as e:
            await pub({"type": "error", "message": str(e)})
        finally:
            if response_text:
                await self._save_to_history(session_id, "assistant", response_text)
            await pub({"type": "done"})

    # ── SSE stream ─────────────────────────────────────────────────────────

    async def stream_session(
        self, session_id: str, request: Request
    ) -> AsyncIterator[str]:
        """Subscribe to Redis channel and yield raw SSE data strings."""
        channel = self._channel(session_id)
        pubsub = self._r.pubsub()
        await pubsub.subscribe(channel)

        try:
            async for msg in pubsub.listen():
                if await request.is_disconnected():
                    break
                if msg["type"] == "message":
                    yield msg["data"]
        finally:
            try:
                await pubsub.unsubscribe(channel)
                await pubsub.aclose()
            except Exception:
                pass
