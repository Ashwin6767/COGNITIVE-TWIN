# Plan Review — Issues, Fixes & Comparisons

> **Status: ALL 31 FIXES APPLIED** to the plan files on 2026-03-31.

This document lists every logical error, chokepoint, and inconsistency found across all 10 modules, the chosen fix for each, and a before/after comparison.

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Logic Error (would break at runtime) | 12 |
| 🟡 Inconsistency (conflicting info across modules) | 10 |
| 🟢 Design Gap (missing but not broken) | 9 |
| **Total** | **31** |

---

## 🔴 LOGIC ERRORS

### #1 — Auth technology contradiction
**Module:** Master Plan vs Module 01
**Issue:** Master plan says "NextAuth.js" but Module 01 implements `python-jose` + `passlib` (backend JWT). NextAuth.js is a Next.js server-side auth library — it conflicts with FastAPI-based auth. You'd have two competing auth systems.
**Fix chosen:** Remove NextAuth.js. Use backend JWT via `python-jose` only. The frontend stores the JWT and sends it in `Authorization: Bearer` headers.

| Before | After |
|--------|-------|
| Master plan: "NextAuth.js, JWT tokens" | Master plan: "JWT tokens via FastAPI, bcrypt password hashing" |

---

### #2 — PickupOrder node doesn't exist
**Module:** 01 (Auth)
**Issue:** Module 01 defines `(:User {role: "DRIVER"})-[:ASSIGNED_TO]->(:PickupOrder)` but PickupOrder is never defined in Module 02's schema. The Driver→Shipment relationship is what actually exists.
**Fix chosen:** Replace with `(:Driver)-[:ASSIGNED_PICKUP]->(:Shipment)` (which Module 02 already defines).

| Before | After |
|--------|-------|
| `(:User)-[:ASSIGNED_TO]->(:PickupOrder)` | `(:Driver)-[:ASSIGNED_PICKUP]->(:Shipment)` |

---

### #3 — Customs form combines two roles into one
**Module:** 04 (Forms) and 03 (Workflow)
**Issue:** The CUSTOMS_DECLARATION form has both "Declaration Details" (filled by port officer/driver with HS code, goods info) AND "Clearance Decision" (filled by customs officer: CLEARED/HELD/REJECTED). These are done by different people at different times. One form can't serve both.
**Fix chosen:** Split into two forms:
- `CUSTOMS_DECLARATION` — Cargo details, HS code, value (filled by driver/port officer at PORT_ENTRY)
- `CUSTOMS_REVIEW` — Decision: CLEARED / HELD_FOR_INSPECTION / REJECTED (filled by customs officer)

| Before | After |
|--------|-------|
| 1 form with 2 sections, 2 different actors | 2 separate forms, 1 actor each |

---

### #4 — PORT_ENTRY → CUSTOMS_CLEARANCE triggered by wrong role
**Module:** 03 (Workflow)
**Issue:** Transition from PORT_ENTRY → CUSTOMS_CLEARANCE is triggered by `CUSTOMS_OFFICER`, but the customs officer hasn't reviewed anything yet — they need to be *notified* when port entry is complete. The PORT_OFFICER should trigger this transition after port forms are done.
**Fix chosen:** Change `triggered_by` for PORT_ENTRY → CUSTOMS_CLEARANCE to `["PORT_OFFICER"]`. Side effect becomes `notify_customs_officer` (correct — they receive notification to start review).

| Before | After |
|--------|-------|
| `triggered_by: ["CUSTOMS_OFFICER"]` | `triggered_by: ["PORT_OFFICER"]` |

---

### #5 — No REJECTED or CANCELLED terminal states
**Module:** 03 (Workflow)
**Issue:** The workflow has no way to reject a shipment request or cancel a shipment mid-process. UNDER_REVIEW mentions "or REJECTED" in a comment but REJECTED doesn't exist in the enum. A stuck or invalid shipment has no exit path.
**Fix chosen:** Add two terminal states:
- `REJECTED` — reachable from `UNDER_REVIEW` (by LOGISTICS_MANAGER)
- `CANCELLED` — reachable from any status except DELIVERED (by LOGISTICS_MANAGER/ADMIN, requires reason)

| Before | After |
|--------|-------|
| 15 statuses, no terminal except DELIVERED | 17 statuses: + REJECTED, CANCELLED |

---

### #6 — GPS Event nodes will flood the graph
**Module:** 07 (Real-Time)
**Issue:** `EventService.emit()` creates an Event node in the graph for every event, including `location_update`. GPS updates from drivers/vessels every 10-30 seconds would create millions of Event nodes, overwhelming Neo4j AuraDB's 200K node free-tier limit.
**Fix chosen:** Only persist Event nodes for significant state changes (`status_change`, `form_submitted`, `cascade_alert`). Location updates are ephemeral — broadcast via WebSocket only, never persisted as graph nodes.

| Before | After |
|--------|-------|
| Every event → Event node in graph | Only status/form/alert events → Event node. GPS is WebSocket-only. |

---

### #7 — Passwords stored as plaintext in seed data
**Module:** 10 (Seed Data)
**Issue:** Seed data has `"password": "demo123"` but Module 01 uses bcrypt hashing. Inserting plaintext passwords means login will fail because bcrypt.verify("demo123", "demo123") ≠ True.
**Fix chosen:** Seed script must hash passwords before creating User nodes: `password_hash = pwd_context.hash(user["password"])`.

| Before | After |
|--------|-------|
| Store `password: "demo123"` in Neo4j | Store `password_hash: "$2b$12$..."` (bcrypt hash) |

---

### #8 — Refresh token invalidation without a token store
**Module:** 01 (Auth)
**Issue:** `POST /api/auth/logout` says "Invalidate refresh token" but JWT tokens are stateless — you can't invalidate them without a server-side blacklist. Neo4j is not ideal for this lookup pattern.
**Fix chosen:** For hackathon: use short-lived access tokens only (30 min), no refresh tokens. Client re-authenticates when token expires. Add refresh tokens in production later.

| Before | After |
|--------|-------|
| Access token + refresh token + logout invalidation | Access token only (30 min). No refresh/logout endpoint. |

---

### #9 — Duplicate port IDs on Shipment node
**Module:** 02 (Schema)
**Issue:** Shipment has both `origin_port_id: string` property AND `(:Shipment)-[:ORIGIN_PORT]->(:Port)` relationship. Same data stored twice — will desync.
**Fix chosen:** Remove `origin_port_id` and `dest_port_id` string properties from Shipment. Use only the `ORIGIN_PORT` and `DEST_PORT` relationships. Query ports via Cypher: `MATCH (s:Shipment)-[:ORIGIN_PORT]->(p:Port) RETURN p`.

| Before | After |
|--------|-------|
| Port IDs as string props + graph relationships | Relationships only (single source of truth) |

---

### #10 — Driver node duplicates User node
**Module:** 02 (Schema)
**Issue:** Driver is a separate node with `id: Same as User.id` and a `(:Driver)-[:IS_USER]->(:User)` relationship. This means every driver query requires joining two nodes. It's confusing and error-prone.
**Fix chosen:** Merge driver-specific fields into User node as optional properties. Users with `role: "DRIVER"` have `license_number`, `license_type` set. Remove the separate Driver node. Change `(:Driver)-[:DRIVES]->(:Truck)` to `(:User {role: "DRIVER"})-[:DRIVES]->(:Truck)`.

| Before | After |
|--------|-------|
| `(:Driver)` separate node + `(:Driver)-[:IS_USER]->(:User)` | Driver fields on `(:User)` node. No separate Driver node. |

---

### #11 — Missing Event/Notification constraints
**Module:** 02 (Schema)
**Issue:** Event and Notification nodes are created (Modules 03, 09) but Module 02's constraint list doesn't include them. Without unique constraints, duplicate IDs are possible.
**Fix chosen:** Add:
```cypher
CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT notification_id IF NOT EXISTS FOR (n:Notification) REQUIRE n.id IS UNIQUE;
```

---

### #12 — LAST_MILE_ASSIGNED → DELIVERED triggered by CUSTOMER
**Module:** 03 (Workflow)
**Issue:** The transition allows `CUSTOMER` to trigger delivery completion. Customers don't physically deliver anything — the driver delivers and captures the POD. Customer just signs.
**Fix chosen:** Change triggered_by to `["DRIVER"]` only. Customer signature is a field within the POD form, not a separate transition trigger.

| Before | After |
|--------|-------|
| `triggered_by: ["DRIVER", "CUSTOMER"]` | `triggered_by: ["DRIVER"]` |

---

## 🟡 INCONSISTENCIES

### #13 — REQUEST_SUBMITTED requires manual trigger to UNDER_REVIEW
**Module:** 03 (Workflow)
**Issue:** When a customer submits a request, it enters REQUEST_SUBMITTED. Then a LOGISTICS_MANAGER must manually trigger REQUEST_SUBMITTED → UNDER_REVIEW. This is a pointless extra step — they're semantically the same.
**Fix chosen:** Auto-transition on creation. When a ShipmentRequest is created, its status is automatically set to UNDER_REVIEW. Remove REQUEST_SUBMITTED from the transition table (it's just the initial creation state).

| Before | After |
|--------|-------|
| Customer submits → REQUEST_SUBMITTED → Manager clicks → UNDER_REVIEW | Customer submits → UNDER_REVIEW (auto) |

---

### #14 — Port Officer not linked to a specific port
**Module:** 05 (API) references "PORT_OFFICER at this port" for the port dashboard, but Module 01/02 have no mechanism to associate a user with a specific port.
**Fix chosen:** Add `assigned_port_id: string | null` to User node. Set for PORT_OFFICER and YARD_MANAGER roles. Query: `MATCH (u:User {id: $uid})-[:WORKS_AT]->(p:Port)`. Also add relationship `(:User)-[:WORKS_AT]->(:Port)`.

| Before | After |
|--------|-------|
| No port-user association | `assigned_port_id` on User + `(:User)-[:WORKS_AT]->(:Port)` |

---

### #15 — notify_customs_officer at PORT_ENTRY notifies the trigger actor
**Module:** 03 (Workflow)
**Issue:** PORT_ENTRY → CUSTOMS_CLEARANCE side effect is `notify_customs_officer`, and the original plan had `triggered_by: ["CUSTOMS_OFFICER"]`. You'd be notifying the person who just triggered the action.
**Fix chosen:** Already fixed by #4 (PORT_OFFICER triggers). Now the side effect correctly notifies customs officer that work is ready for them.

---

### #16 — 4 form schemas missing from Module 04
**Module:** 04 (Forms)
**Issue:** Master plan lists 13 document types. Module 04 only defines 9 form schemas. Missing: LOADING_MANIFEST, DEPARTURE_CLEARANCE, ARRIVAL_CONFIRMATION, LAST_MILE_ASSIGNMENT.
**Fix chosen:** Add all 4 missing schemas. For hackathon efficiency, LOADING_MANIFEST and DEPARTURE_CLEARANCE can be combined into the BOL workflow step (all three filled at stage 11). ARRIVAL_CONFIRMATION and LAST_MILE_ASSIGNMENT need their own schemas.

| Before | After |
|--------|-------|
| 9 form schemas defined | 13 form schemas (all document types covered) |

---

### #17 — POST /api/shipments/request bypasses workflow engine
**Module:** 05 (API)
**Issue:** Endpoint says "Creates ShipmentRequest node, triggers UNDER_REVIEW" — directly setting status instead of going through the workflow engine. Module 03 is supposed to be the single authority for status transitions.
**Fix chosen:** POST /api/shipments/request creates the ShipmentRequest via WorkflowEngine, which handles the initial state and first auto-transition. Don't directly set status in the router.

| Before | After |
|--------|-------|
| Router directly sets status | Router calls `workflow_engine.create_shipment_request()` |

---

### #18 — Customer USR-002 has no company
**Module:** 10 (Seed)
**Issue:** USR-002 (Mike Johnson) has `company_id: None` but the schema expects customers to belong to companies (`ShipmentRequest-[:BELONGS_TO]->Company`).
**Fix chosen:** Create a 4th company: `{"id": "COM-004", "name": "ACME Corp", "type": "SHIPPER", "country": "United States"}`. Link USR-002 to COM-004.

---

### #19 — Side effect handlers reference undefined services
**Module:** 03 (Workflow)
**Issue:** Side effects table references `YardService.auto_assign_slot`, `TrackingService.start_tracking`, `DocumentService.generate_bol` — but none of these classes/methods are defined in any module.
**Fix chosen:** Add explicit cross-references:
- `YardService` → defined in Module 05 (yard endpoints)
- `TrackingService` → defined in Module 07 (event_service.py)
- `DocumentService.generate_bol` → defined in Module 04 (document_service.py)

---

### #20 — No file upload endpoint for forms
**Module:** 04 (Forms)
**Issue:** Forms support `file_multiple` type (photos, supporting docs) but no `/api/files/upload` endpoint or storage strategy exists in any module.
**Fix chosen:** For hackathon: encode files as base64 within the Document.data JSON field (simple, no external storage needed). Add `backend/app/routers/files.py` with a simple upload endpoint that stores to local `uploads/` directory and returns a URL. Add to Module 05's router list.

---

### #21 — WebSocket authentication not specified
**Module:** 07 (Real-Time)
**Issue:** WebSocket connections need authentication but browsers can't send Authorization headers on WebSocket upgrade requests.
**Fix chosen:** Pass JWT as query parameter: `ws://backend/api/ws/stream?token=xxx`. Server validates token on connection, extracts user_id and role, subscribes to appropriate channels.

| Before | After |
|--------|-------|
| No auth mentioned for WebSocket | JWT token passed as `?token=` query param, validated on connect |

---

### #22 — Wildcard WebSocket channels will flood Logistics Manager
**Module:** 07 (Real-Time)
**Issue:** Logistics Manager subscribes to `shipment:*` and `alert:*`. With 100+ active shipments, every GPS update and minor status change floods their WebSocket.
**Fix chosen:** Logistics Manager subscribes to `alert:high` and `alert:critical` only. Shipment list uses polling (React Query with 30s refetch). Only ACTION_REQUIRED and HIGH/CRITICAL alerts are pushed via WebSocket.

| Before | After |
|--------|-------|
| Subscribe to `shipment:*` (all events) | Subscribe to `alert:high`, `alert:critical` only. Shipment data via polling. |

---

## 🟢 DESIGN GAPS

### #23 — 16 agent tools may overwhelm Gemini
**Module:** 08 (AI Agent)
**Issue:** Gemini function calling works best with 5-8 tools. 16 tools increases confusion and token usage.
**Fix chosen:** Reduce to 10 core tools. Merge related tools:
- `get_shipment_details` + `get_shipment_timeline` → single `get_shipment` (includes timeline)
- `get_port_status` + `get_port_schedule` → single `get_port_info`
- `get_container_status` + `get_yard_utilization` → single `get_yard_and_containers`
- Remove `search_shipments` (use `get_shipments_by_status` with better filters)

| Before | After |
|--------|-------|
| 16 tools | 10 tools (merged related ones) |

---

### #24 — Proactive scanning burns Gemini quota
**Module:** 08 (AI Agent)
**Issue:** Scanning every 5 minutes uses Gemini to generate alerts = 288 AI calls/day minimum. Free tier is 1000 RPD.
**Fix chosen:** Scan with pure Python (threshold checks against graph data). Generate alerts with templates for standard issues. Only call Gemini for complex cascade scenarios (max 5 calls per scan). Reduce frequency to every 15 minutes.

| Before | After |
|--------|-------|
| Every 5 min, every alert uses Gemini | Every 15 min, template-based alerts, Gemini only for complex cases |

---

### #25 — `get_pending_actions` takes role but not user_id
**Module:** 08 (AI Agent)
**Issue:** The tool only takes `user_role` but many actions are user-specific (driver's assignments, port officer's specific port).
**Fix chosen:** Pass both `user_role` and `user_id`. The tool queries the graph for actions specific to this user (their port, their assignments).

---

### #26 — Notification `notify_role_group` notifies ALL users of that role
**Module:** 09 (Notifications)
**Issue:** If there are 50 port officers, all 50 get notified even if only 1 is at the relevant port.
**Fix chosen:** `notify_role_group` accepts optional `port_id` filter. Uses the `assigned_port_id` from fix #14 to only notify relevant users.

| Before | After |
|--------|-------|
| `notify_role_group("PORT_OFFICER", ...)` — all port officers | `notify_role_group("PORT_OFFICER", port_id="P001", ...)` — only P001 officers |

---

### #27 — Notifications stored in Neo4j may not scale
**Module:** 09 (Notifications)
**Issue:** High-volume, frequently-updated notifications in a graph DB optimized for relationship traversal, not bulk reads.
**Fix chosen:** For hackathon: Neo4j is fine at small scale. Add architectural note: in production, move notifications to PostgreSQL or Redis. The Notification node stays for linking to Shipment/User in the graph, but read queries go to the relational store.

---

### #28 — No loading/error states for new dashboards
**Module:** 06 (UI)
**Issue:** Existing UI had Skeleton/ErrorCard patterns. New dashboards don't mention them.
**Fix chosen:** Add requirement: all data-fetching components must use React Query's `isLoading`/`isError` states with the Skeleton and ErrorCard components from the UI library.

---

### #29 — 7 dashboards is ambitious for hackathon scope
**Module:** 06 (UI)
**Issue:** Building 7 fully-featured role dashboards is a lot of work. Risk of delivering none well.
**Fix chosen:** Prioritize 3 dashboards for MVP: (1) Customer, (2) Logistics Manager, (3) Driver. Others get a simplified generic view showing their pending actions and relevant shipments.

| Before | After |
|--------|-------|
| 7 full custom dashboards | 3 full + 4 simplified (pending actions + shipment list) |

---

### #30 — Shipments at early stages have no container
**Module:** 10 (Seed)
**Issue:** SHP-2026-004 (GOODS_RELEASED) and SHP-2026-005 (DRIVER_ASSIGNED) have no `container_id`. Code querying `(:Shipment)-[:CONTAINS]->(:Container)` may fail.
**Fix chosen:** This is actually correct — containers are assigned at the port. Mark the CONTAINS relationship as OPTIONAL in all Cypher queries. Add explicit null checks in services.

---

### #31 — Document.data as JSON string is an anti-pattern in Neo4j
**Module:** 02 (Schema)
**Issue:** Storing form data as a JSON string loses Neo4j's ability to index or query individual fields.
**Fix chosen:** Accept this trade-off intentionally. Form schemas vary too much (9+ different structures). JSON string gives flexibility. Add a note: for frequently-queried fields (like customs HS code or BOL number), promote them to top-level Document properties in addition to the JSON blob.

---

## Applied Fixes — Module Dependency Map

```
Fix #14 (port-user link) ← needed by → Fix #26 (scoped notifications)
Fix #4 (workflow trigger) ← needed by → Fix #15 (notification target)
Fix #3 (split customs form) ← needed by → Fix #16 (missing schemas)
Fix #10 (merge Driver node) ← affects → Fix #2 (PickupOrder removal)
Fix #5 (terminal states) ← affects → Fix #13 (auto-transition)
```

---

## Priority Order for Applying Fixes

| Priority | Fixes | Reason |
|----------|-------|--------|
| **P0 — Must fix before coding** | #1, #5, #7, #9, #10 | Would cause runtime errors or broken auth |
| **P1 — Fix during module implementation** | #2, #3, #4, #6, #8, #11, #12, #14, #17 | Logic errors that affect correctness |
| **P2 — Fix when integrating modules** | #13, #15, #16, #18, #19, #20, #21, #22 | Cross-module inconsistencies |
| **P3 — Fix if time allows** | #23, #24, #25, #26, #27, #28, #29, #30, #31 | Design improvements, not blockers |
