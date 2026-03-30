"""
Simulation engine — models supply chain disruption impacts.

All simulations are READ-ONLY: they query Neo4j for current state
but compute results entirely in memory.  The graph is never mutated.
"""
from datetime import timedelta

from app.models.simulation import (
    AffectedShipment,
    DelaySimulationRequest,
    Recommendation,
    SimulationResult,
)
from app.services.graph_service import graph_service


class SimulationEngine:
    """Core simulation logic for delay propagation, rerouting, and comparison."""

    # ── Delay Propagation ─────────────────────────────────

    async def simulate_delay(
        self, port_id: str, delay_hours: float
    ) -> SimulationResult:
        affected_data = await graph_service.run(
            """
            MATCH (v:Vessel)-[:ARRIVING_AT]->(p:Port {id: $port_id})
            MATCH (s:Shipment)-[:ASSIGNED_TO]->(v)
            RETURN s.id AS shipment_id, s.priority AS priority,
                   s.eta AS eta, s.origin AS origin,
                   s.destination AS destination,
                   s.cargo_type AS cargo_type, s.value_usd AS value_usd,
                   v.id AS vessel_id, v.name AS vessel_name
            """,
            port_id=port_id,
        )

        if not affected_data:
            return SimulationResult(
                affected_shipments=[],
                cascades=[],
                recommendations=[],
                total_impact_hours=0,
            )

        affected_shipments = []
        for rec in affected_data:
            eta = rec.get("eta")
            priority_impact = self._calculate_priority_impact(
                rec["priority"], delay_hours
            )
            affected_shipments.append(
                AffectedShipment(
                    shipment_id=rec["shipment_id"],
                    original_eta=str(eta) if eta else None,
                    new_eta=(
                        str(eta + timedelta(hours=delay_hours)) if eta else None
                    ),
                    delay_hours=delay_hours,
                    priority=rec["priority"],
                    priority_impact=priority_impact,
                )
            )

        cascades = await self._calculate_cascades(port_id, delay_hours)
        recommendations = await self._generate_recommendations(
            affected_data, port_id, delay_hours
        )

        return SimulationResult(
            affected_shipments=affected_shipments,
            cascades=cascades,
            recommendations=recommendations,
            total_impact_hours=round(delay_hours * len(affected_shipments), 1),
        )

    # ── Priority Impact ───────────────────────────────────

    @staticmethod
    def _calculate_priority_impact(priority: str, delay_hours: float) -> str:
        if priority == "HIGH":
            if delay_hours >= 6:
                return "CRITICAL"
            if delay_hours >= 3:
                return "HIGH"
            return "MEDIUM"
        if priority == "MEDIUM":
            if delay_hours >= 12:
                return "HIGH"
            if delay_hours >= 6:
                return "MEDIUM"
            return "LOW"
        # LOW
        if delay_hours >= 24:
            return "MEDIUM"
        return "LOW"

    # ── Cascade Effects ───────────────────────────────────

    async def _calculate_cascades(
        self, port_id: str, delay_hours: float
    ) -> list[dict]:
        cascade_data = await graph_service.run(
            """
            MATCH (p:Port {id: $port_id})-[:ROUTES_TO]->(next:Port)
            RETURN next.id AS port_id, next.name AS port_name,
                   next.congestion_level AS congestion
            """,
            port_id=port_id,
        )
        cascades = []
        for rec in cascade_data:
            cascade_delay = delay_hours * 0.5
            if rec["congestion"] in ("HIGH", "CRITICAL"):
                cascade_delay *= 1.5
            cascades.append(
                {
                    "port_id": rec["port_id"],
                    "port_name": rec["port_name"],
                    "cascade_delay_hours": round(cascade_delay, 1),
                    "reason": (
                        f"Delayed arrivals from {port_id} "
                        f"+ existing {rec['congestion']} congestion"
                    ),
                }
            )
        return cascades

    # ── Recommendations ───────────────────────────────────

    async def _generate_recommendations(
        self, affected_data: list, port_id: str, delay_hours: float
    ) -> list[Recommendation]:
        recommendations: list[Recommendation] = []
        for rec in affected_data:
            if rec["priority"] == "HIGH" and delay_hours > 4:
                alt_ports = await graph_service.find_alternate_routes(
                    from_port_id=port_id, exclude_port_id=port_id
                )
                if alt_ports:
                    best = alt_ports[0]["alt"]
                    time_saved = delay_hours - best.get("avg_delay_hours", 0)
                    if time_saved > 0:
                        recommendations.append(
                            Recommendation(
                                action="REROUTE",
                                shipment_id=rec["shipment_id"],
                                description=(
                                    f"Reroute {rec['shipment_id']} through "
                                    f"{best['name']} (saves ~{time_saved:.1f}h)"
                                ),
                                time_saved_hours=round(time_saved, 1),
                                confidence=0.85,
                            )
                        )
            elif rec["priority"] == "MEDIUM" and delay_hours > 6:
                recommendations.append(
                    Recommendation(
                        action="RESCHEDULE",
                        shipment_id=rec["shipment_id"],
                        description=(
                            f"Update ETA for {rec['shipment_id']} "
                            f"and notify downstream warehouses"
                        ),
                        time_saved_hours=0,
                        confidence=0.90,
                    )
                )
        return recommendations

    # ── Reroute Suggestion ────────────────────────────────

    async def suggest_reroute(self, shipment_id: str) -> dict:
        shipment_data = await graph_service.run(
            """
            MATCH (s:Shipment {id: $shipment_id})-[:ASSIGNED_TO]->(v:Vessel)
            MATCH (v)-[:ARRIVING_AT]->(current_port:Port)
            MATCH (s)-[:DESTINED_FOR]->(dest:Port)
            RETURN s, v, current_port, dest
            """,
            shipment_id=shipment_id,
        )
        if not shipment_data:
            return {"error": f"Shipment {shipment_id} not found or has no active route"}

        data = shipment_data[0]
        current_port = data["current_port"]

        alternatives = await graph_service.run(
            """
            MATCH (current:Port {id: $current_port_id})-[:ROUTES_TO]->(alt:Port)
            WHERE alt.congestion_level IN ['LOW', 'MEDIUM']
              AND alt.current_utilization < 0.7
            OPTIONAL MATCH (alt)-[r:ROUTES_TO]->(dest:Port {id: $dest_port_id})
            RETURN alt, r.distance_nm AS onward_distance, r.avg_days AS onward_days
            ORDER BY alt.avg_delay_hours ASC
            """,
            current_port_id=current_port["id"],
            dest_port_id=data["dest"]["id"],
        )

        reroute_options = [
            {
                "port_id": a["alt"]["id"],
                "port_name": a["alt"]["name"],
                "congestion": a["alt"]["congestion_level"],
                "expected_delay_hours": a["alt"]["avg_delay_hours"],
                "onward_distance_nm": a.get("onward_distance"),
                "onward_days": a.get("onward_days"),
            }
            for a in alternatives
        ]

        return {
            "shipment_id": shipment_id,
            "current_route_port": current_port["name"],
            "alternatives": reroute_options,
        }

    # ── Scenario Comparison ───────────────────────────────

    async def compare_scenarios(
        self,
        scenario_a: DelaySimulationRequest,
        scenario_b: DelaySimulationRequest,
    ) -> dict:
        result_a = await self.simulate_delay(scenario_a.port_id, scenario_a.delay_hours)
        result_b = await self.simulate_delay(scenario_b.port_id, scenario_b.delay_hours)
        return {
            "scenario_a": {
                "description": f"Port {scenario_a.port_id} delayed by {scenario_a.delay_hours}h",
                "result": result_a.model_dump(),
            },
            "scenario_b": {
                "description": f"Port {scenario_b.port_id} delayed by {scenario_b.delay_hours}h",
                "result": result_b.model_dump(),
            },
            "comparison": {
                "impact_difference_hours": round(
                    result_a.total_impact_hours - result_b.total_impact_hours, 1
                ),
                "more_severe": (
                    "A" if result_a.total_impact_hours > result_b.total_impact_hours else "B"
                ),
            },
        }


simulation_engine = SimulationEngine()
