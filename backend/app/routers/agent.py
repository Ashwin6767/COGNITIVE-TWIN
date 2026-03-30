"""AI agent endpoints — Gemini-powered chat with function calling."""
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.agent_service import agent_service

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    tools_called: list[str] = []
    cached: bool = False


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a query to the AI supply chain agent."""
    result = await agent_service.chat(request.message)
    return ChatResponse(**result)
