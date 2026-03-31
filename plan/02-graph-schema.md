# Module 02 — Graph Schema & Data Model

## Goal
Redesign the Neo4j graph to model the entire logistics chain. Every entity (user, shipment, container, port, document) is a node. Every interaction is a relationship. The graph becomes the single source of truth.

---

## Node Types

### Core Entities

```cypher
// Company — logistics companies and customers
(:Company {
    id: string,
    name: string,
    type: string,          // "SHIPPER", "LOGISTICS_PROVIDER", "CARRIER"
    country: string,
    address: string,
    contact_email: string,
    contact_phone: string,
    created_at: datetime
})

// User — see Module 01 for full schema
// NOTE: Driver-specific fields (license_number, license_type) are optional properties
// on the User node for users with role: "DRIVER". No separate Driver node.
(:User {
    id: string,
    email: string,
    name: string,
    role: string,
    assigned_port_id: string | null,  // For PORT_OFFICER and YARD_MANAGER
    license_number: string | null,    // For DRIVER role
    license_type: string | null,      // For DRIVER role
    ...
})

// ShipmentRequest — customer's initial request before approval
(:ShipmentRequest {
    id: string,
    status: string,        // "PENDING", "APPROVED", "REJECTED"
    origin_address: string,
    origin_city: string,
    origin_country: string,
    dest_address: string,
    dest_city: string,
    dest_country: string,
    cargo_description: string,
    cargo_type: string,    // "GENERAL", "HAZARDOUS", "PERISHABLE", "OVERSIZED"
    weight_kg: float,
    volume_cbm: float,
    quantity: int,
    preferred_pickup_date: date,
    special_instructions: string,
    declared_value_usd: float,
    created_at: datetime,
    updated_at: datetime
})

// Shipment — active shipment (created after approval)
(:Shipment {
    id: string,            // e.g. "SHP-2026-00001"
    status: string,        // One of 17 lifecycle statuses
    priority: string,      // "STANDARD", "EXPRESS", "CRITICAL"
    current_location: string,
    eta: datetime,
    actual_arrival: datetime | null,
    created_at: datetime,
    updated_at: datetime
})
// NOTE: Origin/dest ports are tracked via relationships only (no string IDs on the node).
// Use (:Shipment)-[:ORIGIN_PORT]->(:Port) and (:Shipment)-[:DEST_PORT]->(:Port).

// Container
(:Container {
    id: string,            // Container number e.g. "CSLU1234567"
    type: string,          // "20FT", "40FT", "40FT_HC", "REEFER"
    status: string,        // "EMPTY", "LOADED", "IN_YARD", "ON_VESSEL", "DELIVERED"
    seal_number: string,
    weight_kg: float,
    max_weight_kg: float,
    temperature_celsius: float | null,  // For reefer containers
    yard_position: string | null,       // e.g. "A-12-3" (block-row-tier)
    loaded_at: datetime | null,
    created_at: datetime
})

// Vessel
(:Vessel {
    id: string,
    name: string,
    imo_number: string,
    flag: string,
    capacity_teu: int,
    current_load_teu: int,
    current_lat: float,
    current_lng: float,
    speed_knots: float,
    status: string,        // "IN_PORT", "AT_SEA", "APPROACHING"
    eta_next_port: datetime | null
})

// Port
(:Port {
    id: string,
    name: string,
    country: string,
    lat: float,
    lng: float,
    type: string,          // "ORIGIN", "DESTINATION", "TRANSSHIPMENT"
    congestion_level: string,
    avg_delay_hours: float,
    capacity_teu: int,
    current_utilization: float,
    operating_hours: string,
    customs_office: boolean
})

// NOTE: No separate Driver node — driver fields are on the User node (see above).
// Users with role="DRIVER" have license_number, license_type set.

// Truck
(:Truck {
    id: string,
    plate_number: string,
    type: string,          // "FLATBED", "CONTAINER_CHASSIS", "BOX_TRUCK"
    capacity_kg: float,
    status: string,        // "AVAILABLE", "IN_USE", "MAINTENANCE"
    current_lat: float | null,
    current_lng: float | null
})

// Yard — a container yard at a port
(:Yard {
    id: string,
    port_id: string,
    name: string,
    total_slots: int,
    occupied_slots: int,
    layout: string         // JSON string describing grid layout
})

// Document — any form or official document in the system
(:Document {
    id: string,
    type: string,          // See document types list below
    status: string,        // "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"
    data: string,          // JSON string with form field values (intentional — form schemas vary too much for fixed properties)
    file_url: string | null,  // URL to uploaded PDF/file
    submitted_by: string,  // User ID
    submitted_at: datetime,
    reviewed_by: string | null,
    reviewed_at: datetime | null,
    notes: string | null
})
// NOTE: For frequently-queried fields (e.g., BOL number, HS code), promote them
// to top-level Document properties in addition to the JSON blob.
```

### Document Types (stored in Document.type)

```
SHIPMENT_REQUEST
APPROVAL_FORM
DRIVER_ASSIGNMENT
RELEASE_FORM
PORT_ENTRY_DECLARATION
CUSTOMS_DECLARATION
CUSTOMS_REVIEW
CONTAINER_INSPECTION
BILL_OF_LADING
LOADING_MANIFEST
DEPARTURE_CLEARANCE
ARRIVAL_CONFIRMATION
LAST_MILE_ASSIGNMENT
PROOF_OF_DELIVERY
```

---

## Relationships

```cypher
// User relationships
(:User)-[:BELONGS_TO]->(:Company)
(:User)-[:SUBMITTED]->(:Document)
(:User)-[:REVIEWED]->(:Document)
(:User)-[:WORKS_AT]->(:Port)             // PORT_OFFICER and YARD_MANAGER

// Shipment request flow
(:User)-[:REQUESTED]->(:ShipmentRequest)
(:ShipmentRequest)-[:APPROVED_AS]->(:Shipment)
(:ShipmentRequest)-[:BELONGS_TO]->(:Company)

// Shipment tracking
(:Shipment)-[:CONTAINS]->(:Container)
(:Shipment)-[:ORIGIN_PORT]->(:Port)
(:Shipment)-[:DEST_PORT]->(:Port)
(:Shipment)-[:CURRENT_VESSEL]->(:Vessel)
(:Shipment)-[:HAS_DOCUMENT]->(:Document)
(:Shipment)-[:REQUESTED_BY]->(:User)

// Container tracking
(:Container)-[:IN_YARD]->(:Yard)
(:Container)-[:LOADED_ON]->(:Vessel)
(:Container)-[:AT_PORT]->(:Port)

// Vessel and port
(:Vessel)-[:DOCKED_AT]->(:Port)
(:Vessel)-[:EN_ROUTE_TO]->(:Port)
(:Port)-[:ROUTES_TO {distance_nm, avg_days}]->(:Port)
(:Yard)-[:LOCATED_AT]->(:Port)

// Driver and truck (Driver fields are on User node — no separate Driver node)
(:User {role: "DRIVER"})-[:DRIVES]->(:Truck)
(:User {role: "DRIVER"})-[:ASSIGNED_PICKUP]->(:Shipment)
(:User {role: "DRIVER"})-[:ASSIGNED_DELIVERY]->(:Shipment)

// Document chain
(:Document)-[:FOR_SHIPMENT]->(:Shipment)
(:Document)-[:FOR_CONTAINER]->(:Container)
(:Document)-[:SIGNED_BY]->(:User)

// Workflow tracking (event log)
(:Shipment)-[:HAS_EVENT]->(:Event {
    id: string,
    type: string,          // "STATUS_CHANGE", "FORM_SUBMITTED", "ALERT", "ASSIGNMENT"
    from_status: string,
    to_status: string,
    triggered_by: string,  // User ID
    timestamp: datetime,
    details: string        // JSON
})
```

---

## Constraints and Indexes

```cypher
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE;
CREATE CONSTRAINT company_id IF NOT EXISTS FOR (c:Company) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT shipment_id IF NOT EXISTS FOR (s:Shipment) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT shipment_request_id IF NOT EXISTS FOR (r:ShipmentRequest) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT container_id IF NOT EXISTS FOR (c:Container) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT vessel_id IF NOT EXISTS FOR (v:Vessel) REQUIRE v.id IS UNIQUE;
CREATE CONSTRAINT port_id IF NOT EXISTS FOR (p:Port) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT document_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT notification_id IF NOT EXISTS FOR (n:Notification) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT driver_id IF NOT EXISTS FOR (d:Driver) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT truck_id IF NOT EXISTS FOR (t:Truck) REQUIRE t.id IS UNIQUE;
CREATE CONSTRAINT yard_id IF NOT EXISTS FOR (y:Yard) REQUIRE y.id IS UNIQUE;

// Performance indexes
CREATE INDEX shipment_status IF NOT EXISTS FOR (s:Shipment) ON (s.status);
CREATE INDEX document_type IF NOT EXISTS FOR (d:Document) ON (d.type);
CREATE INDEX container_status IF NOT EXISTS FOR (c:Container) ON (c.status);
CREATE INDEX vessel_status IF NOT EXISTS FOR (v:Vessel) ON (v.status);
```

---

## Migration from Current Schema

### What changes:
- **Keep:** Port, Vessel nodes (add new properties)
- **Keep:** ROUTES_TO relationships
- **Remove:** Old Shipment nodes (replace with new schema)
- **Add:** User, Company, ShipmentRequest, Container, Driver, Truck, Yard, Document, Event nodes
- **Add:** All new relationships above
- **Rename:** Old relationships to match new naming

### Migration steps:
1. Clear existing data: `MATCH (n) DETACH DELETE n`
2. Create new constraints
3. Run new seed script (Module 10)

---

## Pydantic Models (backend/app/models/)

### Files to create or update:
```
backend/app/models/
├── user.py             # User, UserCreate, UserLogin, UserResponse, TokenPair
├── company.py          # Company, CompanyCreate
├── shipment.py         # Shipment, ShipmentCreate (overhaul)
├── shipment_request.py # ShipmentRequest, ShipmentRequestCreate
├── container.py        # Container, ContainerCreate
├── vessel.py           # Vessel (update with new fields)
├── port.py             # Port (update with new fields)
├── truck.py            # Truck, TruckCreate
├── yard.py             # Yard, YardCreate
├── document.py         # Document, DocumentCreate, DocumentReview
├── event.py            # Event, EventCreate
└── __init__.py
```
