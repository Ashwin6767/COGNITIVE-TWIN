"""Risk scoring service — calculates 0-100 risk scores for supply chain entities."""
from app.services.graph_service import graph_service


class RiskService:
    """Computes risk scores for ports, vessels, and shipments."""

    async def get_risk_score(self, entity_type: str, entity_id: str) -> dict:
        if entity_type == "port":
            return await self._port_risk(entity_id)
        if entity_type == "vessel":
            return await self._vessel_risk(entity_id)
        if entity_type == "shipment":
            return await self._shipment_risk(entity_id)
        return {"error": f"Unknown entity type: {entity_type}"}

    # ── Port Risk ─────────────────────────────────────────

    async def _port_risk(self, port_id: str) -> dict:
        data = await graph_service.run(
            """
            MATCH (p:Port {id: $port_id})
            OPTIONAL MATCH (s:Shipment)-[:ASSIGNED_TO]->(v:Vessel)-[:ARRIVING_AT]->(p)
            WHERE s.priority = 'HIGH'
            RETURN p, count(s) AS high_priority_count
            """,
            port_id=port_id,
        )
        if not data:
            return {"error": f"Port {port_id} not found"}

        port = data[0]["p"]
        high_count = data[0]["high_priority_count"]
        congestion_scores = {"LOW": 10, "MEDIUM": 30, "HIGH": 60, "CRITICAL": 90}

        score = (
            congestion_scores.get(port["congestion_level"], 0) * 0.4
            + port["current_utilization"] * 100 * 0.3
            + min(port["avg_delay_hours"] * 5, 100) * 0.2
            + min(high_count * 15, 100) * 0.1
        )
        score = round(min(score, 100), 1)

        return {
            "entity_type": "port",
            "entity_id": port_id,
            "risk_score": score,
            "risk_level": (
                "CRITICAL" if score >= 75
                else "HIGH" if score >= 50
                else "MEDIUM" if score >= 25
                else "LOW"
            ),
            "factors": {
                "congestion": port["congestion_level"],
                "utilization": f"{port['current_utilization'] * 100:.0f}%",
                "avg_delay": f"{port['avg_delay_hours']}h",
                "high_priority_shipments": high_count,
            },
        }

    # ── Vessel Risk ───────────────────────────────────────

    async def _vessel_risk(self, vessel_id: str) -> dict:
        data = await graph_service.run(
            """
            MATCH (v:Vessel {id: $vessel_id})
            OPTIONAL MATCH (s:Shipment)-[:ASSIGNED_TO]->(v)
            WHERE s.priority = 'HIGH'
            OPTIONAL MATCH (v)-[:ARRIVING_AT]->(p:Port)
            RETURN v, count(s) AS high_priority_count,
                   p.congestion_level AS dest_congestion
            """,
            vessel_id=vessel_id,
        )
        if not data:
            return {"error": f"Vessel {vessel_id} not found"}

        vessel = data[0]["v"]
        high_count = data[0]["high_priority_count"]
        dest_congestion = data[0].get("dest_congestion", "LOW")
        load_pct = (
            vessel["current_load_teu"] / vessel["capacity_teu"] * 100
            if vessel["capacity_teu"] > 0
            else 0
        )
        congestion_scores = {"LOW": 10, "MEDIUM": 30, "HIGH": 60, "CRITICAL": 90}

        score = (
            min(load_pct, 100) * 0.3
            + min(high_count * 20, 100) * 0.3
            + congestion_scores.get(dest_congestion or "LOW", 0) * 0.4
        )
        score = round(min(score, 100), 1)

        return {
            "entity_type": "vessel",
            "entity_id": vessel_id,
            "risk_score": score,
            "risk_level": (
                "CRITICAL" if score >= 75
                else "HIGH" if score >= 50
                else "MEDIUM" if score >= 25
                else "LOW"
            ),
            "factors": {
                "load_percentage": f"{load_pct:.0f}%",
                "high_priority_shipments": high_count,
                "destination_congestion": dest_congestion or "N/A",
            },
        }

    # ── Shipment Risk ─────────────────────────────────────

    async def _shipment_risk(self, shipment_id: str) -> dict:
        data = await graph_service.run(
            """
            MATCH (s:Shipment {id: $shipment_id})
            OPTIONAL MATCH (s)-[:DESTINED_FOR]->(p:Port)
            RETURN s, p.congestion_level AS dest_congestion,
                   p.avg_delay_hours AS dest_delay
            """,
            shipment_id=shipment_id,
        )
        if not data:
            return {"error": f"Shipment {shipment_id} not found"}

        shipment = data[0]["s"]
        dest_congestion = data[0].get("dest_congestion", "LOW")
        dest_delay = data[0].get("dest_delay", 0) or 0
        priority_scores = {"HIGH": 70, "MEDIUM": 40, "LOW": 15}
        congestion_scores = {"LOW": 10, "MEDIUM": 30, "HIGH": 60, "CRITICAL": 90}

        score = (
            priority_scores.get(shipment["priority"], 0) * 0.4
            + congestion_scores.get(dest_congestion or "LOW", 0) * 0.35
            + min(dest_delay * 5, 100) * 0.25
        )
        score = round(min(score, 100), 1)

        return {
            "entity_type": "shipment",
            "entity_id": shipment_id,
            "risk_score": score,
            "risk_level": (
                "CRITICAL" if score >= 75
                else "HIGH" if score >= 50
                else "MEDIUM" if score >= 25
                else "LOW"
            ),
            "factors": {
                "priority": shipment["priority"],
                "destination_congestion": dest_congestion or "N/A",
                "destination_avg_delay": f"{dest_delay}h",
            },
        }


risk_service = RiskService()
