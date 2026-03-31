from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.dependencies import get_current_user
from app.auth.jwt_handler import create_access_token
from app.models.enums import UserRole
from app.models.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services.user_service import user_service

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate):
    # Self-registration only allows CUSTOMER role
    if body.role != UserRole.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self-registration is only allowed for CUSTOMER role",
        )

    existing = await user_service.get_by_email(body.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    try:
        user = await user_service.create_user(body.model_dump())
        if not user:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user")
        return UserResponse(**user)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin):
    user = await user_service.authenticate(body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token({
        "sub": user["id"],
        "role": user["role"],
        "company_id": user.get("company_id"),
        "email": user["email"],
    })

    user_resp = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        company_id=user.get("company_id"),
        assigned_port_id=user.get("assigned_port_id"),
        phone=user.get("phone"),
        license_number=user.get("license_number"),
        license_type=user.get("license_type"),
        is_active=user.get("is_active", True),
        created_at=user.get("created_at"),
    )

    return TokenResponse(access_token=token, user=user_resp)


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    user = await user_service.get_by_id(current_user["id"])
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse(**user)
