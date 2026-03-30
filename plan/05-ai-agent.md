# 05 — AI Agent (Gemini Integration)

## Overview
The AI agent is the conversational interface to the supply chain graph. Users ask natural language questions ("What happens if Port Shanghai is delayed by 6 hours?") and the agent uses function calling to query the graph, run simulations, and return structured decisions.

## Tech Choice: Gemini 2.5 Flash-Lite
- **Why Flash-Lite**: 15 RPM, 1000 RPD (vs Flash: 10 RPM, 500 RPD)
- **Cost**: Free tier
- **Function Calling**: Native support
- **Rate Limit Mitigation**: Response caching + debounce + DEMO_MODE fallback

> ⚠️ **Issue #1**: Original plan had wrong rate limits. Actual: 15 RPM, 1000 RPD, 250K TPM for Flash-Lite.

## Step 1: Agent Tool Definitions (Correct Gemini SDK Format)

> ⚠️ **Issue #10**: The original plan used a custom JSON format. Must use `google.genai.types` format.

```python
# tools/query_tools.py
from google.genai import types

def get_agent_tools():
    return [
        types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name="get_shipments_by_port",
                    description="Get all shipments arriving at or departing from a specific port. Returns shipment details including priority, cargo type, and assigned vessel.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "port_id": types.Schema(
                                type=types.Type.STRING,
                                description="Port ID (e.g., P001 for Shanghai, P002 for Singapore, P003 for Los Angeles, P004 for Rotterdam, P005 for Dubai, P006 for Mumbai)"
                            )
                        },
                        required=["port_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="simulate_delay",
                    description="Simulate a delay at a specific port and calculate the impact on all linked shipments. Returns affected shipments, cascade effects, and recommendations.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "port_id": types.Schema(
                                type=types.Type.STRING,
                                description="Port ID to apply delay to"
                            ),
                            "delay_hours": types.Schema(
                                type=types.Type.NUMBER,
                                description="Number of hours to simulate as delay"
                            )
                        },
                        required=["port_id", "delay_hours"]
                    )
                ),
                types.FunctionDeclaration(
                    name="suggest_reroute",
                    description="Get rerouting suggestions for a delayed shipment. Finds alternative ports with lower congestion.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "shipment_id": types.Schema(
                                type=types.Type.STRING,
                                description="Shipment ID to reroute (e.g., S001)"
                            )
                        },
                        required=["shipment_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_risk_score",
                    description="Get the current risk score (0-100) for a port, vessel, or shipment. Higher score = higher risk.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "entity_type": types.Schema(
                                type=types.Type.STRING,
                                enum=["port", "vessel", "shipment"],
                                description="Type of entity to get risk for"
                            ),
                            "entity_id": types.Schema(
                                type=types.Type.STRING,
                                description="Entity ID (e.g., P001, V001, S001)"
                            )
                        },
                        required=["entity_type", "entity_id"]
                    )
                ),
                types.FunctionDeclaration(
                    name="compare_scenarios",
                    description="Compare two delay scenarios side by side to determine which disruption has greater impact.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "scenario_a_port": types.Schema(type=types.Type.STRING, description="Port ID for scenario A"),
                            "scenario_a_delay": types.Schema(type=types.Type.NUMBER, description="Delay hours for scenario A"),
                            "scenario_b_port": types.Schema(type=types.Type.STRING, description="Port ID for scenario B"),
                            "scenario_b_delay": types.Schema(type=types.Type.NUMBER, description="Delay hours for scenario B"),
                        },
                        required=["scenario_a_port", "scenario_a_delay", "scenario_b_port", "scenario_b_delay"]
                    )
                ),
                types.FunctionDeclaration(
                    name="get_graph_overview",
                    description="Get a high-level summary of the entire supply chain: number of ports, vessels, shipments, and overall status.",
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={},
                    )
                ),
            ]
        )
    ]
```

## Step 2: Tool Execution (Function Dispatch)

```python
# tools/tool_dispatcher.py
from app.services.graph_service import graph_service
from app.services.simulation_engine import simulation_engine
from app.services.risk_service import risk_service

async def execute_tool(function_name: str, args: dict) -> dict:
    """Dispatch agent tool calls to the appropriate service."""
    
    if function_name == "get_shipments_by_port":
        return await graph_service.get_shipments_by_port(args["port_id"])
    
    elif function_name == "simulate_delay":
        result = await simulation_engine.simulate_delay(
            args["port_id"], args["delay_hours"]
        )
        return result.model_dump()
    
    elif function_name == "suggest_reroute":
        return await simulation_engine.suggest_reroute(args["shipment_id"])
    
    elif function_name == "get_risk_score":
        return await risk_service.get_risk_score(
            args["entity_type"], args["entity_id"]
        )
    
    elif function_name == "compare_scenarios":
        from app.models.simulation import DelaySimulationRequest
        return await simulation_engine.compare_scenarios(
            DelaySimulationRequest(port_id=args["scenario_a_port"], delay_hours=args["scenario_a_delay"]),
            DelaySimulationRequest(port_id=args["scenario_b_port"], delay_hours=args["scenario_b_delay"]),
        )
    
    elif function_name == "get_graph_overview":
        return await graph_service.get_graph_overview()
    
    else:
        return {"error": f"Unknown tool: {function_name}"}
```

## Step 3: Agent Service

```python
# services/agent_service.py
import hashlib
import json
from google import genai
from google.genai import types
from app.config import settings
from app.tools.query_tools import get_agent_tools
from app.tools.tool_dispatcher import execute_tool

SYSTEM_PROMPT = """You are a Supply Chain Decision Intelligence Agent for the Cognitive Twin system.

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
- Show simulation results if applicable
- End with clear, numbered recommendations

Available ports: P001 (Shanghai), P002 (Singapore), P003 (Los Angeles), P004 (Rotterdam), P005 (Dubai), P006 (Mumbai)
Available vessels: V001 (Pacific Star), V002 (Atlantic Runner), V003 (Indian Express), V004 (Global Horizon)
Shipments: S001-S008 with varying priorities."""

# Response cache for rate limit mitigation
response_cache: dict[str, dict] = {}

DEMO_RESPONSES = {
    # Pre-computed responses for common demo queries
    "what happens if port shanghai is delayed by 6 hours": {
        "response": "## Situation Assessment\n\nI've analyzed the impact of a 6-hour delay at Port of Shanghai (P001)...",
        "cached": True
    }
}


class AgentService:
    def __init__(self):
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.tools = get_agent_tools()
    
    async def chat(self, user_message: str) -> dict:
        """Process a user message through the AI agent with tool calling."""
        
        # Check cache first
        cache_key = hashlib.md5(user_message.lower().strip().encode()).hexdigest()
        if cache_key in response_cache:
            return response_cache[cache_key]
        
        # Check demo mode
        if settings.demo_mode:
            normalized = user_message.lower().strip()
            for key, response in DEMO_RESPONSES.items():
                if key in normalized:
                    return response
        
        try:
            # Create chat with system prompt and tools
            response = self.client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=user_message,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    tools=self.tools,
                    temperature=0.3,  # Lower temperature for more consistent outputs
                )
            )
            
            # Handle function calls in a loop
            max_iterations = 5  # Prevent infinite tool-calling loops
            iteration = 0
            messages = [
                types.Content(role="user", parts=[types.Part.from_text(user_message)])
            ]
            
            while iteration < max_iterations:
                iteration += 1
                
                # Check if response contains function calls
                if not response.candidates[0].content.parts:
                    break
                
                function_calls = [
                    part for part in response.candidates[0].content.parts
                    if part.function_call
                ]
                
                if not function_calls:
                    # No more function calls — we have the final text response
                    break
                
                # Add assistant's function call to messages
                messages.append(response.candidates[0].content)
                
                # Execute all function calls
                function_responses = []
                for fc in function_calls:
                    result = await execute_tool(fc.function_call.name, dict(fc.function_call.args))
                    function_responses.append(
                        types.Part.from_function_response(
                            name=fc.function_call.name,
                            response=result if isinstance(result, dict) else {"data": result}
                        )
                    )
                
                # Add function responses and get next response
                messages.append(types.Content(role="user", parts=function_responses))
                response = self.client.models.generate_content(
                    model="gemini-2.5-flash-lite",
                    contents=messages,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        tools=self.tools,
                        temperature=0.3,
                    )
                )
            
            # Extract final text response
            final_text = response.text if response.text else "I couldn't generate a response. Please try rephrasing your question."
            
            result = {
                "response": final_text,
                "tools_called": [fc.function_call.name for part in messages for fc in [part] if hasattr(part, 'function_call')],
                "cached": False
            }
            
            # Cache the response
            response_cache[cache_key] = result
            
            return result
            
        except Exception as e:
            # Fallback for rate limiting or API errors
            if "429" in str(e) or "quota" in str(e).lower():
                return {
                    "response": "⚠️ AI service is temporarily rate-limited. Try again in a moment, or use the simulation panel for direct analysis.",
                    "error": "rate_limited",
                    "cached": False
                }
            raise


agent_service = AgentService()
```

## Step 4: Agent Router

```python
# routers/agent.py
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.agent_service import agent_service

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    tools_called: list[str] = []
    cached: bool = False

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    result = await agent_service.chat(request.message)
    return ChatResponse(**result)
```

## Step 5: Rate Limit Mitigation Strategy

### 1. Response Caching (60s TTL)
```python
import time

CACHE_TTL = 60  # seconds

def get_cached(key: str) -> dict | None:
    if key in response_cache:
        entry = response_cache[key]
        if time.time() - entry.get("_timestamp", 0) < CACHE_TTL:
            return entry
        del response_cache[key]
    return None

def set_cached(key: str, value: dict):
    value["_timestamp"] = time.time()
    response_cache[key] = value
```

### 2. Frontend Debounce (500ms)
Implemented in the ChatPanel component (see 07-frontend-components.md).

### 3. DEMO_MODE Fallback
When `DEMO_MODE=true` in environment:
- Serves pre-computed responses for known demo queries
- No API calls to Gemini
- Zero latency, zero rate limit risk
- Useful as backup during demo if rate limits are hit

### 4. Pre-Compute Demo Scenarios
On first load or `/api/seed`, pre-compute and cache responses for:
1. "What happens if Port Shanghai is delayed by 6 hours?"
2. "What are the highest risk ports?"
3. "Suggest reroute options for S001"
4. "Compare Shanghai vs Mumbai delay impact"
5. "Give me an overview of the supply chain"

## Step 6: System Prompt Details

The system prompt tells the agent:
- Its role (decision intelligence)
- Available tools and when to use them
- Response format expectations
- Available entity IDs for reference
- Rules (always query first, quantify impact, prioritize HIGH shipments)

## Example Agent Interaction Flow

```
User: "What happens if Port Shanghai is delayed by 6 hours?"

Agent thinks → calls get_shipments_by_port("P001")
→ Returns: S001 (HIGH, Electronics), S002 (MEDIUM, Industrial), S006 (HIGH, Electronics)

Agent thinks → calls simulate_delay("P001", 6)
→ Returns: 3 affected shipments, 18 total impact hours, 2 reroute recommendations

Agent thinks → calls suggest_reroute("S001")
→ Returns: Singapore (P002) as alternative, saves 4 hours

Agent generates final response:
"## Situation Assessment
Port of Shanghai (P001) is experiencing a 6-hour delay. This affects 3 shipments on 2 vessels.

### Affected Shipments
| Shipment | Priority | Cargo | New ETA | Delay |
|----------|----------|-------|---------|-------|
| S001 | HIGH | Electronics | +6h | 6h |
| S002 | MEDIUM | Industrial | +6h | 6h |
| S006 | HIGH | Electronics | +6h | 6h |

### Cascade Effects
- Port of Los Angeles: +3h additional delay
- Port of Singapore: +3h additional delay

### Recommendations
1. **REROUTE S001** through Singapore (P002) — saves 4 hours, confidence: 85%
2. **REROUTE S006** through Singapore (P002) — saves 4 hours, confidence: 85%
3. **MONITOR S002** — update ETA and notify downstream warehouses"
```

## Checklist
- [ ] Gemini SDK installed (`google-genai`)
- [ ] Tool definitions using correct `google.genai.types` format
- [ ] Tool dispatcher connecting to graph/simulation/risk services
- [ ] Agent service with multi-turn function calling loop
- [ ] Response caching implemented
- [ ] DEMO_MODE fallback with pre-computed responses
- [ ] Rate limit error handling (429 → user-friendly message)
- [ ] Agent router with /chat endpoint
- [ ] System prompt with entity IDs and rules
- [ ] Max iterations guard (prevent infinite tool loops)

## Common Pitfalls
1. ⚠️ Tool schema must use `google.genai.types`, not custom JSON (Issue #10)
2. ⚠️ Flash-Lite has 15 RPM, not 15+ — cache aggressively (Issue #1)
3. ⚠️ Multi-tool calls burn RPM fast — each function call = 1 request
4. ⚠️ Gemini may hallucinate port/shipment IDs — include valid IDs in system prompt
5. ⚠️ Always handle rate limit (429) errors gracefully
6. ⚠️ `response.text` can be None if only function calls returned — check before using
