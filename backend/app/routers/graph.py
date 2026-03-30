from fastapi import APIRouter, HTTPException

from app.services.graph_service import graph_service

router = APIRouter()


@router.get("/ports")
async def list_ports():
    """List all ports with status."""
    return await graph_service.get_all_ports()


@router.get("/vessels")
async def list_vessels():
    """List all vessels with position."""
    return await graph_service.get_all_vessels()


@router.get("/shipments")
async def list_shipments():
    """List all shipments with status."""
    return await graph_service.get_all_shipments()


@router.get("/shipments/by-port/{port_id}")
async def shipments_by_port(port_id: str):
    """Get shipments arriving at a specific port."""
    return await graph_service.get_shipments_by_port(port_id)


@router.get("/port/{port_id}/impact")
async def port_impact(port_id: str):
    """Impact analysis for a port — affected vessels and shipments."""
    result = await graph_service.get_port_impact(port_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Port {port_id} not found")
    return result[0]


@router.get("/overview")
async def graph_overview():
    """Full graph state summary — counts of ports, vessels, shipments."""
    return await graph_service.get_graph_overview()
