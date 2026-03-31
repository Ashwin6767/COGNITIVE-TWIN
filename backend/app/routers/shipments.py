from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.auth.dependencies import get_current_user, require_role
from app.models.enums import UserRole
from app.models.shipment import ShipmentRequestCreate, PaginatedResponse
from app.services.shipment_service import shipment_service
from app.services.workflow_engine import workflow_engine

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
        result = await workflow_engine.create_shipment_request(body.model_dump(), current_user)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
