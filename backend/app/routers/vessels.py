from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.auth.dependencies import get_current_user
from app.services.graph_service import graph_service

router = APIRouter(prefix="/api/vessels", tags=["Vessels"])


@router.get("/")
async def list_vessels(
    status_filter: str | None = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
):
    try:
        if status_filter:
            results = await graph_service.run("""
                MATCH (v:Vessel {status: $status})
                OPTIONAL MATCH (v)-[:DOCKED_AT]->(p:Port)
                RETURN v {.id, .name, .imo, .flag, .status, .capacity_teu,
                           .current_load_teu, .lat, .lon, .speed_knots} AS vessel,
                       p {.id, .name} AS port
                ORDER BY v.name ASC
            """, {"status": status_filter})
        else:
            results = await graph_service.run("""
                MATCH (v:Vessel)
                OPTIONAL MATCH (v)-[:DOCKED_AT]->(p:Port)
                RETURN v {.id, .name, .imo, .flag, .status, .capacity_teu,
                           .current_load_teu, .lat, .lon, .speed_knots} AS vessel,
                       p {.id, .name} AS port
                ORDER BY v.name ASC
            """)
        items = []
        for r in results:
            vessel = r["vessel"]
            vessel["port"] = r["port"]
            items.append(vessel)
        return items
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{vessel_id}")
async def get_vessel(vessel_id: str, current_user: dict = Depends(get_current_user)):
    try:
        result = await graph_service.run_single("""
            MATCH (v:Vessel {id: $id})
            OPTIONAL MATCH (v)-[:DOCKED_AT]->(p:Port)
            OPTIONAL MATCH (c:Container)-[:LOADED_ON]->(v)
            RETURN v {.id, .name, .imo, .flag, .status, .capacity_teu,
                       .current_load_teu, .lat, .lon, .speed_knots} AS vessel,
                   p {.id, .name} AS port,
                   collect(DISTINCT c {.id, .type, .status}) AS containers
        """, {"id": vessel_id})
        if not result or not result["vessel"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vessel not found")
        return {
            "vessel": result["vessel"],
            "port": result["port"],
            "containers": result["containers"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
