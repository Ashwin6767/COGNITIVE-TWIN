# 09 — Testing Strategy

## Overview
Testing strategy focused on backend reliability. Frontend testing is stretch goal. Backend tests use pytest with mocked Neo4j driver and mocked Gemini API.

## Test Structure
```
backend/
└── tests/
    ├── conftest.py                 # Shared fixtures (mock graph service)
    ├── test_graph_service.py       # Neo4j query tests
    ├── test_simulation_engine.py   # Simulation logic tests
    ├── test_agent_tools.py         # Agent tool function tests
    ├── test_api_endpoints.py       # FastAPI endpoint integration tests
    └── test_risk_service.py        # Risk scoring tests
```

## Dependencies
Add to requirements.txt:
```
pytest==8.*
pytest-asyncio==0.24.*
httpx==0.28.*  # Already included (for TestClient)
```

## Step 1: Shared Fixtures (conftest.py)

```python
# tests/conftest.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

@pytest.fixture
def mock_graph_service():
    """Mock Neo4j graph service with pre-defined responses."""
    service = AsyncMock()
    
    # Default port data
    service.get_all_ports.return_value = [
        {"p": {"id": "P001", "name": "Port of Shanghai", "lat": 31.23, "lng": 121.47,
               "congestion_level": "HIGH", "avg_delay_hours": 4.5, "capacity_teu": 40000, "current_utilization": 0.85}},
        {"p": {"id": "P003", "name": "Port of Los Angeles", "lat": 33.74, "lng": -118.27,
               "congestion_level": "LOW", "avg_delay_hours": 1.0, "capacity_teu": 20000, "current_utilization": 0.45}},
    ]
    
    # Default vessel data
    service.get_all_vessels.return_value = [
        {"v": {"id": "V001", "name": "Pacific Star", "current_lat": 25.0, "current_lng": -160.0,
               "capacity_teu": 5000, "current_load_teu": 3500, "speed_knots": 22.0, "status": "EN_ROUTE"}},
    ]
    
    # Shipments by port (P001 - Shanghai)
    service.get_shipments_by_port.return_value = [
        {"s": {"id": "S001", "priority": "HIGH", "cargo_type": "Electronics", "origin": "Shanghai", "destination": "Los Angeles"},
         "v": {"id": "V001", "name": "Pacific Star"}},
        {"s": {"id": "S002", "priority": "MEDIUM", "cargo_type": "Industrial", "origin": "Shanghai", "destination": "Los Angeles"},
         "v": {"id": "V001", "name": "Pacific Star"}},
    ]
    
    # Alternate routes
    service.find_alternate_routes.return_value = [
        {"alt": {"id": "P002", "name": "Port of Singapore", "congestion_level": "MEDIUM", "avg_delay_hours": 2.0}},
    ]
    
    return service

@pytest.fixture
def app_client(mock_graph_service):
    """FastAPI test client with mocked services."""
    from app.main import app
    from app.services import graph_service as gs_module
    gs_module.graph_service = mock_graph_service
    return TestClient(app)
```

## Step 2: Simulation Engine Tests

```python
# tests/test_simulation_engine.py
import pytest
from app.services.simulation_engine import SimulationEngine

class TestSimulationEngine:
    
    @pytest.fixture
    def engine(self, mock_graph_service):
        engine = SimulationEngine()
        # Inject mock graph service
        return engine
    
    def test_priority_impact_high_critical(self):
        """HIGH priority + 6h delay = CRITICAL impact."""
        engine = SimulationEngine()
        assert engine._calculate_priority_impact("HIGH", 6) == "CRITICAL"
    
    def test_priority_impact_high_medium(self):
        """HIGH priority + 2h delay = MEDIUM impact."""
        engine = SimulationEngine()
        assert engine._calculate_priority_impact("HIGH", 2) == "MEDIUM"
    
    def test_priority_impact_low_small_delay(self):
        """LOW priority + 3h delay = LOW impact."""
        engine = SimulationEngine()
        assert engine._calculate_priority_impact("LOW", 3) == "LOW"
    
    def test_priority_impact_medium_large_delay(self):
        """MEDIUM priority + 12h delay = HIGH impact."""
        engine = SimulationEngine()
        assert engine._calculate_priority_impact("MEDIUM", 12) == "HIGH"
    
    @pytest.mark.asyncio
    async def test_simulate_delay_returns_affected_shipments(self, mock_graph_service):
        """Delay simulation should return all affected shipments."""
        mock_graph_service.run.return_value = [
            {"shipment_id": "S001", "priority": "HIGH", "eta": None,
             "origin": "Shanghai", "destination": "Los Angeles",
             "cargo_type": "Electronics", "value_usd": 500000,
             "vessel_id": "V001", "vessel_name": "Pacific Star"},
        ]
        
        engine = SimulationEngine()
        # Would need to patch graph_service inside engine
        # result = await engine.simulate_delay("P001", 6)
        # assert len(result.affected_shipments) == 1
    
    @pytest.mark.asyncio
    async def test_simulate_delay_empty_port(self, mock_graph_service):
        """Delay at port with no vessels should return empty result."""
        mock_graph_service.run.return_value = []
        
        engine = SimulationEngine()
        # result = await engine.simulate_delay("P999", 6)
        # assert result.total_impact_hours == 0
    
    def test_recommendations_only_for_high_priority(self):
        """Reroute recommendations should only be generated for HIGH priority shipments with significant delays."""
        # Test that LOW priority shipments don't get REROUTE recommendations
        pass
    
    def test_cascade_dampening(self):
        """Cascade effects should be dampened (50% of original delay)."""
        pass
    
    def test_cascade_amplification_high_congestion(self):
        """HIGH congestion ports should amplify cascade by 1.5x."""
        pass
```

## Step 3: API Endpoint Tests

```python
# tests/test_api_endpoints.py
import pytest
from fastapi.testclient import TestClient

class TestGraphEndpoints:
    
    def test_health_check(self, app_client):
        response = app_client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_list_ports(self, app_client):
        response = app_client.get("/api/graph/ports")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
    
    def test_list_vessels(self, app_client):
        response = app_client.get("/api/graph/vessels")
        assert response.status_code == 200
    
    def test_list_shipments(self, app_client):
        response = app_client.get("/api/graph/shipments")
        assert response.status_code == 200
    
    def test_shipments_by_port(self, app_client):
        response = app_client.get("/api/graph/shipments/by-port/P001")
        assert response.status_code == 200
    
    def test_port_impact(self, app_client):
        response = app_client.get("/api/graph/port/P001/impact")
        assert response.status_code == 200

class TestSimulationEndpoints:
    
    def test_simulate_delay(self, app_client):
        response = app_client.post("/api/simulate/delay", json={
            "port_id": "P001",
            "delay_hours": 6
        })
        assert response.status_code == 200
        data = response.json()
        assert "affected_shipments" in data
        assert "recommendations" in data
        assert "total_impact_hours" in data
    
    def test_simulate_reroute(self, app_client):
        response = app_client.post("/api/simulate/reroute", json={
            "shipment_id": "S001"
        })
        assert response.status_code == 200

class TestAgentEndpoints:
    
    def test_chat_endpoint(self, app_client):
        response = app_client.post("/api/agent/chat", json={
            "message": "What is the current supply chain status?"
        })
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
```

## Step 4: Risk Service Tests

```python
# tests/test_risk_service.py
import pytest

class TestRiskService:
    
    def test_port_risk_high_congestion(self):
        """HIGH congestion port should have risk score > 50."""
        pass
    
    def test_port_risk_low_congestion(self):
        """LOW congestion port should have risk score < 25."""
        pass
    
    def test_risk_score_clamped(self):
        """Risk score should never exceed 100."""
        pass
    
    def test_unknown_entity_type(self):
        """Unknown entity type should return error."""
        pass
```

## Step 5: Agent Tool Tests

```python
# tests/test_agent_tools.py
import pytest
from app.tools.tool_dispatcher import execute_tool

class TestToolDispatcher:
    
    @pytest.mark.asyncio
    async def test_get_shipments_by_port(self, mock_graph_service):
        result = await execute_tool("get_shipments_by_port", {"port_id": "P001"})
        assert isinstance(result, list)
    
    @pytest.mark.asyncio
    async def test_unknown_tool(self):
        result = await execute_tool("nonexistent_tool", {})
        assert "error" in result
    
    @pytest.mark.asyncio
    async def test_simulate_delay_tool(self):
        result = await execute_tool("simulate_delay", {"port_id": "P001", "delay_hours": 6})
        assert "affected_shipments" in result
```

## Key Test Cases (from master plan)

| # | Test Case | Type | Priority |
|---|-----------|------|----------|
| 1 | Simulate delay propagates to all linked shipments | Unit | HIGH |
| 2 | Reroute suggestion finds alternate port with lower congestion | Unit | HIGH |
| 3 | Agent calls correct tools for "what if" queries | Integration | HIGH |
| 4 | Graph seed creates expected number of nodes/relationships | Integration | HIGH |
| 5 | API returns correct shipments for a port | Integration | HIGH |
| 6 | Risk score increases with congestion level | Unit | MEDIUM |
| 7 | Health check returns 200 | Smoke | HIGH |
| 8 | CORS allows frontend origin | Integration | HIGH |
| 9 | Simulation does NOT write to graph | Unit | HIGH |
| 10 | Cache returns same response for identical queries | Unit | MEDIUM |

## Running Tests

```bash
cd backend

# Run all tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_simulation_engine.py -v

# Run with coverage
python -m pytest tests/ --cov=app --cov-report=term-missing

# Run only fast unit tests (skip integration)
python -m pytest tests/ -v -m "not integration"
```

## Frontend Tests (Stretch Goal)

If time permits, add basic component tests:

```bash
cd frontend
npm test
```

Focus on:
- SimulationPanel renders controls
- ChatPanel sends messages
- AlertCard displays correct colors

## Checklist
- [ ] conftest.py with mock fixtures
- [ ] test_simulation_engine.py — priority impact tests
- [ ] test_api_endpoints.py — health, ports, vessels, shipments
- [ ] test_risk_service.py — risk scoring bounds
- [ ] test_agent_tools.py — tool dispatcher
- [ ] All tests pass: `pytest tests/ -v`
- [ ] No tests write to Neo4j (all mocked)
