from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from app.auth.dependencies import get_current_user, require_role
from app.models.enums import UserRole
from app.services.congestion_service import congestion_service
from app.services.gemini_routing_service import gemini_routing_service


router = APIRouter(prefix="/api/congestion", tags=["Congestion"])


class CongestionReportRequest(BaseModel):
    port_id: str
    congestion_type: str = "OTHER"
    severity: str = "MEDIUM"
    description: str = ""
    estimated_delay_hours: Optional[float] = 0


class CheckPortRequest(BaseModel):
    port_id: str


class RerouteRequest(BaseModel):
    new_port_id: Optional[str] = None


@router.post("/report")
async def report_congestion(
    body: CongestionReportRequest,
    current_user: dict = Depends(get_current_user),
):
    """Staff reports congestion at a port."""
    try:
        result = await congestion_service.report_congestion(body.model_dump(), current_user)
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{port_id}")
async def get_congestion_status(
    port_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get current congestion status and active reports for a port."""
    try:
        result = await congestion_service.get_congestion_status(port_id)
        if "error" in result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/auto-detect")
async def auto_detect_congestion(
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
):
    """Auto-detect congestion from port utilization. Admin-only."""
    try:
        updates = await congestion_service.auto_detect_congestion()
        return {"updates": updates, "count": len(updates)}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ── Predictive Analysis & Re-Routing Endpoints ──────────────────────


@router.post("/check-port")
async def check_port_congestion(
    body: CheckPortRequest,
    current_user: dict = Depends(get_current_user),
):
    """Check if a port is congested and get AI-ranked alternative suggestions."""
    try:
        result = await gemini_routing_service.recommend_alternative_ports(body.port_id)
        if "error" in result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/reroute/{shipment_id}")
async def reroute_shipment(
    shipment_id: str,
    body: RerouteRequest,
    current_user: dict = Depends(get_current_user),
):
    """Trigger AI-based re-routing for a shipment whose destination port is congested."""
    try:
        result = await congestion_service.reroute_shipment(
            shipment_id=shipment_id,
            new_port_id=body.new_port_id,
            triggered_by=current_user,
        )
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=result["error"]
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/predict/{port_id}")
async def predict_congestion(
    port_id: str,
    current_user: dict = Depends(get_current_user),
):
    """AI-powered congestion prediction for a port (6h / 12h / 24h forecast)."""
    try:
        result = await gemini_routing_service.predict_congestion(port_id)
        if "error" in result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
