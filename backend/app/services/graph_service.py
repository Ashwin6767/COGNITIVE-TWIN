from neo4j import AsyncGraphDatabase, AsyncDriver
from app.config import settings


class GraphService:
    _driver: AsyncDriver | None = None

    async def connect(self):
        self._driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        # Verify connectivity
        async with self._driver.session() as session:
            await session.run("RETURN 1")

    async def disconnect(self):
        if self._driver:
            await self._driver.close()
            self._driver = None

    async def run(self, query: str, params: dict | None = None) -> list[dict]:
        if not self._driver:
            raise RuntimeError("Graph database not connected")
        async with self._driver.session() as session:
            result = await session.run(query, params or {})
            records = await result.data()
            return records

    async def run_single(self, query: str, params: dict | None = None) -> dict | None:
        results = await self.run(query, params)
        return results[0] if results else None

    async def setup_constraints(self):
        constraints = [
            "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
            "CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE",
            "CREATE CONSTRAINT company_id IF NOT EXISTS FOR (c:Company) REQUIRE c.id IS UNIQUE",
            "CREATE CONSTRAINT shipment_id IF NOT EXISTS FOR (s:Shipment) REQUIRE s.id IS UNIQUE",
            "CREATE CONSTRAINT shipment_request_id IF NOT EXISTS FOR (r:ShipmentRequest) REQUIRE r.id IS UNIQUE",
            "CREATE CONSTRAINT container_id IF NOT EXISTS FOR (c:Container) REQUIRE c.id IS UNIQUE",
            "CREATE CONSTRAINT vessel_id IF NOT EXISTS FOR (v:Vessel) REQUIRE v.id IS UNIQUE",
            "CREATE CONSTRAINT port_id IF NOT EXISTS FOR (p:Port) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT document_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE",
            "CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE",
            "CREATE CONSTRAINT notification_id IF NOT EXISTS FOR (n:Notification) REQUIRE n.id IS UNIQUE",
            "CREATE CONSTRAINT truck_id IF NOT EXISTS FOR (t:Truck) REQUIRE t.id IS UNIQUE",
            "CREATE CONSTRAINT yard_id IF NOT EXISTS FOR (y:Yard) REQUIRE y.id IS UNIQUE",
            "CREATE INDEX shipment_status IF NOT EXISTS FOR (s:Shipment) ON (s.status)",
            "CREATE INDEX document_type IF NOT EXISTS FOR (d:Document) ON (d.type)",
            "CREATE INDEX container_status IF NOT EXISTS FOR (c:Container) ON (c.status)",
            "CREATE INDEX vessel_status IF NOT EXISTS FOR (v:Vessel) ON (v.status)",
        ]
        for c in constraints:
            try:
                await self.run(c)
            except Exception:
                pass  # Constraint may already exist


graph_service = GraphService()
