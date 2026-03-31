# Module 05 — Backend API Overhaul

## Goal
Rebuild the API to support the full logistics workflow. Each user type gets endpoints for their actions. All endpoints require authentication and check role permissions.

---

## Router Structure

```
backend/app/routers/
├── auth.py           # Login, register, token refresh (Module 01)
├── workflow.py       # Shipment lifecycle transitions (Module 03)
├── documents.py      # Form submission and retrieval (Module 04)
├── shipments.py      # Shipment CRUD and queries
├── containers.py     # Container tracking and management
├── vessels.py        # Vessel tracking
├── ports.py          # Port data and operations
├── drivers.py        # Driver assignments and status
├── yard.py           # Yard management
├── users.py          # User management (Admin)
├── agent.py          # AI agent chat (keep existing, enhance)
├── notifications.py  # Notification endpoints
├── files.py          # File upload endpoint (stores to local uploads/ dir, returns URL)
├── websocket.py      # Real-time events (keep existing, enhance)
└── system.py         # Health, seed, reset
```

---

## Endpoint Specifications

### Shipments (`/api/shipments`)

```
GET  /api/shipments
    Query params: ?status=IN_TRANSIT_SEA&priority=CRITICAL&page=1&limit=20
    Auth: LOGISTICS_MANAGER, ADMIN see all; others see only their shipments
    Returns: paginated list of shipments with current status

GET  /api/shipments/{shipment_id}
    Auth: any authenticated user linked to this shipment
    Returns: full shipment detail with timeline, documents, container info

GET  /api/shipments/{shipment_id}/tracking
    Auth: any authenticated user linked to this shipment
    Returns: current location, ETA, map coordinates, status history

POST /api/shipments/request
    Auth: CUSTOMER
    Body: ShipmentRequest form data
    Action: Creates ShipmentRequest node via WorkflowEngine.create_shipment_request()
           (workflow engine handles initial state and auto-transition to UNDER_REVIEW)

GET  /api/shipments/my
    Auth: any authenticated user
    Returns: shipments related to current user (by role)
```

### Containers (`/api/containers`)

```
GET  /api/containers
    Query params: ?status=IN_YARD&port_id=P001
    Auth: PORT_OFFICER, YARD_MANAGER, LOGISTICS_MANAGER, ADMIN

GET  /api/containers/{container_id}
    Returns: container detail with current location, shipment link

PUT  /api/containers/{container_id}/position
    Auth: YARD_MANAGER
    Body: { "yard_position": "A-12-3" }

GET  /api/containers/{container_id}/history
    Returns: position/status history from Event nodes
```

### Vessels (`/api/vessels`)

```
GET  /api/vessels
    Query params: ?status=AT_SEA
    Auth: PORT_OFFICER, LOGISTICS_MANAGER, ADMIN

GET  /api/vessels/{vessel_id}
    Returns: vessel detail with current position, load, route

GET  /api/vessels/{vessel_id}/containers
    Returns: containers currently loaded on this vessel

PUT  /api/vessels/{vessel_id}/position
    Auth: system or PORT_OFFICER
    Body: { "lat": 25.0, "lng": 130.0, "speed_knots": 18.5 }
```

### Ports (`/api/ports`)

```
GET  /api/ports
    Auth: any authenticated user
    Returns: all ports with congestion and utilization data

GET  /api/ports/{port_id}
    Returns: port detail with current vessels, containers, yard status

GET  /api/ports/{port_id}/dashboard
    Auth: PORT_OFFICER at this port (checked via user.assigned_port_id)
    Returns: pending entries, vessels docked, yard utilization, upcoming departures
```

### Drivers (`/api/drivers`)

```
GET  /api/drivers/my-assignments
    Auth: DRIVER
    Returns: current and upcoming assignments

PUT  /api/drivers/my-status
    Auth: DRIVER
    Body: { "status": "ON_ASSIGNMENT", "lat": 31.2, "lng": 121.5 }

GET  /api/drivers/available
    Auth: LOGISTICS_MANAGER, ADMIN
    Returns: drivers with status AVAILABLE

PUT  /api/drivers/{driver_id}/location
    Auth: DRIVER (own location only)
    Body: { "lat": 31.2, "lng": 121.5 }
```

### Yard (`/api/yard`)

```
GET  /api/yard/{port_id}
    Auth: YARD_MANAGER, PORT_OFFICER, LOGISTICS_MANAGER
    Returns: yard layout with occupied/available slots

GET  /api/yard/{port_id}/containers
    Returns: containers currently in this yard with positions

POST /api/yard/{port_id}/assign-slot
    Auth: YARD_MANAGER
    Body: { "container_id": "CSLU1234567", "position": "A-12-3" }

GET  /api/yard/{port_id}/loading-queue
    Returns: containers scheduled for loading, ordered by vessel departure
```

### Users (`/api/users`) — Admin Only

```
GET  /api/users
    Auth: ADMIN
    Query: ?role=DRIVER&company_id=xxx
    Returns: paginated user list

POST /api/users
    Auth: ADMIN
    Body: { "email": "...", "name": "...", "role": "DRIVER", ... }

PUT  /api/users/{user_id}
    Auth: ADMIN
    Body: updated fields

DELETE /api/users/{user_id}
    Auth: ADMIN (soft delete: set is_active=false)
```

### Notifications (`/api/notifications`)

```
GET  /api/notifications
    Auth: any authenticated user
    Returns: notifications for current user, newest first

PUT  /api/notifications/{id}/read
    Auth: own notifications only
    Action: mark as read

GET  /api/notifications/unread-count
    Returns: { "count": 5 }
```

---

## Service Layer

### Files to create/update:

```
backend/app/services/
├── graph_service.py       # UPDATE: add new query methods for all node types
├── shipment_service.py    # NEW: shipment CRUD, queries, tracking
├── container_service.py   # NEW: container CRUD, yard position
├── vessel_service.py      # NEW: vessel queries, position updates
├── port_service.py        # NEW: port dashboard data, yard overview
├── driver_service.py      # NEW: driver assignments, location
├── user_service.py        # NEW: user CRUD for admin
├── document_service.py    # NEW: document creation, retrieval (Module 04)
├── workflow_engine.py     # NEW: state machine (Module 03)
├── notification_service.py # NEW: notification creation, delivery (Module 09)
├── agent_service.py       # UPDATE: add new tools for full workflow
├── risk_service.py        # UPDATE: risk scoring with new node types
└── simulation_engine.py   # UPDATE: cascade analysis with new relationships
```

---

## Middleware

### File: `backend/app/middleware/auth.py`

```python
# Applied to all /api/* routes except /api/auth/login, /api/auth/register, /api/health
# Extracts JWT from Authorization: Bearer <token>
# Adds request.state.user = { id, role, company_id }
```

---

## Error Responses

All endpoints use consistent error format:

```json
{
    "error": "FORBIDDEN",
    "detail": "Your role (DRIVER) cannot perform this action",
    "status_code": 403
}
```

---

## Pagination

All list endpoints support:
```
?page=1&limit=20&sort_by=created_at&sort_order=desc
```

Response format:
```json
{
    "items": [...],
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
}
```

---

## Files to Create

```
backend/app/routers/shipments.py
backend/app/routers/containers.py
backend/app/routers/vessels.py     # (rename from existing)
backend/app/routers/ports.py       # (rename from existing)
backend/app/routers/drivers.py
backend/app/routers/yard.py
backend/app/routers/users.py
backend/app/routers/notifications.py
backend/app/routers/system.py      # Extract from main.py

backend/app/services/shipment_service.py
backend/app/services/container_service.py
backend/app/services/vessel_service.py
backend/app/services/port_service.py
backend/app/services/user_service.py        # Includes driver-specific queries (no separate driver_service)
backend/app/services/file_service.py        # File upload/storage

backend/app/middleware/auth.py
```

---

## Testing

```
test_shipments_list_filtered_by_role    — CUSTOMER only sees their shipments
test_shipments_list_all_for_manager     — LOGISTICS_MANAGER sees all
test_create_shipment_request            — CUSTOMER submits → 201
test_create_shipment_wrong_role         — DRIVER submits → 403
test_pagination                         — Returns correct page/total
test_container_position_update          — YARD_MANAGER updates → 200
test_driver_assignment_list             — DRIVER sees only their assignments
test_port_dashboard                     — PORT_OFFICER gets port-specific data
test_admin_create_user                  — ADMIN creates new user → 201
test_non_admin_create_user              — CUSTOMER creates user → 403
```
