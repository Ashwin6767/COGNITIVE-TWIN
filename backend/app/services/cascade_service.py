from app.services.graph_service import graph_service


class CascadeService:
    async def detect_cascade(self, changed_node_type: str, changed_node_id: str, change: dict) -> list[dict]:
        affected = []

        if changed_node_type == "Port":
            results = await graph_service.run("""
                MATCH (p:Port {id: $pid})<-[:EN_ROUTE_TO]-(v:Vessel)
                OPTIONAL MATCH (v)<-[:CURRENT_VESSEL]-(s:Shipment)
                OPTIONAL MATCH (s)<-[:APPROVED_AS]-(:ShipmentRequest)<-[:REQUESTED]-(u:User)
                RETURN v.id AS vessel_id, v.name AS vessel_name,
                       collect(DISTINCT s.id) AS shipment_ids,
                       collect(DISTINCT u.id) AS stakeholder_ids
            """, {"pid": changed_node_id})
            for r in results:
                if r["shipment_ids"]:
                    affected.append({
                        "affected_type": "Vessel",
                        "affected_id": r["vessel_id"],
                        "impact": f"Port congestion affects vessel {r['vessel_name']} and {len(r['shipment_ids'])} shipments",
                        "stakeholders": r["stakeholder_ids"],
                        "severity": "HIGH",
                        "shipment_ids": r["shipment_ids"],
                    })

        elif changed_node_type == "Vessel":
            results = await graph_service.run("""
                MATCH (v:Vessel {id: $vid})<-[:CURRENT_VESSEL]-(s:Shipment)
                OPTIONAL MATCH (s)-[:DEST_PORT]->(dp:Port)
                OPTIONAL MATCH (s)<-[:APPROVED_AS]-(:ShipmentRequest)<-[:REQUESTED]-(u:User)
                RETURN s.id AS shipment_id, s.status AS status,
                       dp.name AS dest_port, u.id AS customer_id
            """, {"vid": changed_node_id})
            for r in results:
                affected.append({
                    "affected_type": "Shipment",
                    "affected_id": r["shipment_id"],
                    "impact": f"Vessel delay affects shipment to {r['dest_port']}",
                    "stakeholders": [r["customer_id"]] if r["customer_id"] else [],
                    "severity": "HIGH" if change.get("delay_hours", 0) > 12 else "MEDIUM",
                })

        elif changed_node_type == "Shipment":
            result = await graph_service.run_single("""
                MATCH (s:Shipment {id: $sid})
                OPTIONAL MATCH (s)<-[:APPROVED_AS]-(:ShipmentRequest)<-[:REQUESTED]-(u:User)
                OPTIONAL MATCH (driver:User)-[:ASSIGNED_PICKUP|ASSIGNED_DELIVERY]->(s)
                RETURN collect(DISTINCT u.id) + collect(DISTINCT driver.id) AS stakeholders
            """, {"sid": changed_node_id})
            if result:
                affected.append({
                    "affected_type": "Stakeholders",
                    "affected_id": changed_node_id,
                    "impact": change.get("description", "Shipment status changed"),
                    "stakeholders": [s for s in result["stakeholders"] if s],
                    "severity": change.get("severity", "MEDIUM"),
                })

        return affected

    async def get_impact_graph(self, shipment_id: str) -> dict:
        result = await graph_service.run("""
            MATCH (s:Shipment {id: $sid})
            OPTIONAL MATCH (s)-[:ORIGIN_PORT]->(op:Port)
            OPTIONAL MATCH (s)-[:DEST_PORT]->(dp:Port)
            OPTIONAL MATCH (s)-[:CONTAINS]->(c:Container)
            OPTIONAL MATCH (s)-[:CURRENT_VESSEL]->(v:Vessel)
            OPTIONAL MATCH (s)-[:HAS_DOCUMENT]->(d:Document)
            OPTIONAL MATCH (s)-[:HAS_EVENT]->(e:Event)
            RETURN s {.id, .status, .priority} AS shipment,
                   op {.id, .name} AS origin_port,
                   dp {.id, .name} AS dest_port,
                   c {.id, .type, .status} AS container,
                   v {.id, .name, .status} AS vessel,
                   collect(DISTINCT d {.id, .type, .status}) AS documents,
                   collect(DISTINCT e {.id, .type, .from_status, .to_status, .timestamp}) AS events
        """, {"sid": shipment_id})

        if not result:
            return {}
        r = result[0]
        return {
            "shipment": r["shipment"],
            "origin_port": r["origin_port"],
            "dest_port": r["dest_port"],
            "container": r["container"],
            "vessel": r["vessel"],
            "documents": r["documents"],
            "events": r["events"],
        }


cascade_service = CascadeService()
