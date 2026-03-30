# 03 — Backend Core (FastAPI)

## Overview
FastAPI backend serving as the API layer between the Next.js frontend and Neo4j graph database. Handles graph queries, simulation, AI agent, and WebSocket connections.

## Architecture
```
Frontend (Next.js) ──REST + WS──▶ FastAPI ──Bolt──▶ Neo4j AuraDB
                                    │
                                    ├── Graph Service (Cypher queries)
                                    ├── Simulation Engine (delay/reroute)
                                    ├── AI Agent (Gemini + tools)
                                    └── Risk Service (scoring)
```

## Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry + CORS + lifespan
│   ├── config.py               # Environment config (pydantic-settings)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── shipment.py         # Shipment Pydantic models
│   │   ├── vessel.py           # Vessel Pydantic models
│   │   ├── port.py             # Port Pydantic models
│   │   └── simulation.py       # Simulation request/response models
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── graph.py            # Graph CRUD endpoints
│   │   ├── simulation.py       # Simulation endpoints
│   │   ├── agent.py            # AI agent chat endpoint
│   │   └── websocket.py        # Real-time updates
│   ├── services/
│   │   ├── __init__.py
│   │   ├── graph_service.py    # Neo4j queries
│   │   ├── simulation_engine.py# Core simulation logic
│   │   ├── agent_service.py    # Gemini agent + tools
│   │   └── risk_service.py     # Risk scoring
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── query_tools.py      # Graph query tools for agent
│   │   ├── simulation_tools.py # Simulation tools for agent
│   │   └── decision_tools.py   # Reroute/recommendation tools
│   └── seed/
│       ├── __init__.py
│       └── seed_data.py        # Neo4j seed script
├── tests/
├── requirements.txt
├── .env.example
└── Dockerfile
```

## Step 1: Application Entry Point (main.py)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.services.graph_service import graph_service
from app.routers import graph, simulation, agent, websocket

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect to Neo4j
    await graph_service.connect()
    yield
    # Shutdown: close Neo4j connection
    await graph_service.close()

app = FastAPI(
    title="Cognitive Twin API",
    description="Decision-intelligence supply chain system",
    version="0.1.0",
    lifespan=lifespan
)

# CORS — CRITICAL: without this, frontend cannot call backend
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

# Register routers
app.include_router(graph.router, prefix="/api/graph", tags=["graph"])
app.include_router(simulation.router, prefix="/api/simulate", tags=["simulation"])
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
app.include_router(websocket.router, prefix="/api/ws", tags=["websocket"])

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
    await graph_service.run("MATCH (n) DETACH DELETE n")
    from app.seed.seed_data import run_seed
    await run_seed(graph_service)
    return {"status": "reset_complete"}

@app.post("/api/heartbeat")
async def heartbeat():
    await graph_service.run(
        "MERGE (s:System {id: 'heartbeat'}) SET s.last_ping = datetime()"
    )
    return {"status": "alive"}
```

## Step 2: Configuration (config.py)
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    neo4j_uri: str
    neo4j_user: str = "neo4j"
    neo4j_password: str
    gemini_api_key: str
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"
    demo_mode: bool = False  # Serve pre-computed responses when True

    class Config:
        env_file = ".env"

settings = Settings()
```

## Step 3: Pydantic Models

### Port Model (models/port.py)
```python
from pydantic import BaseModel
from typing import Optional

class Port(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    congestion_level: str  # LOW | MEDIUM | HIGH | CRITICAL
    avg_delay_hours: float
    capacity_teu: int
    current_utilization: float

class PortImpact(BaseModel):
    port: Port
    affected_vessels: list
    affected_shipments: list
    total_cargo_value_usd: float
    estimated_delay_hours: float
```

### Shipment Model (models/shipment.py)
```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class Shipment(BaseModel):
    id: str
    origin: str
    destination: str
    priority: str  # HIGH | MEDIUM | LOW
    eta: Optional[datetime] = None
    status: str  # IN_TRANSIT | DELAYED | DELIVERED | REROUTED
    cargo_type: str
    weight_tons: Optional[float] = None
    value_usd: Optional[float] = None
    vessel_id: Optional[str] = None
```

### Vessel Model (models/vessel.py)
```python
from pydantic import BaseModel
from typing import Optional

class Vessel(BaseModel):
    id: str
    name: str
    current_lat: float
    current_lng: float
    capacity_teu: int
    current_load_teu: int
    speed_knots: float
    status: str  # EN_ROUTE | DOCKED | IDLE
```

### Simulation Models (models/simulation.py)
```python
from pydantic import BaseModel
from typing import Optional

class DelaySimulationRequest(BaseModel):
    port_id: str
    delay_hours: float

class RerouteSimulationRequest(BaseModel):
    shipment_id: str
    target_port_id: Optional[str] = None

class CongestionSimulationRequest(BaseModel):
    port_id: str
    new_level: str  # LOW | MEDIUM | HIGH | CRITICAL

class ScenarioCompareRequest(BaseModel):
    scenario_a: DelaySimulationRequest
    scenario_b: DelaySimulationRequest

class AffectedShipment(BaseModel):
    shipment_id: str
    original_eta: Optional[str] = None
    new_eta: Optional[str] = None
    delay_hours: float
    priority: str
    priority_impact: str  # LOW | MEDIUM | HIGH | CRITICAL

class Recommendation(BaseModel):
    action: str  # REROUTE | RESCHEDULE | REASSIGN | HOLD
    shipment_id: str
    description: str
    time_saved_hours: Optional[float] = None
    confidence: float  # 0.0 - 1.0

class SimulationResult(BaseModel):
    affected_shipments: list[AffectedShipment]
    cascades: list[dict]
    recommendations: list[Recommendation]
    total_impact_hours: float
```

## Step 4: Graph Service (services/graph_service.py)
Full implementation with all query methods needed by the routers.

```python
from neo4j import AsyncGraphDatabase
from app.config import settings
from typing import Optional

class GraphService:
    def __init__(self):
        self._driver = None

    async def connect(self):
        self._driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password)
        )
        # Verify connectivity
        async with self._driver.session() as session:
            await session.run("RETURN 1")

    async def close(self):
        if self._driver:
            await self._driver.close()

    async def run(self, query: str, **params):
        async with self._driver.session() as session:
            result = await session.run(query, **params)
            return [record.data() async for record in result]

    # --- Port queries ---
    async def get_all_ports(self):
        return await self.run("MATCH (p:Port) RETURN p ORDER BY p.id")

    async def get_port(self, port_id: str):
        results = await self.run("MATCH (p:Port {id: $port_id}) RETURN p", port_id=port_id)
        return results[0]["p"] if results else None

    async def get_port_impact(self, port_id: str):
        return await self.run("""
            MATCH (p:Port {id: $port_id})
            OPTIONAL MATCH (v:Vessel)-[:ARRIVING_AT]->(p)
            OPTIONAL MATCH (s:Shipment)-[:ASSIGNED_TO]->(v)
            RETURN p, collect(DISTINCT v) as vessels, collect(DISTINCT s) as shipments
        """, port_id=port_id)

    # --- Vessel queries ---
    async def get_all_vessels(self):
        return await self.run("MATCH (v:Vessel) RETURN v ORDER BY v.id")

    # --- Shipment queries ---
    async def get_all_shipments(self):
        return await self.run("""
            MATCH (s:Shipment)
            OPTIONAL MATCH (s)-[:ASSIGNED_TO]->(v:Vessel)
            RETURN s, v.id as vessel_id ORDER BY s.id
        """)

    async def get_shipments_by_port(self, port_id: str):
        return await self.run("""
            MATCH (s:Shipment)-[:ASSIGNED_TO]->(v:Vessel)-[:ARRIVING_AT]->(p:Port {id: $port_id})
            RETURN s, v ORDER BY s.priority
        """, port_id=port_id)

    # --- Route queries ---
    async def find_alternate_routes(self, from_port_id: str, exclude_port_id: str):
        return await self.run("""
            MATCH (from:Port {id: $from_port_id})-[:ROUTES_TO]->(alt:Port)
            WHERE alt.id <> $exclude_port_id AND alt.congestion_level IN ['LOW', 'MEDIUM']
            RETURN alt ORDER BY alt.avg_delay_hours ASC
        """, from_port_id=from_port_id, exclude_port_id=exclude_port_id)

    # --- Overview ---
    async def get_graph_overview(self):
        return await self.run("""
            MATCH (p:Port) WITH count(p) as ports
            MATCH (v:Vessel) WITH ports, count(v) as vessels
            MATCH (s:Shipment) WITH ports, vessels, count(s) as shipments
            RETURN ports, vessels, shipments
        """)

graph_service = GraphService()
```

## Step 5: API Routers

### Graph Router (routers/graph.py)
```python
from fastapi import APIRouter, HTTPException
from app.services.graph_service import graph_service

router = APIRouter()

@router.get("/ports")
async def list_ports():
    return await graph_service.get_all_ports()

@router.get("/vessels")
async def list_vessels():
    return await graph_service.get_all_vessels()

@router.get("/shipments")
async def list_shipments():
    return await graph_service.get_all_shipments()

@router.get("/shipments/by-port/{port_id}")
async def shipments_by_port(port_id: str):
    return await graph_service.get_shipments_by_port(port_id)

@router.get("/port/{port_id}/impact")
async def port_impact(port_id: str):
    result = await graph_service.get_port_impact(port_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Port {port_id} not found")
    return result[0]

@router.get("/overview")
async def graph_overview():
    return await graph_service.get_graph_overview()
```

### Full endpoint table:

#### Graph Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/graph/ports` | List all ports with status |
| GET | `/api/graph/vessels` | List all vessels with position |
| GET | `/api/graph/shipments` | List all shipments with status |
| GET | `/api/graph/shipments/by-port/{port_id}` | Shipments arriving at port |
| GET | `/api/graph/port/{port_id}/impact` | Impact analysis for a port |
| GET | `/api/graph/overview` | Full graph state summary |

#### Simulation Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/simulate/delay` | Simulate port delay propagation |
| POST | `/api/simulate/reroute` | Simulate rerouting a shipment |
| POST | `/api/simulate/congestion` | Simulate congestion level change |
| POST | `/api/simulate/compare` | Compare two scenarios side-by-side |

#### Agent Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/agent/chat` | Send query to AI agent |
| WS | `/api/ws/stream` | Stream agent responses via WebSocket |

#### System Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/seed` | Seed the graph with demo data |
| GET | `/api/health` | Health check |
| POST | `/api/reset` | Reset graph to initial state |
| POST | `/api/heartbeat` | Prevent Neo4j auto-pause |

## Step 6: Global Error Handling

```python
# Add to main.py
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.environment == "development" else "An error occurred"
        }
    )
```

## Step 7: Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## API Response Formats

### Port Response
```json
{
  "p": {
    "id": "P001",
    "name": "Port of Shanghai",
    "lat": 31.23,
    "lng": 121.47,
    "congestion_level": "HIGH",
    "avg_delay_hours": 4.5,
    "capacity_teu": 40000,
    "current_utilization": 0.85
  }
}
```

### Simulation Response
```json
{
  "affected_shipments": [
    {
      "shipment_id": "S001",
      "original_eta": "2026-04-10T08:00:00Z",
      "new_eta": "2026-04-10T14:00:00Z",
      "delay_hours": 6.0,
      "priority": "HIGH",
      "priority_impact": "CRITICAL"
    }
  ],
  "cascades": [],
  "recommendations": [
    {
      "action": "REROUTE",
      "shipment_id": "S001",
      "description": "Reroute through Port of Singapore",
      "time_saved_hours": 4.0,
      "confidence": 0.85
    }
  ],
  "total_impact_hours": 18.0
}
```

## Checklist
- [ ] main.py with CORS, lifespan, routers, error handler
- [ ] config.py with pydantic-settings
- [ ] All Pydantic models defined
- [ ] Graph service with all query methods
- [ ] Graph router with all endpoints
- [ ] Simulation router (skeleton)
- [ ] Agent router (skeleton)
- [ ] Seed, reset, heartbeat endpoints
- [ ] Dockerfile
- [ ] `uvicorn app.main:app --reload` starts without errors
- [ ] `/api/health` returns 200

## Common Pitfalls
1. ⚠️ Missing CORS middleware — frontend will fail to connect (Issue #2)
2. ⚠️ No global exception handler — raw 500 errors leak details (Issue #18)
3. ⚠️ Must use async Neo4j driver with FastAPI
4. ⚠️ Lifespan context manager needed for startup/shutdown of Neo4j connection
5. ⚠️ Need `pydantic-settings` package (not just `pydantic`) for Settings class
