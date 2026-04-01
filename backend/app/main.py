from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.services.graph_service import graph_service
from app.services.event_service import websocket_endpoint


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Connecting to Neo4j...")
    try:
        await graph_service.connect()
        await graph_service.setup_constraints()
        print("Neo4j connected, constraints set up")
    except Exception as e:
        print(f"WARNING: Neo4j connection failed: {e}")
    yield
    # Shutdown
    await graph_service.disconnect()
    print("Neo4j disconnected")


app = FastAPI(
    title="Cognitive Twin — Logistics Platform",
    description="Graph-based logistics management with AI decision engine",
    version="2.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and register routers
from app.routers import auth, shipments, workflow, documents, notifications, users, ports, vessels, containers, yard, system, analytics  # noqa: E402

app.include_router(auth.router)
app.include_router(shipments.router)
app.include_router(workflow.router)
app.include_router(documents.router)
app.include_router(notifications.router)
app.include_router(users.router)
app.include_router(ports.router)
app.include_router(vessels.router)
app.include_router(containers.router)
app.include_router(yard.router)
app.include_router(system.router)
app.include_router(analytics.router)

# WebSocket
app.add_api_websocket_route("/api/ws/stream", websocket_endpoint)
