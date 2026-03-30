# Cognitive Twin — Comprehensive Build Plan (Hackathon Edition)

> **Decision-intelligence supply chain system**: A live graph model of the supply chain that predicts disruptions and recommends optimal decisions by simulating outcomes.

---

## 0. Problem Statement

### Current Reality
- Supply chain tools show **what happened** (tracking), not **what to do next**
- Decisions are delayed, intuition-driven, and siloed across teams
- No system understands **cross-chain dependencies** to recommend actions

### Solution
> A **live graph model** of the supply chain that an AI agent can query, simulate disruptions on, and output **clear, actionable decisions** (reroute, reschedule, reassign).

### Pitch Line
> "We don't just show what's happening — we help decide what to do next."

---

## 1. Tech Stack (All Free Tier / Open Source)

| Layer | Technology | Cost | Why |
|-------|-----------|------|-----|
| **Graph DB** | Neo4j AuraDB Free | Free (200K nodes, 400K rels) | Purpose-built for relationship queries, Cypher language, free cloud instance |
| **LLM** | Google Gemini 2.5 Flash-Lite | Free (15 RPM, 1000 RPD, 250K TPM) | Best free-tier LLM, supports function calling natively |
| **Backend** | FastAPI (Python 3.11+) | Free | Async, auto-docs, fast, great for hackathons |
| **Frontend** | Next.js 15 (App Router) | Free | File-based routing, built-in best practices, optimized for Vercel |
| **Map Library** | Leaflet.js + OpenStreetMap | Free & OSS | No API key needed, fully open source |
| **Graph Viz** | react-force-graph / D3.js | Free & OSS | Interactive graph visualization |
| **Charts** | Recharts | Free & OSS | Simple, React-native charting |
| **Styling** | Tailwind CSS | Free | Rapid UI development |
| **Deployment (FE)** | Vercel | Free tier | Optimized for Next.js, zero-config deployment |
| **Deployment (BE)** | Render | Free tier (750h/month) | Free Python hosting with auto-deploy |
| **Realtime** | FastAPI WebSockets | Free | Built into FastAPI, no extra service |
| **Auth (optional)** | Clerk or none | Free tier | Skip for hackathon unless time permits |
| **Version Control** | GitHub | Free | Code hosting + CI/CD Actions |

### Alternatives Considered & Rejected
| Option | Reason Rejected |
|--------|----------------|
| OpenAI GPT-4 | Paid API, no free tier |
| AWS Neptune | No free tier for graph DB |
| Google Maps | Requires billing account; Leaflet+OSM is fully free |
| Supabase (as graph) | Not a graph DB; loses relationship modeling advantage |
| MongoDB | Can model graphs but Cypher queries are far superior for this use case |
| Streamlit (UI) | Limited interactivity; Next.js gives better demo experience + easier maintenance |
| Vite + React | No conventions, manual routing setup; Next.js has built-in routing and best practices |

---

## 2. Architecture

### 2.1 System Layers

```
┌─────────────────────────────────────────────────────┐
│                 FRONTEND (Next.js 15)                │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Map View │  │ Chat/AI  │  │ Simulation Panel  │  │
│  │ (Leaflet)│  │  Panel   │  │ + Recommendations │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
│  ┌──────────┐  ┌──────────────────────────────────┐  │
│  │  Alerts  │  │   Graph Visualization (D3/Force) │  │
│  └──────────┘  └──────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ REST + WebSocket
┌──────────────────────▼──────────────────────────────┐
│                  BACKEND (FastAPI)                    │
│  ┌──────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ API Router   │  │ AI Agent   │  │ Simulation  │  │
│  │ (REST + WS)  │  │ (Gemini)   │  │   Engine    │  │
│  └──────┬───────┘  └─────┬──────┘  └──────┬──────┘  │
│         │                │                 │          │
│  ┌──────▼────────────────▼─────────────────▼──────┐  │
│  │            Graph Service (Neo4j Driver)         │  │
│  └─────────────────────┬──────────────────────────┘  │
└────────────────────────┬────────────────────────────┘
                         │ Bolt Protocol
┌────────────────────────▼────────────────────────────┐
│              Neo4j AuraDB Free (Cloud)               │
│  Nodes: Shipment, Vessel, Port, Warehouse, Route     │
│  Relationships: ASSIGNED_TO, ARRIVING_AT, ROUTES_TO  │
└──────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
User Query (Chat or UI Action)
    ↓
FastAPI Endpoint
    ↓
AI Agent (Gemini 2.0 Flash with Function Calling)
    ↓ calls tools
┌───────────────────────────────┐
│ Tool 1: query_graph()         │ → Neo4j Cypher query
│ Tool 2: simulate_delay()      │ → Propagation engine
│ Tool 3: suggest_reroute()     │ → Graph pathfinding
│ Tool 4: get_risk_score()      │ → Risk calculation
│ Tool 5: compare_scenarios()   │ → Side-by-side sim
└───────────────────────────────┘
    ↓
Structured Decision Output (JSON)
    ↓
Frontend renders: Map + Alerts + Recommendations
```

---

## 3. Data Model (Neo4j Graph Schema)

### 3.1 Node Types

#### Shipment
```
(:Shipment {
  id: String,           // "S001"
  origin: String,       // "Shanghai"
  destination: String,  // "Los Angeles"
  priority: String,     // "HIGH" | "MEDIUM" | "LOW"
  eta: DateTime,
  status: String,       // "IN_TRANSIT" | "DELAYED" | "DELIVERED" | "REROUTED"
  cargo_type: String,   // "Electronics" | "Perishable" | "Industrial"
  weight_tons: Float,
  value_usd: Float
})
```

#### Vessel
```
(:Vessel {
  id: String,             // "V001"
  name: String,           // "Pacific Star"
  current_lat: Float,
  current_lng: Float,
  capacity_teu: Integer,  // Twenty-foot Equivalent Units
  current_load_teu: Integer,
  speed_knots: Float,
  status: String          // "EN_ROUTE" | "DOCKED" | "IDLE"
})
```

#### Port
```
(:Port {
  id: String,              // "P001"
  name: String,            // "Port of Shanghai"
  lat: Float,
  lng: Float,
  congestion_level: String,// "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  avg_delay_hours: Float,
  capacity_teu: Integer,
  current_utilization: Float // 0.0 - 1.0
})
```

#### Warehouse
```
(:Warehouse {
  id: String,
  name: String,
  lat: Float,
  lng: Float,
  capacity: Integer,
  current_stock: Integer,
  type: String             // "DISTRIBUTION" | "STORAGE" | "COLD_CHAIN"
})
```

### 3.2 Relationships

```cypher
// Core relationships
(Shipment)-[:ASSIGNED_TO {assigned_date: DateTime}]->(Vessel)
(Vessel)-[:ARRIVING_AT {eta: DateTime}]->(Port)
(Vessel)-[:DEPARTED_FROM {departure: DateTime}]->(Port)
(Port)-[:ROUTES_TO {distance_nm: Float, avg_days: Float}]->(Port)
(Shipment)-[:ORIGINATES_FROM]->(Port)
(Shipment)-[:DESTINED_FOR]->(Port)
(Port)-[:SERVES]->(Warehouse)

// Extended (if time permits)
(Shipment)-[:DEPENDS_ON]->(Shipment)  // inter-shipment dependencies
```

### 3.3 Seed Data (Realistic Scenario)

**Ports (6)**
| ID | Name | Location | Congestion |
|----|------|----------|------------|
| P001 | Port of Shanghai | 31.23°N, 121.47°E | HIGH |
| P002 | Port of Singapore | 1.26°N, 103.84°E | MEDIUM |
| P003 | Port of Los Angeles | 33.74°N, 118.27°W | LOW |
| P004 | Port of Rotterdam | 51.95°N, 4.14°E | MEDIUM |
| P005 | Port of Dubai | 25.27°N, 55.29°E | LOW |
| P006 | Port of Mumbai | 18.95°N, 72.84°E | HIGH |

**Vessels (4)**
| ID | Name | Capacity | Status |
|----|------|----------|--------|
| V001 | Pacific Star | 5000 TEU | EN_ROUTE |
| V002 | Atlantic Runner | 3000 TEU | EN_ROUTE |
| V003 | Indian Express | 4000 TEU | DOCKED |
| V004 | Global Horizon | 6000 TEU | EN_ROUTE |

**Shipments (8)**
| ID | Origin | Dest | Priority | Vessel | Cargo |
|----|--------|------|----------|--------|-------|
| S001 | Shanghai | Los Angeles | HIGH | V001 | Electronics |
| S002 | Shanghai | Los Angeles | MEDIUM | V001 | Industrial |
| S003 | Singapore | Rotterdam | HIGH | V002 | Perishable |
| S004 | Singapore | Rotterdam | LOW | V002 | Industrial |
| S005 | Mumbai | Dubai | MEDIUM | V003 | Textiles |
| S006 | Shanghai | Singapore | HIGH | V004 | Electronics |
| S007 | Dubai | Rotterdam | MEDIUM | V004 | Oil & Gas |
| S008 | Mumbai | Los Angeles | LOW | V001 | Pharmaceuticals |

**Routes (port-to-port)**
| From | To | Distance (nm) | Avg Days |
|------|-----|---------------|----------|
| P001 | P003 | 6,500 | 14 |
| P001 | P002 | 2,500 | 5 |
| P002 | P004 | 8,500 | 18 |
| P002 | P003 | 8,800 | 19 |
| P006 | P005 | 1,200 | 3 |
| P005 | P004 | 6,000 | 13 |
| P001 | P004 | 10,500 | 22 |

---

## 4. Backend Implementation

### 4.1 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Environment config
│   ├── models/
│   │   ├── __init__.py
│   │   ├── shipment.py         # Pydantic models
│   │   ├── vessel.py
│   │   ├── port.py
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
│   ├── tools/                  # Agent tools (function calling)
│   │   ├── __init__.py
│   │   ├── query_tools.py      # Graph query tools
│   │   ├── simulation_tools.py # Simulation tools
│   │   └── decision_tools.py   # Reroute/recommendation tools
│   └── seed/
│       ├── __init__.py
│       └── seed_data.py        # Neo4j seed script
├── tests/
│   ├── test_graph_service.py
│   ├── test_simulation.py
│   └── test_agent.py
├── requirements.txt
├── .env.example
├── Dockerfile
└── README.md
```

### 4.2 Key Dependencies (requirements.txt)

```
fastapi==0.115.*
uvicorn[standard]==0.34.*
neo4j==5.27.*
google-genai==1.5.*
pydantic==2.10.*
python-dotenv==1.0.*
httpx==0.28.*
websockets==14.*
```

### 4.3 API Endpoints

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
| WS | `/api/agent/stream` | Stream agent responses via WebSocket |

#### System Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/seed` | Seed the graph with demo data |
| GET | `/api/health` | Health check |
| POST | `/api/reset` | Reset graph to initial state |

### 4.4 Simulation Engine Logic

```python
# Core simulation algorithm (pseudocode)

def simulate_delay(port_id: str, delay_hours: float) -> SimulationResult:
    # 1. Find all vessels arriving at this port
    vessels = graph.query("MATCH (v:Vessel)-[:ARRIVING_AT]->(p:Port {id: $port_id}) RETURN v", port_id=port_id)

    # 2. For each vessel, find assigned shipments
    affected_shipments = []
    for vessel in vessels:
        shipments = graph.query("MATCH (s:Shipment)-[:ASSIGNED_TO]->(v:Vessel {id: $vid}) RETURN s", vid=vessel.id)
        for shipment in shipments:
            new_eta = shipment.eta + timedelta(hours=delay_hours)
            affected_shipments.append({
                "shipment": shipment,
                "original_eta": shipment.eta,
                "new_eta": new_eta,
                "delay_hours": delay_hours,
                "priority_impact": calculate_priority_impact(shipment, delay_hours)
            })

    # 3. Calculate cascade effects (downstream dependencies)
    cascades = calculate_cascades(affected_shipments)

    # 4. Generate recommendations
    recommendations = []
    for shipment in affected_shipments:
        if shipment.priority == "HIGH" and delay_hours > 4:
            alt_port = find_alternate_port(shipment, port_id)
            if alt_port:
                recommendations.append({
                    "action": "REROUTE",
                    "shipment_id": shipment.id,
                    "from_port": port_id,
                    "to_port": alt_port.id,
                    "time_saved_hours": calculate_time_saved(shipment, alt_port),
                    "confidence": 0.85
                })

    return SimulationResult(
        affected_shipments=affected_shipments,
        cascades=cascades,
        recommendations=recommendations,
        total_impact_hours=sum(s.delay_hours for s in affected_shipments)
    )
```

### 4.5 AI Agent Tool Definitions (Gemini Function Calling)

```python
AGENT_TOOLS = [
    {
        "name": "get_shipments_by_port",
        "description": "Get all shipments arriving at or departing from a specific port",
        "parameters": {
            "port_id": {"type": "string", "description": "Port ID (e.g., P001)"}
        }
    },
    {
        "name": "simulate_delay",
        "description": "Simulate a delay at a port and see impact on shipments",
        "parameters": {
            "port_id": {"type": "string", "description": "Port ID to apply delay to"},
            "delay_hours": {"type": "number", "description": "Hours of delay to simulate"}
        }
    },
    {
        "name": "suggest_reroute",
        "description": "Get rerouting suggestions for a delayed shipment",
        "parameters": {
            "shipment_id": {"type": "string", "description": "Shipment to reroute"}
        }
    },
    {
        "name": "get_risk_score",
        "description": "Get the current risk score for a port or shipment",
        "parameters": {
            "entity_type": {"type": "string", "enum": ["port", "shipment", "vessel"]},
            "entity_id": {"type": "string"}
        }
    },
    {
        "name": "compare_scenarios",
        "description": "Compare two simulation scenarios side by side",
        "parameters": {
            "scenario_a": {"type": "object", "description": "First scenario parameters"},
            "scenario_b": {"type": "object", "description": "Second scenario parameters"}
        }
    },
    {
        "name": "get_graph_overview",
        "description": "Get a summary of the current supply chain state",
        "parameters": {}
    }
]
```

### 4.6 Agent System Prompt

```
You are a Supply Chain Decision Intelligence Agent for the Cognitive Twin system.

Your role:
- Analyze supply chain disruptions using a live graph model
- Simulate impacts of delays, congestion, and route changes
- Recommend optimal actions: reroute, reschedule, or reassign

Rules:
1. Always query the graph FIRST before making recommendations
2. Quantify impact in hours and dollars when possible
3. Prioritize HIGH priority shipments in recommendations
4. Consider cascade effects on downstream shipments
5. Present decisions clearly with confidence scores
6. When comparing options, use the compare_scenarios tool

Response format:
- Start with a brief situation assessment
- Present data from the graph
- Show simulation results
- End with clear, numbered recommendations
```

---

## 5. Frontend Implementation

### 5.1 Project Structure

```
frontend/
├── app/
│   ├── layout.jsx               # Root layout (header, sidebar)
│   ├── page.jsx                 # Dashboard (main page)
│   ├── globals.css              # Tailwind imports + custom styles
│   └── api/                     # Optional: API route handlers (proxy)
│       └── chat/
│           └── route.js         # Server-side chat proxy (optional)
├── components/
│   ├── layout/
│   │   ├── Header.jsx           # 'use client'
│   │   ├── Sidebar.jsx          # 'use client'
│   │   └── Dashboard.jsx        # 'use client'
│   ├── map/
│   │   ├── SupplyChainMap.jsx   # 'use client' - Leaflet map with routes
│   │   ├── VesselMarker.jsx     # Animated vessel icons
│   │   ├── PortMarker.jsx       # Port with status color
│   │   └── RoutePolyline.jsx    # Route lines (color = status)
│   ├── graph/
│   │   └── GraphVisualization.jsx  # 'use client' - Force-directed graph
│   ├── chat/
│   │   ├── ChatPanel.jsx        # 'use client' - AI agent chat interface
│   │   ├── ChatMessage.jsx      # Individual message
│   │   └── SuggestionChips.jsx  # Quick query buttons
│   ├── simulation/
│   │   ├── SimulationPanel.jsx  # 'use client' - Delay/congestion inputs
│   │   ├── ImpactVisualization.jsx  # Before/after comparison
│   │   └── ScenarioCompare.jsx  # Side-by-side scenarios
│   ├── alerts/
│   │   ├── AlertsPanel.jsx      # 'use client' - Live alerts feed
│   │   └── AlertCard.jsx        # Individual alert
│   └── recommendations/
│       ├── RecommendationPanel.jsx  # 'use client' - Action cards
│       └── ActionCard.jsx       # Single recommendation
├── hooks/
│   ├── useWebSocket.js          # WebSocket connection
│   ├── useGraph.js              # Graph data fetching
│   └── useSimulation.js         # Simulation state
├── lib/
│   ├── api.js                   # API client (fetch wrapper)
│   └── utils.js                 # Shared utilities
├── public/
│   └── assets/
│       ├── vessel-icon.svg
│       └── port-icon.svg
├── package.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── .env.local.example
```

### 5.2 Key Dependencies (package.json)

```json
{
  "name": "cognitive-twin-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-leaflet": "^5.0.0",
    "leaflet": "^1.9.4",
    "react-force-graph-2d": "^1.25.0",
    "recharts": "^2.15.0",
    "lucide-react": "^0.469.0",
    "@tanstack/react-query": "^5.64.0"
  },
  "devDependencies": {
    "tailwindcss": "^4.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

### 5.3 UI Layout (Dashboard)

```
┌────────────────────────────────────────────────────────────┐
│  🧠 Cognitive Twin          [Status: Live]    [Reset Demo] │
├────────────┬───────────────────────────────────────────────┤
│            │                                               │
│  ALERTS    │           MAP VIEW (Leaflet + OSM)            │
│  ────────  │   🚢 ─── ─── ─── 🏭                          │
│  ⚠ P001    │        🚢 ─── ─── ─── 🏭                     │
│    HIGH    │   🚢 ─── ─── ─── 🏭                          │
│  ⚠ P006    │                                               │
│    HIGH    │   [Vessels animate along routes]               │
│  ✓ P003    │   [Ports glow red/yellow/green]               │
│    LOW     │                                               │
│            ├───────────────────────────────────────────────┤
│            │                                               │
│  ACTIONS   │     CHAT / AI AGENT PANEL                     │
│  ────────  │   ┌─────────────────────────────────┐         │
│  Reroute   │   │ "What happens if Port Shanghai  │         │
│  S001→P002 │   │  is delayed by 6 hours?"        │         │
│  (save 4h) │   └─────────────────────────────────┘         │
│            │   [What-if P001 delayed?] [Reroute options]   │
│  Reroute   │   [Show all HIGH priority] [Risk overview]    │
│  S006→P005 │                                               │
│  (save 2h) │   SIMULATION RESULTS                          │
│            │   ┌─ Before ──────┬── After ────────┐         │
│            │   │ S001: On Time │ S001: +6h delay │         │
│            │   │ S002: On Time │ S002: +6h delay │         │
│            │   └───────────────┴─────────────────┘         │
└────────────┴───────────────────────────────────────────────┘
```

### 5.4 Color System

| Status | Color | Hex | Usage |
|--------|-------|-----|-------|
| Critical / HIGH | Red | `#EF4444` | High congestion, critical alerts |
| Warning / MEDIUM | Amber | `#F59E0B` | Medium congestion, delays |
| Good / LOW | Green | `#22C55E` | Normal operations |
| Info / Neutral | Blue | `#3B82F6` | Informational, links |
| Rerouted | Purple | `#8B5CF6` | Rerouted shipments |

### 5.5 Next.js Implementation Notes

#### Client vs Server Components
```jsx
// Interactive components with state/effects need 'use client'
'use client'

import { useState } from 'react'
import { MapContainer } from 'react-leaflet'

export default function SupplyChainMap() {
  const [vessels, setVessels] = useState([])
  // ... component logic
}
```

**Components that need 'use client':**
- All map components (Leaflet)
- ChatPanel (uses WebSocket)
- SimulationPanel (has form inputs)
- GraphVisualization (D3/force-graph)
- Any component using useState, useEffect, onClick, etc.

**Server components (default):**
- Layout components without interactivity
- Static UI shells
- Data fetching wrappers (can fetch on server)

#### Environment Variables
```jsx
// Access in client components
const API_URL = process.env.NEXT_PUBLIC_API_URL

// Access in server components/API routes
const SECRET_KEY = process.env.SECRET_KEY  // Not exposed to browser
```

#### API Routes (Optional)
If you need server-side proxying:
```js
// app/api/chat/route.js
export async function POST(request) {
  const body = await request.json()
  const response = await fetch(`${process.env.BACKEND_URL}/api/agent/chat`, {
    method: 'POST',
    body: JSON.stringify(body)
  })
  return response
}
```

---

## 6. Deployment Strategy

### 6.1 Architecture (Production-Ready)

```
                    ┌─────────────┐
                    │   Vercel    │ ← Frontend (React)
                    │   (Free)    │
                    └──────┬──────┘
                           │ HTTPS
                    ┌──────▼──────┐
                    │   Render    │ ← Backend (FastAPI)
                    │   (Free)    │
                    └──────┬──────┘
                           │ Bolt
                    ┌──────▼──────┐
                    │ Neo4j Aura  │ ← Graph Database
                    │   (Free)    │
                    └─────────────┘
```

### 6.2 Environment Variables

```env
# Backend (.env)
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=https://cognitive-twin.vercel.app
ENVIRONMENT=production

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://cognitive-twin.onrender.com
NEXT_PUBLIC_WS_URL=wss://cognitive-twin.onrender.com
```

### 6.3 Deployment Steps

#### Neo4j AuraDB
1. Go to https://neo4j.com/cloud/aura-free/
2. Create free instance (no credit card required)
3. Save connection URI + password
4. Run seed script

#### Backend (Render)
1. Push backend to GitHub repo
2. Connect Render to GitHub
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables
6. Deploy

#### Frontend (Vercel)
1. Push frontend to GitHub repo (or monorepo)
2. Connect Vercel to GitHub
3. Framework preset: **Next.js** (auto-detected)
4. Build command: `npm run build` (auto-configured)
5. Output directory: `.next` (auto-configured)
6. Add environment variables (NEXT_PUBLIC_* prefix)
7. Deploy (Vercel automatically optimizes Next.js builds)

### 6.4 Render Free Tier Limitation & Workaround
- Render free tier spins down after 15 min of inactivity
- **Workaround for demo**: Use a cron job or UptimeRobot (free) to ping `/api/health` every 14 minutes
- Alternative: Use Railway.app (free $5/month credits, no spin-down)

---

## 7. Scalability Design

### 7.1 Scaling the Graph (Post-Hackathon)
```
Hackathon:  ~20 nodes, ~30 relationships  → AuraDB Free
MVP:        ~1,000 nodes                  → AuraDB Professional ($65/mo)
Production: ~100K+ nodes                  → Self-hosted Neo4j cluster
```

### 7.2 Scaling the Backend
```
Hackathon:  Single Render instance
MVP:        Render paid tier (always-on)
Production: Kubernetes (GKE/EKS) with horizontal pod autoscaling
```

### 7.3 Scaling the Agent
```
Hackathon:  Gemini 2.0 Flash (free tier)
MVP:        Gemini Pro / GPT-4o-mini (paid)
Production: Fine-tuned model + RAG for domain knowledge
```

### 7.4 Future Architecture (Post-Hackathon)
```
┌─────────┐   ┌──────────┐   ┌──────────────────┐
│  CDN    │──▶│ API GW   │──▶│ Microservices    │
│ (CF/VCL)│   │ (Kong)   │   │ ┌──────────────┐ │
└─────────┘   └──────────┘   │ │ Graph Service │ │
                              │ │ Sim Engine    │ │
                              │ │ Agent Service │ │
                              │ │ Alert Service │ │
                              │ └──────────────┘ │
                              └────────┬─────────┘
                              ┌────────▼─────────┐
                              │ Neo4j Cluster    │
                              │ Redis Cache      │
                              │ TimescaleDB      │
                              └──────────────────┘
```

---

## 8. Demo Script (Step-by-Step)

### Scene 1: Introduction (30 seconds)
> "Supply chains today have a visibility problem — tools tell you what happened, but no one tells you what to DO. Cognitive Twin is a decision intelligence system that models your supply chain as a live graph and helps you decide the best action."

### Scene 2: Show Normal State (30 seconds)
- Open dashboard
- Show map with 4 vessels moving along routes
- Show all ports GREEN/YELLOW
- "Here's our live supply chain — 8 shipments, 4 vessels, 6 ports. Everything on track."

### Scene 3: Introduce Disruption (30 seconds)
- Click on Port Shanghai (P001)
- Change congestion to CRITICAL
- Map turns P001 marker RED
- Alert appears: "⚠️ Port of Shanghai — Congestion CRITICAL"

### Scene 4: Ask the AI Agent (60 seconds)
- Type in chat: "What happens if Port Shanghai is delayed by 6 hours?"
- Agent calls tools:
  1. `get_shipments_by_port("P001")` → finds S001, S002, S006
  2. `simulate_delay("P001", 6)` → calculates impact
  3. `suggest_reroute("S001")` → finds P002 as alternative
- Agent responds with structured answer

### Scene 5: Show Simulation Results (30 seconds)
- Before/After comparison panel appears
- S001: +6h delay, S002: +6h delay, S006: +6h delay
- Total cascade impact: 18 shipment-hours

### Scene 6: Show Recommendation (30 seconds)
- "System recommends: Reroute S001 through Singapore (P002) — saves 4 hours"
- Click "Apply Reroute" button
- Map updates: S001 route changes, ETA improves
- Cost savings shown: $12,000 estimated

### Scene 7: Close (30 seconds)
> "Cognitive Twin turns your supply chain into a thinking system. It doesn't just track — it decides. One disruption, one simulation, one decision — that's the future of supply chain intelligence."

**Total demo time: ~4 minutes**

---

## 9. Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Neo4j AuraDB free tier limit | Low | High | Keep data minimal; fallback to in-memory NetworkX |
| Gemini API rate limit (15 RPM) | Medium | Medium | Cache responses; debounce chat input; pre-compute common queries |
| Render cold start during demo | High | High | Warm up 5 min before; use UptimeRobot; or switch to Railway |
| WebSocket drops | Medium | Low | Auto-reconnect logic; fallback to polling |
| Leaflet map tiles slow | Low | Low | Pre-cache tiles; use local tile server as backup |

### Fallback Plan
If Neo4j AuraDB is down:
- Use **NetworkX** (Python graph library) as in-memory graph
- Same Cypher-like queries via custom adapter
- Data persists in JSON seed file

If Gemini API is down:
- Pre-recorded agent responses for demo scenarios
- Show "simulated" label in UI

---

## 10. Testing Strategy

### 10.1 Backend Tests
```
tests/
├── test_graph_service.py       # Neo4j query tests (mock driver)
├── test_simulation_engine.py   # Simulation logic unit tests
├── test_agent_tools.py         # Tool function tests
├── test_api_endpoints.py       # FastAPI endpoint integration tests
└── conftest.py                 # Shared fixtures
```

### 10.2 Frontend Tests (if time permits)
- Component rendering tests with Jest + React Testing Library (Next.js built-in)
- Focus on: SimulationPanel, ChatPanel, AlertCard

### 10.3 Key Test Cases
1. ✅ Simulate delay propagates to all linked shipments
2. ✅ Reroute suggestion finds alternate port with lower congestion
3. ✅ Agent calls correct tools for "what if" queries
4. ✅ Graph seed creates expected number of nodes/relationships
5. ✅ API returns correct shipments for a port
6. ✅ Risk score increases with congestion level

---

## 11. Build Phases (Implementation Order)

### Phase 1: Foundation (Core Backend)
1. Set up Python project with FastAPI
2. Set up Neo4j AuraDB Free instance
3. Create graph service with Neo4j driver
4. Write seed data script
5. Build core graph query endpoints
6. Test: graph queries return correct data

### Phase 2: Intelligence (Simulation + Agent)
7. Build simulation engine (delay propagation)
8. Build reroute suggestion algorithm
9. Integrate Gemini 2.0 Flash with function calling
10. Define and implement agent tools
11. Build `/agent/chat` endpoint
12. Test: full simulation + agent flow works

### Phase 3: Interface (Frontend)
13. Scaffold Next.js 15 project with Tailwind CSS (`npx create-next-app@latest`)
14. Set up app/layout.jsx with header and sidebar
15. Build app/page.jsx as main dashboard
16. Implement Leaflet map component (SupplyChainMap.jsx with 'use client')
17. Build alerts panel component
18. Build chat panel with AI agent integration (WebSocket/SSE)
19. Build simulation panel (input + before/after results)
20. Build recommendation/action cards
21. Connect all components to backend API using lib/api.js

### Phase 4: Polish & Deploy
21. Add WebSocket for real-time updates (stretch)
22. Add graph visualization with react-force-graph (stretch)
23. Deploy backend to Render
24. Deploy frontend to Vercel
25. Set up Neo4j AuraDB production seed
26. End-to-end demo rehearsal
27. Record backup demo video

---

## 12. Judging Criteria Alignment

| Criteria | How We Score |
|----------|-------------|
| **Real Problem** | Supply chain decision-making gap — $1.7T industry pain point |
| **Innovation** | Graph-based decision intelligence, not just dashboards |
| **Technical Depth** | Neo4j graph + AI agent + simulation engine + real-time UI |
| **Working Demo** | Full end-to-end: disruption → simulation → recommendation |
| **Scalability** | Graph model scales naturally; microservices-ready architecture |
| **Business Impact** | Quantified: hours saved, cost reduced, decisions automated |
| **Presentation** | Clear narrative arc: problem → demo → impact |

---

## 13. Critical Success Checklist

- [ ] Neo4j AuraDB Free instance created and seeded
- [ ] FastAPI backend running with graph query endpoints
- [ ] Simulation engine correctly propagates delays
- [ ] Gemini agent calls tools and returns structured decisions
- [ ] Next.js frontend renders map with ports/vessels
- [ ] Chat panel sends queries and displays agent responses
- [ ] Simulation panel shows before/after impact
- [ ] Recommendation panel shows actionable decisions
- [ ] Backend deployed to Render (or Railway)
- [ ] Frontend deployed to Vercel (optimized for Next.js)
- [ ] End-to-end demo runs smoothly (< 5 min)
- [ ] Backup demo video recorded

---

## 14. Quick Reference: Key Commands

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m app.seed.seed_data          # Seed Neo4j
uvicorn app.main:app --reload         # Start dev server

# Frontend (Next.js)
cd frontend
npm install
npm run dev                           # Start dev server (http://localhost:3000)
npm run build                         # Production build
npm run start                         # Production server

# Deploy
git push origin main                  # Triggers auto-deploy on Render + Vercel
```

---

*This plan is designed to be executed in phases. Complete Phase 1-2 first (backend works), then Phase 3 (UI), then Phase 4 (deploy). Each phase is independently testable.*

---

## 15. ⚠️ ISSUES FOUND & REQUIRED FIXES

> Reviewed 2026-03-28. These are real issues that will cause failures if not addressed.

---

### ISSUE 1: 🔴 Gemini Free Tier Rate Limits Are WRONG

**Problem**: The plan states "15 RPM, 1M TPM/day". The actual 2026 limits are:
- Gemini 2.5 Flash: **10 RPM**, **250K TPM**, **~500 RPD** (requests per day)
- Gemini 2.5 Flash-Lite: 15 RPM, 1000 RPD
- Daily limits were cut 50-80% in Dec 2025

**Impact**: During a live demo, rapid chat interactions could hit RPD limits. Multi-tool agent calls that require 3-4 function calls per user query burn through RPM fast.

**Fix**:
1. Update tech stack table to reflect actual limits
2. Use **Gemini 2.5 Flash-Lite** (15 RPM, 1000 RPD) — sufficient for hackathon
3. Implement **response caching**: Cache identical queries for 60 seconds
4. Add **debounce** on chat input (500ms) to prevent duplicate rapid requests
5. Pre-compute the 3-4 demo scenarios and cache them on first load
6. Add a `DEMO_MODE` flag that serves pre-computed responses when rate-limited

```python
# Add to agent_service.py
from functools import lru_cache
import hashlib

response_cache = {}

async def cached_agent_chat(query: str):
    cache_key = hashlib.md5(query.lower().strip().encode()).hexdigest()
    if cache_key in response_cache:
        return response_cache[cache_key]
    result = await agent_chat(query)
    response_cache[cache_key] = result
    return result
```

---

### ISSUE 2: 🔴 CORS Not Configured — Frontend Will Fail to Call Backend

**Problem**: Frontend on `*.vercel.app` calling backend on `*.onrender.com` = cross-origin request. Without CORS middleware, every API call will fail with a browser error.

**Impact**: **Complete frontend-backend disconnect**. Nothing works.

**Fix**: Add CORS middleware to FastAPI main.py:

```python
# app/main.py
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",         # Next.js dev server
        "https://cognitive-twin.vercel.app",  # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Status**: MUST be added to Phase 1 (setup-backend todo).

---

### ISSUE 3: 🔴 Seed Data Logic Error — Vessel V004 Route Impossible

**Problem**: V004 (Global Horizon) is assigned:
- S006: Shanghai → Singapore
- S007: Dubai → Rotterdam

A single vessel cannot simultaneously be at Shanghai AND Dubai. These are ~4,500 nautical miles apart.

**Impact**: Judges or technical reviewers will spot this inconsistency immediately. Damages credibility.

**Fix**: Reassign S007 to a different vessel or fix the route:

| Before | After |
|--------|-------|
| S007: Dubai → Rotterdam, **V004** | S007: Dubai → Rotterdam, **V003** (Indian Express, currently DOCKED at Mumbai, near Dubai) |

Also fix V004's route to be Shanghai → Singapore only. Update V003's status to EN_ROUTE after reassignment.

---

### ISSUE 4: 🟡 Neo4j AuraDB Pauses After 3 Days / Deletes After 30 Days

**Problem**: AuraDB Free auto-pauses if no **write** operations for 3 days, and auto-deletes after 30 days of inactivity.

**Impact**: If you set up the DB a week before the hackathon and forget about it, data is gone.

**Fix**:
1. Create the AuraDB instance **the day before** the hackathon (or day-of)
2. Build a `/api/seed` endpoint that re-creates all data from scratch
3. Add a `/api/heartbeat` endpoint that writes a timestamp property to a `:System` node
4. If paranoid: Add a GitHub Actions cron job that calls heartbeat every 48 hours

```python
# Heartbeat to prevent auto-pause
@router.post("/api/heartbeat")
async def heartbeat():
    await graph_service.run(
        "MERGE (s:System {id: 'heartbeat'}) SET s.last_ping = datetime()"
    )
    return {"status": "alive"}
```

---

### ISSUE 5: 🟡 Render Cold Start Will Kill the Demo

**Problem**: Render free tier spins down after 15 min of inactivity. Cold start takes **50-90 seconds**. During a live demo, the first API call will hang for over a minute.

**Impact**: Awkward silence during the most critical moment of your demo.

**Fix** (pick one):
1. **Best**: Warm up the backend **5 minutes before** demo by visiting `https://your-app.onrender.com/api/health` in a browser tab
2. **Automated**: Set up UptimeRobot (free) to ping `/api/health` every 5 minutes starting 30 min before demo
3. **Alternative platform**: Use **Railway.app** ($5 free credits/month, no spin-down on Hobby plan)
4. **Nuclear option**: Run backend locally during demo with `ngrok` tunnel

**Add to Demo Checklist**:
```
- [ ] 5 min before demo: Open backend health URL in browser
- [ ] Confirm response < 1 second before starting
```

---

### ISSUE 6: 🟡 Tailwind CSS v4 Config Mismatch

**Problem**: The plan lists `tailwindcss: "^4.0.0"` in dependencies and `tailwind.config.js` in the project structure. **Tailwind v4 does NOT use `tailwind.config.js`**. It uses CSS-based configuration with `@import "tailwindcss"` and `@theme` blocks.

**Impact**: Tailwind styles won't load. Build may fail.

**Fix**: Either:

**Option A (Recommended)**: Use Tailwind v4 with CSS-based config:
```css
/* src/styles/globals.css */
@import "tailwindcss";

@theme {
  --color-danger: #EF4444;
  --color-warning: #F59E0B;
  --color-success: #22C55E;
  --color-info: #3B82F6;
  --color-rerouted: #8B5CF6;
}
```
Tailwind v4 works seamlessly with Next.js. Keep `tailwind.config.js` for customization.

**Option B**: Use Tailwind v3 for more docs/examples:
```json
"tailwindcss": "^3.4.0"
```
Both versions work well with Next.js.

---

### ISSUE 7: 🟡 Missing Leaflet CSS Import

**Problem**: Leaflet requires its CSS file to be explicitly imported. Without it, the map renders as a broken gray box with tiles stacked vertically.

**Impact**: Map is completely broken visually.

**Fix**: Add to `app/layout.jsx` or `SupplyChainMap.jsx`:

```jsx
import 'leaflet/dist/leaflet.css';
```

Also fix the known Leaflet marker icon issue in Next.js (static asset imports):
```jsx
import L from 'leaflet';

// Fix default marker icons for Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});
```

Copy marker icons to `public/leaflet/` directory from `node_modules/leaflet/dist/images/`.

---

### ISSUE 8: 🟡 Port Coordinates Need Negative Longitude

**Problem**: Seed data shows `Port of Los Angeles: 33.74°N, 118.27°W`. In code, West longitude must be **negative**: `-118.27`. If stored as positive `118.27`, the port renders in **China** instead of California.

**Impact**: Map shows LA port in the wrong hemisphere. Demo looks broken.

**Fix**: Ensure seed data uses signed coordinates:

```python
# Correct
{"id": "P003", "name": "Port of Los Angeles", "lat": 33.74, "lng": -118.27}

# WRONG (renders in China)
{"id": "P003", "name": "Port of Los Angeles", "lat": 33.74, "lng": 118.27}
```

---

### ISSUE 9: 🟡 Simulation Modifies Graph State (Should Be Read-Only)

**Problem**: The simulation pseudocode updates ETAs directly. If the "Apply Reroute" button writes to Neo4j, the graph is permanently mutated. There's no way to reset/undo for the next demo run.

**Impact**: Second demo run shows already-rerouted data. Demo is one-shot only.

**Fix**:
1. Simulations should be **read-only** — compute results in Python memory, never write to Neo4j
2. "Apply Reroute" should write to a **separate state layer** (e.g., a `SimulationState` node) or update the graph BUT the `/api/reset` endpoint must restore original state
3. Add a "Reset Demo" button in the UI header that calls `/api/reset`

```python
@router.post("/api/reset")
async def reset_demo():
    await graph_service.run("MATCH (n) DETACH DELETE n")
    await seed_data()  # Re-seed from scratch
    return {"status": "reset_complete"}
```

---

### ISSUE 10: 🟡 Agent Tool Schema Doesn't Match Gemini SDK Format

**Problem**: The tool definitions in section 4.5 use a custom JSON format. The `google-genai` SDK requires a specific format using `google.genai.types`.

**Fix**: Use the actual Gemini SDK format:

```python
from google import genai
from google.genai import types

tools = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="get_shipments_by_port",
                description="Get all shipments arriving at a specific port",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "port_id": types.Schema(
                            type=types.Type.STRING,
                            description="Port ID (e.g., P001)"
                        )
                    },
                    required=["port_id"]
                )
            ),
            # ... more declarations
        ]
    )
]
```

---

### ISSUE 11: 🟢 No Loading / Error States in Frontend

**Problem**: The plan defines components but no mention of loading spinners, error boundaries, or empty states. API calls to a cold Render instance take 60+ seconds.

**Fix**: Add to every data-fetching component:
1. **Loading state**: Skeleton loaders or spinner while backend warms up
2. **Error boundary**: Catch failed API calls, show "Reconnecting..." not a blank screen
3. **Empty state**: Show placeholder when no simulation has been run yet

```jsx
// Use React Query's built-in states
const { data, isLoading, error } = useQuery({
  queryKey: ['ports'],
  queryFn: fetchPorts,
  retry: 3,
  retryDelay: 2000,
});

if (isLoading) return <Skeleton />;
if (error) return <ErrorCard message="Backend warming up..." />;
```

---

### ISSUE 12: 🟢 Missing `react-router-dom` for Navigation

**Problem**: The frontend has multiple views (Map, Graph Viz, Simulation) but no routing library listed in dependencies.

**Fix**: For a hackathon single-page dashboard, routing is **optional**. If everything fits on one dashboard view, skip it. But if you add a separate Graph Visualization page:

```json
"react-router-dom": "^7.0.0"
```

**Recommendation**: Keep it as a single-page dashboard. No routing needed. Less complexity = fewer bugs during demo.

---

### ISSUE 13: 🟢 EU/EEA Users Cannot Use Gemini Free Tier Commercially

**Problem**: Google's terms prohibit commercial use of Gemini free tier in EU/EEA/UK/Switzerland.

**Impact**: If your hackathon is in the EU or judges evaluate commercial viability, this could be a concern.

**Fix**: For hackathon purposes (non-commercial, educational), this is fine everywhere. But mention in the pitch: "For production, we'd use Gemini paid tier or self-hosted models."

---

### ISSUE 14: 🟢 No Dockerfile Content Specified

**Problem**: `Dockerfile` is listed in the backend structure but no content is provided.

**Fix**: Add to plan:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 16. Updated Risk Matrix (Post-Review)

| # | Risk | Severity | Status |
|---|------|----------|--------|
| 1 | Gemini rate limits wrong (10 RPM, not 15) | 🔴 HIGH | Fix: Use Flash-Lite + caching |
| 2 | CORS not configured | 🔴 CRITICAL | Fix: Add CORSMiddleware |
| 3 | Vessel V004 impossible route | 🔴 HIGH | Fix: Reassign S007 to V003 |
| 4 | Neo4j auto-pause/delete | 🟡 MEDIUM | Fix: Create day-of + heartbeat |
| 5 | Render cold start kills demo | 🟡 MEDIUM | Fix: Warm up before demo |
| 6 | Tailwind v4 config mismatch | 🟡 MEDIUM | Fix: CSS-based config or v3 |
| 7 | Missing Leaflet CSS | 🟡 MEDIUM | Fix: Import CSS + icon fix |
| 8 | LA port longitude positive | 🟡 MEDIUM | Fix: Use -118.27 |
| 9 | Simulation mutates graph | 🟡 MEDIUM | Fix: Read-only sim + reset |
| 10 | Agent tool schema wrong format | 🟡 MEDIUM | Fix: Use google.genai.types |
| 11 | No loading/error states | 🟢 LOW | Fix: Add React Query states |
| 12 | Missing react-router-dom | 🟢 LOW | Fix: Single-page, skip routing |
| 13 | EU Gemini commercial restriction | 🟢 LOW | Fix: Non-issue for hackathon |
| 14 | No Dockerfile content | 🟢 LOW | Fix: Add Dockerfile |

**Total issues found: 14** (3 critical/high, 7 medium, 4 low)
