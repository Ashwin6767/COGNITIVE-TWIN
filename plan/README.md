# Cognitive Twin — Plan Index

> **Decision-intelligence supply chain system**: A live graph model of the supply chain that predicts disruptions and recommends optimal decisions by simulating outcomes.

## 📋 Plan Documents

| # | Document | Description | Build Phase |
|---|----------|-------------|-------------|
| 00 | [00-MASTER-PLAN.md](./00-MASTER-PLAN.md) | Original comprehensive plan (full reference) | All |
| 01 | [01-project-setup.md](./01-project-setup.md) | Repository init, environment setup, tech stack, scaffolding | Pre-Phase 1 |
| 02 | [02-database-setup.md](./02-database-setup.md) | Neo4j AuraDB setup, graph schema, seed data, heartbeat | Phase 1 |
| 03 | [03-backend-core.md](./03-backend-core.md) | FastAPI structure, config, Pydantic models, graph service, API endpoints | Phase 1 |
| 04 | [04-simulation-engine.md](./04-simulation-engine.md) | Delay propagation, reroute algorithm, cascade effects, read-only design | Phase 2 |
| 05 | [05-ai-agent.md](./05-ai-agent.md) | Gemini 2.5 Flash-Lite, function calling, tools, system prompt, caching | Phase 2 |
| 06 | [06-frontend-setup.md](./06-frontend-setup.md) | Next.js 15, Tailwind CSS v4, layout, client/server components | Phase 3 |
| 07 | [07-frontend-components.md](./07-frontend-components.md) | Map, chat, simulation, alerts, recommendations, graph viz | Phase 3 |
| 08 | [08-deployment.md](./08-deployment.md) | Render, Vercel, Neo4j cloud, CORS, Docker, env vars | Phase 4 |
| 09 | [09-testing.md](./09-testing.md) | Backend tests, frontend tests, mocking, key test cases | Phase 1–3 |
| 10 | [10-demo-prep.md](./10-demo-prep.md) | Demo script, pre-demo checklist, warm-up, backup video | Phase 4 |
| 11 | [11-scalability.md](./11-scalability.md) | Post-hackathon scaling for graph, backend, agent, architecture | Post-Hackathon |
| 12 | [12-issues-and-fixes.md](./12-issues-and-fixes.md) | All 20 known issues with severity ratings, impacts, and code fixes | All Phases |

## 🏗️ Build Phases

### Phase 1: Foundation (Core Backend)
📄 Reference: [01-project-setup](./01-project-setup.md), [02-database-setup](./02-database-setup.md), [03-backend-core](./03-backend-core.md)
1. Set up Python project with FastAPI
2. Set up Neo4j AuraDB Free instance
3. Create graph service with Neo4j driver
4. Write seed data script
5. Build core graph query endpoints
6. Test: graph queries return correct data

### Phase 2: Intelligence (Simulation + Agent)
📄 Reference: [04-simulation-engine](./04-simulation-engine.md), [05-ai-agent](./05-ai-agent.md)
7. Build simulation engine (delay propagation)
8. Build reroute suggestion algorithm
9. Integrate Gemini 2.5 Flash-Lite with function calling
10. Define and implement agent tools
11. Build `/agent/chat` endpoint
12. Test: full simulation + agent flow works

### Phase 3: Interface (Frontend)
📄 Reference: [06-frontend-setup](./06-frontend-setup.md), [07-frontend-components](./07-frontend-components.md)
13. Scaffold Next.js 15 project with Tailwind CSS
14. Set up app/layout.jsx with header and sidebar
15. Build app/page.jsx as main dashboard
16. Implement Leaflet map component (with SSR fix)
17. Build alerts panel component
18. Build chat panel with AI agent integration
19. Build simulation panel (input + before/after results)
20. Build recommendation/action cards
21. Connect all components to backend API

### Phase 4: Polish & Deploy
📄 Reference: [08-deployment](./08-deployment.md), [10-demo-prep](./10-demo-prep.md)
22. Add WebSocket for real-time updates (stretch)
23. Add graph visualization with react-force-graph (stretch)
24. Deploy backend to Render
25. Deploy frontend to Vercel
26. Set up Neo4j AuraDB production seed
27. End-to-end demo rehearsal
28. Record backup demo video

## ⚠️ Known Issues
See [12-issues-and-fixes.md](./12-issues-and-fixes.md) for all 20 issues:
- 🔴 **3 Critical/High** — Must fix before any demo
- 🟡 **10 Medium** — Should fix during development
- 🟢 **7 Low** — Nice to fix, won't break anything

## 🎯 Quick Reference Commands
```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m app.seed.seed_data          # Seed Neo4j
uvicorn app.main:app --reload         # Start dev server

# Frontend (Next.js)
cd frontend && npm install
npm run dev                           # Dev server (localhost:3000)
npm run build                         # Production build

# Deploy
git push origin main                  # Triggers auto-deploy
```
