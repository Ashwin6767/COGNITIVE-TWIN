from neo4j import AsyncGraphDatabase
from app.config import settings


class GraphService:
    """Async Neo4j driver wrapper for use with FastAPI."""

    def __init__(self):
        self._driver = None

    async def connect(self):
        self._driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        async with self._driver.session() as session:
            result = await session.run("RETURN 1 AS connected")
            record = await result.single()
            if record and record["connected"] == 1:
                print("✓ Connected to Neo4j")

    async def close(self):
        if self._driver:
            await self._driver.close()

    async def run(self, query: str, **params):
        """Execute a Cypher query and return results as a list of dicts."""
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

    # ── Port Queries ──────────────────────────────────────

    async def get_all_ports(self):
        return await self.run("MATCH (p:Port) RETURN p ORDER BY p.id")

    async def get_port(self, port_id: str):
        results = await self.run(
            "MATCH (p:Port {id: $port_id}) RETURN p", port_id=port_id
        )
        return results[0]["p"] if results else None

    async def get_port_impact(self, port_id: str):
        return await self.run(
            """
            MATCH (p:Port {id: $port_id})
            OPTIONAL MATCH (v:Vessel)-[:ARRIVING_AT]->(p)
            OPTIONAL MATCH (s:Shipment)-[:ASSIGNED_TO]->(v)
            RETURN p, collect(DISTINCT v) as vessels, collect(DISTINCT s) as shipments
            """,
            port_id=port_id,
        )

    # ── Vessel Queries ────────────────────────────────────

    async def get_all_vessels(self):
        return await self.run("MATCH (v:Vessel) RETURN v ORDER BY v.id")

    async def get_vessel(self, vessel_id: str):
        results = await self.run(
            "MATCH (v:Vessel {id: $vessel_id}) RETURN v", vessel_id=vessel_id
        )
        return results[0]["v"] if results else None

    # ── Shipment Queries ──────────────────────────────────

    async def get_all_shipments(self):
        return await self.run(
            """
            MATCH (s:Shipment)
            OPTIONAL MATCH (s)-[:ASSIGNED_TO]->(v:Vessel)
            RETURN s, v.id as vessel_id ORDER BY s.id
            """
        )

    async def get_shipments_by_port(self, port_id: str):
        return await self.run(
            """
            MATCH (s:Shipment)-[:ASSIGNED_TO]->(v:Vessel)-[:ARRIVING_AT]->(p:Port {id: $port_id})
            RETURN s, v ORDER BY s.priority
            """,
            port_id=port_id,
        )

    # ── Route Queries ─────────────────────────────────────

    async def find_alternate_routes(self, from_port_id: str, exclude_port_id: str):
        return await self.run(
            """
            MATCH (from:Port {id: $from_port_id})-[:ROUTES_TO]->(alt:Port)
            WHERE alt.id <> $exclude_port_id
              AND alt.congestion_level IN ['LOW', 'MEDIUM']
            RETURN alt ORDER BY alt.avg_delay_hours ASC
            """,
            from_port_id=from_port_id,
            exclude_port_id=exclude_port_id,
        )

    # ── Overview ──────────────────────────────────────────

    async def get_graph_overview(self):
        return await self.run(
            """
            MATCH (p:Port) WITH count(p) as ports
            MATCH (v:Vessel) WITH ports, count(v) as vessels
            MATCH (s:Shipment) WITH ports, vessels, count(s) as shipments
            RETURN ports, vessels, shipments
            """
        )


graph_service = GraphService()
