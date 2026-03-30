# Cognitive Twin — Progress Tracker

> Last updated: 2026-03-30

---

## Project Overview

**Cognitive Twin** is a decision-intelligence supply chain system built for a hackathon. It models supply chains as a live graph, simulates disruptions, and uses an AI agent to recommend optimal actions (reroute, reschedule, reassign).

**Tech Stack**: Neo4j AuraDB (graph DB) · FastAPI (backend) · Next.js 15 (frontend) · Google Gemini 2.5 Flash-Lite (AI agent) · Leaflet (maps) · Tailwind CSS v4

---

## Completed Actions

### Plan Breakdown (plan/ directory)
- [x] Read and analyzed 1295-line master PLAN.md (48KB)
- [x] Created `plan/` directory with 14 files (~227KB total)
- [x] `00-MASTER-PLAN.md` — Original plan preserved
- [x] `README.md` — Index linking all plan documents
- [x] `01-project-setup.md` through `12-issues-and-fixes.md` — 12 focused sub-plans
- [x] Identified 6 NEW issues (#15-20) beyond the original 14
- [x] Removed original PLAN.md from project root

### Module 01 — Project Setup ✅
- [x] Monorepo structure: `backend/`, `frontend/`, `plan/`
- [x] Backend Python venv at `backend/.venv`
- [x] All Python dependencies installed (fastapi, neo4j, google-genai, pydantic-settings, etc.)
- [x] `backend/requirements.txt` with pinned versions
- [x] `backend/.env.example` with all required variables
- [x] `backend/Dockerfile` (Python 3.11-slim, uvicorn)

### Module 02 — Database Setup ✅
- [x] `backend/app/seed/seed_data.py` — Full seed script
- [x] 6 ports with coordinates, congestion levels, utilization
- [x] 4 vessels with positions, capacity, load, speed
- [x] 8 shipments with priority, cargo type, value, ETA
- [x] 7 ROUTES_TO relationships between ports
- [x] Vessel→Port (ARRIVING_AT) and Shipment→Vessel (ASSIGNED_TO) relationships
- [x] Heartbeat node for AuraDB keep-alive
- [x] **Issue #3 fixed**: S007 assigned to V003 (not V004)
- [x] **Issue #8 fixed**: LA port longitude = -118.27 (negative)

### Module 03 — Backend Core ✅
- [x] `backend/app/main.py` — FastAPI app with CORS, lifespan, global error handler
- [x] `backend/app/config.py` — Pydantic Settings (neo4j_uri, gemini_api_key, demo_mode, etc.)
- [x] `backend/app/models/port.py` — Port, PortImpact models
- [x] `backend/app/models/vessel.py` — Vessel model
- [x] `backend/app/models/shipment.py` — Shipment model
- [x] `backend/app/models/simulation.py` — DelaySimulationRequest, SimulationResult, etc.
- [x] `backend/app/services/graph_service.py` — Async Neo4j driver wrapper (run, get_shipments_by_port, find_alternate_routes, get_graph_overview, etc.)
- [x] `backend/app/routers/graph.py` — 6 endpoints (ports, vessels, shipments, port impact, overview)
- [x] `/api/health`, `/api/seed`, `/api/reset`, `/api/heartbeat` endpoints
- [x] **Issue #2 fixed**: CORS middleware configured
- [x] **Issue #14 fixed**: Dockerfile correct
- [x] **Issue #18 fixed**: Global exception handler
- [x] **Issue #19 fixed**: .env.example with all variables
- [x] Swagger docs at `/docs`

### Module 04 — Simulation Engine ✅
- [x] `backend/app/services/simulation_engine.py` — SimulationEngine class
  - `simulate_delay()` — delay propagation with priority impact matrix
  - `suggest_reroute()` — finds alternative ports with lower congestion
  - `compare_scenarios()` — side-by-side scenario comparison
  - `_calculate_priority_impact()` — HIGH+6h=CRITICAL, MEDIUM+12h=HIGH, etc.
  - `_calculate_cascades()` — 0.5 dampening factor, 1.5x for congested ports
  - `_generate_recommendations()` — REROUTE for HIGH priority, RESCHEDULE for MEDIUM
- [x] `backend/app/services/risk_service.py` — RiskService class
  - Weighted 0-100 scores: congestion(40%), utilization(30%), delay(20%), high-priority(10%)
  - Supports port, vessel, and shipment risk scoring
- [x] `backend/app/routers/simulation.py` — Real endpoints replacing stubs
  - `POST /api/simulate/delay` — delay propagation
  - `POST /api/simulate/reroute` — reroute suggestions
  - `POST /api/simulate/compare` — scenario comparison
  - `GET /api/simulate/risk/{entity_type}/{entity_id}` — risk scores
- [x] **Issue #9 enforced**: All simulations are READ-ONLY (never write to Neo4j)

### Module 05 — AI Agent ✅
- [x] `backend/app/tools/query_tools.py` — 6 Gemini function declarations
  - get_shipments_by_port, simulate_delay, suggest_reroute, get_risk_score, compare_scenarios, get_graph_overview
  - Uses correct `google.genai.types` format (**Issue #10 fixed**)
- [x] `backend/app/tools/tool_dispatcher.py` — Routes tool calls to services
- [x] `backend/app/services/agent_service.py` — AgentService class
  - Lazy Gemini client init (no crash without API key)
  - Multi-turn function calling loop (max 5 iterations — **Issue #13**)
  - Response caching (60s TTL — **Issue #1** rate limit mitigation)
  - DEMO_MODE with 3 pre-computed responses (delay, overview, risk)
  - Graceful degradation: no API key → demo responses → helpful error message
  - Rate limit (429) detection with user-friendly message
- [x] `backend/app/routers/agent.py` — `POST /api/agent/chat` wired to agent_service
- [x] **Issue #1 addressed**: Using Gemini 2.5 Flash-Lite (15 RPM, 1000 RPD)

### Module 06 — Frontend Setup ✅
- [x] Next.js 15 scaffolded with App Router, Tailwind CSS v4
- [x] `frontend/app/globals.css` — Dark theme with supply chain color system
  - danger (#EF4444), warning (#F59E0B), success (#22C55E), info (#3B82F6), rerouted (#8B5CF6)
  - bg-primary (#0F172A), bg-secondary (#1E293B), bg-card (#334155)
  - Leaflet popup dark theme override
- [x] `frontend/app/layout.js` — Root layout with metadata
- [x] `frontend/app/providers.jsx` — QueryClientProvider (React Query) — **Issue #16 fixed**
- [x] `frontend/lib/api.js` — API client with all endpoints (graph, simulation, agent, system)
- [x] `frontend/.env.local` — API_URL=localhost:8000, WS_URL=ws://localhost:8000
- [x] All npm deps installed (react-leaflet, leaflet, recharts, lucide-react, @tanstack/react-query, react-force-graph-2d)
- [x] Leaflet marker icons copied to `public/leaflet/`

### Module 07 — Frontend Components ✅
- [x] `frontend/app/page.js` — Dashboard with 12-column grid layout
  - Left sidebar (col-span-3): Alerts + Recommendations
  - Main area (col-span-9): Map (top half) + Chat/Simulation (bottom half, 2-col)
- [x] `components/layout/Header.jsx` — Brain icon, "Live" badge, Reset Demo button
- [x] `components/map/SupplyChainMap.jsx` — Leaflet with dark CartoDB tiles
  - Dynamic import with `ssr: false` (**Issue #15 fixed**)
  - Leaflet CSS imported (**Issue #7 fixed**)
  - Port markers color-coded by congestion (green/yellow/red)
  - Vessel markers with ship emoji
  - Popups with port/vessel details
- [x] `components/chat/ChatPanel.jsx` — Message history, input, loading state
- [x] `components/chat/ChatMessage.jsx` — User/assistant bubbles, tool badges, cache indicator
- [x] `components/chat/SuggestionChips.jsx` — 4 pre-set query suggestions
- [x] `components/simulation/SimulationPanel.jsx` — Port dropdown, delay slider, Run button
- [x] `components/simulation/ImpactVisualization.jsx` — Impact hours, affected shipments, cascades, recommendations
- [x] `components/alerts/AlertsPanel.jsx` — Auto-refresh (30s), sorted by severity
- [x] `components/alerts/AlertCard.jsx` — Severity-based styling (icons + colors)
- [x] `components/recommendations/RecommendationPanel.jsx` — Populated after simulations
- [x] `components/ui/Skeleton.jsx` — Loading skeleton + MapSkeleton (**Issue #11**)
- [x] `components/ui/ErrorCard.jsx` — Error display with retry
- [x] `hooks/useGraph.js` — usePorts, useVessels, useShipments, useOverview
- [x] `hooks/useWebSocket.js` — Auto-reconnect WebSocket hook
- [x] `npm run build` passes clean ✅

### WebSocket (Phase 4) ✅
- [x] `backend/app/routers/websocket.py` — ConnectionManager class
  - Track active clients, broadcast to all, auto-cleanup dead connections
  - Handles ping/pong, subscribe, generic messages
  - `manager` singleton importable by other modules for real-time pushes

### Demo Polish (Phase 5) ✅
- [x] 3 pre-computed demo responses in agent_service (delay, overview, risk)
- [x] Reset Demo button in header (calls POST /api/reset)
- [x] Loading skeletons in all data-fetching components
- [x] Error handling with retry in all components
- [x] `POST /api/seed` and `POST /api/reset` endpoints for demo reset

---

## Verified Working

| Test | Result |
|------|--------|
| Backend starts (`uvicorn`) | ✅ |
| `GET /api/health` | ✅ `{"status":"healthy"}` |
| `POST /api/simulate/delay` | ✅ Routes correctly (needs Neo4j for data) |
| `POST /api/simulate/reroute` | ✅ Routes correctly |
| `POST /api/simulate/compare` | ✅ Routes correctly |
| `GET /api/simulate/risk/port/P001` | ✅ Routes correctly |
| `POST /api/agent/chat` (demo mode) | ✅ Returns rich markdown |
| `GET /docs` (Swagger) | ✅ HTTP 200 |
| All Python imports | ✅ No errors |
| Frontend `npm run build` | ✅ Compiles clean |
| Frontend `npm run dev` | ✅ Serves on :3000 |
| Frontend HTTP 200 | ✅ |

---

## Known Issues Fixed

| # | Issue | Status |
|---|-------|--------|
| 1 | Gemini rate limits | ✅ Caching + Flash-Lite + demo fallback |
| 2 | CORS not configured | ✅ Middleware in main.py |
| 3 | S007 assigned to wrong vessel | ✅ Fixed to V003 |
| 7 | Leaflet CSS missing | ✅ Imported in SupplyChainMap |
| 8 | LA longitude positive | ✅ Fixed to -118.27 |
| 9 | Simulations writing to DB | ✅ All READ-ONLY |
| 10 | Wrong tool definition format | ✅ Using google.genai.types |
| 11 | No loading states | ✅ Skeletons in all components |
| 13 | Infinite agent loop | ✅ Max 5 iterations |
| 14 | Dockerfile issues | ✅ Correct content |
| 15 | Leaflet SSR crash | ✅ Dynamic import ssr:false |
| 16 | No QueryClientProvider | ✅ providers.jsx wrapping app |
| 18 | No global error handler | ✅ In main.py |
| 19 | No .env.example | ✅ Created with all vars |

---

## Remaining Actions (Modules 08-12)

### Module 08 — Deployment (not started)
- [ ] Create Neo4j AuraDB free instance
- [ ] Deploy backend to Render (or Railway)
- [ ] Deploy frontend to Vercel
- [ ] Set environment variables on both platforms
- [ ] Configure CORS with production Vercel URL
- [ ] Verify cross-origin requests work
- [ ] Set up UptimeRobot for Render keep-alive (optional)

### Module 09 — Testing (not started)
- [ ] Backend unit tests (pytest): graph_service, simulation_engine, risk_service
- [ ] Backend integration tests: API endpoint responses
- [ ] Agent service tests: demo mode, caching, tool dispatch
- [ ] Frontend build test (already passing)
- [ ] End-to-end test: seed → simulate → chat → verify

### Module 10 — Demo Prep (not started)
- [ ] Rehearse 7-scene demo script (~4 minutes)
- [ ] Test all 5 key demo queries end-to-end
- [ ] Record backup demo video
- [ ] Create pre-demo checklist (warm up Render, seed DB, test chat)
- [ ] Prepare local fallback (backend + frontend running locally)

### Module 11 — Scalability (not started, post-hackathon)
- [ ] Document scaling strategy for graph (partitioning, read replicas)
- [ ] Document backend scaling (horizontal, caching layer)
- [ ] Document agent scaling (queue-based, multiple models)

### Module 12 — Issues & Fixes (partially done)
- [ ] Verify remaining issues: #4 (AuraDB auto-pause), #5 (Render cold start), #6 (Tailwind v4 config), #12 (no env validation), #17 (Vercel WebSocket), #20 (step numbering)
- [ ] Add runtime env validation on startup
- [ ] Test Tailwind v4 @theme works in production build

---

## How to Run Locally

```bash
# Terminal 1 — Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

**To get full data flowing:**
1. Create free Neo4j AuraDB at https://neo4j.com/cloud/aura-free/
2. Create `backend/.env`:
   ```
   NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-password
   GEMINI_API_KEY=your-gemini-key  # optional, demo mode works without it
   DEMO_MODE=false
   ```
3. Restart backend, then `POST http://localhost:8000/api/seed`
4. Refresh frontend — map, alerts, simulation, and chat all populate with live data

---

## File Tree (All Created Files)

```
Cognitive-Twin/
├── plan/                          # 14 plan documents (~227KB)
│   ├── 00-MASTER-PLAN.md
│   ├── 01-project-setup.md ... 12-issues-and-fixes.md
│   └── README.md
├── backend/
│   ├── .env.example
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .venv/                     # Python virtual environment
│   └── app/
│       ├── __init__.py
│       ├── config.py              # Pydantic Settings
│       ├── main.py                # FastAPI entry point
│       ├── models/
│       │   ├── port.py, vessel.py, shipment.py, simulation.py
│       │   └── __init__.py
│       ├── routers/
│       │   ├── graph.py           # 6 graph query endpoints
│       │   ├── simulation.py      # delay, reroute, compare, risk
│       │   ├── agent.py           # AI chat endpoint
│       │   ├── websocket.py       # Real-time streaming
│       │   └── __init__.py
│       ├── services/
│       │   ├── graph_service.py   # Neo4j driver wrapper
│       │   ├── simulation_engine.py # Delay propagation + cascades
│       │   ├── risk_service.py    # 0-100 risk scoring
│       │   ├── agent_service.py   # Gemini function calling + caching
│       │   └── __init__.py
│       ├── tools/
│       │   ├── query_tools.py     # 6 Gemini tool definitions
│       │   ├── tool_dispatcher.py # Routes tool calls to services
│       │   └── __init__.py
│       └── seed/
│           ├── seed_data.py       # Full graph seed (6 ports, 4 vessels, 8 shipments)
│           └── __init__.py
├── frontend/
│   ├── .env.local
│   ├── package.json
│   ├── app/
│   │   ├── globals.css            # Tailwind v4 dark theme
│   │   ├── layout.js              # Root layout
│   │   ├── page.js                # Dashboard (12-col grid)
│   │   └── providers.jsx          # React Query provider
│   ├── components/
│   │   ├── layout/Header.jsx
│   │   ├── map/SupplyChainMap.jsx
│   │   ├── chat/ChatPanel.jsx, ChatMessage.jsx, SuggestionChips.jsx
│   │   ├── simulation/SimulationPanel.jsx, ImpactVisualization.jsx
│   │   ├── alerts/AlertsPanel.jsx, AlertCard.jsx
│   │   ├── recommendations/RecommendationPanel.jsx
│   │   └── ui/Skeleton.jsx, ErrorCard.jsx
│   ├── hooks/
│   │   ├── useGraph.js
│   │   └── useWebSocket.js
│   ├── lib/
│   │   └── api.js                 # API client (all endpoints)
│   └── public/
│       └── leaflet/               # Marker icons
└── progress.md                    # ← This file
```
