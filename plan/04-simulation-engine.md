# 04 — Simulation Engine

## Overview
The simulation engine is the core intelligence layer. It models the impact of supply chain disruptions (port delays, congestion changes, vessel breakdowns) and generates actionable recommendations (reroute, reschedule, reassign).

**Critical Design Decision**: Simulations are **READ-ONLY**. They compute results in Python memory and never write to Neo4j. This ensures the graph state remains pristine for repeatable demos. See Issue #9.

## Architecture
```
Simulation Request (port_id, delay_hours)
    │
    ▼
┌─────────────────────────────┐
│  1. Query affected entities │ ← Neo4j (read-only)
│  2. Calculate propagation   │ ← In-memory computation
│  3. Calculate cascades      │ ← In-memory
│  4. Generate recommendations│ ← In-memory + graph lookups
│  5. Return SimulationResult │
└─────────────────────────────┘
    │
    ▼
SimulationResult (JSON) → Frontend renders before/after
```

## Step 1: Core Simulation — Delay Propagation

### Algorithm
```python
# services/simulation_engine.py

from datetime import timedelta
from typing import Optional
from app.services.graph_service import graph_service
from app.models.simulation import (
    SimulationResult, AffectedShipment, Recommendation, 
    DelaySimulationRequest
)


class SimulationEngine:
    
    async def simulate_delay(self, port_id: str, delay_hours: float) -> SimulationResult:
        """
        Simulate a delay at a port and calculate impact on all linked shipments.
        
        Algorithm:
        1. Find all vessels arriving at the delayed port
        2. For each vessel, find all assigned shipments
        3. Calculate new ETA for each shipment
        4. Determine priority impact
        5. Calculate cascade effects on downstream ports
        6. Generate recommendations for HIGH priority shipments
        """
        
        # Step 1: Find affected vessels and their shipments
        affected_data = await graph_service.run("""
            MATCH (v:Vessel)-[:ARRIVING_AT]->(p:Port {id: $port_id})
            MATCH (s:Shipment)-[:ASSIGNED_TO]->(v)
            RETURN s.id as shipment_id, s.priority as priority, 
                   s.eta as eta, s.origin as origin, s.destination as destination,
                   s.cargo_type as cargo_type, s.value_usd as value_usd,
                   v.id as vessel_id, v.name as vessel_name
        """, port_id=port_id)
        
        if not affected_data:
            return SimulationResult(
                affected_shipments=[],
                cascades=[],
                recommendations=[],
                total_impact_hours=0
            )
        
        # Step 2: Calculate impact per shipment
        affected_shipments = []
        for record in affected_data:
            priority_impact = self._calculate_priority_impact(
                record["priority"], delay_hours
            )
            affected_shipments.append(AffectedShipment(
                shipment_id=record["shipment_id"],
                original_eta=str(record["eta"]) if record["eta"] else None,
                new_eta=str(record["eta"] + timedelta(hours=delay_hours)) if record["eta"] else None,
                delay_hours=delay_hours,
                priority=record["priority"],
                priority_impact=priority_impact
            ))
        
        # Step 3: Calculate cascade effects
        cascades = await self._calculate_cascades(port_id, delay_hours)
        
        # Step 4: Generate recommendations
        recommendations = await self._generate_recommendations(
            affected_data, port_id, delay_hours
        )
        
        return SimulationResult(
            affected_shipments=affected_shipments,
            cascades=cascades,
            recommendations=recommendations,
            total_impact_hours=delay_hours * len(affected_shipments)
        )
    
    def _calculate_priority_impact(self, priority: str, delay_hours: float) -> str:
        """Determine how critical the delay is based on shipment priority."""
        if priority == "HIGH":
            if delay_hours >= 6:
                return "CRITICAL"
            elif delay_hours >= 3:
                return "HIGH"
            else:
                return "MEDIUM"
        elif priority == "MEDIUM":
            if delay_hours >= 12:
                return "HIGH"
            elif delay_hours >= 6:
                return "MEDIUM"
            else:
                return "LOW"
        else:  # LOW priority
            if delay_hours >= 24:
                return "MEDIUM"
            else:
                return "LOW"
    
    async def _calculate_cascades(self, port_id: str, delay_hours: float) -> list[dict]:
        """
        Calculate downstream cascade effects.
        If a port is delayed, vessels leaving that port will arrive late
        at their next destination, potentially causing further delays.
        """
        cascade_data = await graph_service.run("""
            MATCH (p:Port {id: $port_id})-[:ROUTES_TO]->(next:Port)
            RETURN next.id as port_id, next.name as port_name,
                   next.congestion_level as congestion
        """, port_id=port_id)
        
        cascades = []
        for record in cascade_data:
            cascade_delay = delay_hours * 0.5  # Cascade dampening factor
            if record["congestion"] in ["HIGH", "CRITICAL"]:
                cascade_delay *= 1.5  # Congested ports amplify delays
            cascades.append({
                "port_id": record["port_id"],
                "port_name": record["port_name"],
                "cascade_delay_hours": round(cascade_delay, 1),
                "reason": f"Delayed arrivals from {port_id} + existing {record['congestion']} congestion"
            })
        
        return cascades
    
    async def _generate_recommendations(
        self, affected_data: list, port_id: str, delay_hours: float
    ) -> list[Recommendation]:
        """Generate actionable recommendations for affected shipments."""
        recommendations = []
        
        for record in affected_data:
            # Only recommend rerouting for HIGH priority shipments with significant delays
            if record["priority"] == "HIGH" and delay_hours > 4:
                alt_ports = await graph_service.find_alternate_routes(
                    from_port_id=port_id, exclude_port_id=port_id
                )
                if alt_ports:
                    best_alt = alt_ports[0]["alt"]
                    time_saved = delay_hours - best_alt.get("avg_delay_hours", 0)
                    if time_saved > 0:
                        recommendations.append(Recommendation(
                            action="REROUTE",
                            shipment_id=record["shipment_id"],
                            description=f"Reroute {record['shipment_id']} through {best_alt['name']} (saves ~{time_saved:.1f}h)",
                            time_saved_hours=round(time_saved, 1),
                            confidence=0.85
                        ))
            
            # For any delayed shipment, suggest monitoring
            elif record["priority"] == "MEDIUM" and delay_hours > 6:
                recommendations.append(Recommendation(
                    action="RESCHEDULE",
                    shipment_id=record["shipment_id"],
                    description=f"Update ETA for {record['shipment_id']} and notify downstream warehouses",
                    time_saved_hours=0,
                    confidence=0.90
                ))
        
        return recommendations


simulation_engine = SimulationEngine()
```

## Step 2: Reroute Suggestion Algorithm

```python
async def suggest_reroute(self, shipment_id: str) -> dict:
    """
    Find the best alternative route for a shipment.
    
    Algorithm:
    1. Find the shipment's current vessel and destination port
    2. Find the vessel's current/next port
    3. Query alternative ports with lower congestion
    4. Calculate time difference for each alternative
    5. Return ranked alternatives
    """
    
    # Get shipment details with current route
    shipment_data = await graph_service.run("""
        MATCH (s:Shipment {id: $shipment_id})-[:ASSIGNED_TO]->(v:Vessel)
        MATCH (v)-[:ARRIVING_AT]->(current_port:Port)
        MATCH (s)-[:DESTINED_FOR]->(dest:Port)
        RETURN s, v, current_port, dest
    """, shipment_id=shipment_id)
    
    if not shipment_data:
        return {"error": f"Shipment {shipment_id} not found"}
    
    data = shipment_data[0]
    current_port = data["current_port"]
    
    # Find alternative ports
    alternatives = await graph_service.run("""
        MATCH (current:Port {id: $current_port_id})-[:ROUTES_TO]->(alt:Port)
        WHERE alt.congestion_level IN ['LOW', 'MEDIUM']
        AND alt.current_utilization < 0.7
        OPTIONAL MATCH (alt)-[r:ROUTES_TO]->(dest:Port {id: $dest_port_id})
        RETURN alt, r.distance_nm as onward_distance, r.avg_days as onward_days
        ORDER BY alt.avg_delay_hours ASC
    """, current_port_id=current_port["id"], dest_port_id=data["dest"]["id"])
    
    reroute_options = []
    for alt in alternatives:
        reroute_options.append({
            "port_id": alt["alt"]["id"],
            "port_name": alt["alt"]["name"],
            "congestion": alt["alt"]["congestion_level"],
            "expected_delay_hours": alt["alt"]["avg_delay_hours"],
            "onward_distance_nm": alt.get("onward_distance"),
            "onward_days": alt.get("onward_days"),
        })
    
    return {
        "shipment_id": shipment_id,
        "current_route_port": current_port["name"],
        "alternatives": reroute_options
    }
```

## Step 3: Scenario Comparison

```python
async def compare_scenarios(
    self, scenario_a: DelaySimulationRequest, scenario_b: DelaySimulationRequest
) -> dict:
    """Compare two disruption scenarios side by side."""
    result_a = await self.simulate_delay(scenario_a.port_id, scenario_a.delay_hours)
    result_b = await self.simulate_delay(scenario_b.port_id, scenario_b.delay_hours)
    
    return {
        "scenario_a": {
            "description": f"Port {scenario_a.port_id} delayed by {scenario_a.delay_hours}h",
            "result": result_a.model_dump()
        },
        "scenario_b": {
            "description": f"Port {scenario_b.port_id} delayed by {scenario_b.delay_hours}h",
            "result": result_b.model_dump()
        },
        "comparison": {
            "impact_difference_hours": result_a.total_impact_hours - result_b.total_impact_hours,
            "more_severe": "A" if result_a.total_impact_hours > result_b.total_impact_hours else "B"
        }
    }
```

## Step 4: Risk Scoring

```python
# services/risk_service.py

class RiskService:
    
    async def get_risk_score(self, entity_type: str, entity_id: str) -> dict:
        """
        Calculate risk score (0-100) for a port, vessel, or shipment.
        
        Factors:
        - Port: congestion_level, utilization, avg_delay, connected high-priority shipments
        - Vessel: load percentage, number of high-priority shipments, route congestion
        - Shipment: priority, current delay, port congestion at destination
        """
        if entity_type == "port":
            return await self._port_risk(entity_id)
        elif entity_type == "vessel":
            return await self._vessel_risk(entity_id)
        elif entity_type == "shipment":
            return await self._shipment_risk(entity_id)
        else:
            return {"error": f"Unknown entity type: {entity_type}"}
    
    async def _port_risk(self, port_id: str) -> dict:
        data = await graph_service.run("""
            MATCH (p:Port {id: $port_id})
            OPTIONAL MATCH (s:Shipment)-[:ASSIGNED_TO]->(v:Vessel)-[:ARRIVING_AT]->(p)
            WHERE s.priority = 'HIGH'
            RETURN p, count(s) as high_priority_count
        """, port_id=port_id)
        
        if not data:
            return {"error": "Port not found"}
        
        port = data[0]["p"]
        high_count = data[0]["high_priority_count"]
        
        congestion_scores = {"LOW": 10, "MEDIUM": 30, "HIGH": 60, "CRITICAL": 90}
        
        score = (
            congestion_scores.get(port["congestion_level"], 0) * 0.4 +
            port["current_utilization"] * 100 * 0.3 +
            min(port["avg_delay_hours"] * 5, 100) * 0.2 +
            min(high_count * 15, 100) * 0.1
        )
        
        return {
            "entity_type": "port",
            "entity_id": port_id,
            "risk_score": round(min(score, 100), 1),
            "risk_level": "CRITICAL" if score >= 75 else "HIGH" if score >= 50 else "MEDIUM" if score >= 25 else "LOW",
            "factors": {
                "congestion": port["congestion_level"],
                "utilization": f"{port['current_utilization']*100:.0f}%",
                "avg_delay": f"{port['avg_delay_hours']}h",
                "high_priority_shipments": high_count
            }
        }

risk_service = RiskService()
```

## Step 5: Simulation Router

```python
# routers/simulation.py
from fastapi import APIRouter
from app.models.simulation import (
    DelaySimulationRequest, RerouteSimulationRequest,
    CongestionSimulationRequest, ScenarioCompareRequest
)
from app.services.simulation_engine import simulation_engine
from app.services.risk_service import risk_service

router = APIRouter()

@router.post("/delay")
async def simulate_delay(request: DelaySimulationRequest):
    return await simulation_engine.simulate_delay(request.port_id, request.delay_hours)

@router.post("/reroute")
async def simulate_reroute(request: RerouteSimulationRequest):
    return await simulation_engine.suggest_reroute(request.shipment_id)

@router.post("/compare")
async def compare_scenarios(request: ScenarioCompareRequest):
    return await simulation_engine.compare_scenarios(request.scenario_a, request.scenario_b)

@router.get("/risk/{entity_type}/{entity_id}")
async def get_risk(entity_type: str, entity_id: str):
    return await risk_service.get_risk_score(entity_type, entity_id)
```

## Design Decisions

### Why Read-Only Simulations?
- **Repeatability**: Demo can be run multiple times without resetting
- **Safety**: No risk of corrupting graph state during live demo
- **Speed**: In-memory computation is faster than graph writes
- **Isolation**: Multiple simulations can run concurrently without conflicts

### Cascade Dampening Factor (0.5)
- Each downstream port receives 50% of the original delay
- HIGH/CRITICAL congestion ports amplify by 1.5x
- This prevents unrealistic domino effects

### Priority Impact Matrix
| Shipment Priority | Delay < 3h | Delay 3-6h | Delay 6-12h | Delay 12-24h | Delay > 24h |
|-------------------|------------|------------|-------------|-------------|-------------|
| HIGH | MEDIUM | HIGH | CRITICAL | CRITICAL | CRITICAL |
| MEDIUM | LOW | LOW | MEDIUM | HIGH | HIGH |
| LOW | LOW | LOW | LOW | LOW | MEDIUM |

## Checklist
- [ ] SimulationEngine class with simulate_delay method
- [ ] Priority impact calculation
- [ ] Cascade effect calculation with dampening
- [ ] Recommendation generation (reroute for HIGH priority)
- [ ] Reroute suggestion algorithm
- [ ] Scenario comparison
- [ ] Risk scoring service (port, vessel, shipment)
- [ ] Simulation router with all endpoints
- [ ] All simulations are READ-ONLY (no graph writes)
- [ ] Integration test: delay simulation returns correct affected shipments

## Common Pitfalls
1. ⚠️ Simulation must NOT write to Neo4j — use in-memory only (Issue #9)
2. ⚠️ Handle empty results (no vessels at port → return empty SimulationResult)
3. ⚠️ Cascade calculations can loop if ports have circular routes — add visited set
4. ⚠️ Risk scores should be clamped to 0-100 range
5. ⚠️ DateTime arithmetic needs careful handling with Neo4j DateTime type
