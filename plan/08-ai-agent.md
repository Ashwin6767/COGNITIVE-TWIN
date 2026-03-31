# Module 08 — AI Agent Enhancement

## Goal
Upgrade the AI from a simple chatbot to a decision engine that understands the full logistics workflow. It can query any node in the graph, understand user roles, and give role-appropriate recommendations. It proactively detects problems and suggests solutions.

---

## Enhanced System Prompt

```python
SYSTEM_PROMPT = """You are the Cognitive Twin AI — a decision intelligence agent
for a logistics management platform.

You have access to a live graph database containing:
- Shipments (with 15-stage lifecycle tracking)
- Containers, Vessels, Ports, Yards
- Drivers, Trucks
- Documents and Forms
- Users and Companies

Your role:
1. Answer questions about any entity in the system
2. Detect problems (delays, congestion, customs holds, capacity issues)
3. Recommend actions based on the user's role
4. Quantify impact (hours, dollars, affected shipments)
5. Consider the full chain — a delay at one node cascades downstream

The current user's role is: {user_role}
Tailor your response to what this role can actually do.

For CUSTOMER: focus on shipment status, ETAs, what they need to do next
For LOGISTICS_MANAGER: focus on overview, bottlenecks, resource allocation
For DRIVER: focus on current assignment, route, next steps
For PORT_OFFICER: focus on port operations, vessels, loading schedule
For CUSTOMS_OFFICER: focus on pending declarations, compliance
For YARD_MANAGER: focus on yard utilization, container placement, loading queue
"""
```

---

## New Agent Tools (Gemini Function Calling)

### File: `backend/app/tools/query_tools.py` (Rewrite)

```python
# Reduced from 16 to 10 tools for better Gemini function calling performance
AGENT_TOOLS = [
    # Core tools (updated)
    "get_shipment",              # Full shipment with timeline, documents, container (merged get_shipment_details + get_shipment_timeline)
    "get_shipments_by_status",   # List shipments filtered by status, priority, route
    "get_port_info",             # Port congestion, utilization, vessels, schedule (merged get_port_status + get_port_schedule)
    "get_vessel_details",        # Vessel position, load, containers, route
    "get_yard_and_containers",   # Yard grid, container statuses, available slots (merged get_container_status + get_yard_utilization)

    # Analysis tools
    "simulate_delay",            # What-if delay propagation (keep)
    "suggest_reroute",           # Alternative routing (keep)
    "get_risk_score",            # Entity risk scoring (keep)
    "get_cascade_impact",        # Downstream impact of a node change

    # User-context tools
    "get_pending_actions",       # What needs attention for current user (by role AND user_id)
]
```

### Tool: `get_pending_actions`

```python
async def get_pending_actions(user_role: str, user_id: str) -> dict:
    """
    Returns what needs the user's attention right now.
    Uses both role AND user_id to scope results (e.g., driver's specific
    assignments, port officer's specific port).

    For LOGISTICS_MANAGER:
      - Shipments pending approval
      - Drivers that need assignment
      - Customs holds requiring escalation

    For PORT_OFFICER:
      - Pending port entries
      - BOLs to issue
      - Vessels awaiting departure clearance

    For CUSTOMS_OFFICER:
      - Declarations pending review

    For YARD_MANAGER:
      - Containers awaiting placement
      - Loading queue for today
    """
```

### Tool: `get_workflow_bottlenecks`

```python
async def get_workflow_bottlenecks() -> dict:
    """
    Find shipments that have been stuck at a stage for too long.

    Thresholds:
      UNDER_REVIEW: > 4 hours
      CUSTOMS_CLEARANCE: > 24 hours
      IN_YARD: > 48 hours (unless waiting for vessel)

    Returns: list of {shipment_id, status, stuck_since, hours_stuck, recommended_action}
    """
```

### Tool: `get_cascade_impact`

```python
async def get_cascade_impact(node_type: str, node_id: str, change_type: str) -> dict:
    """
    Calculate downstream impact of a change.

    Examples:
      - Port P001 congestion increases → affects 5 shipments, 2 vessels
      - Vessel V001 delayed 6h → affects 12 containers, 8 shipments
      - Customs hold on SHP-003 → delays delivery by ~48h, affects customer X

    Returns: {affected_entities, total_impact_hours, recommendations}
    """
```

---

## Role-Scoped Responses

The agent's response changes based on who's asking:

### Same question, different answers:

**Question:** "What's happening with shipment SHP-003?"

**To CUSTOMER:**
> "Your shipment SHP-003 is currently at customs clearance at Port Shanghai. The declaration was submitted 2 hours ago. Expected clearance within 12 hours. You'll be notified when it moves to the yard. No action needed from you right now."

**To LOGISTICS_MANAGER:**
> "SHP-003 is at customs clearance (2h). HS code 8471 (electronics), declared value $125K. Customs queue has 3 items ahead. If cleared by 6 PM, it can make the Pacific Star departure tomorrow. Fallback vessel: Atlantic Runner (departs in 3 days). Risk score: 42/100 (MEDIUM)."

**To CUSTOMS_OFFICER:**
> "SHP-003 — Electronics (HS 8471), origin China, declared $125K. Supporting documents attached. Country of origin certificate verified. No flags in the system. Ready for your review."

---

## Proactive Alerts via Agent

### File: `backend/app/services/agent_alerts.py`

```python
class AgentAlertService:
    """Periodically scan graph for issues and generate AI-powered alerts."""

    async def scan_for_issues(self) -> list[dict]:
        """
        Runs every 15 minutes (not 5 — reduces API quota usage).
        Checks with pure Python threshold logic (no AI for detection):
        1. Shipments stuck at a stage too long
        2. Port congestion exceeding thresholds
        3. Vessels running behind schedule
        4. Customs queue backlogs
        5. Yard approaching capacity

        For standard issues: generates alerts using templates (no Gemini call).
        Only calls Gemini for complex cascade scenarios (max 5 calls per scan).
        """

    async def generate_alert(self, issue: dict) -> dict:
        """
        Uses Gemini to generate a contextual alert message
        tailored to the stakeholders who need to act.
        """
```

---

## Updated Tool Dispatcher

### File: `backend/app/tools/tool_dispatcher.py` (Rewrite)

Add all new tools to the dispatch table. Each tool:
1. Receives args from Gemini function call
2. Queries the appropriate service
3. Returns structured data for the agent to interpret

---

## Files to Create/Update

```
backend/app/tools/query_tools.py       # UPDATE: new tool definitions
backend/app/tools/tool_dispatcher.py   # UPDATE: new dispatch routes
backend/app/services/agent_service.py  # UPDATE: role-aware system prompt
backend/app/services/agent_alerts.py   # NEW: proactive issue scanning
```

---

## Testing

```
test_agent_role_scoped_response   — Same query returns different text per role
test_pending_actions_per_role     — Each role gets their relevant actions
test_workflow_bottlenecks         — Stuck shipments detected correctly
test_cascade_impact_calculation   — Downstream nodes found via graph traversal
test_proactive_alert_scan         — Issues detected from graph state
test_agent_uses_new_tools         — Agent calls new tools when appropriate
```
