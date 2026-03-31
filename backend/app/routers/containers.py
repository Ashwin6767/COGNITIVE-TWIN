from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.auth.dependencies import get_current_user
from app.services.graph_service import graph_service

router = APIRouter(prefix="/api/containers", tags=["Containers"])


@router.get("/")
async def list_containers(
    status_filter: str | None = Query(None, alias="status"),
    port_id: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    try:
        where_clauses = []
        params: dict = {}

        if status_filter:
            where_clauses.append("c.status = $status")
            params["status"] = status_filter
        if port_id:
            where_clauses.append("p.id = $port_id")
            params["port_id"] = port_id

        where = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        query = f"""
            MATCH (c:Container)
            OPTIONAL MATCH (c)-[:IN_YARD]->(y:Yard)-[:LOCATED_AT]->(p:Port)
            {where}
            RETURN c {{.id, .type, .status, .yard_position, .weight_kg, .max_weight_kg}} AS container,
                   p {{.id, .name}} AS port
            ORDER BY c.id ASC
        """
        results = await graph_service.run(query, params)
        items = []
        for r in results:
            container = r["container"]
            container["port"] = r["port"]
            items.append(container)
        return items
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{container_id}")
async def get_container(container_id: str, current_user: dict = Depends(get_current_user)):
    try:
        result = await graph_service.run_single("""
            MATCH (c:Container {id: $id})
            OPTIONAL MATCH (c)-[:IN_YARD]->(y:Yard)-[:LOCATED_AT]->(p:Port)
            OPTIONAL MATCH (c)-[:LOADED_ON]->(v:Vessel)
            OPTIONAL MATCH (s:Shipment)-[:CONTAINS]->(c)
            RETURN c {.id, .type, .status, .yard_position, .weight_kg, .max_weight_kg, .seal_number} AS container,
                   p {.id, .name} AS port,
                   y {.id, .name} AS yard,
                   v {.id, .name} AS vessel,
                   s {.id, .status} AS shipment
        """, {"id": container_id})
        if not result or not result["container"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Container not found")
        return {
            "container": result["container"],
            "port": result["port"],
            "yard": result["yard"],
            "vessel": result["vessel"],
            "shipment": result["shipment"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
