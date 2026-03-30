# 12 — Issues & Fixes (All 20 Known Issues)

## Overview

Complete registry of all known issues found during plan review. Includes 14 original issues and 6 newly discovered issues. Each issue has: severity, description, impact, fix, and code examples.

## Severity Legend

- 🔴 **CRITICAL/HIGH** — Must fix before any demo. Will cause visible failures.
- 🟡 **MEDIUM** — Should fix during development. Could cause subtle bugs or demo issues.
- 🟢 **LOW** — Nice to fix. Won't break anything critical.

## Summary Table

| # | Issue | Severity | Phase | Status |
|---|-------|----------|-------|--------|
| 1 | Gemini rate limits are wrong | 🔴 HIGH | Phase 2 | Fix: Use Flash-Lite + caching |
| 2 | CORS not configured | 🔴 CRITICAL | Phase 1 | Fix: Add CORSMiddleware |
| 3 | Vessel V004 impossible route | 🔴 HIGH | Phase 1 | Fix: Reassign S007 to V003 |
| 4 | Neo4j auto-pause/delete | 🟡 MEDIUM | Phase 1 | Fix: Create day-of + heartbeat |
| 5 | Render cold start kills demo | 🟡 MEDIUM | Phase 4 | Fix: Warm up before demo |
| 6 | Tailwind CSS v4 config mismatch | 🟡 MEDIUM | Phase 3 | Fix: CSS-based config or v3 |
| 7 | Missing Leaflet CSS import | 🟡 MEDIUM | Phase 3 | Fix: Import CSS + icon fix |
| 8 | Port coordinates need negative lng | 🟡 MEDIUM | Phase 1 | Fix: LA = -118.27 |
| 9 | Simulation modifies graph state | 🟡 MEDIUM | Phase 2 | Fix: Read-only sim + reset |
| 10 | Agent tool schema wrong format | 🟡 MEDIUM | Phase 2 | Fix: Use google.genai.types |
| 11 | No loading/error states in frontend | 🟢 LOW | Phase 3 | Fix: Add React Query states |
| 12 | Missing routing library | 🟢 LOW | Phase 3 | Fix: Single-page, skip routing |
| 13 | EU Gemini commercial restriction | 🟢 LOW | N/A | Fix: Non-issue for hackathon |
| 14 | No Dockerfile content | 🟢 LOW | Phase 4 | Fix: Add Dockerfile |
| 15 | **NEW** Leaflet SSR crash | 🔴 HIGH | Phase 3 | Fix: next/dynamic ssr: false |
| 16 | **NEW** No QueryClientProvider | 🟡 MEDIUM | Phase 3 | Fix: Add provider in layout |
| 17 | **NEW** Vercel WebSocket limitation | 🟡 MEDIUM | Phase 4 | Fix: SSE or direct WS |
| 18 | **NEW** Missing global error handler | 🟡 MEDIUM | Phase 1 | Fix: Add exception handler |
| 19 | **NEW** No .env.example content | 🟢 LOW | Phase 1 | Fix: Add template |
| 20 | **NEW** Duplicate step numbering | 🟢 LOW | N/A | Fix: Renumber steps |

**Totals: 4 Critical/High, 9 Medium, 7 Low**

---

## 🔴 ISSUE 1: Gemini Free Tier Rate Limits Are WRONG

**Problem**: The plan states "15 RPM, 1M TPM/day". The actual 2026 limits are:
- Gemini 2.5 Flash: **10 RPM**, **250K TPM**, **~500 RPD**
- Gemini 2.5 Flash-Lite: **15 RPM**, **1000 RPD**
- Daily limits were cut 50-80% in Dec 2025

**Impact**: During a live demo, rapid chat interactions could hit RPD limits. Multi-tool agent calls (3-4 function calls per query) burn through RPM fast.

**Fix**:
1. Use **Gemini 2.5 Flash-Lite** (15 RPM, 1000 RPD)
2. Implement response caching (60s TTL)
3. Add debounce on chat input (500ms)
4. Pre-compute 3-4 demo scenarios and cache on first load
5. Add `DEMO_MODE` flag for pre-computed responses

```python
# services/agent_service.py
import hashlib
import time

response_cache = {}
CACHE_TTL = 60

async def cached_agent_chat(query: str):
    cache_key = hashlib.md5(query.lower().strip().encode()).hexdigest()
    
    # Check cache
    if cache_key in response_cache:
        entry = response_cache[cache_key]
        if time.time() - entry.get("_timestamp", 0) < CACHE_TTL:
            return {**entry, "cached": True}
    
    # Call Gemini
    result = await agent_chat(query)
    
    # Cache result
    result["_timestamp"] = time.time()
    response_cache[cache_key] = result
    
    return result
```

**Phase**: 2 (AI Agent)

---

## 🔴 ISSUE 2: CORS Not Configured — Frontend Will Fail

**Problem**: Frontend on `*.vercel.app` calling backend on `*.onrender.com` = cross-origin. Without CORS middleware, **every API call fails**.

**Impact**: Complete frontend-backend disconnect. Nothing works.

**Fix**: Add CORS middleware to `main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://cognitive-twin.vercel.app",
        "https://cognitive-twin-*.vercel.app",  # Preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Phase**: 1 (Backend Setup) — **Must be included from day one.**

---

## 🔴 ISSUE 3: Vessel V004 Route Impossible

**Problem**: V004 (Global Horizon) is assigned:
- S006: Shanghai → Singapore
- S007: Dubai → Rotterdam

A single vessel can't be at Shanghai AND Dubai simultaneously (~4,500nm apart).

**Impact**: Judges will spot this. Damages credibility.

**Fix**: Reassign S007 to V003 (Indian Express, docked at Mumbai, near Dubai):

| Before | After |
|--------|-------|
| S007: Dubai → Rotterdam, **V004** | S007: Dubai → Rotterdam, **V003** |

Update seed data accordingly. V003 status changes to EN_ROUTE after S005 (Mumbai→Dubai) completes.

**Phase**: 1 (Seed Data)

---

## 🟡 ISSUE 4: Neo4j AuraDB Auto-Pause/Delete

**Problem**: AuraDB Free auto-pauses after 3 days of no **write** operations. Auto-deletes after 30 days.

**Impact**: If DB is created a week before hackathon and forgotten, data is gone.

**Fix**:
1. Create instance **the day before** the hackathon
2. Build `/api/seed` endpoint for from-scratch seeding
3. Add `/api/heartbeat` endpoint:

```python
@router.post("/api/heartbeat")
async def heartbeat():
    await graph_service.run(
        "MERGE (s:System {id: 'heartbeat'}) SET s.last_ping = datetime()"
    )
    return {"status": "alive"}
```

4. Optional: GitHub Actions cron to call heartbeat every 48h

**Phase**: 1 (Database)

---

## 🟡 ISSUE 5: Render Cold Start Kills Demo

**Problem**: Render free tier spins down after 15min inactivity. Cold start = **50-90 seconds**. First API call during demo hangs.

**Impact**: Awkward silence during the most critical moment.

**Fix** (pick one):
1. **Best**: Warm up 5min before demo — visit health URL
2. **Automated**: UptimeRobot (free) pings every 5min
3. **Alternative**: Railway.app ($5 credits, no spin-down)
4. **Nuclear**: Run locally + ngrok

**Demo checklist addition:**
```
□ 5 min before demo: Open backend health URL
□ Confirm response < 1 second before starting
```

**Phase**: 4 (Deployment)

---

## 🟡 ISSUE 6: Tailwind CSS v4 Config Mismatch

**Problem**: Plan lists `tailwindcss: "^4.0.0"` AND `tailwind.config.js`. Tailwind v4 does NOT use `tailwind.config.js` — it uses CSS-based `@import "tailwindcss"` and `@theme` blocks.

**Impact**: Tailwind styles won't load. Build may fail.

**Fix (Option A — Recommended)**: Use Tailwind v4 CSS config:
```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-danger: #EF4444;
  --color-warning: #F59E0B;
  --color-success: #22C55E;
  --color-info: #3B82F6;
  --color-rerouted: #8B5CF6;
}
```

**Fix (Option B)**: Downgrade to Tailwind v3:
```json
"tailwindcss": "^3.4.0"
```

**Phase**: 3 (Frontend Setup)

---

## 🟡 ISSUE 7: Missing Leaflet CSS Import

**Problem**: Leaflet requires CSS import. Without it, map is a broken gray box.

**Impact**: Map completely broken visually.

**Fix**: Add import and fix marker icons:
```jsx
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})
```

Copy icons: `cp node_modules/leaflet/dist/images/*.png public/leaflet/`

**Phase**: 3 (Frontend Map)

---

## 🟡 ISSUE 8: Port Coordinates Need Negative Longitude

**Problem**: LA coordinates shown as `33.74°N, 118.27°W` but W must be **negative** in code. Positive 118.27 places it in China.

**Impact**: LA port renders in wrong hemisphere.

**Fix**:
```python
# CORRECT
{"id": "P003", "name": "Port of Los Angeles", "lat": 33.74, "lng": -118.27}
# WRONG
{"id": "P003", "name": "Port of Los Angeles", "lat": 33.74, "lng": 118.27}
```

**Phase**: 1 (Seed Data)

---

## 🟡 ISSUE 9: Simulation Modifies Graph State

**Problem**: Simulation pseudocode updates ETAs directly in Neo4j. "Apply Reroute" writes permanent changes. No undo for next demo run.

**Impact**: Second demo run shows already-rerouted data.

**Fix**:
1. Simulations = **read-only** (compute in Python memory, never write to Neo4j)
2. Add "Reset Demo" button → `/api/reset`
3. `/api/reset` clears graph and re-seeds:

```python
@router.post("/api/reset")
async def reset_demo():
    await graph_service.run("MATCH (n) DETACH DELETE n")
    await seed_data()
    return {"status": "reset_complete"}
```

**Phase**: 2 (Simulation Engine)

---

## 🟡 ISSUE 10: Agent Tool Schema Wrong Format

**Problem**: Tool definitions use custom JSON. Gemini SDK requires `google.genai.types` format.

**Fix**: Use correct SDK format:
```python
from google.genai import types

tools = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="get_shipments_by_port",
                description="Get all shipments at a port",
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
        ]
    )
]
```

**Phase**: 2 (AI Agent)

---

## 🟢 ISSUE 11: No Loading/Error States

**Problem**: No loading spinners, error boundaries, or empty states. Render cold start = 60+ seconds of blank UI.

**Fix**: Use React Query's built-in states:
```jsx
const { data, isLoading, error } = useQuery({
  queryKey: ['ports'],
  queryFn: fetchPorts,
  retry: 3,
  retryDelay: 2000,
})

if (isLoading) return <Skeleton />
if (error) return <ErrorCard message="Backend warming up..." />
```

**Phase**: 3 (Frontend)

---

## 🟢 ISSUE 12: Missing Navigation/Routing

**Problem**: Multiple views but no routing library.

**Fix**: Keep as single-page dashboard. No routing needed for hackathon. Less complexity = fewer bugs.

**Phase**: 3 (Frontend)

---

## 🟢 ISSUE 13: EU Gemini Commercial Restriction

**Problem**: Google prohibits commercial use of Gemini free tier in EU/EEA/UK/Switzerland.

**Fix**: Non-issue for hackathon (educational/non-commercial). Mention in pitch: "For production, we'd use paid tier."

**Phase**: N/A

---

## 🟢 ISSUE 14: No Dockerfile Content

**Problem**: Dockerfile listed but no content.

**Fix**:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Phase**: 4 (Deployment)

---

## 🔴 ISSUE 15 (NEW): Leaflet SSR Crash in Next.js

**Problem**: Leaflet accesses the `window` object, which doesn't exist during Next.js server-side rendering. Import of `react-leaflet` at the top level crashes the build.

**Impact**: Build failure OR runtime crash. Map component doesn't render at all.

**Fix**: Use `next/dynamic` with `ssr: false`:

```jsx
// app/page.jsx
import dynamic from 'next/dynamic'

const SupplyChainMap = dynamic(
  () => import('@/components/map/SupplyChainMap'),
  {
    ssr: false,
    loading: () => <div className="w-full h-96 bg-gray-800 animate-pulse rounded-lg" />
  }
)

// Now use <SupplyChainMap /> in JSX — it only renders client-side
```

**DO NOT** import Leaflet components at the top of server components. Only import inside the dynamically loaded client component.

**Phase**: 3 (Frontend Map)

---

## 🟡 ISSUE 16 (NEW): No QueryClientProvider Setup

**Problem**: `@tanstack/react-query` is listed as a dependency but no `QueryClientProvider` is mentioned in the layout. Without it, all `useQuery` hooks throw: "No QueryClient set, use QueryClientProvider to set one."

**Impact**: Every data-fetching component crashes.

**Fix**: Create a providers wrapper:

```jsx
// app/providers.jsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        retryDelay: 2000,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

```jsx
// app/layout.jsx
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

**Phase**: 3 (Frontend Setup)

---

## 🟡 ISSUE 17 (NEW): Vercel WebSocket Limitation

**Problem**: Vercel serverless functions have a 10-second execution timeout and do NOT support persistent WebSocket connections. The plan mentions `WebSocket` for real-time updates routed through Vercel.

**Impact**: WebSocket connections drop after 10 seconds on Vercel. Real-time features don't work.

**Fix options**:
1. **Direct WebSocket to Render backend** (recommended):
   ```jsx
   // Connect directly to backend, bypass Vercel
   const WS_URL = process.env.NEXT_PUBLIC_WS_URL  // wss://cognitive-twin.onrender.com
   const ws = new WebSocket(`${WS_URL}/api/ws/stream`)
   ```

2. **Use Server-Sent Events (SSE)** instead of WebSocket:
   ```python
   # Backend: FastAPI SSE endpoint
   from sse_starlette.sse import EventSourceResponse
   
   @router.get("/api/stream")
   async def stream():
       async def event_generator():
           while True:
               data = await get_updates()
               yield {"data": json.dumps(data)}
               await asyncio.sleep(5)
       return EventSourceResponse(event_generator())
   ```

3. **Polling fallback** (simplest for hackathon):
   ```jsx
   // Fetch every 30 seconds
   const { data } = useQuery({
     queryKey: ['ports'],
     queryFn: api.getPorts,
     refetchInterval: 30000,
   })
   ```

**Phase**: 4 (Deployment/Real-time)

---

## 🟡 ISSUE 18 (NEW): Missing Global Error Handler

**Problem**: FastAPI plan has no global exception handler. Unhandled errors return raw 500 responses with stack traces, potentially leaking implementation details.

**Impact**: Unhelpful error messages in production. Potential information disclosure.

**Fix**: Add global exception handler to `main.py`:

```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the full error internally
    import traceback
    traceback.print_exc()
    
    # Return clean error to client
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.environment == "development" else "An unexpected error occurred",
        }
    )

# Also handle Neo4j-specific errors
from neo4j.exceptions import ServiceUnavailable, AuthError

@app.exception_handler(ServiceUnavailable)
async def neo4j_unavailable_handler(request: Request, exc: ServiceUnavailable):
    return JSONResponse(
        status_code=503,
        content={"error": "Database unavailable", "detail": "Neo4j connection failed. The database may be paused."}
    )

@app.exception_handler(AuthError)
async def neo4j_auth_handler(request: Request, exc: AuthError):
    return JSONResponse(
        status_code=503,
        content={"error": "Database authentication failed", "detail": "Check NEO4J_PASSWORD environment variable."}
    )
```

**Phase**: 1 (Backend Core)

---

## 🟢 ISSUE 19 (NEW): No .env.example Content

**Problem**: `.env.example` is listed in the backend project structure but no template content is provided. Developers won't know which variables are needed.

**Fix**: Create `.env.example`:
```env
# Neo4j AuraDB Connection
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-auradb-password

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Environment
ENVIRONMENT=development

# Demo Mode (serve pre-computed responses)
DEMO_MODE=false
```

And frontend `.env.local.example`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

**Phase**: 1 (Project Setup)

---

## 🟢 ISSUE 20 (NEW): Duplicate Step Numbering

**Problem**: Phase 3 ends at step 21 ("Connect all components to backend API") and Phase 4 starts at step 21 ("Add WebSocket for real-time updates"). This causes confusion when referencing steps.

**Fix**: Renumber Phase 4 to start at step 22:

| Phase | Before | After |
|-------|--------|-------|
| Phase 3 | Steps 13-21 | Steps 13-21 (unchanged) |
| Phase 4 | Steps 21-27 | Steps 22-28 |

Corrected Phase 4:
22. Add WebSocket for real-time updates (stretch)
23. Add graph visualization with react-force-graph (stretch)
24. Deploy backend to Render
25. Deploy frontend to Vercel
26. Set up Neo4j AuraDB production seed
27. End-to-end demo rehearsal
28. Record backup demo video

**Phase**: N/A (Documentation)

---

## Fix Priority Order

### Must Fix Before Phase 1 Starts:
1. Issue #2 (CORS)
2. Issue #3 (V004 route)
3. Issue #8 (LA coordinates)
4. Issue #18 (Error handler)
5. Issue #19 (.env.example)

### Must Fix During Phase 2:
6. Issue #1 (Rate limits + caching)
7. Issue #9 (Read-only simulations)
8. Issue #10 (Tool schema format)

### Must Fix During Phase 3:
9. Issue #15 (Leaflet SSR crash)
10. Issue #7 (Leaflet CSS)
11. Issue #6 (Tailwind v4 config)
12. Issue #16 (QueryClientProvider)
13. Issue #11 (Loading states)

### Must Fix During Phase 4:
14. Issue #5 (Cold start)
15. Issue #4 (Neo4j pause)
16. Issue #17 (Vercel WebSocket)
17. Issue #14 (Dockerfile)

### Can Skip (Low Impact):
18. Issue #12 (Routing — skip)
19. Issue #13 (EU restriction — N/A)
20. Issue #20 (Step numbering — documentation only)
