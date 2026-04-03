from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.auth.dependencies import require_role
from app.models.enums import UserRole
from app.models.user import UserCreate, UserResponse
from app.services.user_service import user_service

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/")
async def list_users(
    role: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.LOGISTICS_MANAGER)),
):
    try:
        # Logistics managers may only view DRIVER and CUSTOMER users
        if current_user["role"] == UserRole.LOGISTICS_MANAGER and role not in ("DRIVER", "CUSTOMER", None):
            role = None
        return await user_service.list_users(role=role, page=page, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
):
    existing = await user_service.get_by_email(body.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    try:
        user = await user_service.create_user(body.model_dump())
        if not user:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user")
        return UserResponse(**user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/drivers/available")
async def get_available_drivers(
    current_user: dict = Depends(require_role(UserRole.LOGISTICS_MANAGER, UserRole.ADMIN)),
):
    try:
        return await user_service.get_available_drivers()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
