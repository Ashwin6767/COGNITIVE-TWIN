# 08 — Deployment

## Overview
Three-tier deployment: Next.js frontend on Vercel (free), FastAPI backend on Render (free), Neo4j graph database on AuraDB (free).

## Architecture
```
                    ┌─────────────┐
                    │   Vercel    │ ← Frontend (Next.js)
                    │   (Free)    │
                    └──────┬──────┘
                           │ HTTPS
                    ┌──────▼──────┐
                    │   Render    │ ← Backend (FastAPI)
                    │   (Free)    │
                    └──────┬──────┘
                           │ Bolt Protocol
                    ┌──────▼──────┐
                    │ Neo4j Aura  │ ← Graph Database
                    │   (Free)    │
                    └─────────────┘
```

## Step 1: Neo4j AuraDB Deployment

### Setup
1. Go to https://neo4j.com/cloud/aura-free/
2. Sign up (no credit card required)
3. Create free instance
4. **Save the password immediately** (shown only once!)
5. Note the connection URI: `neo4j+s://xxxxx.databases.neo4j.io`

### Limits
- 200,000 nodes, 400,000 relationships
- Auto-pauses after 3 days of no **write** operations
- Auto-deletes after 30 days of inactivity

### Prevention
- Create instance **day before** the hackathon
- Use `/api/heartbeat` endpoint that writes a timestamp
- Optional: UptimeRobot to ping heartbeat every 48 hours

## Step 2: Backend Deployment (Render)

### Setup
1. Push backend code to GitHub repository
2. Go to https://render.com
3. Create new **Web Service**
4. Connect to GitHub repo
5. Configure:
   - **Name**: cognitive-twin-api
   - **Region**: Oregon (US West) — closest to many users
   - **Branch**: main
   - **Root Directory**: `backend` (if monorepo)
   - **Runtime**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free

### Environment Variables (Render Dashboard)
```
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password-here
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=https://cognitive-twin.vercel.app
ENVIRONMENT=production
DEMO_MODE=false
```

### Dockerfile (Alternative)
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### ⚠️ Cold Start Issue (Issue #5)
Render free tier spins down after 15 min of inactivity. Cold start takes **50-90 seconds**.

**Mitigation options:**
1. **Best for demo**: Warm up 5 min before by visiting `https://your-app.onrender.com/api/health`
2. **Automated**: UptimeRobot (free) to ping `/api/health` every 5 minutes
3. **Alternative platform**: Railway.app ($5 free credits/month, no spin-down)
4. **Nuclear**: Run backend locally during demo + ngrok tunnel

**Pre-demo checklist:**
```
□ 5 min before demo: Open backend health URL in browser
□ Confirm response < 1 second before starting
□ Have local fallback ready (uvicorn running + ngrok)
```

## Step 3: Frontend Deployment (Vercel)

### Setup
1. Push frontend code to GitHub
2. Go to https://vercel.com
3. **Import** the GitHub repository
4. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend` (if monorepo)
   - **Build Command**: `npm run build` (auto)
   - **Output Directory**: `.next` (auto)

### Environment Variables (Vercel Dashboard)
```
NEXT_PUBLIC_API_URL=https://cognitive-twin-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://cognitive-twin-api.onrender.com
```

### Custom Domain (Optional)
Vercel provides `your-project.vercel.app` for free. Custom domain available in free tier.

### ⚠️ WebSocket Limitation (Issue #17)
Vercel serverless functions have a **10-second timeout** and don't support persistent WebSocket connections.

**Workaround:**
- Use Server-Sent Events (SSE) instead of WebSocket for streaming
- Or: Use polling (fetch every 2 seconds) for real-time updates
- Or: Connect WebSocket directly to Render backend URL (bypass Vercel)

```jsx
// Direct WebSocket to backend (recommended)
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
const ws = new WebSocket(`${WS_URL}/api/ws/stream`)
```

## Step 4: CORS Configuration

> ⚠️ **Issue #2**: CRITICAL — Without CORS, frontend cannot call backend.

Backend `main.py` must include:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",                    # Dev
        "https://cognitive-twin.vercel.app",        # Production
        "https://cognitive-twin-*.vercel.app",      # Preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Step 5: Environment Variable Summary

### Backend (.env / Render)
| Variable | Description | Example |
|----------|------------|---------|
| NEO4J_URI | AuraDB connection URI | neo4j+s://xxx.databases.neo4j.io |
| NEO4J_USER | Neo4j username | neo4j |
| NEO4J_PASSWORD | Neo4j password | (from AuraDB setup) |
| GEMINI_API_KEY | Google Gemini API key | AIza... |
| FRONTEND_URL | Vercel frontend URL | https://cognitive-twin.vercel.app |
| ENVIRONMENT | dev/production | production |
| DEMO_MODE | Use pre-computed responses | false |

### Frontend (.env.local / Vercel)
| Variable | Description | Example |
|----------|------------|---------|
| NEXT_PUBLIC_API_URL | Backend REST API URL | https://cognitive-twin-api.onrender.com |
| NEXT_PUBLIC_WS_URL | Backend WebSocket URL | wss://cognitive-twin-api.onrender.com |

## Step 6: Deployment Verification Checklist

```bash
# 1. Backend health check
curl https://cognitive-twin-api.onrender.com/api/health
# Expected: {"status": "healthy", "service": "cognitive-twin"}

# 2. Seed the database
curl -X POST https://cognitive-twin-api.onrender.com/api/seed
# Expected: {"status": "seeded"}

# 3. Test graph endpoint
curl https://cognitive-twin-api.onrender.com/api/graph/ports
# Expected: Array of 6 ports

# 4. Frontend loads
# Open https://cognitive-twin.vercel.app in browser
# Expected: Dashboard with map

# 5. Cross-origin test (in browser console on Vercel site)
fetch('https://cognitive-twin-api.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
# Expected: No CORS error, health response
```

## Step 7: CI/CD (Auto-Deploy)

Both Render and Vercel auto-deploy on push to `main`:

```bash
git push origin main
# → Render rebuilds backend
# → Vercel rebuilds frontend
# → Both live in ~2-5 minutes
```

### GitHub Actions (Optional)
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt
      - run: cd backend && python -m pytest tests/ -v

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci && npm run build
```

## Step 8: Render Alternatives

| Platform | Free Tier | Spin-down | Notes |
|----------|----------|-----------|-------|
| **Render** | 750h/month | Yes (15min) | Default choice |
| **Railway** | $5/month credits | No spin-down | Better for demos |
| **Fly.io** | 3 shared VMs | Yes (configurable) | More complex setup |
| **Local + ngrok** | Free | N/A | Best reliability for demo |

## Checklist
- [ ] Neo4j AuraDB instance created (day before hackathon)
- [ ] Backend deployed to Render with env vars
- [ ] Frontend deployed to Vercel with env vars
- [ ] CORS configured with correct Vercel origin
- [ ] Database seeded via /api/seed
- [ ] Health check returns 200
- [ ] Frontend can call backend (no CORS errors)
- [ ] Map loads with port/vessel data
- [ ] Chat panel connects to AI agent
- [ ] UptimeRobot configured (optional)
- [ ] Pre-demo warm-up plan documented

## Common Pitfalls
1. ⚠️ CORS not configured — complete frontend-backend disconnect (Issue #2)
2. ⚠️ Render cold start during demo — warm up beforehand (Issue #5)
3. ⚠️ Vercel doesn't support persistent WebSocket — use SSE or direct connection (Issue #17)
4. ⚠️ Neo4j auto-pauses after 3 days — create instance day-of (Issue #4)
5. ⚠️ Environment variables must match exactly between platforms
6. ⚠️ NEXT_PUBLIC_ prefix required for client-side env vars in Next.js
