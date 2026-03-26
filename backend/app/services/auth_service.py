"""Auth service — username/password with bcrypt + JWT."""

import json
import os
from datetime import datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = os.getenv("JWT_SECRET", "change-me-in-production-please")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30

_pwd = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

USERS_KEY = "auth:users"   # Redis hash: username -> {id, username, hashed_password}


class AuthService:
    def __init__(self, redis_service):
        self._redis = redis_service

    @property
    def _r(self):
        return self._redis.redis

    # ── Password ───────────────────────────────────────────────────────────

    def _hash(self, password: str) -> str:
        return _pwd.hash(password)

    def _verify(self, plain: str, hashed: str) -> bool:
        return _pwd.verify(plain, hashed)

    # ── JWT ────────────────────────────────────────────────────────────────

    def _make_token(self, user_id: str, username: str) -> str:
        expire = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
        return jwt.encode(
            {"sub": user_id, "username": username, "exp": expire},
            SECRET_KEY,
            algorithm=ALGORITHM,
        )

    def decode_token(self, token: str) -> dict | None:
        try:
            return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except JWTError:
            return None

    # ── User CRUD ──────────────────────────────────────────────────────────

    async def register(self, username: str, password: str) -> dict | None:
        """Returns token dict on success, None if username taken."""
        existing = await self._r.hget(USERS_KEY, username)
        if existing:
            return None
        import uuid
        user_id = uuid.uuid4().hex[:12]
        user = {"id": user_id, "username": username, "hashed_password": self._hash(password)}
        await self._r.hset(USERS_KEY, username, json.dumps(user))
        token = self._make_token(user_id, username)
        return {"token": token, "user_id": user_id, "username": username}

    async def login(self, username: str, password: str) -> dict | None:
        """Returns token dict on success, None if credentials wrong."""
        raw = await self._r.hget(USERS_KEY, username)
        if not raw:
            return None
        user = json.loads(raw)
        if not self._verify(password, user["hashed_password"]):
            return None
        token = self._make_token(user["id"], username)
        return {"token": token, "user_id": user["id"], "username": username}
