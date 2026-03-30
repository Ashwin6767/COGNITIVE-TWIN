# 02 — Database Setup (Neo4j Graph)

## Overview
Setting up Neo4j AuraDB Free as the graph database for modeling supply chain relationships.

## Step 1: Create Neo4j AuraDB Free Instance
1. Go to https://neo4j.com/cloud/aura-free/
2. Sign up (no credit card required)
3. Create a new free instance
4. **IMPORTANT**: Save the auto-generated password immediately — it's only shown once
5. Note the connection URI (format: `neo4j+s://xxxxx.databases.neo4j.io`)
6. Update `.env` with credentials

### Free Tier Limits
- 200,000 nodes
- 400,000 relationships
- Auto-pauses after 3 days of no write operations
- Auto-deletes after 30 days of inactivity

## Step 2: Graph Schema Design

### Node Types

#### Shipment
```cypher
(:Shipment {
  id: String,           // "S001"
  origin: String,       // "Shanghai"
  destination: String,  // "Los Angeles"
  priority: String,     // "HIGH" | "MEDIUM" | "LOW"
  eta: DateTime,
  status: String,       // "IN_TRANSIT" | "DELAYED" | "DELIVERED" | "REROUTED"
  cargo_type: String,   // "Electronics" | "Perishable" | "Industrial"
  weight_tons: Float,
  value_usd: Float
})
```

#### Vessel
```cypher
(:Vessel {
  id: String,             // "V001"
  name: String,           // "Pacific Star"
  current_lat: Float,
  current_lng: Float,
  capacity_teu: Integer,  // Twenty-foot Equivalent Units
  current_load_teu: Integer,
  speed_knots: Float,
  status: String          // "EN_ROUTE" | "DOCKED" | "IDLE"
})
```

#### Port
```cypher
(:Port {
  id: String,
  name: String,
  lat: Float,
  lng: Float,
  congestion_level: String,  // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  avg_delay_hours: Float,
  capacity_teu: Integer,
  current_utilization: Float  // 0.0 - 1.0
})
```

#### Warehouse
```cypher
(:Warehouse {
  id: String,
  name: String,
  lat: Float,
  lng: Float,
  capacity: Integer,
  current_stock: Integer,
  type: String  // "DISTRIBUTION" | "STORAGE" | "COLD_CHAIN"
})
```

### Relationships
```cypher
(Shipment)-[:ASSIGNED_TO {assigned_date: DateTime}]->(Vessel)
(Vessel)-[:ARRIVING_AT {eta: DateTime}]->(Port)
(Vessel)-[:DEPARTED_FROM {departure: DateTime}]->(Port)
(Port)-[:ROUTES_TO {distance_nm: Float, avg_days: Float}]->(Port)
(Shipment)-[:ORIGINATES_FROM]->(Port)
(Shipment)-[:DESTINED_FOR]->(Port)
(Port)-[:SERVES]->(Warehouse)
// Extended (if time permits)
(Shipment)-[:DEPENDS_ON]->(Shipment)
```

## Step 3: Seed Data

### Ports (6)
| ID | Name | Lat | Lng | Congestion |
|----|------|-----|-----|------------|
| P001 | Port of Shanghai | 31.23 | 121.47 | HIGH |
| P002 | Port of Singapore | 1.26 | 103.84 | MEDIUM |
| P003 | Port of Los Angeles | 33.74 | **-118.27** | LOW |
| P004 | Port of Rotterdam | 51.95 | 4.14 | MEDIUM |
| P005 | Port of Dubai | 25.27 | 55.29 | LOW |
| P006 | Port of Mumbai | 18.95 | 72.84 | HIGH |

> ⚠️ **CRITICAL**: Port of Los Angeles longitude must be **negative** (-118.27). Positive value places it in China. See Issue #8.

### Vessels (4)
| ID | Name | Capacity | Status | Current Position |
|----|------|----------|--------|-----------------|
| V001 | Pacific Star | 5000 TEU | EN_ROUTE | Near Pacific (25.0, -160.0) |
| V002 | Atlantic Runner | 3000 TEU | EN_ROUTE | Indian Ocean (5.0, 75.0) |
| V003 | Indian Express | 4000 TEU | DOCKED | Mumbai (18.95, 72.84) |
| V004 | Global Horizon | 6000 TEU | EN_ROUTE | South China Sea (10.0, 110.0) |

### Shipments (8) — CORRECTED
| ID | Origin | Dest | Priority | Vessel | Cargo |
|----|--------|------|----------|--------|-------|
| S001 | Shanghai | Los Angeles | HIGH | V001 | Electronics |
| S002 | Shanghai | Los Angeles | MEDIUM | V001 | Industrial |
| S003 | Singapore | Rotterdam | HIGH | V002 | Perishable |
| S004 | Singapore | Rotterdam | LOW | V002 | Industrial |
| S005 | Mumbai | Dubai | MEDIUM | V003 | Textiles |
| S006 | Shanghai | Singapore | HIGH | V004 | Electronics |
| S007 | Dubai | Rotterdam | MEDIUM | **V003** | Oil & Gas |
| S008 | Mumbai | Los Angeles | LOW | V001 | Pharmaceuticals |

> ⚠️ **FIX APPLIED**: S007 reassigned from V004 to V003. V004 can't be at both Shanghai and Dubai simultaneously. See Issue #3.

### Routes (port-to-port)
| From | To | Distance (nm) | Avg Days |
|------|-----|---------------|----------|
| P001 | P003 | 6500 | 14 |
| P001 | P002 | 2500 | 5 |
| P002 | P004 | 8500 | 18 |
| P002 | P003 | 8800 | 19 |
| P006 | P005 | 1200 | 3 |
| P005 | P004 | 6000 | 13 |
| P001 | P004 | 10500 | 22 |

## Step 4: Seed Script Implementation

Full Python seed script (`app/seed/seed_data.py`):

```python
"""
Seed script for Cognitive Twin Neo4j database.
Run: python -m app.seed.seed_data
"""
import asyncio
from datetime import datetime, timedelta
from neo4j import AsyncGraphDatabase
from app.config import settings


async def clear_database(driver):
    async with driver.session() as session:
        await session.run("MATCH (n) DETACH DELETE n")
        print("✓ Database cleared")


async def create_constraints(driver):
    async with driver.session() as session:
        constraints = [
            "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Port) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (v:Vessel) REQUIRE v.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (s:Shipment) REQUIRE s.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (w:Warehouse) REQUIRE w.id IS UNIQUE",
        ]
        for c in constraints:
            await session.run(c)
        print("✓ Constraints created")


async def seed_ports(driver):
    ports = [
        {"id": "P001", "name": "Port of Shanghai", "lat": 31.23, "lng": 121.47,
         "congestion_level": "HIGH", "avg_delay_hours": 4.5, "capacity_teu": 40000, "current_utilization": 0.85},
        {"id": "P002", "name": "Port of Singapore", "lat": 1.26, "lng": 103.84,
         "congestion_level": "MEDIUM", "avg_delay_hours": 2.0, "capacity_teu": 35000, "current_utilization": 0.65},
        {"id": "P003", "name": "Port of Los Angeles", "lat": 33.74, "lng": -118.27,
         "congestion_level": "LOW", "avg_delay_hours": 1.0, "capacity_teu": 20000, "current_utilization": 0.45},
        {"id": "P004", "name": "Port of Rotterdam", "lat": 51.95, "lng": 4.14,
         "congestion_level": "MEDIUM", "avg_delay_hours": 2.5, "capacity_teu": 30000, "current_utilization": 0.70},
        {"id": "P005", "name": "Port of Dubai", "lat": 25.27, "lng": 55.29,
         "congestion_level": "LOW", "avg_delay_hours": 1.5, "capacity_teu": 22000, "current_utilization": 0.40},
        {"id": "P006", "name": "Port of Mumbai", "lat": 18.95, "lng": 72.84,
         "congestion_level": "HIGH", "avg_delay_hours": 5.0, "capacity_teu": 15000, "current_utilization": 0.90},
    ]
    async with driver.session() as session:
        for p in ports:
            await session.run(
                """CREATE (p:Port {id: $id, name: $name, lat: $lat, lng: $lng,
                   congestion_level: $congestion_level, avg_delay_hours: $avg_delay_hours,
                   capacity_teu: $capacity_teu, current_utilization: $current_utilization})""",
                **p
            )
    print(f"✓ {len(ports)} ports created")


async def seed_vessels(driver):
    vessels = [
        {"id": "V001", "name": "Pacific Star", "current_lat": 25.0, "current_lng": -160.0,
         "capacity_teu": 5000, "current_load_teu": 3500, "speed_knots": 22.0, "status": "EN_ROUTE"},
        {"id": "V002", "name": "Atlantic Runner", "current_lat": 5.0, "current_lng": 75.0,
         "capacity_teu": 3000, "current_load_teu": 2200, "speed_knots": 20.0, "status": "EN_ROUTE"},
        {"id": "V003", "name": "Indian Express", "current_lat": 18.95, "current_lng": 72.84,
         "capacity_teu": 4000, "current_load_teu": 1500, "speed_knots": 18.0, "status": "DOCKED"},
        {"id": "V004", "name": "Global Horizon", "current_lat": 10.0, "current_lng": 110.0,
         "capacity_teu": 6000, "current_load_teu": 4000, "speed_knots": 24.0, "status": "EN_ROUTE"},
    ]
    async with driver.session() as session:
        for v in vessels:
            await session.run(
                """CREATE (v:Vessel {id: $id, name: $name, current_lat: $current_lat,
                   current_lng: $current_lng, capacity_teu: $capacity_teu,
                   current_load_teu: $current_load_teu, speed_knots: $speed_knots, status: $status})""",
                **v
            )
    print(f"✓ {len(vessels)} vessels created")


async def seed_shipments(driver):
    now = datetime.utcnow()
    shipments = [
        {"id": "S001", "origin": "Shanghai", "destination": "Los Angeles", "priority": "HIGH",
         "status": "IN_TRANSIT", "cargo_type": "Electronics", "weight_tons": 450.0, "value_usd": 2500000.0,
         "vessel_id": "V001", "origin_port": "P001", "dest_port": "P003",
         "eta": (now + timedelta(days=10)).isoformat()},
        {"id": "S002", "origin": "Shanghai", "destination": "Los Angeles", "priority": "MEDIUM",
         "status": "IN_TRANSIT", "cargo_type": "Industrial", "weight_tons": 800.0, "value_usd": 1200000.0,
         "vessel_id": "V001", "origin_port": "P001", "dest_port": "P003",
         "eta": (now + timedelta(days=10)).isoformat()},
        {"id": "S003", "origin": "Singapore", "destination": "Rotterdam", "priority": "HIGH",
         "status": "IN_TRANSIT", "cargo_type": "Perishable", "weight_tons": 200.0, "value_usd": 800000.0,
         "vessel_id": "V002", "origin_port": "P002", "dest_port": "P004",
         "eta": (now + timedelta(days=15)).isoformat()},
        {"id": "S004", "origin": "Singapore", "destination": "Rotterdam", "priority": "LOW",
         "status": "IN_TRANSIT", "cargo_type": "Industrial", "weight_tons": 600.0, "value_usd": 500000.0,
         "vessel_id": "V002", "origin_port": "P002", "dest_port": "P004",
         "eta": (now + timedelta(days=15)).isoformat()},
        {"id": "S005", "origin": "Mumbai", "destination": "Dubai", "priority": "MEDIUM",
         "status": "IN_TRANSIT", "cargo_type": "Textiles", "weight_tons": 300.0, "value_usd": 400000.0,
         "vessel_id": "V003", "origin_port": "P006", "dest_port": "P005",
         "eta": (now + timedelta(days=3)).isoformat()},
        {"id": "S006", "origin": "Shanghai", "destination": "Singapore", "priority": "HIGH",
         "status": "IN_TRANSIT", "cargo_type": "Electronics", "weight_tons": 350.0, "value_usd": 3000000.0,
         "vessel_id": "V004", "origin_port": "P001", "dest_port": "P002",
         "eta": (now + timedelta(days=4)).isoformat()},
        {"id": "S007", "origin": "Dubai", "destination": "Rotterdam", "priority": "MEDIUM",
         "status": "IN_TRANSIT", "cargo_type": "Oil & Gas", "weight_tons": 1000.0, "value_usd": 5000000.0,
         "vessel_id": "V003", "origin_port": "P005", "dest_port": "P004",
         "eta": (now + timedelta(days=16)).isoformat()},
        {"id": "S008", "origin": "Mumbai", "destination": "Los Angeles", "priority": "LOW",
         "status": "IN_TRANSIT", "cargo_type": "Pharmaceuticals", "weight_tons": 150.0, "value_usd": 1800000.0,
         "vessel_id": "V001", "origin_port": "P006", "dest_port": "P003",
         "eta": (now + timedelta(days=20)).isoformat()},
    ]
    async with driver.session() as session:
        for s in shipments:
            # Create shipment node
            await session.run(
                """CREATE (s:Shipment {id: $id, origin: $origin, destination: $destination,
                   priority: $priority, status: $status, cargo_type: $cargo_type,
                   weight_tons: $weight_tons, value_usd: $value_usd, eta: datetime($eta)})""",
                id=s["id"], origin=s["origin"], destination=s["destination"],
                priority=s["priority"], status=s["status"], cargo_type=s["cargo_type"],
                weight_tons=s["weight_tons"], value_usd=s["value_usd"], eta=s["eta"]
            )
            # Create ASSIGNED_TO relationship
            await session.run(
                """MATCH (s:Shipment {id: $sid}), (v:Vessel {id: $vid})
                   CREATE (s)-[:ASSIGNED_TO {assigned_date: datetime()}]->(v)""",
                sid=s["id"], vid=s["vessel_id"]
            )
            # Create ORIGINATES_FROM relationship
            await session.run(
                """MATCH (s:Shipment {id: $sid}), (p:Port {id: $pid})
                   CREATE (s)-[:ORIGINATES_FROM]->(p)""",
                sid=s["id"], pid=s["origin_port"]
            )
            # Create DESTINED_FOR relationship
            await session.run(
                """MATCH (s:Shipment {id: $sid}), (p:Port {id: $pid})
                   CREATE (s)-[:DESTINED_FOR]->(p)""",
                sid=s["id"], pid=s["dest_port"]
            )
    print(f"✓ {len(shipments)} shipments created with relationships")


async def seed_routes(driver):
    routes = [
        {"from_id": "P001", "to_id": "P003", "distance_nm": 6500, "avg_days": 14},
        {"from_id": "P001", "to_id": "P002", "distance_nm": 2500, "avg_days": 5},
        {"from_id": "P002", "to_id": "P004", "distance_nm": 8500, "avg_days": 18},
        {"from_id": "P002", "to_id": "P003", "distance_nm": 8800, "avg_days": 19},
        {"from_id": "P006", "to_id": "P005", "distance_nm": 1200, "avg_days": 3},
        {"from_id": "P005", "to_id": "P004", "distance_nm": 6000, "avg_days": 13},
        {"from_id": "P001", "to_id": "P004", "distance_nm": 10500, "avg_days": 22},
    ]
    async with driver.session() as session:
        for r in routes:
            await session.run(
                """MATCH (a:Port {id: $from_id}), (b:Port {id: $to_id})
                   CREATE (a)-[:ROUTES_TO {distance_nm: $distance_nm, avg_days: $avg_days}]->(b)""",
                **r
            )
    print(f"✓ {len(routes)} routes created")


async def seed_vessel_relationships(driver):
    """Create ARRIVING_AT and DEPARTED_FROM relationships for vessels."""
    vessel_routes = [
        {"vessel_id": "V001", "arriving_at": "P003", "departed_from": "P001"},
        {"vessel_id": "V002", "arriving_at": "P004", "departed_from": "P002"},
        {"vessel_id": "V003", "arriving_at": None, "departed_from": None},  # DOCKED at Mumbai
        {"vessel_id": "V004", "arriving_at": "P002", "departed_from": "P001"},
    ]
    now = datetime.utcnow()
    async with driver.session() as session:
        for vr in vessel_routes:
            if vr["departed_from"]:
                await session.run(
                    """MATCH (v:Vessel {id: $vid}), (p:Port {id: $pid})
                       CREATE (v)-[:DEPARTED_FROM {departure: datetime($dep)}]->(p)""",
                    vid=vr["vessel_id"], pid=vr["departed_from"],
                    dep=(now - timedelta(days=5)).isoformat()
                )
            if vr["arriving_at"]:
                await session.run(
                    """MATCH (v:Vessel {id: $vid}), (p:Port {id: $pid})
                       CREATE (v)-[:ARRIVING_AT {eta: datetime($eta)}]->(p)""",
                    vid=vr["vessel_id"], pid=vr["arriving_at"],
                    eta=(now + timedelta(days=7)).isoformat()
                )
    print("✓ Vessel route relationships created")


async def seed_heartbeat(driver):
    """Create heartbeat node to prevent AuraDB auto-pause."""
    async with driver.session() as session:
        await session.run(
            "MERGE (s:System {id: 'heartbeat'}) SET s.last_ping = datetime()"
        )
    print("✓ Heartbeat node created")


async def main():
    driver = AsyncGraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password)
    )
    try:
        await clear_database(driver)
        await create_constraints(driver)
        await seed_ports(driver)
        await seed_vessels(driver)
        await seed_shipments(driver)
        await seed_routes(driver)
        await seed_vessel_relationships(driver)
        await seed_heartbeat(driver)
        print("\n✅ Seed complete!")
    finally:
        await driver.close()


if __name__ == "__main__":
    asyncio.run(main())
```

## Step 5: Graph Service (Neo4j Driver Wrapper)

`app/services/graph_service.py`:
```python
from neo4j import AsyncGraphDatabase
from app.config import settings


class GraphService:
    """Async Neo4j driver wrapper for use with FastAPI."""

    def __init__(self):
        self._driver = None

    async def connect(self):
        self._driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password)
        )
        # Verify connectivity
        async with self._driver.session() as session:
            result = await session.run("RETURN 1 AS connected")
            record = await result.single()
            if record and record["connected"] == 1:
                print("✓ Connected to Neo4j")

    async def close(self):
        if self._driver:
            await self._driver.close()

    async def run(self, query: str, **params):
        """Execute a Cypher query and return results as list of dicts."""
        async with self._driver.session() as session:
            result = await session.run(query, **params)
            return [record.data() async for record in result]

    async def run_single(self, query: str, **params):
        """Execute a Cypher query and return a single result dict."""
        async with self._driver.session() as session:
            result = await session.run(query, **params)
            record = await result.single()
            return record.data() if record else None

    async def write(self, query: str, **params):
        """Execute a write transaction."""
        async with self._driver.session() as session:
            result = await session.run(query, **params)
            summary = await result.consume()
            return summary.counters


graph_service = GraphService()
```

## Step 6: Heartbeat Strategy
- Create `/api/heartbeat` endpoint that writes timestamp to System node
- Prevents AuraDB auto-pause (3 days no writes)
- Optional: GitHub Actions cron job every 48 hours

### Heartbeat Endpoint
```python
@app.get("/api/heartbeat")
async def heartbeat():
    result = await graph_service.run(
        "MERGE (s:System {id: 'heartbeat'}) SET s.last_ping = datetime() RETURN s.last_ping AS ping"
    )
    return {"status": "ok", "last_ping": result[0]["ping"]}
```

### GitHub Actions Cron (optional)
```yaml
# .github/workflows/heartbeat.yml
name: Neo4j Heartbeat
on:
  schedule:
    - cron: '0 0 */2 * *'  # Every 2 days
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X GET "${{ secrets.API_URL }}/api/heartbeat"
```

## Step 7: Database Reset
- `/api/reset` endpoint clears all nodes and re-seeds
- Critical for repeatable demos
- Command: `MATCH (n) DETACH DELETE n` then re-run seed

### Reset Endpoint
```python
@app.post("/api/reset")
async def reset_database():
    await graph_service.run("MATCH (n) DETACH DELETE n")
    # Re-run seed logic (import from seed module)
    from app.seed.seed_data import main as seed_main
    await seed_main()
    return {"status": "reset_complete"}
```

## Checklist
- [ ] AuraDB Free instance created
- [ ] Connection URI and password saved in .env
- [ ] Constraints created (unique IDs per node type)
- [ ] All 6 ports seeded with CORRECT coordinates (LA = -118.27)
- [ ] All 4 vessels seeded with positions
- [ ] All 8 shipments seeded (S007 → V003, not V004)
- [ ] All 7 routes created
- [ ] All relationships created (ASSIGNED_TO, ARRIVING_AT, etc.)
- [ ] Heartbeat node created
- [ ] Seed script runs without errors
- [ ] Graph queries return expected data

## Key Cypher Queries for Verification
```cypher
// Count all nodes
MATCH (n) RETURN labels(n)[0] AS type, count(n) AS count

// Verify LA port coordinates
MATCH (p:Port {id: 'P003'}) RETURN p.lng  // Should be -118.27

// Verify S007 assignment
MATCH (s:Shipment {id: 'S007'})-[:ASSIGNED_TO]->(v:Vessel) RETURN v.id  // Should be V003

// Get full graph overview
MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 50

// Check all shipment-vessel assignments
MATCH (s:Shipment)-[:ASSIGNED_TO]->(v:Vessel)
RETURN s.id, s.origin, s.destination, v.id AS vessel, v.name

// Verify route distances
MATCH (a:Port)-[r:ROUTES_TO]->(b:Port)
RETURN a.name, b.name, r.distance_nm, r.avg_days
ORDER BY r.distance_nm DESC
```

## Common Pitfalls
1. ⚠️ LA port longitude must be negative (-118.27) — see Issue #8
2. ⚠️ V004 can't serve Shanghai→Singapore AND Dubai→Rotterdam — see Issue #3
3. ⚠️ AuraDB auto-pauses after 3 days of no writes — see Issue #4
4. ⚠️ Save password when instance is created — it's shown only once
5. ⚠️ Use async Neo4j driver (`neo4j.AsyncGraphDatabase`) with FastAPI
