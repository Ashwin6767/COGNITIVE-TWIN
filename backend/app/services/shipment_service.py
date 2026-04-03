from app.services.graph_service import graph_service
from app.models.enums import UserRole


class ShipmentService:
    async def get_shipment(self, shipment_id: str) -> dict | None:
        result = await graph_service.run_single("""
            MATCH (s:Shipment {id: $id})
            OPTIONAL MATCH (s)-[:ORIGIN_PORT]->(op:Port)
            OPTIONAL MATCH (s)-[:DEST_PORT]->(dp:Port)
            OPTIONAL MATCH (s)-[:CONTAINS]->(c:Container)
            OPTIONAL MATCH (s)-[:CURRENT_VESSEL]->(v:Vessel)
            OPTIONAL MATCH (u:User)-[:REQUESTED]->(s)
            OPTIONAL MATCH (drv:User)-[:ASSIGNED_PICKUP]->(s)
            RETURN s {.id, .status, .priority, .current_location, .eta, .created_at, .updated_at,
                       .pickup_address, .pickup_lat, .pickup_lng, .trucks_required, .cargo_weight_kg,
                       .driver_lat, .driver_lng, .driver_location_updated_at} AS shipment,
                   op {.id, .name, .country, .lat, .lon} AS origin_port,
                   dp {.id, .name, .country, .lat, .lon} AS dest_port,
                   c {.id, .type, .status, .yard_position} AS container,
                   v {.id, .name, .status} AS vessel,
                   u {.id, .name, .email} AS customer,
                   drv {.id, .name, .email} AS assigned_driver
        """, {"id": shipment_id})
        if not result:
            return None
        ship = result["shipment"]
        ship["origin_port"] = result["origin_port"]
        ship["dest_port"] = result["dest_port"]
        ship["container"] = result["container"]
        ship["vessel"] = result["vessel"]
        ship["customer"] = result["customer"]
        ship["assigned_driver"] = result["assigned_driver"]
        return ship

    async def list_shipments(
        self, user: dict, status: str | None = None,
        priority: str | None = None, page: int = 1, limit: int = 20
    ) -> dict:
        where_clauses = []
        params: dict = {"skip": (page - 1) * limit, "limit": limit}

        if status:
            where_clauses.append("s.status = $status")
            params["status"] = status
        if priority:
            where_clauses.append("s.priority = $priority")
            params["priority"] = priority

        # Role-based filtering
        role = user["role"]
        match_clause = "MATCH (s:Shipment)"
        if role == UserRole.CUSTOMER:
            match_clause = """
                MATCH (u:User {id: $uid})-[:REQUESTED]->(s:Shipment)
            """
            params["uid"] = user["id"]
        elif role == UserRole.DRIVER:
            match_clause = """
                MATCH (u:User {id: $uid})-[:ASSIGNED_PICKUP|ASSIGNED_DELIVERY]->(s:Shipment)
            """
            params["uid"] = user["id"]
        elif role == UserRole.PORT_OFFICER:
            match_clause = """
                MATCH (s:Shipment)-[:ORIGIN_PORT|DEST_PORT]->(p:Port {id: $port_id})
            """
            params["port_id"] = user.get("assigned_port_id", "")
        elif role == UserRole.YARD_MANAGER:
            match_clause = """
                MATCH (s:Shipment)-[:ORIGIN_PORT|DEST_PORT]->(p:Port {id: $port_id})
            """
            params["port_id"] = user.get("assigned_port_id", "")
        elif role not in [UserRole.LOGISTICS_MANAGER, UserRole.ADMIN]:
            match_clause = "MATCH (s:Shipment)"

        where = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        count_result = await graph_service.run_single(
            f"{match_clause} {where} RETURN count(DISTINCT s) AS total", params
        )
        total = count_result["total"] if count_result else 0

        results = await graph_service.run(f"""
            {match_clause} {where}
            WITH DISTINCT s
            OPTIONAL MATCH (s)-[:ORIGIN_PORT]->(op:Port)
            OPTIONAL MATCH (s)-[:DEST_PORT]->(dp:Port)
            RETURN s {{.id, .status, .priority, .eta, .created_at, .updated_at}} AS shipment,
                   op {{.id, .name}} AS origin_port, dp {{.id, .name}} AS dest_port
            ORDER BY s.created_at DESC SKIP $skip LIMIT $limit
        """, params)

        items = []
        for r in results:
            ship = r["shipment"]
            ship["origin_port"] = r["origin_port"]
            ship["dest_port"] = r["dest_port"]
            items.append(ship)

        return {
            "items": items, "total": total,
            "page": page, "limit": limit,
            "pages": max(1, (total + limit - 1) // limit),
        }

    async def get_my_shipments(self, user: dict) -> list[dict]:
        role = user["role"]
        if role == UserRole.CUSTOMER:
            results = await graph_service.run("""
                MATCH (u:User {id: $uid})-[:REQUESTED]->(s:Shipment)
                OPTIONAL MATCH (s)-[:ORIGIN_PORT]->(op:Port)
                OPTIONAL MATCH (s)-[:DEST_PORT]->(dp:Port)
                RETURN s {.id, .status, .priority, .eta, .created_at, .updated_at} AS shipment,
                       op {.id, .name} AS origin_port, dp {.id, .name} AS dest_port
                ORDER BY s.created_at DESC
            """, {"uid": user["id"]})
            items = []
            for r in results:
                ship = r["shipment"]
                ship["origin_port"] = r["origin_port"]
                ship["dest_port"] = r["dest_port"]
                items.append(ship)
            return items
        elif role == UserRole.DRIVER:
            results = await graph_service.run("""
                MATCH (u:User {id: $uid})-[:ASSIGNED_PICKUP|ASSIGNED_DELIVERY]->(s:Shipment)
                OPTIONAL MATCH (s)-[:ORIGIN_PORT]->(op:Port)
                OPTIONAL MATCH (s)-[:DEST_PORT]->(dp:Port)
                RETURN s {.id, .status, .priority, .eta, .created_at, .updated_at,
                           .pickup_address, .pickup_lat, .pickup_lng,
                           .trucks_required, .cargo_weight_kg} AS shipment,
                       op {.id, .name, .lat, .lon} AS origin_port,
                       dp {.id, .name, .lat, .lon} AS dest_port
                ORDER BY s.updated_at DESC
            """, {"uid": user["id"]})
            items = []
            for r in results:
                ship = r["shipment"]
                ship["origin_port"] = r["origin_port"]
                ship["dest_port"] = r["dest_port"]
                items.append(ship)
            return items
        else:
            return []


shipment_service = ShipmentService()
