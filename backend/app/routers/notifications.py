from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.auth.dependencies import get_current_user
from app.models.shipment import PaginatedResponse
from app.services.notification_service import notification_service

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("/", response_model=PaginatedResponse)
async def get_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    try:
        result = await notification_service.get_all(current_user["id"], page=page, limit=limit)
        return PaginatedResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    try:
        count = await notification_service.get_unread_count(current_user["id"])
        return {"count": count}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.put("/{notification_id}/read")
async def mark_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    try:
        success = await notification_service.mark_read(notification_id, current_user["id"])
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.put("/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    try:
        count = await notification_service.mark_all_read(current_user["id"])
        return {"success": True, "count": count}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
