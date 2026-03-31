import json
from fastapi import WebSocket, WebSocketDisconnect
from app.auth.jwt_handler import decode_token


class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, set[WebSocket]] = {}  # channel → websockets
        self.user_channels: dict[str, set[str]] = {}  # user_id → channels
        self.user_sockets: dict[str, set[WebSocket]] = {}  # user_id → websockets

    async def connect(self, websocket: WebSocket, user_id: str, channels: list[str]):
        await websocket.accept()
        if user_id not in self.user_sockets:
            self.user_sockets[user_id] = set()
        self.user_sockets[user_id].add(websocket)

        if user_id not in self.user_channels:
            self.user_channels[user_id] = set()

        for channel in channels:
            self.user_channels[user_id].add(channel)
            if channel not in self.connections:
                self.connections[channel] = set()
            self.connections[channel].add(websocket)

    async def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.user_sockets:
            self.user_sockets[user_id].discard(websocket)
        for channel, sockets in self.connections.items():
            sockets.discard(websocket)
        if user_id in self.user_channels:
            del self.user_channels[user_id]

    async def broadcast_to_channel(self, channel: str, event: dict):
        sockets = self.connections.get(channel, set())
        dead = set()
        for ws in sockets:
            try:
                await ws.send_json(event)
            except Exception:
                dead.add(ws)
        for ws in dead:
            sockets.discard(ws)

    async def broadcast_to_user(self, user_id: str, event: dict):
        sockets = self.user_sockets.get(user_id, set())
        dead = set()
        for ws in sockets:
            try:
                await ws.send_json(event)
            except Exception:
                dead.add(ws)
        for ws in dead:
            sockets.discard(ws)


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return

    payload = decode_token(token)
    if not payload:
        await websocket.close(code=1008, reason="Invalid token")
        return

    user_id = payload.get("sub")
    role = payload.get("role")

    # Auto-subscribe based on role
    channels = [f"user:{user_id}"]
    if role in ("LOGISTICS_MANAGER", "ADMIN"):
        channels.extend(["alert:high", "alert:critical"])
    elif role == "PORT_OFFICER":
        port_id = payload.get("assigned_port_id", "")
        if port_id:
            channels.append(f"port:{port_id}")
    elif role == "YARD_MANAGER":
        port_id = payload.get("assigned_port_id", "")
        if port_id:
            channels.append(f"yard:{port_id}")

    await manager.connect(websocket, user_id, channels)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            # Handle client subscribing to additional channels
            if msg.get("action") == "subscribe":
                channel = msg.get("channel")
                if channel:
                    if channel not in manager.connections:
                        manager.connections[channel] = set()
                    manager.connections[channel].add(websocket)
                    manager.user_channels[user_id].add(channel)
    except WebSocketDisconnect:
        await manager.disconnect(websocket, user_id)
    except Exception:
        await manager.disconnect(websocket, user_id)
