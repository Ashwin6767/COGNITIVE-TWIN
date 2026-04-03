from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.auth.dependencies import get_current_user, require_role
from app.models.enums import UserRole
from app.services.graph_service import graph_service

router = APIRouter(prefix="/api/yard", tags=["Yard"])


class AssignSlotRequest(BaseModel):
    container_id: str
    position: str


@router.get("/{port_id}")
async def get_yard_layout(port_id: str, current_user: dict = Depends(get_current_user)):
    try:
        result = await graph_service.run_single("""
            MATCH (y:Yard)-[:LOCATED_AT]->(p:Port {id: $id})
            RETURN y {.id, .name, .total_slots, .occupied_slots} AS yard,
                   p {.id, .name} AS port
        """, {"id": port_id})
        if not result or not result["yard"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Yard not found for this port")

        slots = await graph_service.run("""
            MATCH (y:Yard)-[:LOCATED_AT]->(p:Port {id: $id})
            OPTIONAL MATCH (c:Container)-[:IN_YARD]->(y)
            RETURN c {.id, .type, .status, .yard_position, .weight_kg} AS container
        """, {"id": port_id})

        return {
            "yard": result["yard"],
            "port": result["port"],
            "containers": [r["container"] for r in slots if r["container"]],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{port_id}/containers")
async def get_yard_containers(port_id: str, current_user: dict = Depends(get_current_user)):
    try:
        results = await graph_service.run("""
            MATCH (y:Yard)-[:LOCATED_AT]->(p:Port {id: $id}),
                  (c:Container)-[:IN_YARD]->(y)
            RETURN c {.id, .type, .status, .yard_position, .weight_kg} AS container
            ORDER BY c.yard_position ASC
        """, {"id": port_id})
        return [r["container"] for r in results]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{port_id}/analytics")
async def get_yard_analytics(port_id: str, current_user: dict = Depends(get_current_user)):
    """Yard analytics: container distributions, slot occupancy grid for heatmap."""
    try:
        # Container type distribution
        type_dist = await graph_service.run("""
            MATCH (y:Yard)-[:LOCATED_AT]->(p:Port {id: $id}),
                  (c:Container)-[:IN_YARD]->(y)
            RETURN c.type AS type, count(c) AS count
            ORDER BY count DESC
        """, {"id": port_id})

        # Container status distribution
        status_dist = await graph_service.run("""
            MATCH (y:Yard)-[:LOCATED_AT]->(p:Port {id: $id}),
                  (c:Container)-[:IN_YARD]->(y)
            RETURN c.status AS status, count(c) AS count
            ORDER BY count DESC
        """, {"id": port_id})

        # Yard info for utilization
        yard_info = await graph_service.run_single("""
            MATCH (y:Yard)-[:LOCATED_AT]->(p:Port {id: $id})
            RETURN y.id AS id, y.name AS name, y.total_slots AS total_slots,
                   y.occupied_slots AS occupied_slots
        """, {"id": port_id})

        # Slot grid data for heatmap (each container with position)
        slot_grid = await graph_service.run("""
            MATCH (y:Yard)-[:LOCATED_AT]->(p:Port {id: $id}),
                  (c:Container)-[:IN_YARD]->(y)
            RETURN c.id AS container_id, c.yard_position AS position,
                   c.type AS type, c.status AS status, c.weight_kg AS weight_kg
            ORDER BY c.yard_position ASC
        """, {"id": port_id})

        # Shipments entering/leaving yard
        yard_activity = await graph_service.run("""
            MATCH (s:Shipment)-[:ORIGIN_PORT]->(p:Port {id: $id})
            WHERE s.status IN ['IN_YARD', 'LOADED_ON_VESSEL', 'IN_TRANSIT_TO_PORT', 'PORT_ENTRY', 'CUSTOMS_CLEARANCE']
            RETURN s.status AS status, count(s) AS count
            ORDER BY count DESC
        """, {"id": port_id})

        total = yard_info["total_slots"] if yard_info else 0
        occupied = yard_info["occupied_slots"] if yard_info else 0

        return {
            "container_type_distribution": type_dist,
            "container_status_distribution": status_dist,
            "total_slots": total,
            "occupied_slots": occupied,
            "utilization_pct": round((occupied / total) * 100, 1) if total > 0 else 0,
            "slot_grid": slot_grid,
            "yard_activity": yard_activity,
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{port_id}/assign-slot")
async def assign_yard_slot(
    port_id: str,
    body: AssignSlotRequest,
    current_user: dict = Depends(require_role(UserRole.YARD_MANAGER)),
):
    try:
        container = await graph_service.run_single(
            "MATCH (c:Container {id: $id}) RETURN c.id AS id", {"id": body.container_id}
        )
        if not container:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Container not found")

        yard = await graph_service.run_single(
            "MATCH (y:Yard)-[:LOCATED_AT]->(p:Port {id: $pid}) RETURN y.id AS id",
            {"pid": port_id},
        )
        if not yard:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Yard not found for this port")

        await graph_service.run("""
            MATCH (c:Container {id: $cid}), (y:Yard)-[:LOCATED_AT]->(p:Port {id: $pid})
            SET c.yard_position = $position, c.status = 'IN_YARD'
            MERGE (c)-[:IN_YARD]->(y)
        """, {"cid": body.container_id, "pid": port_id, "position": body.position})

        return {
            "success": True,
            "container_id": body.container_id,
            "position": body.position,
            "port_id": port_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
