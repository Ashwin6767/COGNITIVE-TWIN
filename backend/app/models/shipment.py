from pydantic import BaseModel
from typing import Optional
from app.models.enums import ShipmentStatus


class ShipmentRequestCreate(BaseModel):
    origin_port_id: str
    dest_port_id: str
    cargo_description: str
    cargo_type: str = "GENERAL"
    weight_kg: float = 0
    quantity: int = 1
    declared_value_usd: float = 0
    container_type: Optional[str] = None
    priority: str = "MEDIUM"
    notes: Optional[str] = None


class ShipmentResponse(BaseModel):
    id: str
    status: ShipmentStatus
    priority: str
    current_location: Optional[str] = None
    eta: Optional[str] = None
    actual_arrival: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    origin_port: Optional[dict] = None
    dest_port: Optional[dict] = None
    customer: Optional[dict] = None
    container: Optional[dict] = None


class TransitionRequest(BaseModel):
    to_status: ShipmentStatus
    form_data: Optional[dict] = None
    notes: Optional[str] = None


class TransitionResponse(BaseModel):
    shipment_id: str
    from_status: str
    to_status: str
    event_id: str
    message: str


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    limit: int
    pages: int
