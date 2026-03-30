# 10 — Demo Preparation

## Overview
Complete demo preparation guide: 7-scene script (~4 minutes), pre-demo checklist, backup plans, and reset procedure.

## Demo Script (Step-by-Step)

### Scene 1: Introduction (30 seconds)
**Say**: "Supply chains today have a visibility problem — tools tell you what happened, but no one tells you what to DO. Cognitive Twin is a decision intelligence system that models your supply chain as a live graph and helps you decide the best action."

**Show**: Title slide or splash screen.

### Scene 2: Show Normal State (30 seconds)
**Actions**:
- Open the dashboard
- Point to the map with 4 vessels moving along routes
- Point to the alerts panel (all ports GREEN/YELLOW)

**Say**: "Here's our live supply chain — 8 shipments, 4 vessels, 6 ports. Everything is on track."

### Scene 3: Introduce Disruption (30 seconds)
**Actions**:
- Click on Port Shanghai (P001) on the map
- In the simulation panel, select Shanghai and set delay to 6 hours
- Click "Run Simulation"

**Say**: "Now let's introduce a disruption. Port of Shanghai just reported a 6-hour congestion delay."

**Visual**: P001 marker turns RED. Alert appears: "⚠️ Port of Shanghai — HIGH congestion"

### Scene 4: Ask the AI Agent (60 seconds)
**Actions**:
- Type in chat: "What happens if Port Shanghai is delayed by 6 hours?"
- Wait for agent response

**Say**: "Let's ask our AI agent what the impact is. The agent queries the live graph, runs a simulation, and gives us a structured analysis."

**Expected Agent Actions**:
1. Calls `get_shipments_by_port("P001")` → finds S001, S002, S006
2. Calls `simulate_delay("P001", 6)` → calculates impact
3. Calls `suggest_reroute("S001")` → finds P002 as alternative
4. Returns structured response with recommendations

### Scene 5: Show Simulation Results (30 seconds)
**Actions**:
- Point to the simulation panel before/after comparison
- Highlight the affected shipments

**Say**: "The simulation shows 3 shipments affected — S001, S002, and S006 — totaling 18 shipment-hours of delay. The cascade effect hits Singapore and Los Angeles too."

**Visual**:
- S001: +6h delay, CRITICAL impact
- S002: +6h delay, MEDIUM impact
- S006: +6h delay, CRITICAL impact

### Scene 6: Show Recommendation (30 seconds)
**Actions**:
- Point to the recommendations panel
- Highlight the reroute suggestion

**Say**: "The system recommends: Reroute S001 through Singapore — saves 4 hours. That's $12,000 in estimated cost savings from a single decision."

**Visual**:
- Recommendation card: REROUTE S001 → P002, saves 4h, 85% confidence
- Cost savings: $12,000

### Scene 7: Close (30 seconds)
**Say**: "Cognitive Twin turns your supply chain into a thinking system. It doesn't just track — it decides. One disruption, one simulation, one decision — that's the future of supply chain intelligence."

**Total demo time: ~4 minutes**

## Pre-Demo Checklist

### 1 Hour Before
- [ ] Verify Neo4j AuraDB instance is active (not paused)
- [ ] Open backend health URL: `https://cognitive-twin-api.onrender.com/api/health`
- [ ] Confirm response time < 1 second (if slow, backend is cold-starting)
- [ ] Open frontend: `https://cognitive-twin.vercel.app`
- [ ] Verify map loads with all 6 ports and 4 vessels

### 30 Minutes Before
- [ ] Seed/reset the database: `POST /api/seed` or click "Reset Demo"
- [ ] Test the AI chat: send "Give me a supply chain overview"
- [ ] Confirm AI agent responds (not rate-limited)
- [ ] Run one simulation: Shanghai, 6h delay
- [ ] Verify recommendations appear

### 5 Minutes Before
- [ ] Ping backend health again (keep it warm)
- [ ] Reset demo state: Click "Reset Demo" button
- [ ] Close all unrelated browser tabs
- [ ] Set browser to fullscreen / presentation mode
- [ ] Open backup demo video (in case of live failure)
- [ ] Disable notifications (Do Not Disturb)

### During Demo
- [ ] Follow the script scene by scene
- [ ] If AI agent is slow: "The agent is analyzing the graph..." (buy time)
- [ ] If backend is down: Switch to backup video
- [ ] If rate limited: Use simulation panel directly (skip AI chat)

## Backup Plans

### If Backend (Render) Is Down
1. **Option A**: Run backend locally
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload
   # Use ngrok for public URL if needed
   ```
2. **Option B**: Play backup demo video

### If Neo4j AuraDB Is Paused/Down
1. Reset/re-seed: `POST /api/seed`
2. If AuraDB is inaccessible: Switch to DEMO_MODE (pre-computed responses)

### If Gemini API Is Rate Limited
1. Enable DEMO_MODE: Set `DEMO_MODE=true` in environment
2. Pre-computed responses serve the demo scenarios
3. Use simulation panel (no AI needed) to show impact analysis

### If Internet Is Flaky
1. Run everything locally:
   - Backend: `uvicorn app.main:app --reload` (localhost:8000)
   - Frontend: `npm run dev` (localhost:3000)
   - Neo4j: Can't run locally, but DEMO_MODE works offline
2. Have mobile hotspot ready

## Demo Reset Procedure

Between demo runs or if something breaks:

1. Click "Reset Demo" button in the UI header
   - This calls `POST /api/reset`
   - Clears all graph data
   - Re-seeds from scratch
   - Takes ~5 seconds

2. Or via API:
   ```bash
   curl -X POST https://your-backend.onrender.com/api/reset
   ```

3. Refresh the frontend page

## Key Demo Queries (Pre-Tested)

Test each of these before the demo:

| Query | Expected Tools Called | Expected Outcome |
|-------|---------------------|------------------|
| "What happens if Port Shanghai is delayed by 6 hours?" | get_shipments_by_port, simulate_delay, suggest_reroute | 3 affected shipments, reroute S001 recommendation |
| "What are the highest risk ports?" | get_risk_score (×6) | Shanghai (P001) and Mumbai (P006) highest risk |
| "Suggest reroute options for S001" | suggest_reroute | Singapore (P002) as alternative |
| "Compare Shanghai vs Mumbai delay impact" | compare_scenarios | Side-by-side comparison |
| "Give me an overview of the supply chain" | get_graph_overview | 6 ports, 4 vessels, 8 shipments |

## Timing Guide

| Scene | Duration | Cumulative | Key Action |
|-------|----------|------------|------------|
| 1. Introduction | 30s | 0:30 | Pitch line |
| 2. Normal State | 30s | 1:00 | Show dashboard |
| 3. Disruption | 30s | 1:30 | Run simulation |
| 4. AI Agent | 60s | 2:30 | Chat query + response |
| 5. Results | 30s | 3:00 | Before/after view |
| 6. Recommendation | 30s | 3:30 | Reroute suggestion |
| 7. Close | 30s | 4:00 | Closing statement |

## Backup Demo Video

Record a backup demo video covering the full flow:
- Screen record the entire 4-minute demo
- Use a clean browser session
- Include narration
- Save as MP4 locally and upload to Google Drive/YouTube (unlisted)
- Have it ready to play if live demo fails

## Presentation Tips
1. **Speak to the problem first** — judges care about the problem more than the tech
2. **Show, don't tell** — the live demo IS the presentation
3. **Quantify everything** — "saves 4 hours" and "$12,000 in savings" are more impactful than "it helps"
4. **Have a recovery phrase** — if something breaks: "Let me show you the backup of what this looks like when it's running"
5. **End strong** — the closing line should be memorable

## Checklist
- [ ] Demo script memorized / on notes
- [ ] Pre-demo checklist completed
- [ ] All 5 key queries tested
- [ ] Reset procedure verified
- [ ] Backup video recorded
- [ ] Local fallback ready (backend + frontend)
- [ ] Timing rehearsed (< 4 minutes)
- [ ] Browser in presentation mode
- [ ] Notifications disabled
