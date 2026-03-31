from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.auth.dependencies import get_current_user, require_role
from app.models.enums import UserRole
from app.models.shipment import TransitionRequest, TransitionResponse
from app.services.workflow_engine import workflow_engine

router = APIRouter(prefix="/api/workflow", tags=["Workflow"])


class CancelRequest(BaseModel):
    reason: str


@router.post("/{shipment_id}/transition", response_model=TransitionResponse)
async def transition(
    shipment_id: str,
    body: TransitionRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        result = await workflow_engine.transition(
            shipment_id=shipment_id,
            to_status=body.to_status,
            user=current_user,
            form_data=body.form_data,
            notes=body.notes,
        )
        return TransitionResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{shipment_id}/transitions")
async def get_available_transitions(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        return await workflow_engine.get_available_transitions(shipment_id, current_user["role"])
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{shipment_id}/timeline")
async def get_timeline(
    shipment_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        return await workflow_engine.get_timeline(shipment_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{shipment_id}/cancel")
async def cancel_shipment(
    shipment_id: str,
    body: CancelRequest,
    current_user: dict = Depends(require_role(UserRole.LOGISTICS_MANAGER)),
):
    try:
        return await workflow_engine.cancel_shipment(shipment_id, body.reason, current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
