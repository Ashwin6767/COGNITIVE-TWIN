from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_user
from app.services.graph_service import graph_service

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_overview(current_user: dict = Depends(get_current_user)):
    """KPI summary: total shipments, status breakdown, avg transit, active drivers."""
    status_counts = await graph_service.run("""
        MATCH (s:Shipment)
        RETURN s.status AS status, count(s) AS count
        ORDER BY count DESC
    """)

    total = sum(r["count"] for r in status_counts)
    delivered = next((r["count"] for r in status_counts if r["status"] == "DELIVERED"), 0)
    in_transit = sum(
        r["count"] for r in status_counts
        if r["status"] in [
            "IN_TRANSIT_SEA", "PICKUP_EN_ROUTE", "IN_TRANSIT_TO_PORT",
            "LAST_MILE_ASSIGNED"
        ]
    )
    at_port = sum(
        r["count"] for r in status_counts
        if r["status"] in [
            "PORT_ENTRY", "CUSTOMS_CLEARANCE", "IN_YARD", "LOADED_ON_VESSEL"
        ]
    )
    pending = sum(
        r["count"] for r in status_counts
        if r["status"] in ["REQUEST_SUBMITTED", "UNDER_REVIEW", "APPROVED", "AWAITING_CUSTOMER_DETAILS"]
    )

    active_drivers = await graph_service.run("""
        MATCH (u:User {role: 'DRIVER'})-[:ASSIGNED_PICKUP]->(s:Shipment)
        WHERE s.status IN ['DRIVER_ASSIGNED', 'PICKUP_EN_ROUTE', 'GOODS_RELEASED', 'IN_TRANSIT_TO_PORT']
        RETURN count(DISTINCT u) AS count
    """)

    port_util = await graph_service.run("""
        MATCH (p:Port)
        RETURN avg(p.utilization) AS avg_util
    """)

    return {
        "total_shipments": total,
        "delivered": delivered,
        "in_transit": in_transit,
        "at_port": at_port,
        "pending": pending,
        "active_drivers": active_drivers[0]["count"] if active_drivers else 0,
        "avg_port_utilization": round((port_util[0]["avg_util"] or 0) * 100, 1) if port_util else 0,
        "status_breakdown": {r["status"]: r["count"] for r in status_counts},
    }


@router.get("/shipments")
async def get_shipment_analytics(current_user: dict = Depends(get_current_user)):
    """Shipment analytics: status distribution, priority breakdown, route volumes."""
    status_dist = await graph_service.run("""
        MATCH (s:Shipment)
        RETURN s.status AS status, count(s) AS count
        ORDER BY count DESC
    """)

    priority_dist = await graph_service.run("""
        MATCH (s:Shipment)
        RETURN s.priority AS priority, count(s) AS count
        ORDER BY count DESC
    """)

    route_volumes = await graph_service.run("""
        MATCH (s:Shipment)-[:ORIGIN_PORT]->(op:Port), (s)-[:DEST_PORT]->(dp:Port)
        RETURN op.name AS origin, dp.name AS destination, count(s) AS shipments
        ORDER BY shipments DESC
        LIMIT 10
    """)

    by_cargo = await graph_service.run("""
        MATCH (s:Shipment)
        WHERE s.cargo_type IS NOT NULL
        RETURN s.cargo_type AS cargo_type, count(s) AS count
        ORDER BY count DESC
    """)

    return {
        "status_distribution": status_dist,
        "priority_distribution": priority_dist,
        "top_routes": route_volumes,
        "cargo_types": by_cargo,
    }


@router.get("/ports")
async def get_port_analytics(current_user: dict = Depends(get_current_user)):
    """Port analytics: utilization, congestion, throughput."""
    ports = await graph_service.run("""
        MATCH (p:Port)
        OPTIONAL MATCH (p)<-[:ORIGIN_PORT]-(s:Shipment)
        WITH p, count(s) AS outbound
        OPTIONAL MATCH (p)<-[:DEST_PORT]-(s2:Shipment)
        RETURN p.id AS id, p.name AS name, p.country AS country,
               p.congestion AS congestion, p.utilization AS utilization,
               p.avg_delay_hours AS avg_delay, p.capacity_teu AS capacity,
               outbound, count(s2) AS inbound
        ORDER BY utilization DESC
    """)

    vessels_at_port = await graph_service.run("""
        MATCH (v:Vessel)-[:DOCKED_AT]->(p:Port)
        RETURN p.name AS port, count(v) AS vessels
    """)

    return {
        "ports": ports,
        "vessels_at_ports": vessels_at_port,
    }


@router.get("/performance")
async def get_performance_analytics(current_user: dict = Depends(get_current_user)):
    """Delivery performance metrics."""
    delivered = await graph_service.run("""
        MATCH (s:Shipment {status: 'DELIVERED'})
        RETURN count(s) AS total_delivered
    """)

    active = await graph_service.run("""
        MATCH (s:Shipment)
        WHERE NOT s.status IN ['DELIVERED', 'REJECTED', 'CANCELLED']
        RETURN count(s) AS active_shipments
    """)

    by_priority_status = await graph_service.run("""
        MATCH (s:Shipment)
        RETURN s.priority AS priority, s.status AS status, count(s) AS count
        ORDER BY priority, status
    """)

    driver_load = await graph_service.run("""
        MATCH (u:User {role: 'DRIVER'})
        OPTIONAL MATCH (u)-[:ASSIGNED_PICKUP]->(s:Shipment)
        WHERE s.status IN ['DRIVER_ASSIGNED', 'PICKUP_EN_ROUTE', 'GOODS_RELEASED', 'IN_TRANSIT_TO_PORT']
        RETURN u.name AS driver, count(s) AS active_assignments
        ORDER BY active_assignments DESC
    """)

    customs_queue = await graph_service.run("""
        MATCH (s:Shipment {status: 'CUSTOMS_CLEARANCE'})
        RETURN count(s) AS pending_customs
    """)

    return {
        "total_delivered": delivered[0]["total_delivered"] if delivered else 0,
        "active_shipments": active[0]["active_shipments"] if active else 0,
        "priority_status_matrix": by_priority_status,
        "driver_workload": driver_load,
        "pending_customs": customs_queue[0]["pending_customs"] if customs_queue else 0,
    }
