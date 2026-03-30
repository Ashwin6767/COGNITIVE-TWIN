from pydantic import BaseModel
from typing import Optional


class DelaySimulationRequest(BaseModel):
    port_id: str
    delay_hours: float


class RerouteSimulationRequest(BaseModel):
    shipment_id: str
    target_port_id: Optional[str] = None


class CongestionSimulationRequest(BaseModel):
    port_id: str
    new_level: str


class ScenarioCompareRequest(BaseModel):
    scenario_a: DelaySimulationRequest
    scenario_b: DelaySimulationRequest


class AffectedShipment(BaseModel):
    shipment_id: str
    original_eta: Optional[str] = None
    new_eta: Optional[str] = None
    delay_hours: float
    priority: str
    priority_impact: str


class Recommendation(BaseModel):
    action: str
    shipment_id: str
    description: str
    time_saved_hours: Optional[float] = None
    confidence: float


class SimulationResult(BaseModel):
    affected_shipments: list[AffectedShipment]
    cascades: list[dict]
    recommendations: list[Recommendation]
    total_impact_hours: float
