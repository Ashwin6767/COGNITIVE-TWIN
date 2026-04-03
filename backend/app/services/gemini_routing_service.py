import asyncio
import json
import logging
import math
from functools import partial

from app.config import settings
from app.services.graph_service import graph_service

logger = logging.getLogger(__name__)

_EARTH_RADIUS_KM = 6371.0

_ACTIVE_INBOUND_STATUSES = [
    "IN_TRANSIT_TO_PORT",
    "IN_TRANSIT_SEA",
    "GOODS_COLLECTED",
]


class GeminiRoutingService:
    """AI-powered port congestion analysis and re-routing recommendations."""

    def __init__(self) -> None:
        self._client = None

    def _get_client(self):
        if self._client is not None:
            return self._client
        if not settings.gemini_api_key:
            logger.warning("Gemini API key not configured – AI features disabled")
            return None
        from google import genai

        self._client = genai.Client(api_key=settings.gemini_api_key)
        return self._client

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Return the great-circle distance in km between two points."""
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        )
        return _EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    async def _call_gemini(self, prompt: str) -> str:
        """Call the Gemini API (sync SDK) from async code via executor."""
        client = self._get_client()
        if client is None:
            raise RuntimeError("Gemini client not available")

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            partial(
                client.models.generate_content,
                model="gemini-2.5-flash",
                contents=prompt,
            ),
        )
        return response.text

    @staticmethod
    def _parse_json_response(text: str) -> dict:
        """Extract a JSON object from Gemini's response, handling markdown fences."""
        cleaned = text.strip()
        if "```" in cleaned:
            # Strip markdown code blocks
            parts = cleaned.split("```")
            for part in parts[1:]:
                body = part.split("\n", 1)[-1] if "\n" in part else part
                body = body.strip()
                if body.startswith("{") or body.startswith("["):
                    cleaned = body
                    break
        # Remove any trailing ``` that may remain
        cleaned = cleaned.rstrip("`").strip()
        return json.loads(cleaned)

    # ------------------------------------------------------------------
    # 1. Find nearby ports
    # ------------------------------------------------------------------

    async def find_nearby_ports(
        self, port_id: str, radius_km: float = 500.0
    ) -> list[dict]:
        target = await graph_service.run_single(
            "MATCH (p:Port {id: $id}) RETURN p.lat AS lat, p.lon AS lon",
            {"id": port_id},
        )
        if not target:
            return []

        all_ports = await graph_service.run(
            """
            MATCH (p:Port)
            WHERE p.id <> $id
            RETURN p.id AS id, p.name AS name, p.country AS country,
                   p.lat AS lat, p.lon AS lon, p.congestion AS congestion,
                   p.utilization AS utilization, p.capacity_teu AS capacity_teu,
                   p.avg_delay_hours AS avg_delay_hours
            """,
            {"id": port_id},
        )

        t_lat, t_lon = target["lat"], target["lon"]
        nearby: list[dict] = []
        for p in all_ports:
            dist = self._haversine(t_lat, t_lon, p["lat"], p["lon"])
            if dist <= radius_km:
                nearby.append({**p, "distance_km": round(dist, 2)})

        nearby.sort(key=lambda x: x["distance_km"])
        return nearby

    # ------------------------------------------------------------------
    # 2. Check port congestion
    # ------------------------------------------------------------------

    async def check_port_congestion(self, port_id: str) -> dict:
        port = await graph_service.run_single(
            """
            MATCH (p:Port {id: $id})
            RETURN p.id AS port_id, p.name AS port_name, p.country AS country,
                   p.congestion AS congestion_level, p.utilization AS utilization,
                   p.avg_delay_hours AS avg_delay_hours, p.capacity_teu AS capacity_teu
            """,
            {"id": port_id},
        )
        if not port:
            return {"error": "Port not found"}

        congestion = port.get("congestion_level", "LOW")
        utilization = port.get("utilization", 0)
        port["is_congested"] = congestion == "HIGH" or utilization > 0.85
        return port

    # ------------------------------------------------------------------
    # 3. Recommend alternative ports
    # ------------------------------------------------------------------

    async def recommend_alternative_ports(self, port_id: str) -> dict:
        congestion_info = await self.check_port_congestion(port_id)
        if "error" in congestion_info:
            return congestion_info

        nearby = await self.find_nearby_ports(port_id)
        # Filter out HIGH-congestion alternatives
        candidates = [p for p in nearby if p.get("congestion") != "HIGH"]

        if not candidates:
            return {
                "target_port": congestion_info,
                "is_congested": congestion_info["is_congested"],
                "alternatives": [],
                "ai_summary": "No suitable alternative ports found within range.",
                "ai_available": True,
            }

        # ------ Build Gemini prompt ------
        port_lines = "\n".join(
            f"- {c['name']} ({c['id']}): congestion={c['congestion']}, "
            f"utilization={c['utilization']}, capacity={c['capacity_teu']} TEU, "
            f"avg_delay={c['avg_delay_hours']}h, distance={c['distance_km']}km"
            for c in candidates
        )

        prompt = f"""You are the Cognitive Twin Port Intelligence System.

Analyze the following congested port and recommend the best alternative ports.

TARGET PORT (congested):
- Name: {congestion_info['port_name']} ({congestion_info['port_id']})
- Country: {congestion_info['country']}
- Congestion: {congestion_info['congestion_level']}
- Utilization: {congestion_info['utilization']}
- Avg Delay: {congestion_info['avg_delay_hours']} hours
- Capacity: {congestion_info['capacity_teu']} TEU

AVAILABLE ALTERNATIVE PORTS:
{port_lines}

Rank the alternative ports from best to worst considering:
1. Congestion level (lower is better)
2. Utilization (lower is better)
3. Distance from target (shorter is better)
4. Capacity (higher is better)
5. Average delay (lower is better)

Return your response as JSON with this exact structure:
{{
  "ranked_alternatives": [
    {{
      "port_id": "...",
      "port_name": "...",
      "score": <1-100>,
      "distance_km": <number>,
      "estimated_time_savings_hours": <number>,
      "reason": "Brief explanation"
    }}
  ],
  "summary": "A human-readable recommendation paragraph"
}}"""

        try:
            raw = await self._call_gemini(prompt)
            parsed = self._parse_json_response(raw)

            # Merge AI scores back with full port data
            score_map = {
                a["port_id"]: a for a in parsed.get("ranked_alternatives", [])
            }
            alternatives = []
            for c in candidates:
                ai = score_map.get(c["id"], {})
                alternatives.append(
                    {
                        **c,
                        "ai_score": ai.get("score"),
                        "estimated_time_savings_hours": ai.get(
                            "estimated_time_savings_hours"
                        ),
                        "reason": ai.get("reason", ""),
                    }
                )
            # Sort by AI score descending (highest = best)
            alternatives.sort(
                key=lambda x: x.get("ai_score") or 0, reverse=True
            )

            return {
                "target_port": congestion_info,
                "is_congested": congestion_info["is_congested"],
                "alternatives": alternatives,
                "ai_summary": parsed.get("summary", ""),
                "ai_available": True,
            }

        except Exception:
            logger.exception("Gemini call failed – falling back to distance ranking")
            alternatives = [
                {**c, "ai_score": None, "estimated_time_savings_hours": None, "reason": ""}
                for c in candidates
            ]
            return {
                "target_port": congestion_info,
                "is_congested": congestion_info["is_congested"],
                "alternatives": alternatives,
                "ai_summary": (
                    "AI analysis unavailable. Alternatives are ranked by distance "
                    "from the congested port (nearest first)."
                ),
                "ai_available": False,
            }

    # ------------------------------------------------------------------
    # 4. Generate re-route plan
    # ------------------------------------------------------------------

    async def generate_reroute_plan(
        self, shipment_id: str, congested_port_id: str
    ) -> dict:
        shipment = await graph_service.run_single(
            """
            MATCH (s:Shipment {id: $id})
            OPTIONAL MATCH (s)-[:ORIGIN_PORT]->(op:Port)
            OPTIONAL MATCH (s)-[:DEST_PORT]->(dp:Port)
            RETURN s.id AS id, s.status AS status,
                   op {.id, .name, .country, .lat, .lon} AS origin_port,
                   dp {.id, .name, .country, .lat, .lon} AS dest_port
            """,
            {"id": shipment_id},
        )
        if not shipment:
            return {"error": "Shipment not found"}

        recommendations = await self.recommend_alternative_ports(congested_port_id)
        if "error" in recommendations:
            return recommendations

        top_alt = (
            recommendations["alternatives"][0]
            if recommendations["alternatives"]
            else None
        )

        congested_info = recommendations["target_port"]

        # ------ Build Gemini prompt ------
        alt_summary = "None available" if not top_alt else (
            f"{top_alt['name']} ({top_alt['id']}), distance={top_alt['distance_km']}km, "
            f"congestion={top_alt['congestion']}, utilization={top_alt['utilization']}"
        )

        prompt = f"""You are the Cognitive Twin Port Intelligence System.

Create a detailed re-routing plan for the following shipment.

SHIPMENT:
- ID: {shipment['id']}
- Status: {shipment['status']}
- Origin Port: {shipment['origin_port']}
- Destination Port: {shipment['dest_port']}

CONGESTED PORT:
- Name: {congested_info['port_name']} ({congested_info['port_id']})
- Congestion: {congested_info['congestion_level']}
- Utilization: {congested_info['utilization']}
- Avg Delay: {congested_info['avg_delay_hours']} hours

RECOMMENDED ALTERNATIVE PORT:
{alt_summary}

Provide a complete re-routing plan as JSON with this structure:
{{
  "best_alternative_port": "port name and id",
  "estimated_additional_travel_hours": <number>,
  "delivery_timeline_impact": "description of impact on delivery",
  "actions": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "estimated_delay_change_hours": <number positive=slower negative=faster>,
  "plan_summary": "A concise paragraph summarizing the re-route plan"
}}"""

        reroute_plan = ""
        estimated_delay_change = None

        try:
            raw = await self._call_gemini(prompt)
            parsed = self._parse_json_response(raw)
            reroute_plan = parsed.get("plan_summary", raw)
            estimated_delay_change = parsed.get("estimated_delay_change_hours")
        except Exception:
            logger.exception("Gemini reroute plan failed – returning basic info")
            reroute_plan = (
                f"AI plan generation unavailable. Recommended alternative: "
                f"{top_alt['name'] if top_alt else 'N/A'} "
                f"({top_alt['distance_km'] if top_alt else '?'}km away)."
            )

        return {
            "shipment_id": shipment["id"],
            "congested_port": congested_info,
            "recommended_port": top_alt,
            "all_alternatives": recommendations["alternatives"],
            "reroute_plan": reroute_plan,
            "estimated_delay_change": estimated_delay_change,
        }

    # ------------------------------------------------------------------
    # 5. Predict congestion
    # ------------------------------------------------------------------

    async def predict_congestion(self, port_id: str) -> dict:
        port = await graph_service.run_single(
            """
            MATCH (p:Port {id: $id})
            RETURN p.id AS port_id, p.name AS port_name,
                   p.congestion AS congestion, p.utilization AS utilization,
                   p.avg_delay_hours AS avg_delay_hours,
                   p.capacity_teu AS capacity_teu
            """,
            {"id": port_id},
        )
        if not port:
            return {"error": "Port not found"}

        inbound = await graph_service.run_single(
            """
            MATCH (s:Shipment)-[:DEST_PORT]->(p:Port {id: $id})
            WHERE s.status IN $statuses
            RETURN count(s) AS count
            """,
            {"id": port_id, "statuses": _ACTIVE_INBOUND_STATUSES},
        )
        inbound_count = inbound["count"] if inbound else 0

        vessels = await graph_service.run_single(
            """
            MATCH (v:Vessel)-[:HEADING_TO]->(p:Port {id: $id})
            RETURN count(v) AS count
            """,
            {"id": port_id},
        )
        vessel_count = vessels["count"] if vessels else 0

        # ------ Build Gemini prompt ------
        prompt = f"""You are the Cognitive Twin Port Intelligence System.

Predict the congestion levels for this port over the next 24 hours.

PORT CURRENT STATE:
- Name: {port['port_name']} ({port['port_id']})
- Current Congestion: {port['congestion']}
- Utilization: {port['utilization']}
- Average Delay: {port['avg_delay_hours']} hours
- Capacity: {port['capacity_teu']} TEU

INBOUND TRAFFIC:
- Active inbound shipments (IN_TRANSIT_TO_PORT / IN_TRANSIT_SEA / GOODS_COLLECTED): {inbound_count}
- Vessels currently heading to port: {vessel_count}

Based on the current data, predict congestion for 6h, 12h, and 24h windows.

Return your response as JSON with this exact structure:
{{
  "predictions": {{
    "6h":  {{"level": "LOW|MEDIUM|HIGH", "confidence": <0-100>}},
    "12h": {{"level": "LOW|MEDIUM|HIGH", "confidence": <0-100>}},
    "24h": {{"level": "LOW|MEDIUM|HIGH", "confidence": <0-100>}}
  }},
  "risk_factors": ["factor 1", "factor 2"],
  "recommended_actions": ["action 1", "action 2"],
  "analysis": "A paragraph explaining the prediction rationale"
}}"""

        current_state = {
            "congestion": port["congestion"],
            "utilization": port["utilization"],
            "avg_delay_hours": port["avg_delay_hours"],
            "capacity_teu": port["capacity_teu"],
            "inbound_shipments": inbound_count,
            "inbound_vessels": vessel_count,
        }

        try:
            raw = await self._call_gemini(prompt)
            parsed = self._parse_json_response(raw)

            return {
                "port_id": port["port_id"],
                "port_name": port["port_name"],
                "current_state": current_state,
                "predictions": parsed.get("predictions", {}),
                "risk_factors": parsed.get("risk_factors", []),
                "recommended_actions": parsed.get("recommended_actions", []),
                "ai_analysis": parsed.get("analysis", ""),
                "ai_available": True,
            }

        except Exception:
            logger.exception("Gemini prediction failed – returning heuristic estimate")
            util = port["utilization"] or 0
            heuristic_level = (
                "HIGH" if util > 0.85 or inbound_count > 10
                else "MEDIUM" if util > 0.6 or inbound_count > 5
                else "LOW"
            )

            return {
                "port_id": port["port_id"],
                "port_name": port["port_name"],
                "current_state": current_state,
                "predictions": {
                    "6h": {"level": port["congestion"], "confidence": 60},
                    "12h": {"level": heuristic_level, "confidence": 40},
                    "24h": {"level": heuristic_level, "confidence": 25},
                },
                "risk_factors": [
                    f"Current utilization at {util:.0%}",
                    f"{inbound_count} inbound shipments",
                    f"{vessel_count} vessels heading to port",
                ],
                "recommended_actions": (
                    ["Consider diverting inbound vessels to nearby ports"]
                    if heuristic_level == "HIGH"
                    else ["Continue monitoring"]
                ),
                "ai_analysis": "AI analysis unavailable. Predictions are based on simple heuristics.",
                "ai_available": False,
            }


gemini_routing_service = GeminiRoutingService()
