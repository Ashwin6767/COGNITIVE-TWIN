from pydantic import BaseModel
from typing import Optional


class Port(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    congestion_level: str
    avg_delay_hours: float
    capacity_teu: int
    current_utilization: float


class PortImpact(BaseModel):
    port: Port
    affected_vessels: list
    affected_shipments: list
    total_cargo_value_usd: float
    estimated_delay_hours: float
