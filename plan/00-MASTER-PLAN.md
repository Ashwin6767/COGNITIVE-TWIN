# Cognitive Twin — Master Plan v2

## What Is This?

A logistics management platform where **every step of a shipment's journey** — from customer request to final delivery — is tracked as a graph. Different users (customers, drivers, port officers, etc.) each get their own dashboard and forms. An AI agent watches the graph and makes smart decisions when things change.

---

## Modules at a Glance

### Module 01 — Authentication & User Roles
**What it does:** Login system with 7 user types. Each user sees only what they're allowed to.
**Tech:** JWT tokens via FastAPI (python-jose + passlib/bcrypt), Neo4j user nodes, role-based middleware

### Module 02 — Graph Schema & Data Model
**What it does:** Redesigns the entire database to model the full logistics chain — shipments, containers, documents, forms, yards, customs, and all the connections between them.
**Tech:** Neo4j AuraDB, Cypher constraints, new node/relationship types

### Module 03 — Workflow Engine
**What it does:** A state machine that moves shipments through 17 statuses (request → approval → pickup → port → yard → loading → transit → landing → delivery, plus rejected/cancelled). Each transition triggers events and unlocks the next form.
**Tech:** Python state machine, Neo4j status tracking, event emitter

### Module 04 — Forms & Documents
**What it does:** Every step in the logistics workflow requires a form. When submitted, the form data creates a Document node in the graph linked to the shipment. Supports 14 document types (Release Form, Bill of Lading, Customs Declaration, Customs Review, etc.).
**Tech:** React dynamic forms, PDF generation, file upload to S3-compatible storage

### Module 05 — Backend API Overhaul
**What it does:** New API routes for every user action — submitting forms, approving requests, assigning drivers, tracking shipments. Real-time events via WebSocket.
**Tech:** FastAPI routers, Pydantic models, dependency injection for auth

### Module 06 — UI Overhaul
**What it does:** Replaces the dark monitoring dashboard with a clean, white, usable interface. Each user type gets their own dashboard with only the information and actions they need.
**Tech:** Next.js App Router, Tailwind CSS (light theme), responsive layouts, white space-heavy design

### Module 07 — Real-Time Monitoring & Tracking
**What it does:** Live tracking of every shipment, container, and vessel. Map view with real positions. Automatic alerts when a node changes state that could affect downstream nodes.
**Tech:** WebSocket events, Leaflet maps, graph traversal for cascade detection

### Module 08 — AI Agent Enhancement
**What it does:** Upgrades the AI from a chat bot to a decision engine. It watches the graph for problems (delays, port congestion, customs holds) and proactively suggests solutions per user role.
**Tech:** Google Gemini, graph-aware tool calling, role-scoped responses

### Module 09 — Notifications & Alerts
**What it does:** Smart notifications per user role. A customs hold alerts the logistics manager, not the driver. Escalation rules for time-sensitive issues.
**Tech:** WebSocket push, email (optional), in-app notification center

### Module 10 — Seed Data, Testing & Deployment
**What it does:** Realistic sample data covering a full shipment lifecycle. Test suite for all workflows. Deployment config for production.
**Tech:** Pytest, Neo4j seed scripts, Docker, Render + Vercel

---

## User Types

| Role | What They Do | What They See |
|------|-------------|---------------|
| **Customer** | Submit shipment requests, sign release forms, track their shipments | Their shipments, tracking map, forms to fill |
| **Logistics Manager** | Approve requests, assign drivers/vessels, monitor everything | All shipments, assignments, overview dashboard |
| **Driver** | Accept pickup/delivery assignments, update status | Their assignments, navigation, pickup/delivery forms |
| **Port Officer** | Manage port entry/exit, container operations | Port-specific view, vessels, containers at their port |
| **Customs Officer** | Review/approve customs declarations | Pending declarations, inspection queue |
| **Yard Manager** | Track containers in yard, manage placement | Yard map, container positions, loading queue |
| **Admin** | Manage users, system settings, full access | Everything + user management |

---

## Shipment Lifecycle (17 Statuses)

```
1.  REQUEST_SUBMITTED     — Customer fills shipment request form (auto-transitions to UNDER_REVIEW)
2.  UNDER_REVIEW          — Logistics team reviews the request
3.  APPROVED              — Request approved, driver assignment begins
4.  REJECTED              — Request rejected (terminal state)
5.  DRIVER_ASSIGNED       — Driver assigned for pickup
6.  PICKUP_EN_ROUTE       — Driver heading to pickup location
7.  GOODS_RELEASED        — Customer signs release form, goods handed to driver
8.  IN_TRANSIT_TO_PORT    — Driver transporting to origin port
9.  PORT_ENTRY            — Arrived at port, entry forms being filled
10. CUSTOMS_CLEARANCE     — Customs declaration submitted and under review
11. IN_YARD               — Container placed in yard, yard monitoring active
12. LOADED_ON_VESSEL      — Container loaded, BOL issued
13. IN_TRANSIT_SEA        — Vessel in transit (tracking active)
14. ARRIVED_DEST_PORT     — Vessel arrived at destination port
15. LAST_MILE_ASSIGNED    — Last-mile driver assigned for delivery
16. DELIVERED             — Proof of delivery signed, shipment complete
17. CANCELLED             — Shipment cancelled at any stage (terminal state, requires reason)
```

---

## Document Types

| Document | Filled By | At Stage |
|----------|-----------|----------|
| Shipment Request | Customer | 1 |
| Approval Form | Logistics Manager | 3 |
| Driver Assignment | Logistics Manager | 4 |
| Release Form | Customer | 6 |
| Port Entry Declaration | Driver / Port Officer | 8 |
| Customs Declaration | Driver / Port Officer | 9 |
| Customs Review | Customs Officer | 9 |
| Container Inspection | Yard Manager | 10 |
| Bill of Lading (BOL) | Port Officer | 11 |
| Loading Manifest | Port Officer | 11 |
| Departure Clearance | Port Officer | 11 |
| Arrival Confirmation | Dest Port Officer | 13 |
| Last Mile Assignment | Logistics Manager | 14 |
| Proof of Delivery (POD) | Driver (customer signs within form) | 15 |
