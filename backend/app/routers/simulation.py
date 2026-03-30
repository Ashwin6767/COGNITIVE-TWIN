"""Simulation & risk endpoints."""
from fastapi import APIRouter

from app.models.simulation import (
    DelaySimulationRequest,
    RerouteSimulationRequest,
    ScenarioCompareRequest,
)
from app.services.simulation_engine import simulation_engine
from app.services.risk_service import risk_service

router = APIRouter()


@router.post("/delay")
async def simulate_delay(request: DelaySimulationRequest):
    """Simulate port delay propagation with cascade effects."""
    result = await simulation_engine.simulate_delay(request.port_id, request.delay_hours)
    return result.model_dump()


@router.post("/reroute")
async def simulate_reroute(request: RerouteSimulationRequest):
    """Get reroute suggestions for a shipment."""
    return await simulation_engine.suggest_reroute(request.shipment_id)


@router.post("/compare")
async def compare_scenarios(request: ScenarioCompareRequest):
    """Compare two delay scenarios side-by-side."""
    return await simulation_engine.compare_scenarios(request.scenario_a, request.scenario_b)


@router.get("/risk/{entity_type}/{entity_id}")
async def get_risk_score(entity_type: str, entity_id: str):
    """Get risk score (0-100) for a port, vessel, or shipment."""
    return await risk_service.get_risk_score(entity_type, entity_id)
