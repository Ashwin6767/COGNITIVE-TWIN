"""WebSocket endpoint — real-time streaming to frontend clients."""
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, message: dict):
        """Send a message to all connected clients."""
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)

    @property
    def count(self):
        return len(self.active)


manager = ConnectionManager()


@router.websocket("/stream")
async def websocket_stream(ws: WebSocket):
    """Stream real-time supply chain updates to the frontend."""
    await manager.connect(ws)
    try:
        # Send welcome message with connection count
        await ws.send_json({
            "type": "connected",
            "clients": manager.count,
        })

        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                data = {"action": raw}

            msg_type = data.get("action", data.get("type", ""))

            if msg_type == "ping":
                await ws.send_json({"type": "pong"})
            elif msg_type == "subscribe":
                await ws.send_json({
                    "type": "subscribed",
                    "channel": data.get("channel", "all"),
                })
            else:
                await ws.send_json({
                    "type": "ack",
                    "received": data,
                })
    except WebSocketDisconnect:
        manager.disconnect(ws)
