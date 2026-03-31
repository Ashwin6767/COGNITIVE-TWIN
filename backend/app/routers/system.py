from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.dependencies import require_role
from app.models.enums import UserRole

router = APIRouter(prefix="/api", tags=["System"])


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/seed")
async def seed_data():
    """Seed the database. No auth required (needed for initial setup)."""
    try:
        from app.seed.seed_data import run_seed
        await run_seed()
        return {"status": "success", "message": "Seed data imported successfully"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
