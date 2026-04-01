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
