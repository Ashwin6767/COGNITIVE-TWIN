"""
Seed script for Cognitive Twin Neo4j database.

Usage:
  Standalone:  python -m app.seed.seed_data
  From API:    POST /api/seed  (calls run_seed)
"""
import asyncio
from datetime import datetime, timedelta

from neo4j import AsyncGraphDatabase

from app.config import settings

# ── Data ──────────────────────────────────────────────────

PORTS = [
    {"id": "P001", "name": "Port of Shanghai", "lat": 31.23, "lng": 121.47,
     "congestion_level": "HIGH", "avg_delay_hours": 4.5,
     "capacity_teu": 40000, "current_utilization": 0.85},
    {"id": "P002", "name": "Port of Singapore", "lat": 1.26, "lng": 103.84,
     "congestion_level": "MEDIUM", "avg_delay_hours": 2.0,
     "capacity_teu": 35000, "current_utilization": 0.65},
    {"id": "P003", "name": "Port of Los Angeles", "lat": 33.74, "lng": -118.27,
     "congestion_level": "LOW", "avg_delay_hours": 1.0,
     "capacity_teu": 20000, "current_utilization": 0.45},
    {"id": "P004", "name": "Port of Rotterdam", "lat": 51.95, "lng": 4.14,
     "congestion_level": "MEDIUM", "avg_delay_hours": 2.5,
     "capacity_teu": 30000, "current_utilization": 0.70},
    {"id": "P005", "name": "Port of Dubai", "lat": 25.27, "lng": 55.29,
     "congestion_level": "LOW", "avg_delay_hours": 1.5,
     "capacity_teu": 22000, "current_utilization": 0.40},
    {"id": "P006", "name": "Port of Mumbai", "lat": 18.95, "lng": 72.84,
     "congestion_level": "HIGH", "avg_delay_hours": 5.0,
     "capacity_teu": 15000, "current_utilization": 0.90},
]

VESSELS = [
    {"id": "V001", "name": "Pacific Star",
     "current_lat": 25.0, "current_lng": -160.0,
     "capacity_teu": 5000, "current_load_teu": 3500,
     "speed_knots": 22.0, "status": "EN_ROUTE"},
    {"id": "V002", "name": "Atlantic Runner",
     "current_lat": 5.0, "current_lng": 75.0,
     "capacity_teu": 3000, "current_load_teu": 2200,
     "speed_knots": 20.0, "status": "EN_ROUTE"},
    {"id": "V003", "name": "Indian Express",
     "current_lat": 18.95, "current_lng": 72.84,
     "capacity_teu": 4000, "current_load_teu": 1500,
     "speed_knots": 18.0, "status": "DOCKED"},
    {"id": "V004", "name": "Global Horizon",
     "current_lat": 10.0, "current_lng": 110.0,
     "capacity_teu": 6000, "current_load_teu": 4000,
     "speed_knots": 24.0, "status": "EN_ROUTE"},
]

ROUTES = [
    {"from_id": "P001", "to_id": "P003", "distance_nm": 6500, "avg_days": 14},
    {"from_id": "P001", "to_id": "P002", "distance_nm": 2500, "avg_days": 5},
    {"from_id": "P002", "to_id": "P004", "distance_nm": 8500, "avg_days": 18},
    {"from_id": "P002", "to_id": "P003", "distance_nm": 8800, "avg_days": 19},
    {"from_id": "P006", "to_id": "P005", "distance_nm": 1200, "avg_days": 3},
    {"from_id": "P005", "to_id": "P004", "distance_nm": 6000, "avg_days": 13},
    {"from_id": "P001", "to_id": "P004", "distance_nm": 10500, "avg_days": 22},
]

VESSEL_ROUTES = [
    {"vessel_id": "V001", "arriving_at": "P003", "departed_from": "P001"},
    {"vessel_id": "V002", "arriving_at": "P004", "departed_from": "P002"},
    {"vessel_id": "V003", "arriving_at": None, "departed_from": None},
    {"vessel_id": "V004", "arriving_at": "P002", "departed_from": "P001"},
]


def _build_shipments():
    """Build shipment list with dynamic ETAs relative to now."""
    now = datetime.utcnow()
    return [
        {"id": "S001", "origin": "Shanghai", "destination": "Los Angeles",
         "priority": "HIGH", "status": "IN_TRANSIT", "cargo_type": "Electronics",
         "weight_tons": 450.0, "value_usd": 2500000.0,
         "vessel_id": "V001", "origin_port": "P001", "dest_port": "P003",
         "eta": (now + timedelta(days=10)).isoformat()},
        {"id": "S002", "origin": "Shanghai", "destination": "Los Angeles",
         "priority": "MEDIUM", "status": "IN_TRANSIT", "cargo_type": "Industrial",
         "weight_tons": 800.0, "value_usd": 1200000.0,
         "vessel_id": "V001", "origin_port": "P001", "dest_port": "P003",
         "eta": (now + timedelta(days=10)).isoformat()},
        {"id": "S003", "origin": "Singapore", "destination": "Rotterdam",
         "priority": "HIGH", "status": "IN_TRANSIT", "cargo_type": "Perishable",
         "weight_tons": 200.0, "value_usd": 800000.0,
         "vessel_id": "V002", "origin_port": "P002", "dest_port": "P004",
         "eta": (now + timedelta(days=15)).isoformat()},
        {"id": "S004", "origin": "Singapore", "destination": "Rotterdam",
         "priority": "LOW", "status": "IN_TRANSIT", "cargo_type": "Industrial",
         "weight_tons": 600.0, "value_usd": 500000.0,
         "vessel_id": "V002", "origin_port": "P002", "dest_port": "P004",
         "eta": (now + timedelta(days=15)).isoformat()},
        {"id": "S005", "origin": "Mumbai", "destination": "Dubai",
         "priority": "MEDIUM", "status": "IN_TRANSIT", "cargo_type": "Textiles",
         "weight_tons": 300.0, "value_usd": 400000.0,
         "vessel_id": "V003", "origin_port": "P006", "dest_port": "P005",
         "eta": (now + timedelta(days=3)).isoformat()},
        {"id": "S006", "origin": "Shanghai", "destination": "Singapore",
         "priority": "HIGH", "status": "IN_TRANSIT", "cargo_type": "Electronics",
         "weight_tons": 350.0, "value_usd": 3000000.0,
         "vessel_id": "V004", "origin_port": "P001", "dest_port": "P002",
         "eta": (now + timedelta(days=4)).isoformat()},
        # S007 assigned to V003 (not V004) — Issue #3 fix
        {"id": "S007", "origin": "Dubai", "destination": "Rotterdam",
         "priority": "MEDIUM", "status": "IN_TRANSIT", "cargo_type": "Oil & Gas",
         "weight_tons": 1000.0, "value_usd": 5000000.0,
         "vessel_id": "V003", "origin_port": "P005", "dest_port": "P004",
         "eta": (now + timedelta(days=16)).isoformat()},
        {"id": "S008", "origin": "Mumbai", "destination": "Los Angeles",
         "priority": "LOW", "status": "IN_TRANSIT", "cargo_type": "Pharmaceuticals",
         "weight_tons": 150.0, "value_usd": 1800000.0,
         "vessel_id": "V001", "origin_port": "P006", "dest_port": "P003",
         "eta": (now + timedelta(days=20)).isoformat()},
    ]


# ── Seed Functions ────────────────────────────────────────

async def _clear(gs):
    await gs.run("MATCH (n) DETACH DELETE n")
    print("✓ Database cleared")


async def _create_constraints(gs):
    for label in ("Port", "Vessel", "Shipment", "Warehouse"):
        await gs.run(
            f"CREATE CONSTRAINT IF NOT EXISTS FOR (n:{label}) REQUIRE n.id IS UNIQUE"
        )
    print("✓ Constraints created")


async def _seed_ports(gs):
    for p in PORTS:
        await gs.run(
            """CREATE (p:Port {
                id: $id, name: $name, lat: $lat, lng: $lng,
                congestion_level: $congestion_level,
                avg_delay_hours: $avg_delay_hours,
                capacity_teu: $capacity_teu,
                current_utilization: $current_utilization
            })""",
            **p,
        )
    print(f"✓ {len(PORTS)} ports created")


async def _seed_vessels(gs):
    for v in VESSELS:
        await gs.run(
            """CREATE (v:Vessel {
                id: $id, name: $name,
                current_lat: $current_lat, current_lng: $current_lng,
                capacity_teu: $capacity_teu, current_load_teu: $current_load_teu,
                speed_knots: $speed_knots, status: $status
            })""",
            **v,
        )
    print(f"✓ {len(VESSELS)} vessels created")


async def _seed_shipments(gs):
    shipments = _build_shipments()
    for s in shipments:
        await gs.run(
            """CREATE (s:Shipment {
                id: $id, origin: $origin, destination: $destination,
                priority: $priority, status: $status, cargo_type: $cargo_type,
                weight_tons: $weight_tons, value_usd: $value_usd,
                eta: datetime($eta)
            })""",
            id=s["id"], origin=s["origin"], destination=s["destination"],
            priority=s["priority"], status=s["status"], cargo_type=s["cargo_type"],
            weight_tons=s["weight_tons"], value_usd=s["value_usd"], eta=s["eta"],
        )
        # ASSIGNED_TO
        await gs.run(
            """MATCH (s:Shipment {id: $sid}), (v:Vessel {id: $vid})
               CREATE (s)-[:ASSIGNED_TO {assigned_date: datetime()}]->(v)""",
            sid=s["id"], vid=s["vessel_id"],
        )
        # ORIGINATES_FROM
        await gs.run(
            """MATCH (s:Shipment {id: $sid}), (p:Port {id: $pid})
               CREATE (s)-[:ORIGINATES_FROM]->(p)""",
            sid=s["id"], pid=s["origin_port"],
        )
        # DESTINED_FOR
        await gs.run(
            """MATCH (s:Shipment {id: $sid}), (p:Port {id: $pid})
               CREATE (s)-[:DESTINED_FOR]->(p)""",
            sid=s["id"], pid=s["dest_port"],
        )
    print(f"✓ {len(shipments)} shipments created with relationships")


async def _seed_routes(gs):
    for r in ROUTES:
        await gs.run(
            """MATCH (a:Port {id: $from_id}), (b:Port {id: $to_id})
               CREATE (a)-[:ROUTES_TO {distance_nm: $distance_nm, avg_days: $avg_days}]->(b)""",
            **r,
        )
    print(f"✓ {len(ROUTES)} routes created")


async def _seed_vessel_relationships(gs):
    now = datetime.utcnow()
    for vr in VESSEL_ROUTES:
        if vr["departed_from"]:
            await gs.run(
                """MATCH (v:Vessel {id: $vid}), (p:Port {id: $pid})
                   CREATE (v)-[:DEPARTED_FROM {departure: datetime($dep)}]->(p)""",
                vid=vr["vessel_id"], pid=vr["departed_from"],
                dep=(now - timedelta(days=5)).isoformat(),
            )
        if vr["arriving_at"]:
            await gs.run(
                """MATCH (v:Vessel {id: $vid}), (p:Port {id: $pid})
                   CREATE (v)-[:ARRIVING_AT {eta: datetime($eta)}]->(p)""",
                vid=vr["vessel_id"], pid=vr["arriving_at"],
                eta=(now + timedelta(days=7)).isoformat(),
            )
    print("✓ Vessel route relationships created")


async def _seed_heartbeat(gs):
    await gs.run(
        "MERGE (s:System {id: 'heartbeat'}) SET s.last_ping = datetime()"
    )
    print("✓ Heartbeat node created")


# ── Public API ────────────────────────────────────────────

async def run_seed(graph_service):
    """Called from FastAPI endpoints (POST /api/seed, /api/reset)."""
    await _clear(graph_service)
    await _create_constraints(graph_service)
    await _seed_ports(graph_service)
    await _seed_vessels(graph_service)
    await _seed_shipments(graph_service)
    await _seed_routes(graph_service)
    await _seed_vessel_relationships(graph_service)
    await _seed_heartbeat(graph_service)
    print("\n✅ Seed complete!")


async def main():
    """Standalone CLI entry point."""
    from app.services.graph_service import graph_service

    await graph_service.connect()
    try:
        await run_seed(graph_service)
    finally:
        await graph_service.close()


if __name__ == "__main__":
    asyncio.run(main())
