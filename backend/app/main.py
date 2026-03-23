"""
FastAPI backend service for UI Component Demo

Handles business logic, manages component state, and provides SSE events.
"""

import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import database
from .services.redis_service import RedisService
from .services.sse_service import SSEService
from .services.todo_service import TodoService
from .services.backlog_service import BacklogService
from .routers import todos, backlogs, events, health, agent


redis_service = RedisService()
sse_service = SSEService()
todo_service = TodoService()
backlog_service = BacklogService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    await database.connect()
    
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    await redis_service.connect(redis_url)
    
    asyncio.create_task(redis_service.listen_for_messages())
    
    yield
    
    await redis_service.disconnect()
    await database.disconnect()


app = FastAPI(
    title="UI Component Backend",
    description="Backend service for UI Component Demo",
    version="0.1.0",
    lifespan=lifespan
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(events.router)
app.include_router(todos.router, prefix="/api")
app.include_router(backlogs.router, prefix="/api")
app.include_router(agent.router, prefix="/api")

app.state.redis_service = redis_service
app.state.sse_service = sse_service
app.state.todo_service = todo_service
app.state.backlog_service = backlog_service


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "UI Component Backend Service", "version": "0.1.0"}
