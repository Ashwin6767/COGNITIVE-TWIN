from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class Shipment(BaseModel):
    id: str
    origin: str
    destination: str
    priority: str
    eta: Optional[datetime] = None
    status: str
    cargo_type: str
    weight_tons: Optional[float] = None
    value_usd: Optional[float] = None
    vessel_id: Optional[str] = None
