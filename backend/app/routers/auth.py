"""Auth router — register / login / me."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()


class Credentials(BaseModel):
    username: str
    password: str


def _auth(request: Request):
    return request.app.state.auth_service


@router.post("/auth/register")
async def register(body: Credentials, request: Request):
    result = await _auth(request).register(body.username, body.password)
    if result is None:
        raise HTTPException(status_code=409, detail="用户名已存在")
    return result


@router.post("/auth/login")
async def login(body: Credentials, request: Request):
    result = await _auth(request).login(body.username, body.password)
    if result is None:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    return result


@router.get("/auth/me")
async def me(request: Request):
    """Validate token and return user info."""
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="未登录")
    payload = _auth(request).decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token 无效或已过期")
    return {"user_id": payload["sub"], "username": payload["username"]}


def _extract_token(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None
