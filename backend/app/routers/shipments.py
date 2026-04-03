from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from datetime import datetime, timezone
from app.auth.dependencies import get_current_user, require_role
from app.models.enums import UserRole
from app.models.shipment import ShipmentRequestCreate, PaginatedResponse
from app.services.shipment_service import shipment_service
from app.services.workflow_engine import workflow_engine
from app.services.graph_service import graph_service

router = APIRouter(prefix="/api/shipments", tags=["Shipments"])


@router.get("/", response_model=PaginatedResponse)
async def list_shipments(
    status_filter: str | None = Query(None, alias="status"),
    priority: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    try:
        result = await shipment_service.list_shipments(
            user=current_user,
            status=status_filter,
            priority=priority,
            page=page,
            limit=limit,
        )
        return PaginatedResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/my")
async def get_my_shipments(current_user: dict = Depends(get_current_user)):
    try:
        return await shipment_service.get_my_shipments(current_user)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{shipment_id}")
async def get_shipment(shipment_id: str, current_user: dict = Depends(get_current_user)):
    shipment = await shipment_service.get_shipment(shipment_id)
    if not shipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    return shipment


@router.post("/request", status_code=status.HTTP_201_CREATED)
async def create_shipment_request(
    body: ShipmentRequestCreate,
    current_user: dict = Depends(require_role(UserRole.CUSTOMER)),
):
    try:
        # Check destination port congestion before creating the shipment
        if not body.congestion_acknowledged:
            from app.services.gemini_routing_service import gemini_routing_service
            congestion_info = await gemini_routing_service.check_port_congestion(body.dest_port_id)
            if congestion_info.get("is_congested"):
                alternatives = await gemini_routing_service.recommend_alternative_ports(body.dest_port_id)
                return {
                    "congestion_warning": True,
                    "message": f"Port {congestion_info.get('port_name', body.dest_port_id)} is currently experiencing HIGH congestion.",
                    "congestion_info": congestion_info,
                    "alternatives": alternatives.get("alternatives", []),
                    "ai_summary": alternatives.get("ai_summary", ""),
                }

        result = await workflow_engine.create_shipment_request(body.model_dump(), current_user)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


class LocationUpdate(BaseModel):
    lat: float
    lng: float


@router.put("/{shipment_id}/location")
async def update_driver_location(
    shipment_id: str,
    body: LocationUpdate,
    current_user: dict = Depends(require_role(UserRole.DRIVER)),
):
    """Driver updates their current location for a shipment."""
    now = datetime.now(timezone.utc).isoformat()
    result = await graph_service.run_single("""
        MATCH (u:User {id: $uid})-[:ASSIGNED_PICKUP|ASSIGNED_DELIVERY]->(s:Shipment {id: $sid})
        SET s.driver_lat = $lat, s.driver_lng = $lng, s.driver_location_updated_at = $now
        RETURN s.id AS id
    """, {"uid": current_user["id"], "sid": shipment_id, "lat": body.lat, "lng": body.lng, "now": now})
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found or not assigned to you")
    return {"status": "ok", "shipment_id": shipment_id, "lat": body.lat, "lng": body.lng}


@router.get("/{shipment_id}/location")
async def get_driver_location(shipment_id: str, current_user: dict = Depends(get_current_user)):
    """Get current driver location for a shipment."""
    result = await graph_service.run_single("""
        MATCH (s:Shipment {id: $sid})
        OPTIONAL MATCH (s)-[:ORIGIN_PORT]->(op:Port)
        OPTIONAL MATCH (s)-[:DEST_PORT]->(dp:Port)
        RETURN s.driver_lat AS driver_lat, s.driver_lng AS driver_lng,
               s.driver_location_updated_at AS updated_at,
               s.pickup_address AS pickup_address,
               s.pickup_lat AS pickup_lat, s.pickup_lng AS pickup_lng,
               op.lat AS origin_lat, op.lon AS origin_lng, op.name AS origin_port_name,
               dp.lat AS dest_lat, dp.lon AS dest_lng, dp.name AS dest_port_name
    """, {"sid": shipment_id})
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")
    return result
