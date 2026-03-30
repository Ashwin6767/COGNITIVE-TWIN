from pydantic import BaseModel
from typing import Optional


class Vessel(BaseModel):
    id: str
    name: str
    current_lat: float
    current_lng: float
    capacity_teu: int
    current_load_teu: int
    speed_knots: float
    status: str
