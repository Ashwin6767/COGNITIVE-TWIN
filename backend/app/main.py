import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.services.graph_service import graph_service
from app.routers import graph, simulation, agent, websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Connect to Neo4j on startup, disconnect on shutdown."""
    try:
        await graph_service.connect()
    except Exception as exc:
        print(f"⚠ Neo4j connection failed: {exc}")
        print("  Backend will start but graph queries will fail until DB is available.")
    yield
    await graph_service.close()


app = FastAPI(
    title="Cognitive Twin API",
    description="Decision-intelligence supply chain system",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS (Issue #2) ──────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        settings.frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────
app.include_router(graph.router, prefix="/api/graph", tags=["graph"])
app.include_router(simulation.router, prefix="/api/simulate", tags=["simulation"])
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
app.include_router(websocket.router, prefix="/api/ws", tags=["websocket"])


# ── System Endpoints ──────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "cognitive-twin"}


@app.post("/api/seed")
async def seed():
    from app.seed.seed_data import run_seed
    await run_seed(graph_service)
    return {"status": "seeded"}


@app.post("/api/reset")
async def reset():
    from app.seed.seed_data import run_seed
    await graph_service.run("MATCH (n) DETACH DELETE n")
    await run_seed(graph_service)
    return {"status": "reset_complete"}


@app.post("/api/heartbeat")
async def heartbeat():
    await graph_service.run(
        "MERGE (s:System {id: 'heartbeat'}) SET s.last_ping = datetime()"
    )
    return {"status": "alive"}


# ── Global Error Handler (Issue #18) ──────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    detail = str(exc) if settings.environment == "development" else "An unexpected error occurred"
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": detail},
    )
