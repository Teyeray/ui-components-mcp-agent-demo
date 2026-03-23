"""SSE events router."""

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

router = APIRouter()


@router.get("/events")
async def stream_events(request: Request):
    """Stream SSE events to clients."""

    #TODO register to fastapi sdk(dp.agent.ui.backend.fastapi)
    sse_service = request.app.state.sse_service
    
    return StreamingResponse(
        sse_service.event_stream(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )
