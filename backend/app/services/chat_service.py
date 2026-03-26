"""Chat service — routes agent events through Redis per user+session."""

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

    def __init__(self, redis_service, agent_service):
        self._redis = redis_service
        self._agent = agent_service

    # ── Redis helpers ──────────────────────────────────────────────────────

    @property
    def _r(self):
        return self._redis.redis

    def _sessions_key(self, user_id: str) -> str:
        return f"chat:{user_id}:sessions"

    def _channel(self, user_id: str, session_id: str) -> str:
        return f"chat:{user_id}:{session_id}:events"

    def _history_key(self, user_id: str, session_id: str) -> str:
        return f"chat:{user_id}:{session_id}:history"

    # ── Session CRUD ───────────────────────────────────────────────────────

    async def create_session(self, user_id: str, name: str | None = None) -> dict:
        sid = _new_id()
        now = datetime.now().isoformat()
        meta = {"id": sid, "name": name or "新对话", "created_at": now}
        await self._r.hset(self._sessions_key(user_id), sid, json.dumps(meta))
        return meta

    async def list_sessions(self, user_id: str) -> list[dict]:
        raw = await self._r.hgetall(self._sessions_key(user_id))
        sessions = [json.loads(v) for v in raw.values()]
        return sorted(sessions, key=lambda s: s["created_at"])

    async def rename_session(self, user_id: str, session_id: str, name: str) -> bool:
        raw = await self._r.hget(self._sessions_key(user_id), session_id)
        if not raw:
            return False
        meta = json.loads(raw)
        meta["name"] = name
        await self._r.hset(self._sessions_key(user_id), session_id, json.dumps(meta))
        return True

    async def delete_session(self, user_id: str, session_id: str) -> bool:
        deleted = await self._r.hdel(self._sessions_key(user_id), session_id)
        await self._r.delete(self._history_key(user_id, session_id))
        return bool(deleted)

    # ── History ────────────────────────────────────────────────────────────

    async def get_history(self, user_id: str, session_id: str) -> list[dict]:
        items = await self._r.lrange(self._history_key(user_id, session_id), 0, -1)
        return [json.loads(i) for i in items]

    async def _save_to_history(self, user_id: str, session_id: str, role: str, content: str):
        entry = json.dumps({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
        })
        await self._r.rpush(self._history_key(user_id, session_id), entry)

    # ── Message handling ───────────────────────────────────────────────────

    async def send_message(self, user_id: str, session_id: str, message: str):
        """Save user message. Agent is started by stream_session to avoid race conditions."""
        await self._save_to_history(user_id, session_id, "user", message)

    async def start_agent(self, user_id: str, session_id: str, message: str):
        """Kick off agent in background. Call only after Redis subscription is established."""
        asyncio.create_task(self._run_agent(user_id, session_id, message))

    async def _run_agent(self, user_id: str, session_id: str, message: str):
        channel = self._channel(user_id, session_id)
        response_text = ""

        async def pub(payload: dict):
            await self._r.publish(channel, json.dumps(payload))

        try:
            async for event in self._agent.stream(message, f"{user_id}:{session_id}"):
                parts = event.get("content", {}).get("parts", [])
                partial = event.get("partial", False)

                # Skip final non-partial text-only events — the partial stream
                # already delivered every token; forwarding the full text again
                # would cause visible duplication on the frontend.
                has_tool = any(p.get("functionCall") or p.get("functionResponse") for p in parts)
                has_text = any(p.get("text") and not p.get("thought") for p in parts)
                if not partial and has_text and not has_tool:
                    # Accumulate for history but don't forward to frontend
                    for part in parts:
                        if part.get("text") and not part.get("thought"):
                            response_text += part["text"]
                    continue

                await pub({"type": "event", "data": event})
                if partial:
                    for part in parts:
                        if part.get("text") and not part.get("thought"):
                            response_text += part["text"]
        except Exception as e:
            await pub({"type": "error", "message": str(e)})
        finally:
            if response_text:
                await self._save_to_history(user_id, session_id, "assistant", response_text)
            await pub({"type": "done"})

    # ── SSE stream ─────────────────────────────────────────────────────────

    async def stream_session(
        self, user_id: str, session_id: str, message: str, request: Request
    ) -> AsyncIterator[str]:
        """Subscribe to Redis channel, then start agent, then yield events.

        Subscribing BEFORE starting the agent guarantees no events are missed
        even if the agent errors out immediately.
        """
        channel = self._channel(user_id, session_id)
        pubsub = self._r.pubsub()
        await pubsub.subscribe(channel)

        # Only start agent after subscription is established
        await self.start_agent(user_id, session_id, message)

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
