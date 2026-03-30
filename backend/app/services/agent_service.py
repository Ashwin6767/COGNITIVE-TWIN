"""
AI agent service — Gemini-powered conversational supply chain assistant.

Handles:
- Multi-turn function calling with Gemini 2.5 Flash-Lite
- Response caching (Issue #1: rate limit mitigation)
- DEMO_MODE fallback for pre-computed responses
- Graceful degradation when API key is missing
"""
import hashlib
import time
import traceback

from app.config import settings

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

CACHE_TTL = 60  # seconds
_response_cache: dict[str, dict] = {}

DEMO_RESPONSES = {
    "what happens if port shanghai is delayed by 6 hours": {
        "response": (
            "## Situation Assessment\n\n"
            "A 6-hour delay at **Port of Shanghai (P001)** impacts 3 shipments "
            "across 2 vessels.\n\n"
            "### Affected Shipments\n"
            "| Shipment | Priority | Cargo | Delay |\n"
            "|----------|----------|-------|-------|\n"
            "| S001 | HIGH | Electronics | +6h |\n"
            "| S002 | MEDIUM | Industrial | +6h |\n"
            "| S006 | HIGH | Electronics | +6h |\n\n"
            "### Cascade Effects\n"
            "- Port of Los Angeles: +3h estimated cascade delay\n"
            "- Port of Singapore: +3h estimated cascade delay\n\n"
            "### Recommendations\n"
            "1. **REROUTE S001** through Singapore (P002) — saves ~2.5h, confidence: 85%\n"
            "2. **REROUTE S006** through Singapore (P002) — saves ~2.5h, confidence: 85%\n"
            "3. **MONITOR S002** — update ETA and notify downstream warehouses"
        ),
        "tools_called": ["get_shipments_by_port", "simulate_delay", "suggest_reroute"],
        "cached": True,
    },
    "give me an overview": {
        "response": (
            "## Supply Chain Overview\n\n"
            "- **6 ports** monitored (2 HIGH congestion: Shanghai, Mumbai)\n"
            "- **4 vessels** active (3 EN_ROUTE, 1 DOCKED)\n"
            "- **8 shipments** in transit (3 HIGH priority)\n\n"
            "### Risk Summary\n"
            "- **Shanghai (P001)**: HIGH congestion, 85% utilization\n"
            "- **Mumbai (P006)**: HIGH congestion, 90% utilization\n"
            "- All other ports operating normally."
        ),
        "tools_called": ["get_graph_overview"],
        "cached": True,
    },
    "highest risk": {
        "response": (
            "## Highest Risk Ports\n\n"
            "| Port | Congestion | Utilization | Avg Delay |\n"
            "|------|-----------|-------------|----------|\n"
            "| Mumbai (P006) | HIGH | 90% | 5.0h |\n"
            "| Shanghai (P001) | HIGH | 85% | 4.5h |\n\n"
            "Both ports carry HIGH priority shipments and are operating "
            "near capacity. Recommend proactive monitoring and reroute "
            "contingencies for HIGH priority cargo."
        ),
        "tools_called": ["get_risk_score"],
        "cached": True,
    },
}


def _cache_get(key: str) -> dict | None:
    if key in _response_cache:
        entry = _response_cache[key]
        if time.time() - entry.get("_ts", 0) < CACHE_TTL:
            return {k: v for k, v in entry.items() if k != "_ts"}
        del _response_cache[key]
    return None


def _cache_set(key: str, value: dict) -> None:
    _response_cache[key] = {**value, "_ts": time.time()}


class AgentService:
    """Gemini-powered agent with function calling and caching."""

    def __init__(self):
        self._client = None
        self._tools = None

    def _ensure_client(self):
        """Lazy-init the Gemini client (avoids crash when key is missing)."""
        if self._client is not None:
            return
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY not configured")
        from google import genai
        self._client = genai.Client(api_key=settings.gemini_api_key)
        from app.tools.query_tools import get_agent_tools
        self._tools = get_agent_tools()

    async def chat(self, user_message: str) -> dict:
        """Process a user message through the AI agent."""
        cache_key = hashlib.md5(user_message.lower().strip().encode()).hexdigest()

        # 1. Check cache
        cached = _cache_get(cache_key)
        if cached:
            return {**cached, "cached": True}

        # 2. Check demo mode
        if settings.demo_mode:
            normalized = user_message.lower().strip()
            for key, resp in DEMO_RESPONSES.items():
                if key in normalized:
                    return resp

        # 3. Try Gemini
        try:
            self._ensure_client()
        except RuntimeError:
            return self._no_key_fallback(user_message)

        try:
            from google.genai import types
            from app.tools.tool_dispatcher import execute_tool

            messages = [
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(user_message)],
                )
            ]

            response = self._client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=messages,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    tools=self._tools,
                    temperature=0.3,
                ),
            )

            tools_used: list[str] = []
            max_iters = 5
            for _ in range(max_iters):
                if (
                    not response.candidates
                    or not response.candidates[0].content
                    or not response.candidates[0].content.parts
                ):
                    break

                fn_calls = [
                    p for p in response.candidates[0].content.parts if p.function_call
                ]
                if not fn_calls:
                    break

                messages.append(response.candidates[0].content)

                fn_responses = []
                for fc in fn_calls:
                    tools_used.append(fc.function_call.name)
                    result = await execute_tool(
                        fc.function_call.name, dict(fc.function_call.args)
                    )
                    payload = result if isinstance(result, dict) else {"data": result}
                    fn_responses.append(
                        types.Part.from_function_response(
                            name=fc.function_call.name, response=payload
                        )
                    )

                messages.append(types.Content(role="user", parts=fn_responses))
                response = self._client.models.generate_content(
                    model="gemini-2.5-flash-lite",
                    contents=messages,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        tools=self._tools,
                        temperature=0.3,
                    ),
                )

            final_text = (
                response.text
                if response.text
                else "I couldn't generate a response. Please try rephrasing."
            )

            result = {
                "response": final_text,
                "tools_called": tools_used,
                "cached": False,
            }
            _cache_set(cache_key, result)
            return result

        except Exception as exc:
            traceback.print_exc()
            if "429" in str(exc) or "quota" in str(exc).lower():
                return {
                    "response": (
                        "⚠️ AI service is temporarily rate-limited. "
                        "Try again in a moment, or use the simulation panel."
                    ),
                    "tools_called": [],
                    "cached": False,
                }
            return {
                "response": f"⚠️ AI agent error: {exc}",
                "tools_called": [],
                "cached": False,
            }

    @staticmethod
    def _no_key_fallback(user_message: str) -> dict:
        """Return a helpful message when no API key is configured."""
        normalized = user_message.lower().strip()
        for key, resp in DEMO_RESPONSES.items():
            if key in normalized:
                return resp
        return {
            "response": (
                "⚠️ Gemini API key not configured. "
                "Set GEMINI_API_KEY in your .env file, or enable DEMO_MODE=true "
                "for pre-computed responses.\n\n"
                "You can still use the simulation panel and graph endpoints directly."
            ),
            "tools_called": [],
            "cached": False,
        }


agent_service = AgentService()
