# 01 — Project Setup & Environment

## Overview

This document covers the complete initial setup for **Cognitive Twin** — a decision-intelligence supply chain system built for a hackathon. It walks through repository creation, backend scaffolding (FastAPI + Python), frontend scaffolding (Next.js), dependency installation, environment configuration, and local verification. By the end of this step you will have a running monorepo with both dev servers responding on their respective ports.

---

## Prerequisites

| Prerequisite | Minimum Version | Notes |
|---|---|---|
| Python | 3.11+ | Required for modern `asyncio` and type-hint features |
| Node.js | 20+ (LTS) | Next.js 15 requires Node 18.18+; use 20 LTS for stability |
| npm _or_ pnpm | latest | npm ships with Node; pnpm is optional but faster |
| Git | 2.x | Any recent version works |
| GitHub account | — | For hosting the repo and CI |
| Google Cloud account | — | Needed to generate a Gemini API key |
| Neo4j AuraDB Free account | — | Sign up at [console.neo4j.io](https://console.neo4j.io) |

---

## Step 1: Repository Setup

### 1a — Create the GitHub repo

```bash
# Option A: via GitHub CLI
gh repo create cognitive-twin --public --clone

# Option B: create on github.com then clone
git clone https://github.com/<your-username>/cognitive-twin.git
cd cognitive-twin
```

### 1b — Initialize with `.gitignore`

Create a combined Python + Node `.gitignore` at the repo root. At a minimum it should cover:

```gitignore
# Python
__pycache__/
*.py[cod]
*.egg-info/
dist/
.venv/
env/
.env

# Node / Next.js
node_modules/
.next/
out/
.env.local

# IDE
.vscode/
.idea/
*.swp
```

### 1c — Create the monorepo directory structure

```
cognitive-twin/
├── backend/          # FastAPI application
├── frontend/         # Next.js application
├── plan/             # Step-by-step build plans (this file lives here)
├── .gitignore
├── README.md
└── LICENSE
```

```bash
mkdir -p backend frontend plan
touch README.md LICENSE
```

---

## Step 2: Backend Project Scaffolding

### 2a — Directory structure

Create the full backend tree in one shot:

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── config.py             # Pydantic-settings configuration
│   ├── models/
│   │   ├── __init__.py
│   │   ├── shipment.py       # Shipment Pydantic models
│   │   ├── vessel.py         # Vessel Pydantic models
│   │   ├── port.py           # Port Pydantic models
│   │   └── simulation.py     # Simulation request/response models
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── graph.py          # Graph query endpoints
│   │   ├── simulation.py     # Simulation endpoints
│   │   ├── agent.py          # Gemini agent/chat endpoints
│   │   └── websocket.py      # WebSocket endpoint for realtime updates
│   ├── services/
│   │   ├── __init__.py
│   │   ├── graph_service.py  # Neo4j driver wrapper & queries
│   │   ├── simulation_engine.py  # Discrete-event simulation logic
│   │   ├── agent_service.py  # Gemini function-calling agent
│   │   └── risk_service.py   # Risk scoring & disruption analysis
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── query_tools.py    # Tools the agent can call to query the graph
│   │   ├── simulation_tools.py   # Tools to run simulations
│   │   └── decision_tools.py # Tools for decision recommendations
│   └── seed/
│       ├── __init__.py
│       └── seed_data.py      # Script to populate Neo4j with sample data
├── tests/
│   ├── test_graph_service.py
│   ├── test_simulation.py
│   └── test_agent.py
├── requirements.txt
├── .env.example
├── Dockerfile
└── README.md
```

Quick scaffold command:

```bash
cd backend

# Directories
mkdir -p app/{models,routers,services,tools,seed} tests

# __init__.py files (critical — without these Python won't treat dirs as packages)
touch app/__init__.py \
      app/models/__init__.py \
      app/routers/__init__.py \
      app/services/__init__.py \
      app/tools/__init__.py \
      app/seed/__init__.py

# Placeholder source files
touch app/main.py app/config.py
touch app/models/{shipment,vessel,port,simulation}.py
touch app/routers/{graph,simulation,agent,websocket}.py
touch app/services/{graph_service,simulation_engine,agent_service,risk_service}.py
touch app/tools/{query_tools,simulation_tools,decision_tools}.py
touch app/seed/seed_data.py
touch tests/{test_graph_service,test_simulation,test_agent}.py

# Config files
touch requirements.txt .env.example Dockerfile README.md
```

### 2b — `requirements.txt`

```
fastapi==0.115.*
uvicorn[standard]==0.34.*
neo4j==5.27.*
google-genai==1.5.*
pydantic==2.10.*
pydantic-settings>=2.6,<3
python-dotenv==1.0.*
httpx==0.28.*
websockets==14.*
```

> **Note:** `pydantic-settings` is listed explicitly because it was split out of the `pydantic` core package in v2 and is required by `config.py`.

Install into a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
```

### 2c — `.env.example`

```env
# ── Neo4j AuraDB ─────────────────────────────────────────
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=

# ── Google Gemini ─────────────────────────────────────────
GEMINI_API_KEY=

# ── App ───────────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
```

Copy this to `.env` and fill in real values:

```bash
cp .env.example .env
```

### 2d — `app/main.py` (initial version with CORS)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(title="Cognitive Twin API", version="0.1.0")

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


@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "cognitive-twin"}
```

### 2e — `app/config.py` (Pydantic Settings)

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    neo4j_uri: str
    neo4j_user: str = "neo4j"
    neo4j_password: str
    gemini_api_key: str
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
```

This will automatically read values from the `.env` file (or from real environment variables in production).

---

## Step 3: Frontend Project Scaffolding

### 3a — Create the Next.js app

From the **repo root**:

```bash
npx create-next-app@latest frontend \
  --js \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

> **Important:** We use `--js` (JavaScript), _not_ `--typescript`. This keeps the hackathon codebase simpler and avoids type-checking overhead during rapid prototyping. If the CLI prompts interactively instead, select the equivalent options manually.

### 3b — Install additional dependencies

```bash
cd frontend
npm install react-leaflet leaflet react-force-graph-2d recharts lucide-react @tanstack/react-query
```

| Package | Purpose |
|---|---|
| `react-leaflet` + `leaflet` | Interactive map with OpenStreetMap tiles |
| `react-force-graph-2d` | Force-directed graph visualization of supply chain |
| `recharts` | Simple, composable React charts (bar, line, area) |
| `lucide-react` | Lightweight icon library |
| `@tanstack/react-query` | Server-state management, caching, polling |

### 3c — `.env.local.example`

Create `frontend/.env.local.example`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

Copy and use locally:

```bash
cp .env.local.example .env.local
```

---

## Step 4: Tech Stack Decisions & Rationale

### Full Tech Stack

| Layer | Technology | Cost | Why |
|---|---|---|---|
| Graph DB | Neo4j AuraDB Free | Free (200K nodes, 400K rels) | Purpose-built for relationship queries; Cypher is expressive for supply-chain traversals |
| LLM | Google Gemini 2.5 Flash-Lite | Free (15 RPM, 1000 RPD, 250K TPM) | Best free-tier LLM with native function-calling support |
| Backend | FastAPI (Python 3.11+) | Free | Async-first, automatic OpenAPI docs, excellent ecosystem |
| Frontend | Next.js 15 (App Router) | Free | File-based routing, React Server Components, Vercel-optimized |
| Map | Leaflet.js + OpenStreetMap | Free & OSS | No API key required, fully open-source tile layer |
| Graph Viz | react-force-graph / D3.js | Free & OSS | Interactive, physics-based graph visualization |
| Charts | Recharts | Free & OSS | Declarative React charting with composable components |
| Styling | Tailwind CSS v4 | Free | Utility-first CSS, rapid UI development |
| Deploy (FE) | Vercel | Free tier | Zero-config Next.js deployments |
| Deploy (BE) | Render | Free tier (750 h/month) | Free Python hosting with environment variable support |
| Realtime | FastAPI WebSockets | Free | Built into FastAPI, no extra infrastructure needed |

### Alternatives Considered & Rejected

| Alternative | Rejected Because |
|---|---|
| PostgreSQL / MySQL | Relationship-heavy queries (shortest-path, subgraph) are awkward in relational DBs; Neo4j handles them natively |
| OpenAI GPT-4o | No free tier sufficient for a hackathon demo; Gemini Flash-Lite free tier is generous |
| LangChain | Adds abstraction overhead; direct `google-genai` SDK with function declarations is simpler and more transparent |
| Django | Heavier framework; FastAPI's async support and auto-generated docs are better suited to an API-first project |
| Mapbox GL JS | Requires an API key and has usage limits; Leaflet + OSM is truly free |
| Express.js (Node backend) | Python has stronger Neo4j driver support and the Gemini SDK is Python-first |
| Socket.IO | Adds a dependency; FastAPI's native WebSocket support is sufficient for our needs |
| AWS / GCP hosting | Free tiers are more complex to configure; Vercel + Render give the fastest path to deployment |

---

## Step 5: Development Workflow

### Git Branching Strategy

- **`main`** — always deployable; protected branch
- **Feature branches** — branch off `main`, named `feature/<short-description>` (e.g., `feature/graph-seed`, `feature/simulation-engine`)
- Merge via pull request (or direct push during hackathon crunch time)

### Running the Dev Servers

Open **two terminal windows** (or use a split terminal):

**Terminal 1 — Backend (port 8000)**

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

The `--reload` flag enables hot-reload on file changes.

**Terminal 2 — Frontend (port 3000)**

```bash
cd frontend
npm run dev
```

Next.js dev server starts on `http://localhost:3000` with Fast Refresh enabled.

### Useful Commands

| Command | Description |
|---|---|
| `uvicorn app.main:app --reload` | Start backend with hot-reload |
| `npm run dev` | Start frontend dev server |
| `pip install -r requirements.txt` | Install/update Python deps |
| `npm install` | Install/update Node deps |
| `pytest` | Run backend tests |
| `npm run build` | Build frontend for production |

---

## Step 6: Initial Verification

Once both servers are running, verify the setup:

### Backend Health Check

```bash
curl http://localhost:8000/api/health
```

Expected response:

```json
{"status": "healthy", "service": "cognitive-twin"}
```

You can also visit `http://localhost:8000/docs` to see the auto-generated Swagger UI.

### Frontend Loads

Open `http://localhost:3000` in a browser. You should see the default Next.js welcome page.

### Neo4j Connection

This will be verified in **02-database-setup.md**. For now, just confirm your AuraDB instance is created and you have the connection URI and password saved in `.env`.

---

## Checklist

- [ ] GitHub repo created and cloned
- [ ] Monorepo structure in place (`backend/`, `frontend/`, `plan/`)
- [ ] `.gitignore` covers Python + Node artifacts
- [ ] Backend scaffolded with all directories and `__init__.py` files
- [ ] `requirements.txt` populated (including `pydantic-settings`)
- [ ] Python virtual environment created and dependencies installed
- [ ] `.env.example` created with all required variables
- [ ] `.env` created from example with real credentials filled in
- [ ] `app/main.py` with CORS middleware written and working
- [ ] `app/config.py` with Pydantic Settings written
- [ ] Frontend scaffolded with Next.js 15 (JavaScript, Tailwind, App Router)
- [ ] Additional npm dependencies installed (`react-leaflet`, `recharts`, etc.)
- [ ] `frontend/.env.local.example` created
- [ ] Backend dev server starts without errors (`uvicorn`)
- [ ] Frontend dev server starts without errors (`npm run dev`)
- [ ] `GET /api/health` returns `{"status": "healthy"}`

---

## Common Pitfalls

1. **Forgetting CORS middleware** — The frontend (port 3000) cannot call the backend (port 8000) without CORS headers. The `main.py` above already configures this. See also _Issue #2_ in `12-issues-and-fixes.md` for debugging CORS problems.

2. **Wrong Python version** — Python 3.11+ is required. Older versions lack certain `asyncio` improvements and type-hint syntax used in the codebase. Check with `python --version`.

3. **Missing `__init__.py` files** — Every sub-directory under `app/` must have an `__init__.py` (even if empty) for Python to recognize it as a package. The scaffold command above creates them all.

4. **Forgetting `pydantic-settings`** — In Pydantic v2, `BaseSettings` was moved to a separate `pydantic-settings` package. If you only install `pydantic`, the import in `config.py` will fail with `ModuleNotFoundError: No module named 'pydantic_settings'`.

5. **Not copying `.env.example` to `.env`** — The `Settings` class will raise a validation error on startup if required environment variables are missing. Always copy the example file and fill in real values before running the server.

6. **Port conflicts** — If port 8000 or 3000 is already in use, either stop the conflicting process or override the port:
   - Backend: `uvicorn app.main:app --reload --port 8001`
   - Frontend: `npm run dev -- --port 3001` (and update `FRONTEND_URL` in `.env` accordingly)
