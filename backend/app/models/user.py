from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional
from app.models.enums import UserRole


class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: UserRole = UserRole.CUSTOMER
    company_id: Optional[str] = None
    assigned_port_id: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    license_type: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    company_id: Optional[str] = None
    assigned_port_id: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    license_type: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
    last_login: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
