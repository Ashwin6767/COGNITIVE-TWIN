from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.dependencies import get_current_user, require_role
from app.models.enums import UserRole
from app.services.graph_service import graph_service

router = APIRouter(prefix="/api/ports", tags=["Ports"])


@router.get("/")
async def list_ports(current_user: dict = Depends(get_current_user)):
    try:
        results = await graph_service.run("""
            MATCH (p:Port)
            RETURN p {.id, .name, .country, .lat, .lon, .congestion,
                       .avg_delay_hours, .capacity_teu, .utilization} AS port
            ORDER BY p.name ASC
        """)
        return [r["port"] for r in results]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{port_id}")
async def get_port(port_id: str, current_user: dict = Depends(get_current_user)):
    try:
        result = await graph_service.run_single("""
            MATCH (p:Port {id: $id})
            OPTIONAL MATCH (v:Vessel)-[:DOCKED_AT]->(p)
            OPTIONAL MATCH (y:Yard)-[:LOCATED_AT]->(p)
            RETURN p {.id, .name, .country, .lat, .lon, .congestion,
                       .avg_delay_hours, .capacity_teu, .utilization} AS port,
                   collect(DISTINCT v {.id, .name, .imo, .status, .capacity_teu, .current_load_teu}) AS vessels,
                   collect(DISTINCT y {.id, .name, .total_slots, .occupied_slots}) AS yards
        """, {"id": port_id})
        if not result or not result["port"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Port not found")

        # Count active shipments at this port
        active = await graph_service.run_single("""
            MATCH (s:Shipment)-[:ORIGIN_PORT|DEST_PORT]->(p:Port {id: $id})
            WHERE NOT s.status IN ['DELIVERED', 'REJECTED', 'CANCELLED']
            RETURN count(s) AS count
        """, {"id": port_id})

        return {
            "port": result["port"],
            "vessels": result["vessels"],
            "yards": result["yards"],
            "active_shipments": active["count"] if active else 0,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{port_id}/dashboard")
async def port_dashboard(
    port_id: str,
    current_user: dict = Depends(require_role(UserRole.PORT_OFFICER, UserRole.YARD_MANAGER)),
):
    try:
        port = await graph_service.run_single(
            "MATCH (p:Port {id: $id}) RETURN p {.id, .name, .congestion, .utilization, .avg_delay_hours} AS port",
            {"id": port_id},
        )
        if not port or not port["port"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Port not found")

        pending = await graph_service.run_single("""
            MATCH (s:Shipment)-[:ORIGIN_PORT|DEST_PORT]->(p:Port {id: $id})
            WHERE s.status IN ['IN_TRANSIT_TO_PORT', 'PORT_ENTRY', 'CUSTOMS_CLEARANCE']
            RETURN count(s) AS count
        """, {"id": port_id})

        vessels = await graph_service.run("""
            MATCH (v:Vessel)-[:DOCKED_AT]->(p:Port {id: $id})
            RETURN v {.id, .name, .imo, .status, .capacity_teu, .current_load_teu} AS vessel
        """, {"id": port_id})

        yard_util = await graph_service.run_single("""
            MATCH (y:Yard)-[:LOCATED_AT]->(p:Port {id: $id})
            RETURN y.total_slots AS capacity, y.occupied_slots AS occupied
        """, {"id": port_id})

        # Shipments at this port grouped by status
        shipments = await graph_service.run("""
            MATCH (s:Shipment)-[:ORIGIN_PORT|DEST_PORT]->(p:Port {id: $id})
            WHERE NOT s.status IN ['DELIVERED', 'REJECTED', 'CANCELLED']
            OPTIONAL MATCH (s)-[:ORIGIN_PORT]->(op:Port)
            OPTIONAL MATCH (s)-[:DEST_PORT]->(dp:Port)
            RETURN s.id AS id, s.status AS status, s.priority AS priority,
                   s.cargo_description AS cargo_description,
                   op.name AS origin_port, dp.name AS dest_port,
                   s.created_at AS created_at
            ORDER BY s.updated_at DESC
        """, {"id": port_id})

        # Shipment status breakdown at this port
        status_breakdown = await graph_service.run("""
            MATCH (s:Shipment)-[:ORIGIN_PORT|DEST_PORT]->(p:Port {id: $id})
            WHERE NOT s.status IN ['DELIVERED', 'REJECTED', 'CANCELLED']
            RETURN s.status AS status, count(s) AS count
            ORDER BY count DESC
        """, {"id": port_id})

        # Active congestion reports
        congestion_reports = await graph_service.run("""
            MATCH (cr:CongestionReport)-[:AT_PORT]->(p:Port {id: $id})
            WHERE cr.status = 'ACTIVE'
            RETURN cr {.id, .congestion_type, .severity, .description,
                       .estimated_delay_hours, .reporter_name, .created_at}
            ORDER BY cr.created_at DESC
            LIMIT 5
        """, {"id": port_id})

        return {
            "port": port["port"],
            "pending_entries": pending["count"] if pending else 0,
            "vessels_docked": [r["vessel"] for r in vessels],
            "yard_utilization": {
                "capacity": yard_util["capacity"] if yard_util else 0,
                "occupied": yard_util["occupied"] if yard_util else 0,
            },
            "shipments": shipments,
            "status_breakdown": status_breakdown,
            "congestion_reports": [r["cr"] for r in congestion_reports],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
