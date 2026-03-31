# Module 10 — Seed Data, Testing & Deployment

## Goal
Create realistic sample data that covers a complete shipment lifecycle. Update the test suite for the new architecture. Prepare deployment configuration.

---

## Seed Data

### File: `backend/app/seed/seed_data.py` (Complete Rewrite)

#### Companies (4)
```python
COMPANIES = [
    {"id": "COM-001", "name": "ToyWorld Manufacturing", "type": "SHIPPER", "country": "China"},
    {"id": "COM-002", "name": "Pacific Logistics Co.", "type": "LOGISTICS_PROVIDER", "country": "Singapore"},
    {"id": "COM-003", "name": "FastFreight America", "type": "CARRIER", "country": "United States"},
    {"id": "COM-004", "name": "ACME Corp", "type": "SHIPPER", "country": "United States"},
]
```

#### Users (10 — one for each role + extras)

> **IMPORTANT:** Seed script must hash passwords with bcrypt before inserting into Neo4j:
> `password_hash = pwd_context.hash(user["password"])`. Never store plaintext passwords.

```python
USERS = [
    # Customers
    {"id": "USR-001", "email": "sarah@toyworld.cn", "name": "Sarah Chen", "role": "CUSTOMER",
     "company_id": "COM-001", "password": "demo123"},
    {"id": "USR-002", "email": "mike@acme.us", "name": "Mike Johnson", "role": "CUSTOMER",
     "company_id": "COM-004", "password": "demo123"},

    # Logistics
    {"id": "USR-003", "email": "lisa@pacificlog.sg", "name": "Lisa Wong", "role": "LOGISTICS_MANAGER",
     "company_id": "COM-002", "password": "demo123"},

    # Drivers
    {"id": "USR-004", "email": "wang@pacificlog.sg", "name": "Wang Wei", "role": "DRIVER",
     "company_id": "COM-002", "password": "demo123"},
    {"id": "USR-005", "email": "james@fastfreight.us", "name": "James Rodriguez", "role": "DRIVER",
     "company_id": "COM-003", "password": "demo123"},

    # Port Officers (with assigned_port_id)
    {"id": "USR-006", "email": "zhang@shanghai-port.cn", "name": "Zhang Min", "role": "PORT_OFFICER",
     "company_id": None, "assigned_port_id": "P001", "password": "demo123"},
    {"id": "USR-007", "email": "robert@la-port.us", "name": "Robert Smith", "role": "PORT_OFFICER",
     "company_id": None, "assigned_port_id": "P003", "password": "demo123"},

    # Customs
    {"id": "USR-008", "email": "liu@customs.cn", "name": "Liu Yan", "role": "CUSTOMS_OFFICER",
     "company_id": None, "password": "demo123"},

    # Yard Manager (with assigned_port_id)
    {"id": "USR-009", "email": "chen@shanghai-port.cn", "name": "Chen Bo", "role": "YARD_MANAGER",
     "company_id": None, "assigned_port_id": "P001", "password": "demo123"},

    # Admin
    {"id": "USR-010", "email": "admin@cognitivetwin.io", "name": "System Admin", "role": "ADMIN",
     "company_id": None, "password": "admin123"},
]
```

#### Ports (6 — keep existing, add new properties)
```python
PORTS = [
    {"id": "P001", "name": "Port of Shanghai", "country": "China",
     "lat": 31.23, "lng": 121.47, "congestion_level": "HIGH",
     "avg_delay_hours": 4.5, "capacity_teu": 40000, "current_utilization": 0.85,
     "customs_office": True},
    {"id": "P002", "name": "Port of Singapore", "country": "Singapore",
     "lat": 1.26, "lng": 103.84, "congestion_level": "MEDIUM",
     "avg_delay_hours": 2.0, "capacity_teu": 35000, "current_utilization": 0.65,
     "customs_office": True},
    {"id": "P003", "name": "Port of Los Angeles", "country": "United States",
     "lat": 33.74, "lng": -118.27, "congestion_level": "LOW",
     "avg_delay_hours": 1.0, "capacity_teu": 20000, "current_utilization": 0.45,
     "customs_office": True},
    {"id": "P004", "name": "Port of Rotterdam", "country": "Netherlands",
     "lat": 51.95, "lng": 4.13, "congestion_level": "MEDIUM",
     "avg_delay_hours": 2.5, "capacity_teu": 30000, "current_utilization": 0.70,
     "customs_office": True},
    {"id": "P005", "name": "Port of Dubai", "country": "UAE",
     "lat": 25.27, "lng": 55.29, "congestion_level": "LOW",
     "avg_delay_hours": 1.5, "capacity_teu": 22000, "current_utilization": 0.40,
     "customs_office": True},
    {"id": "P006", "name": "Port of Mumbai", "country": "India",
     "lat": 19.00, "lng": 72.87, "congestion_level": "HIGH",
     "avg_delay_hours": 5.0, "capacity_teu": 18000, "current_utilization": 0.90,
     "customs_office": True},
]
```

#### Vessels (4 — keep existing)
Keep existing vessel data with updated properties.

#### Yards (2)
```python
YARDS = [
    {"id": "YRD-001", "port_id": "P001", "name": "Shanghai East Yard",
     "total_slots": 200, "occupied_slots": 156},
    {"id": "YRD-002", "port_id": "P003", "name": "LA Terminal Yard",
     "total_slots": 150, "occupied_slots": 67},
]
```

#### Trucks (3)
```python
TRUCKS = [
    {"id": "TRK-001", "plate_number": "沪A-88888", "type": "CONTAINER_CHASSIS",
     "capacity_kg": 30000, "status": "IN_USE"},
    {"id": "TRK-002", "plate_number": "CA-7X9K2M1", "type": "CONTAINER_CHASSIS",
     "capacity_kg": 28000, "status": "AVAILABLE"},
    {"id": "TRK-003", "plate_number": "沪B-66666", "type": "FLATBED",
     "capacity_kg": 25000, "status": "AVAILABLE"},
]
```

#### Containers (5)
```python
CONTAINERS = [
    {"id": "CSLU1234567", "type": "40FT", "status": "ON_VESSEL",
     "seal_number": "SL-001-2026", "weight_kg": 22000, "max_weight_kg": 30000},
    {"id": "MSKU7654321", "type": "40FT_HC", "status": "IN_YARD",
     "seal_number": "SL-002-2026", "weight_kg": 18000, "max_weight_kg": 32000,
     "yard_position": "A-05-2"},
    {"id": "TCNU3456789", "type": "20FT", "status": "IN_YARD",
     "seal_number": "SL-003-2026", "weight_kg": 12000, "max_weight_kg": 22000,
     "yard_position": "B-12-1"},
    {"id": "HLXU9876543", "type": "REEFER", "status": "LOADED",
     "seal_number": "SL-004-2026", "weight_kg": 20000, "max_weight_kg": 28000,
     "temperature_celsius": -18.0},
    {"id": "OOLU5432109", "type": "40FT", "status": "EMPTY",
     "seal_number": None, "weight_kg": 3800, "max_weight_kg": 30000},
]
```

#### Shipments at Various Stages (8)
Create 8 shipments at different lifecycle stages to showcase the full workflow:

> **Note:** Early-stage shipments (GOODS_RELEASED, DRIVER_ASSIGNED, UNDER_REVIEW) do NOT have a container
> assigned — containers are assigned at the port. All code querying `(:Shipment)-[:CONTAINS]->(:Container)`
> must handle this relationship being absent (it's optional until IN_YARD stage).

```python
SHIPMENTS = [
    # Stage 12: IN_TRANSIT_SEA (most advanced)
    {"id": "SHP-2026-001", "status": "IN_TRANSIT_SEA", "priority": "EXPRESS",
     "customer_id": "USR-001", "container_id": "CSLU1234567",
     "origin_port": "P001", "dest_port": "P003"},  # Stored as relationships, not string props

    # Stage 10: IN_YARD (waiting for vessel)
    {"id": "SHP-2026-002", "status": "IN_YARD", "priority": "STANDARD",
     "customer_id": "USR-001", "container_id": "MSKU7654321",
     "origin_port": "P001", "dest_port": "P004"},

    # Stage 9: CUSTOMS_CLEARANCE
    {"id": "SHP-2026-003", "status": "CUSTOMS_CLEARANCE", "priority": "STANDARD",
     "customer_id": "USR-002", "container_id": "TCNU3456789",
     "origin_port": "P001", "dest_port": "P003"},

    # Stage 6: GOODS_RELEASED (driver just picked up — no container yet)
    {"id": "SHP-2026-004", "status": "GOODS_RELEASED", "priority": "CRITICAL",
     "customer_id": "USR-002",
     "origin_port": "P006", "dest_port": "P004"},

    # Stage 4: DRIVER_ASSIGNED (pickup scheduled — no container yet)
    {"id": "SHP-2026-005", "status": "DRIVER_ASSIGNED", "priority": "STANDARD",
     "customer_id": "USR-001",
     "origin_port": "P001", "dest_port": "P005"},

    # Stage 2: UNDER_REVIEW (pending approval — no container yet)
    {"id": "SHP-2026-006", "status": "UNDER_REVIEW", "priority": "STANDARD",
     "customer_id": "USR-002",
     "origin_port": "P002", "dest_port": "P003"},

    # Stage 14: LAST_MILE_ASSIGNED (almost delivered)
    {"id": "SHP-2026-007", "status": "LAST_MILE_ASSIGNED", "priority": "EXPRESS",
     "customer_id": "USR-001",
     "origin_port": "P001", "dest_port": "P003"},

    # Stage 15: DELIVERED (complete)
    {"id": "SHP-2026-008", "status": "DELIVERED", "priority": "STANDARD",
     "customer_id": "USR-002",
     "origin_port": "P006", "dest_port": "P005"},
]
```

#### Sample Documents
Create documents for shipments that have passed form-requiring stages (e.g., SHP-2026-001 has all docs from stages 1-11).

#### Routes (7 — keep existing)
Keep existing port-to-port routes.

---

## Test Suite

### Backend Tests (update `backend/tests/`)

```
tests/
├── conftest.py                    # Updated fixtures for new schema
├── test_auth.py                   # Register, login, JWT, role checks
├── test_workflow_engine.py        # All 15 transitions, role validation
├── test_document_service.py       # Form schemas, submission, validation
├── test_shipment_service.py       # CRUD, queries, tracking
├── test_notification_service.py   # Create, deliver, mark read
├── test_api_shipments.py          # API integration tests
├── test_api_auth.py               # Auth API integration tests
├── test_api_workflow.py           # Workflow API integration tests
├── test_cascade_detection.py      # Downstream impact detection
├── test_agent_tools.py            # Updated agent with new tools
└── test_risk_service.py           # Updated risk with new node types
```

---

## Deployment

### Docker (backend/Dockerfile — update)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables (production)
```
# Backend (Render)
NEO4J_URI=neo4j+s://xxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=xxx
GEMINI_API_KEY=xxx
FRONTEND_URL=https://cognitive-twin.vercel.app
ENVIRONMENT=production
DEMO_MODE=false
JWT_SECRET=<random-256-bit-string>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=30

# Frontend (Vercel)
NEXT_PUBLIC_API_URL=https://cognitive-twin-api.onrender.com
NEXT_PUBLIC_WS_URL=wss://cognitive-twin-api.onrender.com
```

### Deployment Steps
1. Push to GitHub
2. Backend: Connect Render to repo, root dir `backend`, start cmd `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Frontend: Connect Vercel to repo, root dir `frontend`
4. Set env vars on both platforms
5. POST /api/seed to populate database
6. Verify all endpoints

---

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | sarah@toyworld.cn | demo123 |
| Customer | mike@acme.us | demo123 |
| Logistics Manager | lisa@pacificlog.sg | demo123 |
| Driver | wang@pacificlog.sg | demo123 |
| Driver | james@fastfreight.us | demo123 |
| Port Officer | zhang@shanghai-port.cn | demo123 |
| Customs Officer | liu@customs.cn | demo123 |
| Yard Manager | chen@shanghai-port.cn | demo123 |
| Admin | admin@cognitivetwin.io | admin123 |
